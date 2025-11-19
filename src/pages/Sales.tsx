import { useState, useEffect } from 'react';
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
import { api, normalizeList, apiFetch } from '@/lib/apiClient';
import { Commande } from '@/types/api';
import {
  Search,
  Receipt,
  Eye,
  Calendar,
  User,
  TrendingUp,
  Loader2,
  DollarSign,
  Package,
  Clock,
} from 'lucide-react';
import SaleDetail from '@/components/details/SaleDetail';
import RecuPaiementRealtech from '@/components/details/RecuPaiementRealtech';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const Sales = () => {
  const { toast } = useToast();

  const [paiementsByVente, setPaiementsByVente] = useState<Record<string, any[]>>({});
  const [recuOpen, setRecuOpen] = useState(false);
  const [recuData, setRecuData] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  // === Chargement ===
  useEffect(() => {
    loadSales();
  }, []);

  useEffect(() => {
    if (sales.length === 0) return;

    const loadPaiements = async () => {
      const map: Record<string, any[]> = {};
      for (const sale of sales) {
        try {
          const res = await apiFetch(`/api/commandes/${sale.id}/paiements`);
          map[sale.id] = Array.isArray(res?.data?.paiements) ? res.data.paiements : [];
        } catch {
          map[sale.id] = [];
        }
      }
      setPaiementsByVente(map);
    };
    loadPaiements();
  }, [sales]);

  const loadSales = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/commandes');
      setSales(normalizeList<any>(response));
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message || 'Impossible de charger les ventes', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // === Calculs ===
  const getTotal = (sale: any) => Number(sale.total_cmd || sale.montant || 0);
  const getPaid = (sale: any) => Number(sale.montant_paye || 0);

  const getPaymentStatus = (sale: any): 'PAYEE' | 'PARTIELLE' | 'NON_PAYEE' => {
    const total = getTotal(sale);
    const paid = getPaid(sale);
    if (paid >= total) return 'PAYEE';
    if (paid > 0) return 'PARTIELLE';
    return 'NON_PAYEE';
  };

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';

  const filteredSales = sales.filter(sale => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const client = sale.client ? `${sale.client.prenom || ''} ${sale.client.nom || ''}`.toLowerCase() : '';
      if (![sale.code, sale.numero, client].some(s => String(s || '').toLowerCase().includes(term))) return false;
    }
    return true;
  });

  const grouped = {
    PAYEE: filteredSales.filter(s => getPaymentStatus(s) === 'PAYEE'),
    PARTIELLE: filteredSales.filter(s => getPaymentStatus(s) === 'PARTIELLE'),
    NON_PAYEE: filteredSales.filter(s => getPaymentStatus(s) === 'NON_PAYEE'),
  };

  const statusConfig = {
    PAYEE: { label: 'Payée', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-400' },
    PARTIELLE: { label: 'Partielle', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-400' },
    NON_PAYEE: { label: 'Non payée', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-400' },
  };

  // === Carte vente ===
  const SaleCard = ({ sale, status }: { sale: any; status: 'PAYEE' | 'PARTIELLE' | 'NON_PAYEE' }) => {
    const config = statusConfig[status];
    const total = getTotal(sale);
    const paid = getPaid(sale);

    return (
      <Card className={`overflow-hidden hover:shadow-2xl transition-all duration-300 border-l-8 ${config.border} ${config.bg} group`}>
        <CardHeader className="bg-gradient-to-r from-transparent via-muted/20 to-transparent">
          <div className="flex justify-between items-start">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <h3 className="text-2xl font-bold text-primary flex items-center gap-3">
                  <Package className="h-7 w-7 text-primary/80" />
                  {sale.code || `CMD-${sale.id}`}
                </h3>
                <Badge variant={status === 'PAYEE' ? 'default' : status === 'PARTIELLE' ? 'secondary' : 'destructive'} className="text-base px-4 py-1">
                  {config.label}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(sale.created_at)}
                </span>
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {sale.client ? `${sale.client.prenom || ''} ${sale.client.nom || ''}`.trim() || 'Client occasionnel' : 'Client occasionnel'}
                </span>
                {sale.utilisateur && (
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Par {sale.utilisateur.prenom || ''} {sale.utilisateur.nom || ''}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right space-y-2">
              <div className="text-4xl font-bold text-primary flex items-center justify-end gap-3">
                <DollarSign className="h-10 w-10" />
                {total.toLocaleString()} FCFA
              </div>
              {status === 'PARTIELLE' && (
                <div className="text-lg">
                  <span className="text-muted-foreground">Payé :</span>{' '}
                  <span className="font-bold text-orange-600">{paid.toLocaleString()} FCFA</span>
                </div>
              )}
              {status === 'NON_PAYEE' && (
                <div className="text-lg text-red-600 font-medium">
                  À régler intégralement
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <div className="flex flex-wrap gap-4">
            <Button
              size="lg"
              onClick={() => { setRecuData(sale); setRecuOpen(true); }}
              className="gap-3 shadow-lg hover:shadow-xl"
            >
              <Receipt className="h-5 w-5" />
              Reçu de paiement
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={() => { setDetailId(sale.id); setDetailOpen(true); }}
              className="gap-3"
            >
              <Eye className="h-5 w-5" />
              Détails complets
            </Button>
          </div>

          {/* Historique des paiements */}
          {paiementsByVente[sale.id]?.length > 0 && (
            <div className="bg-muted/40 rounded-2xl p-6 border">
              <h4 className="font-bold text-primary text-lg mb-4 flex items-center gap-3">
                <TrendingUp className="h-6 w-6" />
                Historique des règlements
              </h4>
              <div className="space-y-4">
                {paiementsByVente[sale.id].map((p: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-3 border-b last:border-0">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="text-base px-4">
                        {p.mode_paiement || 'Inconnu'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(p.date_paiement || p.created_at)}
                      </span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">
                      +{Number(p.montant || 0).toLocaleString()} FCFA
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* Header Premium */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-primary mb-4 flex items-center justify-center gap-5">
            <DollarSign className="h-16 w-16 text-primary" />
            Historique des ventes & paiements
          </h1>
          <p className="text-2xl text-muted-foreground">Visualisez tous vos encaissements en un coup d'œil</p>
        </div>

        {/* Total global */}
        <div className="text-center mb-12">
          <div className="inline-block bg-primary/10 rounded-3xl px-12 py-8 shadow-2xl">
            <div className="text-5xl font-bold text-primary">
              {filteredSales.reduce((sum, s) => sum + getTotal(s), 0).toLocaleString()} FCFA
            </div>
            <div className="text-xl text-muted-foreground mt-2">Total des ventes affichées</div>
          </div>
        </div>

        {/* Recherche */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground" />
            <Input
              placeholder="Rechercher par code, client, numéro..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-16 text-lg h-16 rounded-2xl shadow-lg"
            />
          </div>
        </div>

        {/* Contenu */}
        <div className="space-y-20">

          {/* Ventes payées */}
          {grouped.PAYEE.length > 0 && (
            <section>
              <h2 className="text-4xl font-bold text-green-600 mb-10 text-center flex items-center justify-center gap-4">
                <TrendingUp className="h-12 w-12" />
                Ventes entièrement réglées
                <Badge variant="default" className="text-2xl px-6 py-2 ml-6">{grouped.PAYEE.length}</Badge>
              </h2>
              <div className="space-y-8">
                {grouped.PAYEE.map(sale => <SaleCard key={sale.id} sale={sale} status="PAYEE" />)}
              </div>
            </section>
          )}

          {/* Ventes partielles */}
          {grouped.PARTIELLE.length > 0 && (
            <section>
              <h2 className="text-4xl font-bold text-orange-600 mb-10 text-center flex items-center justify-center gap-4">
                <Clock className="h-12 w-12" />
                Ventes partiellement réglées
                <Badge variant="secondary" className="text-2xl px-6 py-2 ml-6">{grouped.PARTIELLE.length}</Badge>
              </h2>
              <div className="space-y-8">
                {grouped.PARTIELLE.map(sale => <SaleCard key={sale.id} sale={sale} status="PARTIELLE" />)}
              </div>
            </section>
          )}

          {/* Ventes non payées */}
          {grouped.NON_PAYEE.length > 0 && (
            <section>
              <h2 className="text-4xl font-bold text-red-600 mb-10 text-center flex items-center justify-center gap-4">
                <DollarSign className="h-12 w-12" />
                Ventes en attente de règlement
                <Badge variant="destructive" className="text-2xl px-6 py-2 ml-6">{grouped.NON_PAYEE.length}</Badge>
              </h2>
              <div className="space-y-8">
                {grouped.NON_PAYEE.map(sale => <SaleCard key={sale.id} sale={sale} status="NON_PAYEE" />)}
              </div>
            </section>
          )}

          {/* Vide */}
          {filteredSales.length === 0 && (
            <div className="text-center py-32">
              <div className="bg-muted/50 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8">
                <Receipt className="h-16 w-16 text-muted-foreground" />
              </div>
              <h3 className="text-4xl font-bold text-muted-foreground mb-4">Aucune vente trouvée</h3>
              <p className="text-xl text-muted-foreground">Essayez de modifier vos critères de recherche</p>
            </div>
          )}
        </div>

        {/* Dialog Reçu */}
        <Dialog open={recuOpen} onOpenChange={setRecuOpen}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto bg-gray-50">
            <DialogHeader>
              <DialogTitle className="text-3xl text-center">Reçu de paiement</DialogTitle>
            </DialogHeader>
            {recuData && (
              <div className="bg-white rounded-2xl shadow-2xl p-10">
                <RecuPaiementRealtech
                  numero={recuData.code || recuData.numero || `REC-${recuData.id}`}
                  date={recuData.created_at || new Date().toISOString()}
                  client={recuData.client || { nom: '', prenom: '' }}
                  commande={{
                    numero: recuData.code || recuData.numero || '',
                    date: recuData.created_at || '',
                    total: getTotal(recuData),
                    items: (recuData.items || recuData.produits || []).map((it: any) => ({
                      nom: it.nom || it.produit_nom || 'Article',
                      quantite: Number(it.quantite || 1),
                      prix_unitaire: Number(it.prix_unitaire || 0),
                      total: Number(it.total || it.quantite * it.prix_unitaire || 0),
                    })),
                  }}
                  paiement={{
                    montant: getPaid(recuData),
                    mode: paiementsByVente[recuData.id]?.[0]?.mode_paiement || 'Non spécifié',
                    date: paiementsByVente[recuData.id]?.[0]?.date_paiement || recuData.created_at,
                  }}
                  reste={getTotal(recuData) - getPaid(recuData)}
                  entreprise={{ nom: 'REALTECH', adresse: 'Douala, Cameroun', telephone: '+237 XXX XXX XXX', email: 'contact@realtech.cm' }}
                  paiements={paiementsByVente[recuData.id] || []}
                />
              </div>
            )}
            <div className="mt-8 text-center">
              <Button size="lg" className="text-xl px-12 py-6" onClick={() => window.print()}>
                Imprimer le reçu
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <SaleDetail id={detailId} open={detailOpen} onOpenChange={setDetailOpen} />
      </div>
    </div>
  );
};

export default Sales;