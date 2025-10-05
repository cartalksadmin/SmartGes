import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/apiClient';
import { Task } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TaskDetail({ id, open, onOpenChange }: { id: string | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [item, setItem] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !id) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res: any = await api.tasks.get(id as string);
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
        if (!payload) console.debug('TaskDetail: response payload empty', res);
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
          <DialogTitle>Détails de la tâche</DialogTitle>
        </DialogHeader>
        <Card>
          <CardHeader>
            <CardTitle>{item ? item.nom : 'Tâche'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading && <div>Chargement...</div>}
              {!loading && !item && <div>Aucune tâche trouvée</div>}
              {!loading && item && (
                <div className="grid grid-cols-1 gap-2">
                  <div className="text-sm text-muted-foreground">ID: {item.id}</div>
                  <div>Description: {item.description || 'N/A'}</div>
                  <div>Date début: {item.date_debut || 'N/A'}</div>
                  <div>Date fin: {item.date_fin || 'N/A'}</div>
                  <div>Importance: {item.importance || 'N/A'}</div>
                  <div>Statut: {item.statut}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
