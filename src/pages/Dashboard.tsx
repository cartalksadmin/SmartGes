import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Eye
} from 'lucide-react';

// Small inline sparkline component used for compact charts
function Sparkline({ data = [], color = '#06b6d4', height = 28 }: { data?: Array<number | { month?: string; total?: number }>; color?: string; height?: number }) {
  const nums = Array.isArray(data) ? data.map((d: any) => (typeof d === 'number' ? d : Number(d.total || 0))) : [];
  if (!nums || nums.length === 0) return <div className="text-muted-foreground">—</div>;
  const max = Math.max(...nums, 1);
  const points = nums.map((n, i) => `${(i * (100 / nums.length)).toFixed(2)},${((1 - (n / max)) * 100).toFixed(2)}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-7">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Small stat card to make dashboard more attractive
function StatCard({ title, value, change, trend, color, series }: { title: string; value: string; change?: string; trend?: 'up'|'down'; color?: string; series?: any[] }) {
  const changeColor = trend === 'up' ? 'text-success' : 'text-destructive';
  return (
    <Card className="hover:shadow-xl transition-shadow transform hover:-translate-y-1">
      <CardHeader className="flex items-start justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="mt-1 flex items-baseline gap-3">
            <div className="text-2xl font-bold text-primary">{value}</div>
            {change && <div className={`text-sm ${changeColor} font-medium`}>{change}</div>}
          </div>
        </div>
        <div className="w-28">
          <Sparkline data={series || []} color={color || '#06b6d4'} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">Dernières données</div>
      </CardContent>
    </Card>
  );
}

const Dashboard = () => {
  const { toast } = useToast();
  const { user, isAdmin, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({});
  const [recentOrders, setRecentOrders] = useState<Commande[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [employeeOrders, setEmployeeOrders] = useState<Commande[]>([]);
  const [employeeSales, setEmployeeSales] = useState<any[]>([]);
  const [employeeTasks, setEmployeeTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const role = (user?.role || '').toUpperCase();
  const isEmployee = role === 'EMPLOYE';
  useEffect(() => {
    // Wait until auth finished loading before redirecting
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    // Fetch data only after auth finished and user is authenticated
    if (!authLoading && isAuthenticated) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // require token present before requesting
      const token = localStorage.getItem('accessToken');
      if (!token) {
        navigate('/login');
        return;
      }
      // Fetch dashboard stats
      const statsResponse = await api.dashboard.getStats();
      // the backend returns { success: true, data: { ... } }
      const data = (statsResponse && (statsResponse as any).data) ? (statsResponse as any).data : statsResponse;
      // map top-level numbers
      setStats(prev => ({
        ...prev,
        totalRevenue: data?.revenue?.total ?? data?.revenue?.monthly ?? prev.totalRevenue,
        totalOrders: data?.orders?.total ?? prev.totalOrders,
        totalClients: data?.clients?.total ?? prev.totalClients,
        totalProducts: data?.products?.total ?? prev.totalProducts,
        monthlyRevenueSeries: data?.monthlyRevenueSeries || data?.revenue?.monthlySeries || data?.monthlyRevenueSeries || prev.monthlyRevenueSeries,
      }));

      // Recent orders: support multiple shapes
      const recent = data?.recentOrders || data?.recent?.orders || data?.recentOrders || data?.recent?.orders || data?.recent || data?.recentOrders;
      let ordersList: any[] = [];
      if (Array.isArray(recent)) ordersList = recent;
      else if (Array.isArray(data?.recent?.orders)) ordersList = data.recent.orders;
      else ordersList = [];

      // normalize field names (createdat vs created_at) and ensure shape matches Commande
      const normalizedOrders: Commande[] = ordersList.map((o: any) => ({
        id: o.id,
        code: o.code || o.numero || String(o.id || ''),
        numero: o.numero || o.code || String(o.id || ''),
        utilisateur_id: o.utilisateur_id || o.utilisateurid || o.utilisateur?.id || '',
        total_cmd: Number(o.total_cmd ?? o.montant ?? o.montant_total ?? 0),
        statut: (o.statut || '').toUpperCase() as Commande['statut'],
        created_at: o.createdat || o.created_at || o.createdAt,
        client_id: o.client_id || o.client?.id || o.clientId,
        client: o.client || (o.client_nom ? { nom: o.client_nom, prenom: o.client_prenom } : undefined),
      } as Commande));
      setRecentOrders(normalizedOrders.slice(0, 4));

      // pending tasks
      const recentTasks = data?.recentTasks || data?.recent?.tasks || data?.recentTasks || data?.recent?.tasks || data?.recentTasks || [];
      // some backends use slightly different task shapes; keep as any[] then filter
      const tasksList: any[] = Array.isArray(recentTasks) ? recentTasks.map((t: any) => ({
        id: t.id,
        nom: t.nom || t.titre || '',
        statut: (t.statut || '').toUpperCase(),
        importance: (t.importance || '').toUpperCase(),
        date_fin: t.date_fin || t.updatedAt || t.updatedat || t.updated_at,
        utilisateur_id: t.utilisateurid || t.utilisateurId || t.utilisateur?.id,
      })) : [];
      const pending = tasksList.filter(t => t.statut === 'EN_ATTENTE' || t.statut === 'EN_COURS');
      // normalize to Task[] shape for state
      const pendingForState: Task[] = pending.slice(0, 3).map((t: any) => ({
        id: t.id,
        nom: t.nom,
        statut: (t.statut || 'EN_ATTENTE') as Task['statut'],
        importance: (t.importance || 'MOYENNE') as Task['importance'],
        date_fin: t.date_fin,
        utilisateur_id: t.utilisateur_id || t.utilisateur?.id,
      }));
      setPendingTasks(pendingForState);

      // Also fetch users to compute employees (role EMPLOYE)
      try {
        const usersRes = await api.users.list();
        const userList = normalizeList(usersRes) as any[];
        const employees = userList.filter(u => (u.role || '').toUpperCase() === 'EMPLOYE');
        setStats(prev => ({ ...prev, totalEmployees: employees.length }));
      } catch (e) {
        // non-fatal if users endpoint fails
        // keep existing stats
      }

      // If current user is an EMPLOYE, fetch their commandes, ventes and taches
      try {
        const role = (user?.role || '').toUpperCase();
        if (role === 'EMPLOYE') {
          const uid = user?.id;
          // commandes
          const cmdRes = await api.commandes.list();
          const cmdList = normalizeList(cmdRes) as any[];
          const myCmd = cmdList.filter(c => Number(c.utilisateurid || c.utilisateurId || c.utilisateur?.id) === Number(uid));
          setEmployeeOrders(myCmd);

          // ventes
          const ventesRes = await api.ventes.list();
          const ventesList = normalizeList(ventesRes) as any[];
          const myVentes = ventesList.filter(v => Number(v.utilisateurid || v.utilisateurId || v.utilisateur?.id) === Number(uid));
          setEmployeeSales(myVentes);

          // taches
          const tachesRes = await api.tasks.list();
          const tachesList = normalizeList(tachesRes) as Task[];
          const myTaches = tachesList.filter(t => Number(t.utilisateur_id || t.utilisateur?.id) === Number(uid));
          setEmployeeTasks(myTaches);
        }
      } catch (e) {
        // ignore non-fatal
      }

    } catch (error: any) {
      // apiFetch already handles 401 by redirecting, but show a user friendly toast for other errors
      const msg = error?.message || 'Impossible de charger les données';
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
      // if unauthorized, ensure we land on login
      if (error?.message && /session|autorisé|401|expired/i.test(error.message)) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        navigate('/login');
      }

      // Normalize various unauthorized / expired token shapes
      const errMsg = (error?.message || '').toString();
      const respErr = (error?.response?.data?.error || error?.response?.data?.message || '')?.toString();
      const isUnauthorizedStatus = error?.response && error.response.status === 401;
      const isTokenError = /token invalide|jwt expired|jwt expired|expired token|token expir|token expired|invalid token/i.test(errMsg + ' ' + respErr);
      if (isUnauthorizedStatus || isTokenError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        navigate('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Small helpers for charting & forecasting
  const getMonthlySeries = () => {
    // expect stats.monthlyRevenueSeries as [{month:'YYYY-MM', total: number}]
    const series = stats.monthlyRevenueSeries || [];
    // if series already numbers only, return it
    return Array.isArray(series) ? series.map((s: any) => ({ month: s.month, total: Number(s.total || 0) })) : [];
  };

  const forecastNextMonth = (series: Array<{ month: string; total: number }>) => {
    if (!series || series.length < 2) return series?.[series.length - 1]?.total ?? 0;
    // compute month-over-month growth rates
    const totals = series.map(s => Number(s.total || 0));
    const growths: number[] = [];
    for (let i = 1; i < totals.length; i++) {
      const prev = totals[i - 1] || 0;
      const cur = totals[i] || 0;
      if (prev === 0) continue;
      growths.push((cur - prev) / prev);
    }
    const avgGrowth = growths.length ? (growths.reduce((a, b) => a + b, 0) / growths.length) : 0;
    const last = totals[totals.length - 1] || 0;
    return Math.max(0, last * (1 + avgGrowth));
  };

  const formatCurrency = (v: number) => `F CFA ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const statsCards = [
    {
      title: "Chiffre d'affaires",
      value: formatCurrency(Number(stats.totalRevenue || 0)),
      change: stats.revenueChange || '+0%',
      trend: stats.revenueChange?.startsWith('+') ? 'up' : 'down',
      icon: Euro,
      description: "Ce mois",
      series: stats.monthlyRevenueSeries || []
    },
    {
      title: "Commandes",
      value: (Number(stats.totalOrders || 0)).toLocaleString(),
      change: stats.ordersChange || '+0%',
      trend: stats.ordersChange?.startsWith('+') ? 'up' : 'down',
      icon: ShoppingCart,
      description: "Nouvelles commandes",
      series: (stats.monthlyRevenueSeries || []).slice(-6).map((s:any) => Number(s.total || 0))
    },
    {
      title: "Clients actifs",
      value: (Number(stats.totalClients || 0)).toLocaleString(),
      change: stats.clientsChange || '+0%',
      trend: stats.clientsChange?.startsWith('+') ? 'up' : 'down',
      icon: Users,
      description: "Ce mois",
      series: []
    },
    {
      title: "Produits en stock",
      value: (Number(stats.totalProducts || 0)).toLocaleString(),
      change: stats.productsChange || '+0%',
      trend: stats.productsChange?.startsWith('+') ? 'up' : 'down',
      icon: Package,
      description: "Inventaire total",
      series: []
    }
    ,{
      title: "Employés",
      value: (Number(stats.totalEmployees || 0)).toLocaleString(),
      change: '+0%',
      trend: 'up',
      icon: Users,
      description: 'Comptes employés',
      series: []
    }
  ];

  const getStatusBadge = (status: string) => {
    const s = ((status || '') as string).toUpperCase();
    const statusMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      PAYEE: 'default',
      NON_PAYEE: 'secondary',
      PARTIELLE: 'destructive',
      PARTIELLEMENT_PAYEE: 'destructive',
      VALIDE: 'default',
      EN_ATTENTE: 'secondary',
      TERMINEE: 'outline',
      ANNULEE: 'destructive',
    };
    return statusMap[s] || 'secondary';
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      HAUTE: "destructive",
      MOYENNE: "secondary",
      BASSE: "outline",
    };
    return priorityMap[priority] || "secondary";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Aperçu de votre activité RealTech Holding
          </p>
        </div>
        <Button className="bg-gradient-accent hover:opacity-90" onClick={() => navigate('/orders')}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle commande
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.filter(s => {
          if (isEmployee) return !['Chiffre d\'affaires', 'Produits en stock', 'Employés'].includes(s.title);
          return true;
        }).map((s, i) => (
              <StatCard key={i} title={s.title} value={s.value} change={s.change} trend={(s.trend as 'up'|'down')} color={i === 0 ? '#06b6d4' : undefined} series={s.series} />
            ))}
      </div>

  {/* Revenue chart + Forecast (hidden for employees) */}
  {!isEmployee && (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenu mensuel</CardTitle>
            <CardDescription>Derniers mois et prévision pour le mois prochain</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-48">
              {/* Simple SVG bar chart */}
              {(() => {
                const series = getMonthlySeries();
                if (!series || series.length === 0) return <div className="text-muted-foreground">Aucune donnée</div>;
                const max = Math.max(...series.map(s => s.total), 1);
                const barWidth = Math.max(6, Math.floor((100 / series.length)));
                return (
                  <svg viewBox={`0 0 100 40`} preserveAspectRatio="none" className="w-full h-48">
                    {series.map((s, i) => {
                      const x = (i * (100 / series.length));
                      const height = (s.total / max) * 30; // scale
                      return (
                        <g key={s.month}>
                          <rect x={x + 1} y={40 - height} width={(100 / series.length) - 2} height={height} fill="#06b6d4" rx={1} />
                          <text x={x + (100 / series.length) / 2} y={39} fontSize={2.5} textAnchor="middle" fill="#334155">{s.month.slice(-2)}</text>
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Prévision prochaine période</div>
                <div className="text-xl font-semibold text-primary">
                  {formatCurrency(forecastNextMonth(getMonthlySeries()))}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total ce mois</div>
                <div className="text-lg font-medium text-primary">{formatCurrency(stats.totalRevenue || 0)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick revenue summary card */}
        <Card>
          <CardHeader>
            <CardTitle>Résumé revenus</CardTitle>
            <CardDescription>Comparaison et tendances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <div className="text-sm text-muted-foreground">Revenu total</div>
                <div className="font-semibold">{formatCurrency(stats.totalRevenue || 0)}</div>
              </div>
              <div className="flex justify-between">
                <div className="text-sm text-muted-foreground">Commandes (total)</div>
                <div className="font-semibold">{stats.totalOrders || 0}</div>
              </div>
              <div className="flex justify-between">
                <div className="text-sm text-muted-foreground">Clients</div>
                <div className="font-semibold">{stats.totalClients || 0}</div>
              </div>
              <div className="flex justify-between">
                <div className="text-sm text-muted-foreground">Employés</div>
                <div className="font-semibold">{stats.totalEmployees || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Commandes récentes
            </CardTitle>
            <CardDescription>
              Dernières commandes clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Chargement...</div>
              ) : (isEmployee ? employeeOrders.length === 0 : recentOrders.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">Aucune commande récente</div>
              ) : (
                (isEmployee ? employeeOrders.slice(0,4) : recentOrders).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="space-y-1">
                      <div className="font-semibold text-primary">{order.numero}</div>
                      <div className="text-sm text-muted-foreground">
                        {order.client?.nom || 'Client non spécifié'}
                      </div>
                      <div className="text-xs text-muted-foreground">{formatDate(order.created_at)}</div>
                    </div>
                    <div className="text-right space-y-2">
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="font-bold">{formatCurrency(Number(order.total_cmd || 0))}</div>
                                  <div className="text-xs text-muted-foreground">{formatDate(order.created_at)}</div>
                                </div>
                                <div className="w-36">
                                  <Sparkline data={stats.monthlyRevenueSeries || []} />
                                </div>
                                <Badge variant={getStatusBadge(order.statut)}>
                                  {String(order.statut || '').replace('_', ' ')}
                                </Badge>
                               {/* <Button variant="ghost" size="sm" onClick={() => navigate(`/orders/${order.id}`)}><Eye className="h-4 w-4" /></Button> */}
                              </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Tâches en cours
            </CardTitle>
            <CardDescription>
              Tâches assignées nécessitant attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Chargement...</div>
              ) : pendingTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Aucune tâche en attente</div>
              ) : (
                pendingTasks.map((task) => (
                  <div key={task.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="space-y-1 flex-1">
                      <div className="font-medium">{task.nom}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Échéance: {formatDate(task.date_fin)}
                      </div>
                    </div>
                    <Badge variant={getPriorityBadge(task.importance || 'MOYENNE')}>
                      {task.importance || 'MOYENNE'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Employee-specific view */}
      {user?.role && user.role.toUpperCase() === 'EMPLOYE' ? (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Vue employé</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Mes commandes ({employeeOrders.length})</CardTitle>
                <CardDescription>Commandes qui vous sont assignées</CardDescription>
              </CardHeader>
              <CardContent>
                {employeeOrders.length === 0 ? (
                  <div className="text-muted-foreground">Aucune commande</div>
                ) : (
                  employeeOrders.slice(0,5).map(o => (
                    <div key={o.id} className="flex justify-between py-2">
                      <div>
                        <div className="font-medium">{o.numero || o.code}</div>
                        <div className="text-sm text-muted-foreground">{o.client?.nom || 'Client'}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">F CFA{Number(o.total_cmd || 0).toFixed(2)}</div>
                        <Badge variant={getStatusBadge((o.statut || '').toUpperCase())}>{(o.statut || '').replace('_',' ')}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mes ventes ({employeeSales.length})</CardTitle>
                <CardDescription>Ventes enregistrées par vous</CardDescription>
              </CardHeader>
              <CardContent>
                {employeeSales.length === 0 ? (
                  <div className="text-muted-foreground">Aucune vente</div>
                ) : (
                  employeeSales.slice(0,5).map(v => (
                    <div key={v.id} className="flex justify-between py-2">
                      <div className="font-medium">{v.numero || v.code}</div>
                      <div className="font-semibold">F CFA{Number(v.montant || v.total || 0).toFixed(2)}</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mes tâches ({employeeTasks.length})</CardTitle>
                <CardDescription>Tâches qui vous sont assignées</CardDescription>
              </CardHeader>
              <CardContent>
                {employeeTasks.length === 0 ? (
                  <div className="text-muted-foreground">Aucune tâche</div>
                ) : (
                  <div className="space-y-2">
                    {employeeTasks.slice(0,6).map(t => (
                      <div key={t.id} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{t.nom}</div>
                          <div className="text-sm text-muted-foreground">Échéance: {formatDate(t.date_fin)}</div>
                        </div>
                        <Badge variant={getPriorityBadge(t.importance || 'MOYENNE')}>{t.importance || 'MOYENNE'}</Badge>
                      </div>
                    ))}
                    {/* Simple charts for tasks */}
                    <div className="mt-4">
                      <div className="text-sm font-medium mb-2">Répartition par statut</div>
                      {(() => {
                        const byStatus: Record<string, number> = {};
                        employeeTasks.forEach(t => { const s = (t.statut||'NON_DEFINI').toUpperCase(); byStatus[s] = (byStatus[s]||0)+1; });
                        const entries = Object.entries(byStatus);
                        if (entries.length === 0) return <div className="text-muted-foreground">Aucune donnée</div>;
                        const total = entries.reduce((a,b) => a + b[1], 0);
                        return (
                          <svg viewBox="0 0 100 20" className="w-full h-14">
                            {entries.map((e, i) => {
                              const w = (e[1]/total)*100;
                              const x = entries.slice(0,i).reduce((a, b) => a + (b[1]/total)*100, 0);
                              const color = i % 2 === 0 ? '#06b6d4' : '#7c3aed';
                              return <rect key={e[0]} x={x} y={2} width={w} height={16} fill={color} rx={2} />;
                            })}
                          </svg>
                        );
                      })()}

                      <div className="text-sm font-medium mt-3 mb-2">Répartition par priorité</div>
                      {(() => {
                        const byPrio: Record<string, number> = {};
                        employeeTasks.forEach(t => { const p = (t.importance||'MOYENNE').toUpperCase(); byPrio[p] = (byPrio[p]||0)+1; });
                        const entries = Object.entries(byPrio);
                        if (entries.length === 0) return <div className="text-muted-foreground">Aucune donnée</div>;
                        const total = entries.reduce((a,b) => a + b[1], 0);
                        return (
                          <svg viewBox="0 0 100 20" className="w-full h-14">
                            {entries.map((e, i) => {
                              const w = (e[1]/total)*100;
                              const x = entries.slice(0,i).reduce((a, b) => a + (b[1]/total)*100, 0);
                              const color = i % 2 === 0 ? '#ef4444' : '#f59e0b';
                              return <rect key={e[0]} x={x} y={2} width={w} height={16} fill={color} rx={2} />;
                            })}
                          </svg>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {/* Quick Actions */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>
            Accès direct aux fonctionnalités principales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/clients')}>
              <Users className="h-6 w-6" />
              <span>Nouveau Client</span>
            </Button>
            {!isEmployee && (
              <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/products')}>
                <Package className="h-6 w-6" />
                <span>Ajouter Produit</span>
              </Button>
            )}
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/orders')}>
              <ShoppingCart className="h-6 w-6" />
              <span>Créer Commande</span>
            </Button>
            {!isEmployee && (
              <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/sales')}>
                <Receipt className="h-6 w-6" />
                <span>Nouvelle Vente</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;