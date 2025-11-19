import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api, normalizeList } from '@/lib/apiClient';
import { DashboardStats, Commande, Task } from '@/types/api';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  ShoppingCart,
  Receipt,
  Euro,
  Clock,
  Plus,
  Eye,
  Activity,
  Target,
  Award,
  Zap,
  BarChart3,
  UserCheck,
  Calendar,
} from 'lucide-react';

function Sparkline({ data = [], color = '#06b6d4' }: { data?: number[]; color?: string }) {
  if (!data || data.length === 0) return <div className="text-muted-foreground text-xs">—</div>;
  const max = Math.max(...data, 1);
  const points = data
    .map((val, i) => `${(i / (data.length - 1)) * 100},${100 - (val / max) * 100}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 30" className="w-full h-8 overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

const StatCard = ({
  title,
  value,
  change,
  trend,
  icon: Icon,
  color = 'text-primary',
  series,
}: {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down';
  icon: any;
  color?: string;
  series?: number[];
}) => (
  <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-0 bg-gradient-to-br from-white to-gray-50/50">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div>
          <CardDescription className="text-base">{title}</CardDescription>
          <CardTitle className="text-4xl font-bold mt-2">{value}</CardTitle>
          {change && (
            <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {change}
            </div>
          )}
        </div>
        <div className={`p-4 rounded-2xl ${color} bg-opacity-10`}>
          <Icon className={`h-10 w-10 ${color}`} />
        </div>
      </div>
    </CardHeader>
    <CardContent className="pt-2">
      <Sparkline data={series} color={color.replace('text-', '#')} />
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats>({});
  const [recentOrders, setRecentOrders] = useState<Commande[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [employeeStats, setEmployeeStats] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await api.dashboard.getStats();
        const data = res.data || res;

        setStats({
          totalRevenue: data.revenue?.total || 0,
          totalOrders: data.orders?.total || 0,
          totalClients: data.clients?.total || 0,
          totalProducts: data.products?.total || 0,
          totalEmployees: data.employees?.total || 0,
          monthlyRevenueSeries: data.monthlyRevenueSeries || [],
          revenueChange: data.revenue?.change || '+12%',
          ordersChange: data.orders?.change || '+8%',
        });

        // Recent orders
        const orders = (data.recentOrders || []).slice(0, 6);
        setRecentOrders(orders);

        // Pending tasks
        const tasks = (data.recentTasks || []).filter((t: any) => ['EN_ATTENTE', 'EN_COURS'].includes(t.statut?.toUpperCase()));
        setPendingTasks(tasks.slice(0, 5));

        // Employee stats (admin only)
        if (isAdmin) {
          const empRes = await api.users.stats();
          setEmployeeStats(empRes.data || []);
        }

        // Recent activity
        try {
          const act = await api.dashboard.getRecentActivity();
          setRecentActivity((act.data || act).slice(0, 10));
        } catch {}
      } catch (err: any) {
        toast({ title: 'Erreur', description: err.message || 'Impossible de charger le tableau de bord', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAdmin, toast]);

  const formatCurrency = (amount: number) => {
    try {
      return `F CFA ${Number(amount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } catch (e) {
      return `F CFA ${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  const isEmployee = user?.role?.toUpperCase() === 'EMPLOYE';

  const statsCards = [
    { title: 'Chiffre d’affaires', value: formatCurrency(stats.totalRevenue || 0), change: '+18.2%', trend: 'up' as const, icon: Euro, series: stats.monthlyRevenueSeries?.map((s: any) => s.total) || [] },
    { title: 'Commandes totales', value: String(stats.totalOrders || 0), change: '+12.5%', trend: 'up' as const, icon: ShoppingCart, series: [] },
    { title: 'Clients actifs', value: String(stats.totalClients || 0), change: '+5.8%', trend: 'up' as const, icon: Users, series: [] },
    { title: 'Produits en stock', value: String(stats.totalProducts || 0), change: '-2.1%', trend: 'down' as const, icon: Package, series: [] },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Activity className="h-16 w-16 animate-pulse text-primary mx-auto mb-6" />
          <p className="text-xl text-muted-foreground">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* Hero Header */}
        <div className="text-center py-12">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-4">
            Tableau de bord RealTech
          </h1>
          <p className="text-2xl text-muted-foreground">
            Bienvenue, <span className="font-bold text-primary">{user?.prenom} {user?.nom}</span> • {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {statsCards.map((stat, i) => (
            <StatCard key={i} {...stat} />
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-3">
              <Zap className="h-8 w-8 text-primary" />
              Actions rapides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <Button size="lg" className="h-24 flex-col gap-3 text-lg font-medium shadow-lg hover:shadow-xl" onClick={() => navigate('/orders')}>
                <Plus className="h-8 w-8" />
                Nouvelle commande
              </Button>
              <Button size="lg" variant="outline" className="h-24 flex-col gap-3 text-lg" onClick={() => navigate('/clients')}>
                <Users className="h-8 w-8" />
                Ajouter client
              </Button>
              {!isEmployee && (
                <>
                  <Button size="lg" variant="outline" className="h-24 flex-col gap-3 text-lg" onClick={() => navigate('/products')}>
                    <Package className="h-8 w-8" />
                    Nouveau produit
                  </Button>
                  <Button size="lg" variant="outline" className="h-24 flex-col gap-3 text-lg" onClick={() => navigate('/sales')}>
                    <Receipt className="h-8 w-8" />
                    Enregistrer vente
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders & Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Recent Orders */}
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <ShoppingCart className="h-8 w-8 text-primary" />
                Commandes récentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">Aucune commande récente</p>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map(order => (
                    <div key={order.id} className="flex items-center justify-between p-5 rounded-xl bg-muted/30 hover:bg-muted/60 transition">
                      <div className="space-y-1">
                        <div className="font-bold text-lg">{order.code || order.numero}</div>
                        <div className="text-sm text-muted-foreground">
                          {order.client ? `${order.client.prenom} ${order.client.nom}` : 'Client occasionnel'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(order.created_at || '').toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {Number(order.total_cmd || 0).toLocaleString()} FCFA
                        </div>
                        <Badge variant={order.statut === 'PAYEE' ? 'default' : order.statut === 'EN_ATTENTE' ? 'secondary' : 'destructive'}>
                          {order.statut?.replace('_', ' ') || 'Inconnu'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Tasks */}
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Target className="h-8 w-8 text-orange-500" />
                Tâches en attente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingTasks.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Aucune tâche en cours</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-5 rounded-xl bg-orange-50 border border-orange-200">
                      <div>
                        <div className="font-semibold text-lg">{task.nom}</div>
                        <div className="text-sm text-muted-foreground">
                          Échéance : {new Date(task.date_fin || '').toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <Badge variant={task.importance === 'HAUTE' ? 'destructive' : task.importance === 'MOYENNE' ? 'secondary' : 'outline'}>
                        {task.importance || 'Normale'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Admin : Activité récente */}
        {isAdmin && recentActivity.length > 0 && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Activity className="h-8 w-8 text-primary" />
                Activité en temps réel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((act, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{act.label || act.action}</p>
                      <p className="text-sm text-muted-foreground">
                        {act.utilisateur?.prenom} {act.utilisateur?.nom} • {new Date(act.date || act.created_at).toLocaleTimeString('fr-FR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin : Top Performers */}
        {isAdmin && employeeStats.length > 0 && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Award className="h-8 w-8 text-yellow-500" />
                Top Performers du mois
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {employeeStats
                  .sort((a, b) => (b.commandes + b.ventes) - (a.commandes + a.ventes))
                  .slice(0, 3)
                  .map((emp, i) => (
                    <div key={emp.id} className="text-center p-6 rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200">
                      <div className="text-5xl mb-3">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                      <div className="font-bold text-xl">{emp.prenom} {emp.nom}</div>
                      <div className="text-sm text-muted-foreground mt-2">
                        {emp.commandes} commandes • {emp.ventes} ventes
                      </div>
                      <div className="text-2xl font-bold text-primary mt-3">
                        {Number(emp.revenue || 0).toLocaleString()} FCFA
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;