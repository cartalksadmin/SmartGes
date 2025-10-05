import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api, normalizeList } from '@/lib/apiClient';
import { Commande } from '@/types/api';
import { Search, Eye, FileText, Edit, CheckCircle, Plus, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import OrderDetail from '@/components/details/OrderDetail';
import OrderForm from '@/components/forms/OrderForm';

const Orders: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<Commande | null>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.commandes.list();
      const data = normalizeList<Commande>(res);
      setOrders(data);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Impossible de charger les commandes', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const getPaymentStatus = (order: Commande) => {
    const explicit = (order as any).statut_paiement;
    if (explicit) return String(explicit).toUpperCase();
    const paid = Number((order as any).montant_paye || 0);
    const total = Number((order as any).total_cmd || 0);
    if (paid <= 0) return 'NON_PAYEE';
    if (paid >= total) return 'PAYEE';
    return 'PARTIELLE';
  };

  const filtered = orders.filter(o => {
    // search
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      const match = (o.code || '').toLowerCase().includes(term) || (o.numero || '').toLowerCase().includes(term) || ((o.client && ((o.client.nom||'') + ' ' + (o.client.prenom||'')).toLowerCase().includes(term)));
      if (!match) return false;
    }
    // status filter
    const key = getPaymentStatus(o);
    if (statusFilter && statusFilter !== 'ALL' && String(key).toUpperCase() !== String(statusFilter).toUpperCase()) return false;
    // date range
    const created = (o as any).created_at || null;
    if (dateFrom) {
      if (!created || new Date(created) < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      if (!created) return false;
      const end = new Date(dateTo); end.setHours(23,59,59,999);
      if (new Date(created) > end) return false;
    }
    return true;
  });

  const grouped = filtered.reduce((acc: Record<string, Commande[]>, o) => {
    const k = getPaymentStatus(o);
    acc[k] = acc[k] || [];
    acc[k].push(o);
    return acc;
  }, {} as Record<string, Commande[]>);

  const getStatusBadge = (status: string): 'default' | 'secondary' | 'destructive' => {
    const map: Record<string, 'default' | 'secondary' | 'destructive'> = { PAYEE: 'default', PARTIELLE: 'secondary', NON_PAYEE: 'destructive' };
    return map[status] || 'secondary';
  };

  const getStatusLabel = (status: string) => ({ PAYEE: 'Payée', PARTIELLE: 'Partiellement payée', NON_PAYEE: 'Non payée' } as Record<string,string>)[status] || status;

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR') : 'N/A';

  const attemptDownloadInvoice = async (orderId: string) => {
    const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
    const base = `${API_BASE || ''}/api/commandes/${orderId}/invoice/download`;
    const inlineUrl = `${base}?inline=true`;
    const token = localStorage.getItem('accessToken') || '';
    const headers: Record<string,string> = { 'Accept': 'application/pdf' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Poll with HEAD to ensure file is present, then open inline in new tab and trigger download
    for (let i = 0; i < 6; i++) {
        try {
        const r = await fetch(base, { method: 'HEAD', headers });
        if (r.ok) {
          // open inline view in new tab
          try { window.open(inlineUrl, '_blank'); } catch (e) {}
          // fetch blob and trigger download
          try {
            const blobResp = await fetch(base, { headers });
            if (blobResp.ok) {
              const blob = await blobResp.blob();
              const urlBlob = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = urlBlob;
              const disp = blobResp.headers.get('content-disposition');
              let filename = `facture-${orderId}.pdf`;
              if (disp) {
                const m = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/.exec(disp);
                if (m) filename = decodeURIComponent(m[1] || m[2] || filename);
              }
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(urlBlob);
              toast({ title: 'Téléchargement', description: `La facture a été téléchargée dans votre dossier Téléchargements: ${filename}` });
              return;
            }
          } catch (e) {
            // ignore fetch/download errors and fallthrough to open tab only
          }
          return;
        }
      } catch (e) {
        // ignore and retry
      }
      await new Promise(r => setTimeout(r, 300 * (i + 1)));
    }

    // final attempt: open inline URL in new tab
    try { window.open(inlineUrl, '_blank'); } catch { }
  };

  const attemptDownloadReceipt = async (orderId: string) => {
    const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
    const base = `${API_BASE || ''}/api/commandes/${orderId}/receipt/download`;
    const inlineUrl = `${base}?inline=true`;
    const token = localStorage.getItem('accessToken') || '';
    const headers: Record<string,string> = { 'Accept': 'application/pdf' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Poll with HEAD to ensure file is present, then open inline in new tab and trigger download
    for (let i = 0; i < 8; i++) {
      try {
        const r = await fetch(base, { method: 'HEAD', headers });
        if (r.ok) {
          // open inline view in new tab
          try { window.open(inlineUrl, '_blank'); } catch (e) {}
          // fetch blob and trigger download
          try {
            const blobResp = await fetch(base, { headers });
            if (blobResp.ok) {
              const blob = await blobResp.blob();
              const urlBlob = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = urlBlob;
              const disp = blobResp.headers.get('content-disposition');
              let filename = `recu-${orderId}.pdf`;
              if (disp) {
                const m = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/.exec(disp);
                if (m) filename = decodeURIComponent(m[1] || m[2] || filename);
              }
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(urlBlob);
              toast({ title: 'Téléchargement', description: `Le reçu a été téléchargé: ${filename}` });
              return;
            }
          } catch (e) {
            // ignore fetch/download errors and fallthrough to open tab only
          }
          return;
        }
      } catch (e) {
        // ignore and retry
      }
      await new Promise(r => setTimeout(r, 300 * (i + 1)));
    }

    try { window.open(inlineUrl, '_blank'); } catch { }
  };

  const handleGenerateInvoice = async (orderId: string) => {
    try {
      setGeneratingInvoice(orderId);
      // trigger server-side generation
      await api.commandes.generateInvoice(orderId);
      // attempt to open inline and download to user's Downloads
      await attemptDownloadInvoice(orderId);
  // notify other UI parts that notifications may have changed (server created invoice/paiement notifications)
  try { window.dispatchEvent(new CustomEvent('notifications-updated')); } catch (e) {}
  toast({ title: 'Facture générée' });
      loadOrders();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || String(err), variant: 'destructive' });
    } finally {
      setGeneratingInvoice(null);
    }
  };

  const handlePay = async (order: Commande) => {
  try {
    const total = Number((order as any).total_cmd || 0);
    const paid = Number((order as any).montant_paye || 0);
    const remaining = Math.max(total - paid, 0);
    const html = `<div style="text-align:left"><label>Montant</label><input id="swal-montant" type="number" min="0" step="0.01" class="swal2-input" value="${remaining}" /><label>Type</label><select id="swal-statut" class="swal2-select"><option value="PAYEE">Payée</option><option value="PARTIELLE">Partielle</option></select></div>`;
    const res = await Swal.fire({ title: `Règlement ${order.code || order.numero || ''}`, html, focusConfirm: false, showCancelButton: true, preConfirm: () => {
      const m = (document.getElementById('swal-montant') as HTMLInputElement | null)?.value;
      const s = (document.getElementById('swal-statut') as HTMLSelectElement | null)?.value || 'PARTIELLE';
      const montant = m ? Number(m) : NaN;
      if (Number.isNaN(montant) || montant <= 0) { Swal.showValidationMessage('Montant invalide'); return null; }
      return { montant, statut: s };
    } });
    if (!res || !res.isConfirmed || !res.value) return;
    
    // ask for payment mode (cash, mobile_money, carte, cheque, virement)
    const { value: mode } = await Swal.fire({ 
      title: 'Mode de paiement', 
      input: 'select', 
      inputOptions: { cash: 'Cash', mobile_money: 'Mobile Money', carte: 'Carte', cheque: 'Chèque', virement: 'Virement' }, 
      inputValue: 'cash', 
      showCancelButton: true 
    });
    if (!mode) return;
    
    await api.commandes.pay(String(order.id), { 
      montant: Number(res.value.montant), 
      mode_paiement: mode, 
      statut_paiement: res.value.statut 
    });
    toast({ title: 'Paiement enregistré' });
    // notify UI (Sidebar will reload notifications)
    try { window.dispatchEvent(new CustomEvent('notifications-updated')); } catch (e) {}
    loadOrders();
    attemptDownloadInvoice(String(order.id));
    attemptDownloadReceipt(String(order.id));
  } catch (err: any) { 
    toast({ title: 'Erreur', description: err.message || String(err), variant: 'destructive' }); 
  }
};

  const handleEdit = async (order: Commande) => {
    try {
      const res: any = await api.commandes.get(order.id);
      const body = res.data || res;
      const cmd = body?.commande || body;
      const alreadyPaid = Number((cmd as any).montant_paye || 0);
      if (alreadyPaid > 0) { toast({ title: 'Impossible d\'éditer', description: 'La commande contient déjà un paiement', variant: 'destructive' }); return; }
      setFormInitial(cmd);
      setFormOpen(true);
    } catch (err: any) { toast({ title: 'Erreur', description: err.message || String(err), variant: 'destructive' }); }
  };

  const handleValidate = async (order: Commande) => {
    try { await api.commandes.update(order.id, { statut: 'CONFIRMEE' }); toast({ title: 'Commande validée' }); loadOrders(); } catch (err: any) { toast({ title: 'Erreur', description: err.message || String(err), variant: 'destructive' }); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  );

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Gestion des Commandes</h1>
          <p className="text-muted-foreground">Recherchez, filtrez et gérez les commandes</p>
        </div>
        <Button onClick={() => { setFormInitial(null); setFormOpen(true); }}><Plus className="h-4 w-4 mr-2"/>Nouvelle commande</Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recherche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher par numéro, code ou client..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
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
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Date fin</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => { setStatusFilter('ALL'); setDateFrom(''); setDateTo(''); setSearchTerm(''); }}>Effacer</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {['PAYEE','PARTIELLE','NON_PAYEE'].map(section => (
          grouped[section] && grouped[section].length > 0 ? (
            <div key={section}>
              <h2 className="text-lg font-semibold mb-2">{section === 'PAYEE' ? 'Commandes payées' : section === 'PARTIELLE' ? 'Commandes partiellement payées' : 'Commandes non payées'}</h2>
              <div className="space-y-4">
                {grouped[section].map(o => (
                  <Card key={o.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-xl text-primary">{o.code}</CardTitle>
                          <CardDescription className="flex items-center gap-4 text-sm">
                            <span>Numéro: {o.numero}</span>
                            <span>{formatDate((o as any).created_at)}</span>
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={getStatusBadge(section)}>{getStatusLabel(section)}</Badge>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">{(() => { const n = Number(o.total_cmd || 0); return `${n.toFixed(2)} FCFA`; })()}</div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          {o.client && <div className="text-sm text-muted-foreground">Client: {o.client.nom} {o.client.prenom}</div>}
                        </div>
                        <div className="flex gap-2">
                          {/* Valider: only when fully paid and EN_ATTENTE */}
                          {section === 'PAYEE' && o.statut === 'EN_ATTENTE' && (isAdmin || (o.utilisateur && String(o.utilisateur.id) === String(api.auth.getCurrentUser()?.id))) && (
                            <Button size="sm" variant="outline" onClick={() => handleValidate(o)}><CheckCircle className="h-4 w-4 mr-1"/>Valider</Button>
                          )}

                          <Button size="sm" variant="outline" onClick={() => handleGenerateInvoice(o.id)} disabled={generatingInvoice === o.id}><FileText className="h-4 w-4 mr-1"/>Facture</Button>

                          <Button size="sm" variant="outline" onClick={() => { setDetailId(String(o.id)); setDetailOpen(true); }}><Eye className="h-4 w-4 mr-1"/>Détails</Button>

                          {/* Edit only when no payment exists */}
                          {Number((o as any).montant_paye || 0) <= 0 && (
                            <Button size="sm" variant="outline" onClick={() => handleEdit(o)}><Edit className="h-4 w-4 mr-1"/>Editer</Button>
                          )}

                          {/* Règlement visible for NON_PAYEE and PARTIELLE */}
                          {(section === 'NON_PAYEE' || section === 'PARTIELLE') && (
                            <Button size="sm" variant="outline" onClick={() => handlePay(o)}>Règlement</Button>
                          )}
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

      <OrderDetail id={detailId} open={detailOpen} onOpenChange={setDetailOpen} />
      <OrderForm open={formOpen} onOpenChange={setFormOpen} initial={formInitial} onSaved={() => loadOrders()} />
    </div>
  );
};

export default Orders;