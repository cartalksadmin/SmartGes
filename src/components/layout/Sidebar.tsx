import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/apiClient';
import { 
  Building2, 
  Bell,
  LayoutDashboard, 
  Users, 
  Package, 
  Wrench, 
  ShoppingCart, 
  Receipt, 
  CheckSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  currentPage?: string;
  onPageChange?: (page: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'EMPLOYE'] },
  { id: 'clients', label: 'Clients', icon: Users, roles: ['ADMIN', 'EMPLOYE'] },
  { id: 'products', label: 'Produits', icon: Package, roles: ['ADMIN', 'EMPLOYE'] },
  { id: 'services', label: 'Services', icon: Wrench, roles: ['ADMIN', 'EMPLOYE'] },
  { id: 'orders', label: 'Commandes', icon: ShoppingCart, roles: ['ADMIN', 'EMPLOYE'] },
  { id: 'inventory', label: 'Inventaire', icon: Package, roles: ['ADMIN', 'MANAGER'] },
  { id: 'sales', label: 'Ventes', icon: Receipt, roles: ['ADMIN', 'EMPLOYE'] },
  { id: 'tasks', label: 'Tâches', icon: CheckSquare, roles: ['ADMIN', 'EMPLOYE'] },
  { id: 'users', label: 'Utilisateurs', icon: Users, roles: ['ADMIN'] },
  { id: 'reports', label: 'Rapports', icon: Receipt, roles: ['ADMIN'] },
];

