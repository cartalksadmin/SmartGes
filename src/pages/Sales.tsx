import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api, normalizeList } from '@/lib/apiClient';
import { Vente } from '@/types/api';
import { 
  Search, 
  Receipt, 
  Eye,
  Calendar,
  User,
  Euro,
  FileText,
  Loader2
} from 'lucide-react';
import SaleDetail from '@/components/details/SaleDetail';

const Sales = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sales, setSales] = useState<Vente[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      const response = await api.ventes.list();
      const salesList = normalizeList<Vente>(response);
      setSales(salesList);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger les ventes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter(sale =>
    // basic search
    (sale.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sale.numero || '').toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(sale => {
    // status filter: prefer statut_paiement then infer from montant
    const key = (sale as any).statut_paiement || ((sale as any).paiement_summary as any)?.statut_paiement || (() => {
      const paid = Number((sale as any).montant_paye || ((sale as any).paiement_summary as any)?.montant_paye || 0);
      const total = Number(sale.montant || 0);
      if (paid <= 0) return 'NON_PAYEE';
      if (paid >= total) return 'PAYEE';
      return 'PARTIELLE';
    })();
    if (statusFilter && statusFilter !== 'ALL' && String(key).toUpperCase() !== String(statusFilter).toUpperCase()) {
      return false;
    }

    // date range filter
    const createdAt = sale.created_at || (sale as any).date || null;
    if (dateFrom) {
      if (!createdAt || new Date(createdAt) < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      if (!createdAt) return false;
      const end = new Date(dateTo);
      end.setHours(23,59,59,999);
      if (new Date(createdAt) > end) return false;
    }

    return true;
  });

  const grouped = filteredSales.reduce((acc: Record<string, Vente[]>, s) => {
    const key = ((s as any).statut_paiement || (() => {
      const paid = Number((s as any).montant_paye || 0);
      const total = Number(s.montant || 0);
      if (paid <= 0) return 'PAYEE';
      if (paid >= total) return 'PAYEE';
      return 'PARTIELLE';
    })()).toString().toUpperCase();
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {} as Record<string, Vente[]>);

  const getStatusBadge = (status: string) => {
    const variants = {
      PAYEE: "default" as const,
      PARTIELLE: "secondary" as const,
      NON_PAYEE: "destructive" as const,
    };
    return variants[status as keyof typeof variants] || "secondary" as const;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      PAYEE: "Payée",
      PARTIELLE: "Partiellement payée",
      NON_PAYEE: "Non payée",
    };
    return labels[status as keyof typeof labels] || status;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  // --- Chart helpers ---
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  const getDailySeries = (days = 30) => {
    const now = new Date();
    const map = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, 0);
    }
    sales.forEach(s => {
      const d = s.created_at ? new Date(s.created_at).toISOString().slice(0,10) : null;
      if (d && map.has(d)) map.set(d, (map.get(d) || 0) + Number(s.montant || 0));
    });
    return Array.from(map.entries()).map(([k,v]) => ({ date: k, value: v }));
  };

  const getMonthlySeries = (months = 12) => {
    const now = new Date();
    const map = new Map<string, number>();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      map.set(key, 0);
    }
    sales.forEach(s => {
      if (!s.created_at) return;
      const d = new Date(s.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (map.has(key)) map.set(key, (map.get(key) || 0) + Number(s.montant || 0));
    });
    return Array.from(map.entries()).map(([k,v]) => ({ period: k, value: v }));
  };

  const getSemestrialSeries = (sem = 6) => getMonthlySeries(sem);

  const Sparkline = ({ points }: { points: number[] }) => {
    const w = 200; const h = 40; const max = Math.max(...points, 1);
    const step = points.length > 1 ? w / (points.length - 1) : w;
    const path = points.map((v, i) => `${i===0?'M':'L'} ${i*step} ${h - (v/max)*h}`).join(' ');
    return (
      <svg width={w} height={h} className="block">
        <path d={path} stroke="#0ea5e9" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  const daily = getDailySeries(30);
  const monthly = getMonthlySeries(12);
  const semestrial = getSemestrialSeries(6);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Gestion des Ventes</h1>
          <p className="text-muted-foreground">
            Suivez et gérez toutes les ventes
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recherche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par numéro ou code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ventes - 30 derniers jours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold">{sum(daily.map(d => d.value)).toFixed(2)} FCFA</div>
                <div className="text-sm text-muted-foreground">Total sur 30 jours</div>
              </div>
              <div>
                <Sparkline points={daily.map(d => d.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ventes - 12 mois</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold">{sum(monthly.map(d => d.value)).toFixed(2)} FCFA</div>
                <div className="text-sm text-muted-foreground">Total sur 12 mois</div>
              </div>
              <div>
                <Sparkline points={monthly.map(d => d.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ventes - 6 mois</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold">{sum(semestrial.map(d => d.value)).toFixed(2)} FCFA</div>
                <div className="text-sm text-muted-foreground">Total sur 6 mois</div>
              </div>
              <div>
                <Sparkline points={semestrial.map(d => d.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Sales List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par numéro ou code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Statut paiement</label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(String(v || 'ALL'))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Tous" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous</SelectItem>
                  <SelectItem value="PAYEE">Payée</SelectItem>
                  <SelectItem value="PARTIELLE">Partiellement payée</SelectItem>
                  <SelectItem value="NON_PAYEE">Non payée</SelectItem>
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
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="ghost" onClick={() => { setStatusFilter('ALL'); setDateFrom(''); setDateTo(''); setSearchTerm(''); }}>Effacer</Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {['PAYEE','PARTIELLE'].map((section) => (
          grouped[section] && grouped[section].length > 0 ? (
            <div key={section}>
              <h2 className="text-lg font-semibold mb-2">
                {section === 'PAYEE' ? 'Ventes payées' : 'Ventes partiellement payées'}
              </h2>
              <div className="space-y-4">
                {grouped[section].map((sale) => (
                  <Card key={sale.id} className="hover:shadow-lg transition-shadow animate-scale-in">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-xl text-primary">{sale.code}</CardTitle>
                          <CardDescription className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Numéro: {sale.numero}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(sale.created_at)}
                            </span>
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={getStatusBadge(section)}>{getStatusLabel(section)}</Badge>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">{(() => { const num = Number(sale.montant || 0); return `${num.toFixed(2)} FCFA`; })()}</div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          {sale.recu && (
                            <Button variant="outline" size="sm">
                              <Receipt className="h-4 w-4 mr-1" />
                              Reçu
                            </Button>
                          )}
                          {sale.commande && (
                            <div className="text-sm text-muted-foreground">Commande: {sale.commande.code}</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setDetailId(sale.id); setDetailOpen(true); }}>
                            <Eye className="h-4 w-4 mr-1" />Détails
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : null
        ))}
      </div>

      {filteredSales.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune vente trouvée</h3>
            <p className="text-muted-foreground mb-4">
              Aucune vente ne correspond à votre recherche
            </p>
            <Button variant="outline" onClick={() => setSearchTerm('')}>
              Effacer la recherche
            </Button>
          </CardContent>
        </Card>
      )}
      <SaleDetail id={detailId} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
};

export default Sales;
