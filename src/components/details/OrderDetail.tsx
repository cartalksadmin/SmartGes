import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/apiClient';
import { Commande } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function OrderDetail({ id, open, onOpenChange }: { id: string | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [item, setItem] = useState<Commande | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !id) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res: any = await api.commandes.get(id as string);
        if (!mounted) return;
        let payload = res?.data ?? res ?? null;
        const unwrapPayload = (p: any) => {
          if (!p) return p;
          if (Array.isArray(p) && p.length === 1) return p[0];
          if (typeof p === 'object') {
            const keys = Object.keys(p || {});
            if (keys.length === 1) {
              const v = p[keys[0]];
              if (typeof v === 'object') return v;
            }
          }
          return p;
        };
        payload = unwrapPayload(payload);
        if (!payload) console.debug('OrderDetail: response payload empty', res);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Détails de la commande</DialogTitle>
        </DialogHeader>
        <Card>
          <CardHeader>
            <CardTitle>{item ? `${item.code || ''} ${item.numero || ''}` : 'Commande'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading && <div>Chargement...</div>}
              {!loading && !item && <div>Aucune commande trouvée</div>}
              {!loading && item && (
                <div className="grid grid-cols-1 gap-2">
                  <div className="text-sm text-muted-foreground">ID: {item.id}</div>
                  <div>Client: {item.client ? `${(item.client as any).prenom || ''} ${(item.client as any).nom || ''}` : 'N/A'}</div>
                  <div>Statut: {item.statut}</div>
                  <div>Total: {item.total_cmd}</div>
                  <div>Articles:</div>
                  <ul className="list-disc pl-6">
                    {item.items?.map((it: any) => (
                      <li key={it.id}>{it.nom} — {it.quantite} x {it.prix_unitaire} = {it.total}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
