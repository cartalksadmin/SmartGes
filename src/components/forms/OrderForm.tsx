'use client';
import { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/apiClient';
import { normalizeList } from '@/lib/apiClient';
import { Commande, Client, Product, Service } from '@/types/api';
import { Search, Trash2, UserPlus, Package, Wrench } from 'lucide-react';
import InvoicePreviewModal from '@/components/ui/InvoicePreviewModal';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Commande | null;
  onSaved?: (commande: Commande) => void;
};

interface OrderLine {
  id: string;
  produit_id: string | null;
  service_id: string | null;
  nom: string;
  quantite: number;
  prix_unitaire: number;
}

export default function OrderForm({ open, onOpenChange, initial, onSaved }: Props) {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clientId, setClientId] = useState<string>('');
  const [items, setItems] = useState<OrderLine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewInvoiceOpen, setPreviewInvoiceOpen] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);

  useEffect(() => {
    if (!open) {
      setItems([]);
      setClientId('');
      return;
    }
    const loadData = async () => {
      try {
        const [clientsRes, productsRes, servicesRes] = await Promise.all([
          api.clients.list(),
          api.products.list(),
          api.services.list(),
        ]);
        setClients(normalizeList<Client>(clientsRes));
        setProducts(normalizeList<Product>(productsRes));
        setServices(normalizeList<Service>(servicesRes));
      } catch {
        toast({ title: 'Erreur de chargement', variant: 'destructive' });
      }
      if (initial) {
        setClientId(String(initial.client_id || ''));
        const lines: OrderLine[] = [];
        const all = [...(initial.produits || []), ...(initial.services || []), ...(initial.items || [])];
        all.forEach((line: any) => {
          const isProduct = !!line.produit_id || !!line.produitid;
          lines.push({
            id: `loaded-${Date.now()}-${Math.random()}`,
            produit_id: isProduct ? String(line.produit_id || line.produitid || line.id) : null,
            service_id: !isProduct ? String(line.service_id || line.serviceid || line.id) : null,
            nom: line.nom || line.produit_nom || line.service_nom || 'Article',
            quantite: Number(line.quantite || line.qte || 1),
            prix_unitaire: Number(line.prix_unitaire || line.prix || 0),
          });
        });
        setItems(lines);
      }
    };
    loadData();
  }, [open, initial, toast]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: any[] = [];
    products.forEach(p => {
      if (
        Number(p.stock_actuel || 0) > 0 &&
        (p.nom?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q))
      ) {
        results.push({ ...p, type: 'product' });
      }
    });
    services.forEach(s => {
      if (s.nom?.toLowerCase().includes(q)) {
        results.push({ ...s, type: 'service' });
      }
    });
    return results.slice(0, 20);
  }, [searchQuery, products, services]);

  const addItem = (item: any, callback?: () => void) => {
    const existing = items.find(i =>
      (item.type === 'product' && i.produit_id === String(item.id)) ||
      (item.type === 'service' && i.service_id === String(item.id))
    );
    if (existing) {
      setItems(prev => prev.map(i => i === existing ? { ...i, quantite: i.quantite + 1 } : i));
    } else {
      setItems(prev => [...prev, {
        id: `tmp-${Date.now()}`,
        produit_id: item.type === 'product' ? String(item.id) : null,
        service_id: item.type === 'service' ? String(item.id) : null,
        nom: item.nom,
        quantite: 1,
        prix_unitaire: Number(item.prix_unitaire || 0),
      }]);
    }
    setSearchQuery('');
    setSearchOpen(false);
    callback?.();
  };

  const updateQuantity = (i: number, qty: number) => {
    if (qty < 1) return;
    setItems(prev => prev.map((it, idx) => (idx === i ? { ...it, quantite: qty } : it)));
  };

  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const total = items.reduce((sum, it) => sum + it.prix_unitaire * it.quantite, 0);

  const handleSave = async () => {
    if (items.length === 0) {
      toast({ title: 'Ajoutez au moins un article', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        clientId: clientId ? Number(clientId) : undefined,
        produits: items.filter(i => i.produit_id).map(i => ({ id: Number(i.produit_id!), quantite: i.quantite })),
        services: items.filter(i => i.service_id).map(i => ({ id: Number(i.service_id!), quantite: i.quantite })),
      };

      const result = initial
        ? await api.commandes.update(initial.id, payload)
        : await api.commandes.create(payload);

      const commandeId = String((result?.data?.id || result?.data?.commande?.id || result?.id || result?.commande?.id));
      if (commandeId) {
        try {
          await api.commandes.generateInvoice(commandeId);
          await api.attemptDownloadInvoice(commandeId);
        } catch (e) {
          toast({ title: 'Erreur facture', description: 'Impossible de générer ou télécharger la facture', variant: 'destructive' });
        }
      }

      toast({ title: initial ? 'Commande modifiée !' : 'Commande créée !' });
      onSaved?.((result?.data || result) as Commande);
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* ==================== MODAL PRINCIPAL ==================== */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl h-[95vh] flex flex-col p-0">
          {/* Header fixe */}
          <DialogHeader className="shrink-0 p-6 border-b bg-background sticky top-0 z-30">
            <DialogTitle className="text-2xl font-bold">
              {initial ? 'Modifier la commande' : 'Nouvelle commande'}
            </DialogTitle>
          </DialogHeader>

          {/* Zone centrale scrollable */}
          <ScrollArea className="flex-1 px-6">
            <div className="py-6 space-y-8">
              {/* Client */}
              <div>
                <label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <UserPlus className="h-4 w-4" /> Client
                </label>
                <select
                  className="w-full px-4 py-2 border rounded-lg bg-background"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                >
                  <option value="">Client occasionnel</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.prenom} {c.nom} {c.telephone && `• ${c.telephone}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recherche rapide */}
              <div>
                <label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Search className="h-4 w-4" /> Ajouter un produit ou service
                </label>
                <div className="relative">
                  <Input
                    placeholder="Rechercher par nom, code..."
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      setSearchOpen(!!e.target.value);
                    }}
                    onFocus={() => setSearchOpen(true)}
                  />
                  {searchOpen && searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-background border rounded-lg shadow-2xl max-h-96 overflow-y-auto">
                      <Command>
                        <CommandList>
                          <CommandEmpty>Aucun résultat</CommandEmpty>
                          <CommandGroup>
                            {searchResults.map(item => (
                              <CommandItem
                                key={`${item.type}-${item.id}`}
                                onSelect={() => addItem(item)}
                                className="cursor-pointer py-3"
                              >
                                <div className="flex justify-between w-full items-center">
                                  <div>
                                    <span className="font-medium">{item.nom}</span>
                                    <span className="text-sm text-muted-foreground ml-3">
                                      • {Number(item.prix_unitaire).toLocaleString()} FCFA
                                      {item.type === 'product' && ` • Stock: ${item.stock_actuel}`}
                                    </span>
                                  </div>
                                  <Badge variant={item.type === 'product' ? 'default' : 'secondary'}>
                                    {item.type === 'product' ? 'Produit' : 'Service'}
                                  </Badge>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </div>
                  )}
                </div>
              </div>

              {/* Produits & Services récents */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ... même contenu que tu avais ... */}
                {/* (je le garde identique) */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Package className="h-5 w-5" /> Produits récents
                    </h3>
                    <Button size="sm" variant="outline" onClick={() => setShowAllProducts(true)}>
                      Voir tous
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {products.slice(0, 5).map(p => (
                      <div key={p.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-accent transition">
                        <div>
                          <div className="font-medium">{p.nom}</div>
                          <div className="text-sm text-muted-foreground">
                            {Number(p.prix_unitaire).toLocaleString()} FCFA • Stock: {p.stock_actuel}
                          </div>
                        </div>
                        <Button size="sm" onClick={() => addItem({ ...p, type: 'product' })}>
                          Ajouter
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Wrench className="h-5 w-5" /> Services récents
                    </h3>
                    <Button size="sm" variant="outline" onClick={() => setShowAllServices(true)}>
                      Voir tous
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {services.slice(0, 5).map(s => (
                      <div key={s.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-accent transition">
                        <div>
                          <div className="font-medium">{s.nom}</div>
                          <div className="text-sm text-muted-foreground">
                            {Number(s.prix_unitaire).toLocaleString()} FCFA
                          </div>
                        </div>
                        <Button size="sm" onClick={() => addItem({ ...s, type: 'service' })}>
                          Ajouter
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tableau des lignes */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Articles sélectionnés</h3>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead>Article</TableHead>
                        <TableHead className="text-center">Qté</TableHead>
                        <TableHead className="text-right">Prix U.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                            Aucun article ajouté
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((item, i) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.nom}</TableCell>
                            <TableCell className="text-center">
                              <Input
                                type="number"
                                min="1"
                                className="w-20 mx-auto"
                                value={item.quantite}
                                onChange={e => updateQuantity(i, Number(e.target.value) || 1)}
                              />
                            </TableCell>
                            <TableCell className="text-right">{item.prix_unitaire.toLocaleString()} FCFA</TableCell>
                            <TableCell className="text-right font-medium">
                              {(item.prix_unitaire * item.quantite).toLocaleString()} FCFA
                            </TableCell>
                            <TableCell>
                              <Button size="icon" variant="ghost" onClick={() => removeItem(i)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Total */}
              <div className="border-t-2 border-primary pt-6">
                <div className="text-right text-3xl font-bold text-primary">
                  Total : {total.toLocaleString()} FCFA
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Footer fixe */}
          <div className="shrink-0 flex justify-end gap-4 p-6 border-t bg-background sticky bottom-0 z-30">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            {initial && (
              <Button variant="secondary" onClick={() => setPreviewInvoiceOpen(true)}>
                Prévisualiser la facture
              </Button>
            )}
            <Button onClick={handleSave} disabled={isSaving || items.length === 0}>
              {isSaving ? 'Enregistrement...' : initial ? 'Enregistrer' : 'Créer la commande'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Les autres modals (prévisualisation facture, tous les produits, tous les services) */}
      {initial && (
        <InvoicePreviewModal
          orderId={String(initial.id)}
          open={previewInvoiceOpen}
          onClose={() => setPreviewInvoiceOpen(false)}
        />
      )}

      {/* Modal Tous les produits – scroll corrigé */}
      <Dialog open={showAllProducts} onOpenChange={setShowAllProducts}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="shrink-0 p-6 border-b">
            <DialogTitle>Tous les produits</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-6">
              {products.map(p => (
                <div
                  key={p.id}
                  className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition"
                  onClick={() => addItem({ ...p, type: 'product' }, () => setShowAllProducts(false))}
                >
                  <div className="font-medium">{p.nom}</div>
                  <div className="text-sm text-muted-foreground">
                    {Number(p.prix_unitaire).toLocaleString()} FCFA • Stock: {p.stock_actuel || 0}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal Tous les services – scroll corrigé */}
      <Dialog open={showAllServices} onOpenChange={setShowAllServices}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="shrink-0 p-6 border-b">
            <DialogTitle>Tous les services</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-6">
              {services.map(s => (
                <div
                  key={s.id}
                  className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition"
                  onClick={() => addItem({ ...s, type: 'service' }, () => setShowAllServices(false))}
                >
                  <div className="font-medium">{s.nom}</div>
                  <div className="text-sm text-muted-foreground">
                    {Number(s.prix_unitaire).toLocaleString()} FCFA
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}