const Sidebar = ({ currentPage, onPageChange }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const prevUnreadRef = useRef<number>(0);

  // fetch notifications
  const loadNotifications = async () => {
    try {
      const body = await (await api.notifications.list()).data;
      const items = (body && body.notifications) ? body.notifications : [];
      setNotifications(items);
      const unread = items.filter((i:any) => !i.lu).length;
      setUnreadCount(unread);
      return items;
    } catch (e) {
      console.warn('Failed to load notifications', e);
      // indicate an error state so UI can display a small badge
      setUnreadCount(-1);
      return [];
    }
  };

  useEffect(() => { 
    // initial load
    (async () => {
      const items = await loadNotifications();
      prevUnreadRef.current = items ? items.filter((i:any)=>!i.lu).length : 0;
    })();

    // polling every 15 seconds
    const iv = setInterval(async () => {
      const items = await loadNotifications();
      const unread = items ? items.filter((i:any)=>!i.lu).length : 0;
      if (unread > (prevUnreadRef.current || 0)) {
        // show a toast for the newest unread
        const newest = items.filter((i:any)=>!i.lu).sort((a:any,b:any)=> new Date(b.createdat).getTime() - new Date(a.createdat).getTime())[0];
        if (newest) {
          const msg = newest.titre + ' — ' + newest.message;
          toast({ title: `Nouvelle notification`, description: msg });
          // broadcast to global listeners (GlobalAlert listens to this)
          try { window.dispatchEvent(new CustomEvent('global-alert', { detail: { level: 'info', message: msg } })); } catch (e) {}
        }
      }
      prevUnreadRef.current = unread;
    }, 15000);

    // also listen to external triggers to refresh immediately
    const onExternal = async () => { const items = await loadNotifications(); const unread = items ? items.filter((i:any)=>!i.lu).length : 0; if (unread > (prevUnreadRef.current || 0)) { const newest = items.filter((i:any)=>!i.lu).sort((a:any,b:any)=> new Date(b.createdat).getTime() - new Date(a.createdat).getTime())[0]; if (newest) { const msg = newest.titre + ' — ' + newest.message; toast({ title: `Nouvelle notification`, description: msg }); try { window.dispatchEvent(new CustomEvent('global-alert', { detail: { level: 'info', message: msg } })); } catch (e) {} } } prevUnreadRef.current = unread; };
    window.addEventListener('notifications-updated', onExternal as any);

    return () => { clearInterval(iv); window.removeEventListener('notifications-updated', onExternal as any); };
  }, []);

  const markRead = async (id:any) => {
    try {
      await api.notifications.markRead(String(id));
      await loadNotifications();
    } catch (e) {}
  };

  // Filter menu items based on user role
  const visibleMenuItems = menuItems.filter(item => 
    item.roles.includes((user?.role || 'EMPLOYE').toUpperCase())
  );

  return (
    <div className={cn(
      "bg-gradient-secondary text-white transition-all duration-300 flex flex-col",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
            <div className="bg-accent p-2 rounded-lg">
              <Building2 className="h-6 w-6 text-accent-foreground" />
            </div>
            {!isCollapsed && (
              <div>
                <h2 className="font-bold text-lg">RealTech</h2>
                <p className="text-xs text-white/70">Holding</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-white hover:bg-white/10 p-2"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* User Info (with notifications bell) */}
      {!isCollapsed && user && (
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">{user.prenom} {user.nom}</div>
            <div className="text-xs text-white/70">{user.role}</div>
          </div>

          <div className="relative">
            <Button variant="ghost" className="p-2 text-white/80 hover:bg-white/10" onClick={() => setNotifOpen(!notifOpen)}>
              <Bell className="h-5 w-5" />
              {unreadCount === -1 && <span className="ml-2 bg-red-800 animate-pulse text-white rounded-full px-2 text-xs">!</span>}
              {unreadCount > 0 && <span className="ml-2 bg-red-600 text-white rounded-full px-2 text-xs">{unreadCount}</span>}
            </Button>

            {notifOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                {/* backdrop */}
                <div className="absolute inset-0 bg-black/40" onClick={() => setNotifOpen(false)} />
                <div className="relative z-60 w-[min(720px,92%)] max-h-[80vh]">
                  <div className="overflow-hidden rounded-2xl shadow-2xl bg-white">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4 p-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
                      <div className="flex items-center gap-3">
                        <Bell className="h-5 w-5 opacity-90" />
                        <div>
                          <div className="text-lg font-semibold">Notifications</div>
                          <div className="text-xs opacity-80">{unreadCount > 0 ? `${unreadCount} non lue(s)` : 'A jour'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-sm text-white/90 hover:underline"
                          onClick={async () => {
                            try {
                              const unread = notifications.filter((i:any)=>!i.lu).map((i:any)=>i.id);
                              for (const id of unread) {
                                try { await api.notifications.markRead(String(id)); } catch (e) { /* continue */ }
                              }
                              await loadNotifications();
                            } catch (e) {}
                          }}
                        >
                          Marquer tout lu
                        </button>
                        <Button variant="ghost" className="text-white/90" onClick={() => setNotifOpen(false)}>Fermer</Button>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 bg-gray-50 max-h-[calc(80vh-72px)] overflow-auto space-y-3">
                      {notifications.length === 0 && (
                        <div className="text-center py-12 text-sm text-gray-500">Aucune notification</div>
                      )}

                      {notifications.map((n:any) => (
                        <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg ${n.lu ? 'bg-white border' : 'bg-white shadow-sm border'} `}>
                          <div className={`flex h-10 w-10 items-center justify-center rounded-md ${n.lu ? 'bg-gray-100' : 'bg-indigo-50'}`}>
                            <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-slate-900">{n.titre}</div>
                                <div className="text-sm text-slate-700 mt-1">{n.message}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xxs text-gray-400">{new Date(n.createdat).toLocaleString()}</div>
                                {!n.lu && (
                                  <button className="mt-2 inline-block text-sm text-indigo-600 hover:underline" onClick={() => markRead(n.id)}>Marquer lu</button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-12 text-left",
                isActive 
                  ? "bg-accent text-accent-foreground shadow-lg" 
                  : "text-white/80 hover:bg-white/10 hover:text-white",
                isCollapsed && "justify-center px-2"
              )}
              onClick={() => {
                // navigate by updating history so react-router can react to the path change
                const path = `/${item.id === 'dashboard' ? '' : item.id}`;
                window.history.pushState({}, '', path);
                window.dispatchEvent(new PopStateEvent('popstate'));
                if (onPageChange) onPageChange(item.id);
              }}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </Button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 space-y-2">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 h-12 text-white/80 hover:bg-white/10",
            isCollapsed && "justify-center px-2"
          )}
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Paramètres</span>}
        </Button>
        
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 h-12 text-white/80 hover:bg-red-500/20",
            isCollapsed && "justify-center px-2"
          )}
          onClick={logout}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Déconnexion</span>}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;