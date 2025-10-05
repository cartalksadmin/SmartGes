import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Box, ArrowDownCircle, ArrowUpCircle, User } from 'lucide-react';
import { api, normalizeList } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

const Inventory = () => {
  const [movements, setMovements] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [productFilter, setProductFilter] = useState<string>('');
  const { toast } = useToast();

  const load = async (opts: { since?: string; until?: string; produitid?: string } = {}) => {
    try {
      const params: any = { limit: 100 };
      if (opts.since) params.since = opts.since;
      if (opts.produitid) params.produitid = opts.produitid;
      // backend supports `since`; we'll fetch with since (start) and filter by until (end) client-side
      const res: any = await api.inventaire.list(params);
      const body = res.data || res;
      let mvts = body?.movements || body?.data?.movements || [];
      // client-side filter by until if provided
      if (opts.until) {
        const untilDate = new Date(opts.until);
        mvts = mvts.filter((m: any) => {
          const d = new Date(m.createdat);
          return d <= untilDate;
        });
      }
      setMovements(mvts);

      // simple aggregation by date
      const byDate: Record<string, { in: number; out: number }> = {};
      for (const m of mvts) {
        const d = new Date(m.createdat).toLocaleDateString('fr-FR');
        if (!byDate[d]) byDate[d] = { in: 0, out: 0 };
        if (String(m.type).toUpperCase() === 'IN') byDate[d].in += Number(m.quantite);
        else byDate[d].out += Number(m.quantite);
      }
      const data = Object.keys(byDate).map(k => ({ date: k, in: byDate[k].in, out: byDate[k].out })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setChartData(data);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || String(err), variant: 'destructive' });
    }
  };

  const createMovement = async () => {
    // kept for backward compatibility; this function will be replaced by modal submit
    return;
  };

  // modal form state
  const [modalOpen, setModalOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState({ produitid: '', quantite: '', type: 'IN', note: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function formatError(err: any) {
    if (!err) return 'Erreur inconnue';
    if (typeof err === 'string') return err;
    if (err instanceof Error && typeof err.message === 'string') return err.message;
    // If the error is a CustomEvent-like payload (from global alert), try detail or raw
    if (err.detail) {
      const detail = err.detail;
      if (typeof detail === 'string') return detail;
      if (detail.message) return String(detail.message);
      if (detail.raw) {
        // raw might be an object
        const r = detail.raw;
        if (typeof r === 'string') return r;
        if (r.message) return String(r.message);
        if (r.error) return String(r.error);
        try { return JSON.stringify(r); } catch (e) { /* fallback */ }
      }
    }

    // axios-like response
    if (err.response && err.response.data) {
      const d = err.response.data;
      if (typeof d === 'string') return d;
      if (d.message) return String(d.message);
      if (d.error) return String(d.error);
    }
    // apiFetch style: maybe err is an object with data or message
    if (err.data) {
      const d = err.data;
      if (typeof d === 'string') return d;
      if (d.message) return String(d.message);
      if (d.error) return String(d.error);
      try { return JSON.stringify(d); } catch (e) { /* fallback */ }
    }
    if (err.message) return String(err.message);
    try {
      return JSON.stringify(err);
    } catch (e) {
      return String(err);
    }
  }

  const loadProducts = async () => {
    try {
      const res: any = await api.products.list();
      const list = normalizeList(res);
      setProducts(list || []);
    } catch (err: any) {
      // non-fatal
      console.warn('Impossible de charger les produits pour la liste:', err?.message || err);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleOpenModal = () => {
    setForm({ produitid: '', quantite: '', type: 'IN', note: '' });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      if (!form.produitid) return toast({ title: "Erreur", description: 'Veuillez choisir un produit', variant: 'destructive' });
      const produitid = Number(form.produitid);
      const quantite = Number(form.quantite);
      if (Number.isNaN(quantite) || quantite <= 0) return toast({ title: 'Erreur', description: 'Quantité invalide', variant: 'destructive' });
      setFormError(null);
      setIsSubmitting(true);
      await api.inventaire.create({ produitid, quantite, type: String(form.type).toUpperCase(), source: 'MANUEL', note: form.note || null });
      toast({ title: 'Mouvement créé' });
      setModalOpen(false);
  load({ since: dateFrom || undefined, until: dateTo || undefined });
    } catch (err: any) {
      const msg = formatError(err);
      console.log('inventory error:', err, 'formatted:', msg);
      // set form-level error so user sees it in the modal
      setFormError(msg);
      // surface specific server-side validation messages
      const lower = msg.toLowerCase();
      if (lower.includes('rupture') || lower.includes('stock = 0')) {
        toast({ title: 'Stock insuffisant', description: msg, variant: 'destructive' });
      } else if (lower.includes('impossible de sortir') || lower.includes('impossible de') || lower.includes('quantité')) {
        toast({ title: 'Quantité trop élevée', description: msg, variant: 'destructive' });
      } else {
        toast({ title: 'Erreur', description: msg, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Inventaire</h1>
        <div className="space-x-2">
          <Button onClick={() => load({ since: dateFrom || undefined, until: dateTo || undefined, produitid: productFilter || undefined })}>Rafraîchir</Button>
          <Button onClick={handleOpenModal}>Créer mouvement</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Flux de stock (dernières entrées / sorties)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData && chartData.length > 0 ? (
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="in" stroke="#10b981" />
                  <Line type="monotone" dataKey="out" stroke="#ef4444" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">Aucun mouvement de stock enregistré pour le moment.</div>
          )}
        </CardContent>
      </Card>

      {/* Filters - placed after the chart (inspired by Orders.tsx) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-sm text-muted-foreground">Produit</label>
              <Select value={productFilter} onValueChange={(v) => setProductFilter(String(v || ''))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Tous" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous</SelectItem>
                  {products.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Date début</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Date fin</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => load({ since: dateFrom || undefined, until: dateTo || undefined, produitid: productFilter || undefined })}>Filtrer</Button>
              <Button variant="ghost" onClick={() => { setProductFilter(''); setDateFrom(''); setDateTo(''); load(); }}>Effacer</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Détails des mouvements</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            {movements && movements.length > 0 ? (
              <div className="space-y-3">
                {movements.map((m: any) => {
                  const prod = products.find((p: any) => String(p.id) === String(m.produitid));
                  const prodName = prod ? `${prod.nom}` : `#${m.produitid}`;
                  const isIn = String(m.type).toUpperCase() === 'IN';
                  return (
                    <div key={m.id} className="flex items-center justify-between gap-4 p-4 bg-card rounded-lg shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                          <Box className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-medium">{prodName}</div>
                          <div className="text-xs text-muted-foreground">{m.source || 'N/A'} • {new Date(m.createdat).toLocaleString('fr-FR')}</div>
                          {m.note && <div className="text-xs text-muted-foreground">Note: {m.note}</div>}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={isIn ? 'text-green-600 font-semibold text-lg' : 'text-red-600 font-semibold text-lg'}>
                            {isIn ? <><ArrowUpCircle className="inline-block mr-1" />+{m.quantite}</> : <><ArrowDownCircle className="inline-block mr-1" />-{m.quantite}</>}
                          </div>
                          <div className="text-xs text-muted-foreground">{m.utilisateurid ? `Utilisateur: ${m.utilisateurid}` : 'Utilisateur: N/A'}</div>
                        </div>
                        <Badge variant={isIn ? 'default' : 'destructive'}>{isIn ? 'Entrée' : 'Sortie'}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">Aucun mouvement à afficher.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal form for creating movement */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel enregistrement de stock</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => handleSubmit(e)} className="space-y-4 py-4">
            {formError && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded text-destructive-700">
                <strong>Erreur :</strong>
                <div className="text-sm mt-1">{formError}</div>
              </div>
            )}
            <div>
              <Label>Produit *</Label>
              <Select value={form.produitid} onValueChange={(v) => setForm({ ...form, produitid: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choisir un produit" /></SelectTrigger>
                <SelectContent>
                  {products.length === 0 ? (
                    <SelectItem value="">Aucun produit</SelectItem>
                  ) : (
                    products.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.nom} {p.stock_actuel !== undefined ? `(stock: ${p.stock_actuel})` : ''}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quantité *</Label>
              <Input type="number" min={1} value={form.quantite} onChange={(e) => { setForm({ ...form, quantite: e.target.value }); setFormError(null); }} required />
            </div>

            <div>
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => { setForm({ ...form, type: v }); setFormError(null); }}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Entrée (IN)</SelectItem>
                  <SelectItem value="OUT">Sortie (OUT)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Note</Label>
              <Input value={form.note} onChange={(e) => { setForm({ ...form, note: e.target.value }); setFormError(null); }} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Enregistrement...' : 'Enregistrer'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
