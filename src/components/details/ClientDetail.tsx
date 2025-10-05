import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/apiClient';
import { Client } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ClientDetail({ id, open, onOpenChange }: { id: string | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !id) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res: any = await api.clients.get(id as string);
        if (!mounted) return;
        let payload = res?.data ?? res ?? null;
        // Unwrap single-key wrapper objects, e.g. { client: { ... } }
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
        if (!payload) console.debug('ClientDetail: response payload empty', res);
        setClient(payload || null);
      } catch (err) {
        if (!mounted) return;
        setClient(null);
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
          <DialogTitle>Détails du client</DialogTitle>
        </DialogHeader>
        <Card>
          <CardHeader>
            <CardTitle className="truncate">{client ? `${client.prenom || ''} ${client.nom || ''}` : 'Client'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading && <div>Chargement...</div>}
              {!loading && !client && <div>Aucun client trouvé</div>}
              {!loading && client && (
                <div className="grid grid-cols-1 gap-2">
                  <div className="text-sm text-muted-foreground">ID: {client.id}</div>
                  <div>Email: {client.email || 'N/A'}</div>
                  <div>Téléphone: {client.telephone || 'N/A'}</div>
                  <div>Actif: {client.actif ? 'Oui' : 'Non'}</div>
                  <div className="text-sm text-muted-foreground">Créé: {client.created_at || (client as any).createdAt || 'N/A'}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
                        
