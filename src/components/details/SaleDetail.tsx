import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/apiClient';
import { Vente } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SaleDetail({ id, open, onOpenChange }: { id: string | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [item, setItem] = useState<Vente | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !id) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res: any = await api.ventes.get(id as string);
        if (!mounted) return;
        // Normalize common API shapes: { data: {...} } or { success: true, data: { vente: {...} } }
        let payload = res?.data ?? res ?? null;
        if (payload && payload.success && payload.data) payload = payload.data;
        if (payload && payload.vente) payload = payload.vente;
        if (Array.isArray(payload) && payload.length === 1) payload = payload[0];
  if (!payload) console.debug('SaleDetail: response payload empty', res);
  // normalize statut_paiement values to known set
  if (payload && (payload as any).statut_paiement) {
    const s = String((payload as any).statut_paiement).toUpperCase();
    if (s === 'PAID' || s === 'PARTIELLE' || s === 'PAYEE') {
      (payload as any).statut_paiement = s;
    }
  }
  setItem(payload || null);
      } catch (err) {
        if (!mounted) return;
        setItem(null);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [open, id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Détails de la vente</DialogTitle>
        </DialogHeader>
        <Card>
          <CardHeader>
            <CardTitle>{item ? `${item.code || ''} ${item.numero || ''}` : 'Vente'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading && <div>Chargement...</div>}
              {!loading && !item && <div>Aucune vente trouvée</div>}
              {!loading && item && (
                <div className="grid grid-cols-1 gap-2">
                  <div className="text-sm text-muted-foreground">ID: {item.id}</div>
                  <div>Montant: {item.montant}</div>
                  <div>Statut: {item.statut}</div>
                  <div>Commande: {item.commande ? (item.commande as any).code : 'N/A'}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
