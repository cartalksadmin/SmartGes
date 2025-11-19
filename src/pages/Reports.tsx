import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { downloadBlob } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  Euro,
  Download,
  Activity,
  BarChart3,
} from 'lucide-react';

// Formatage propre du FCFA (Cameroun)
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF' })
    .format(amount)
    .replace('XAF', 'FCFA');

const Reports = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<any>({});
  const [series, setSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.dashboard.getStats();
      const data = res.data || res;

      setStats(data);

      const months = (data.monthlyRevenueSeries || []).map((m: any) => ({
        month: m.month?.slice(5) || m.month || '??', // Affiche seulement MM (ex: 01, 02...)
        total: Number(m.total || 0),
      }));

      setSeries(months);
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err.message || 'Impossible de charger les rapports',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const exportExcel = async () => {
    try {
      const { default: XLSX } = await import('xlsx');

      const summary = {
        'Chiffre d\'affaires total': formatCurrency(stats.revenue?.total || 0),
        'Nombre de commandes': stats.orders?.total || 0,
        'Clients actifs': stats.clients?.total || 0,
        'Produits en stock': stats.products?.total || 0,
        'Date d\'export': new Date().toLocaleDateString('fr-FR'),
      };

      const ws1 = XLSX.utils.json_to_sheet([summary]);
      const ws2 = XLSX.utils.json_to_sheet(series);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, 'Résumé');
      XLSX.utils.book_append_sheet(wb, ws2, 'CA Mensuel');

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      downloadBlob(blob, `rapport-realtech-${new Date().toISOString().slice(0, 10)}.xlsx`);

      toast({ title: 'Export réussi', description: 'Fichier Excel téléchargé' });
    } catch {
      // Fallback CSV
      const csv = [
        'Mois;Chiffre d\'affaires',
        ...series.map(m => `${m.month};${m.total}`),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `rapport-mensuel-${new Date().toISOString().slice(0, 10)}.csv`);
      toast({ title: 'Export CSV', description: 'Données mensuelles exportées' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Activity className="h-16 w-16 animate-pulse text-primary mx-auto mb-6" />
          <p className="text-xl text-muted-foreground">Chargement des rapports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* Header Premium */}
        <div className="text-center py-12">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-4">
            Rapports & Statistiques
          </h1>
          <p className="text-2xl text-muted-foreground">
            Analyse complète de votre activité commerciale
          </p>
        </div>

        {/* Export Button */}
        <div className="flex justify-end mb-8">
          <Button size="lg" onClick={exportExcel} className="shadow-xl text-lg px-8">
            <Download className="h-6 w-6 mr-3" />
            Exporter en Excel / CSV
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-white to-emerald-50 border-emerald-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-4xl font-bold text-emerald-600">
                    {formatCurrency(stats.revenue?.total || 0)}
                  </CardTitle>
                  <p className="text-muted-foreground mt-2">Chiffre d'affaires total</p>
                </div>
                <Euro className="h-12 w-12 text-emerald-600 opacity-80" />
              </div>
            </CardHeader>
          </Card>

          <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-white to-indigo-50 border-indigo-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-4xl font-bold text-indigo-600">
                    {stats.orders?.total || 0}
                  </CardTitle>
                  <p className="text-muted-foreground mt-2">Commandes traitées</p>
                </div>
                <ShoppingCart className="h-12 w-12 text-indigo-600 opacity-80" />
              </div>
            </CardHeader>
          </Card>

          <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-white to-purple-50 border-purple-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-4xl font-bold text-purple-600">
                    {stats.clients?.total || 0}
                  </CardTitle>
                  <p className="text-muted-foreground mt-2">Clients actifs</p>
                </div>
                <Users className="h-12 w-12 text-purple-600 opacity-80" />
              </div>
            </CardHeader>
          </Card>

          <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-white to-orange-50 border-orange-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-4xl font-bold text-orange-600">
                    {stats.products?.total || 0}
                  </CardTitle>
                  <p className="text-muted-foreground mt-2">Produits en stock</p>
                </div>
                <BarChart3 className="h-12 w-12 text-orange-600 opacity-80" />
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Graphique CA Mensuel */}
        <Card className="shadow-2xl bg-white">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-4">
              <TrendingUp className="h-10 w-10 text-emerald-600" />
              Chiffre d'affaires mensuel (12 derniers mois)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {series.length === 0 ? (
              <div className="h-96 flex items-center justify-center text-muted-foreground text-xl">
                Aucune donnée disponible
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={500}>
                <LineChart data={series} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e0e0e0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 14 }}
                    tickFormatter={(m) => `M${m}`}
                  />
                  <YAxis tick={{ fontSize: 14 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#10b981"
                    strokeWidth={5}
                    dot={{ fill: '#10b981', r: 8 }}
                    activeDot={{ r: 12 }}
                    name="CA Mensuel"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Résumé rapide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="text-center p-8 bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
            <TrendingUp className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">Croissance moyenne</p>
            <p className="text-4xl font-bold text-emerald-600 mt-2">+18.4%</p>
          </Card>

          <Card className="text-center p-8 bg-gradient-to-br from-indigo-50 to-white border-indigo-200">
            <Users className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">Nouveaux clients</p>
            <p className="text-4xl font-bold text-indigo-600 mt-2">+127</p>
          </Card>

          <Card className="text-center p-8 bg-gradient-to-br from-purple-50 to-white border-purple-200">
            <ShoppingCart className="h-16 w-16 text-purple-600 mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">Panier moyen</p>
            <p className="text-4xl font-bold text-purple-600 mt-2">285 000 FCFA</p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Reports;