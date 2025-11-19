import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api, normalizeList, apiFetch } from '@/lib/apiClient';
import showPaymentModal from '@/lib/showPaymentModal';
import { Commande } from '@/types/api';
import {
  Search,
  Eye,
  FileText,
  Edit,
  Plus,
  Loader2,
  Trash2,
  ReceiptText,
  Calendar,
  User,
  DollarSign,
  Package,
} from 'lucide-react';
import Swal from 'sweetalert2';
import OrderDetail from '@/components/details/OrderDetail';
import OrderForm from '@/components/forms/OrderForm';
import InvoicePreviewModal from '@/components/ui/InvoicePreviewModal';

const Orders: React.FC = () => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [activeSection, setActiveSection] = useState<'ALL' | 'PAYEE' | 'PARTIELLE' | 'NON_PAYEE' | 'SUPPRIMEES'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<Commande[]>([]);
  const [deletedOrders, setDeletedOrders] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<Commande | null>(null);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);
  const [previewInvoiceData, setPreviewInvoiceData] = useState<any | null>(null);

  // === Chargement ===
  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.commandes.list();
      setOrders(normalizeList<Commande>(res));
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Impossible de charger les commandes', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  // === Suppression ===
  const handleDeleteOrder = async (order: Commande) => {
    const result = await Swal.fire({
      title: 'Supprimer la commande ?',
      text: `La commande ${order.code || order.numero} sera archivée définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#ef4444',
    });

    if (!result.isConfirmed) return;

    try {
      await api.commandes.delete(order.id);
      toast({ title: 'Commande supprimée', description: 'Archivée avec succès' });
      setDeletedOrders(prev => [...prev, { ...order, deletedat: new Date().toISOString() } as Commande]);
      setOrders(prev => prev.filter(o => o.id !== order.id));
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Échec de la suppression', variant: 'destructive' });
    }
  };

  // === Édition ===
  const handleEdit = async (order: Commande) => {
    try {
      const res: any = await api.commandes.get(order.id);
      const cmd = res.data?.commande || res.data || res;
      setFormInitial(cmd);
      setFormOpen(true);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Impossible de charger la commande', variant: 'destructive' });
    }
  };

  // === Paiement ===
 const handlePay = async (order: Commande) => {
    try {
      const total = Number((order as any).total_cmd || 0);
      const paid = Number((order as any).montant_paye || 0);

      const result = await showPaymentModal({
        title: `Règlement • ${order.code || order.numero}`,
        total,
        alreadyPaid: paid,
      });

      if (!result) return;

      await api.commandes.pay(String(order.id), {
        montant: result.montant,
        mode_paiement: result.mode,
        statut_paiement: result.statut,
      });

      toast({ title: 'Paiement enregistré !', description: `${result.montant.toLocaleString()} FCFA` });
      loadOrders();
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    } catch (err: any) {
      toast({ title: 'Erreur de paiement', description: err.message || 'Une erreur est survenue', variant: 'destructive' });
    }
  };

  // === Statut & Filtrage ===
  const getPaymentStatus = (o: Commande): 'PAYEE' | 'PARTIELLE' | 'NON_PAYEE' => {
    const paid = Number((o as any).montant_paye || 0);
    const total = Number((o as any).total_cmd || 0);
    if (paid >= total) return 'PAYEE';
    if (paid > 0) return 'PARTIELLE';
    return 'NON_PAYEE';
  };

  const filteredOrders = orders.filter(o => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const client = o.client ? `${o.client.prenom} ${o.client.nom}`.toLowerCase() : '';
      if (![o.code, o.numero, client].some(s => s?.toLowerCase().includes(term))) return false;
    }
    return true;
  });

  const grouped = {
    PAYEE: filteredOrders.filter(o => getPaymentStatus(o) === 'PAYEE'),
    PARTIELLE: filteredOrders.filter(o => getPaymentStatus(o) === 'PARTIELLE'),
    NON_PAYEE: filteredOrders.filter(o => getPaymentStatus(o) === 'NON_PAYEE'),
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

  const statusConfig = {
    PAYEE: { label: 'Payée', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    PARTIELLE: { label: 'Partielle', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
    NON_PAYEE: { label: 'Non payée', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  };

  // === Carte commande ===
  const OrderCard = ({ order, status }: { order: Commande; status: 'PAYEE' | 'PARTIELLE' | 'NON_PAYEE' }) => {
    const config = statusConfig[status];
    const total = Number((order as any).total_cmd || 0);
    const paid = Number((order as any).montant_paye || 0);

    return (
      <Card className={`overflow-hidden hover:shadow-2xl transition-all duration-300 border-l-8 ${config.border} ${config.bg}`}>
        <CardHeader className="bg-gradient-to-r from-transparent to-muted/30">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <h3 className="text-2xl font-bold text-primary flex items-center gap-3">
                  <Package className="h-6 w-6" />
                  {order.code || 'CMD-' + order.numero}
                </h3>
                <Badge variant={status === 'PAYEE' ? 'default' : status === 'PARTIELLE' ? 'secondary' : 'destructive'} className="text-base px-4 py-1">
                  {config.label}
                </Badge>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {formatDate((order as any).created_at)}</span>
                <span className="flex items-center gap-2"><User className="h-4 w-4" /> {order.client ? `${order.client.prenom} ${order.client.nom}` : 'Client occasionnel'}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary flex items-center justify-end gap-2">
                <DollarSign className="h-8 w-8" />
                {total.toLocaleString()} FCFA
              </div>
              {status === 'PARTIELLE' && (
                <div className="text-sm mt-1">
                  <span className="text-muted-foreground">Payé :</span>{' '}
                  <span className="font-bold text-orange-600">{paid.toLocaleString()} FCFA</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Button size="lg" variant="outline" onClick={() => { setDetailId(String(order.id)); setDetailOpen(true); }}>
              <Eye className="h-5 w-5 mr-2" /> Détails
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-white"
              onClick={async () => {
                try {
                  const res: any = await api.commandes.get(order.id);
                  const cmd = res.data?.commande || res.data || res;
                  const pRes: any = await apiFetch(`/api/commandes/${order.id}/paiements`).catch(() => ({ data: { paiements: [] } }));
                  const paiements = pRes.data?.paiements || [];

                  const items = (cmd.items || cmd.produits || []).map((it: any) => ({
                    nom: it.nom || it.produit_nom || '',
                    type: it.service_id ? 'Service' : 'Produit',
                    quantite: Number(it.quantite || 1),
                    prix_unitaire: Number(it.prix_unitaire || 0),
                    total: Number(it.total || it.quantite * it.prix_unitaire || 0),
                  }));

                  setPreviewInvoiceData({ ...cmd, items, paiements });
                  setPreviewInvoiceId(String(order.id));
                } catch {
                  toast({ title: 'Erreur', description: 'Impossible de charger la facture', variant: 'destructive' });
                }
              }}
            >
              <FileText className="h-5 w-5 mr-2" /> Facture
            </Button>

            {paid === 0 && (
              <Button size="lg" variant="outline" onClick={() => handleEdit(order)}>
                <Edit className="h-5 w-5 mr-2" /> Modifier
              </Button>
            )}

            {(status === 'NON_PAYEE' || status === 'PARTIELLE') && (
              <Button size="lg" onClick={() => handlePay(order)}>
                <ReceiptText className="h-5 w-5 mr-2" /> Régler
              </Button>
            )}

            {status === 'NON_PAYEE' && (
              <Button size="lg" variant="destructive" onClick={() => handleDeleteOrder(order)}>
                <Trash2 className="h-5 w-5 mr-2" /> Supprimer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header Premium */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-primary mb-4 flex items-center justify-center gap-4">
            <Package className="h-12 w-12" />
            Gestion des Commandes
          </h1>
          <p className="text-xl text-muted-foreground">Suivez, modifiez et encaissez vos commandes en toute simplicité</p>
        </div>

        {/* Onglets stylisés */}
        <div className="flex flex-wrap justify-center gap-4 mb-10">
          {(['ALL', 'PAYEE', 'PARTIELLE', 'NON_PAYEE', 'SUPPRIMEES'] as const).map(section => (
            <Button
              key={section}
              variant={activeSection === section ? 'default' : 'outline'}
              size="lg"
              onClick={() => setActiveSection(section)}
              className="text-lg px-8 py-6"
            >
              {section === 'ALL' && 'Toutes'}
              {section === 'PAYEE' && `Payées (${grouped.PAYEE.length})`}
              {section === 'PARTIELLE' && `Partielles (${grouped.PARTIELLE.length})`}
              {section === 'NON_PAYEE' && `Non payées (${grouped.NON_PAYEE.length})`}
              {section === 'SUPPRIMEES' && `Supprimées (${deletedOrders.length})`}
            </Button>
          ))}
        </div>

        {/* Bouton Nouvelle commande */}
        <div className="flex justify-end mb-8">
          <Button size="lg" className="text-lg px-8 shadow-xl" onClick={() => { setFormInitial(null); setFormOpen(true); }}>
            <Plus className="h-6 w-6 mr-3" /> Nouvelle commande
          </Button>
        </div>

        {/* Recherche */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
            <Input
              placeholder="Rechercher par code, numéro ou client..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-14 text-lg h-14"
            />
          </div>
        </div>

        {/* Contenu */}
        <div className="space-y-16">
          {/* Supprimées */}
          {activeSection === 'SUPPRIMEES' && (
            <div className="text-center py-20">
              {deletedOrders.length === 0 ? (
                <p className="text-2xl text-muted-foreground">Aucune commande supprimée</p>
              ) : (
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-destructive">Corbeille</h2>
                  {deletedOrders.map(o => (
                    <Card key={o.id} className="bg-destructive/5 border-destructive/30">
                      <CardContent className="pt-6 text-center">
                        <p className="text-xl font-bold text-destructive">{o.code} • {formatDate((o as any).deletedat)}</p>
                        <p className="text-3xl font-bold mt-4">{Number(o.total_cmd || 0).toLocaleString()} FCFA</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Autres sections */}
          {(activeSection === 'ALL' || activeSection === 'PAYEE') && grouped.PAYEE.map(o => <OrderCard key={o.id} order={o} status="PAYEE" />)}
          {(activeSection === 'ALL' || activeSection === 'PARTIELLE') && grouped.PARTIELLE.map(o => <OrderCard key={o.id} order={o} status="PARTIELLE" />)}
          {(activeSection === 'ALL' || activeSection === 'NON_PAYEE') && grouped.NON_PAYEE.map(o => <OrderCard key={o.id} order={o} status="NON_PAYEE" />)}

          {/* Vide */}
          {activeSection !== 'SUPPRIMEES' && filteredOrders.length === 0 && (
            <div className="text-center py-20">
              <Package className="h-24 w-24 text-muted-foreground mx-auto mb-6 opacity-50" />
              <p className="text-2xl text-muted-foreground">Aucune commande trouvée</p>
            </div>
          )}
        </div>

        {/* Modals */}
        <OrderDetail id={detailId} open={detailOpen} onOpenChange={setDetailOpen} />
        <OrderForm open={formOpen} onOpenChange={setFormOpen} initial={formInitial} onSaved={loadOrders} />
        <InvoicePreviewModal
          orderId={previewInvoiceId}
          orderData={previewInvoiceData}
          payments={previewInvoiceData?.paiements || []}
          open={!!previewInvoiceId}
          onClose={() => { setPreviewInvoiceId(null); setPreviewInvoiceData(null); }}
        />
      </div>
    </div>
  );
};

export default Orders;