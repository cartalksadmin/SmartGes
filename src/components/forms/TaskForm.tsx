import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/apiClient';
import { Task } from '@/types/api';

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  task?: Task | null;
}

export function TaskForm({ open, onClose, onSuccess, task }: TaskFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    date_debut: '',
    date_fin: '',
    frequence: 'UNIQUE',
    importance: 'MOYENNE',
    // selected assignee ids
    assigneIds: [] as number[],
  });
  const { toast } = useToast();

  useEffect(() => {
    if (task) {
      setFormData({
        nom: task.nom,
        description: task.description || '',
        date_debut: task.date_debut?.split('T')[0] || '',
        date_fin: task.date_fin?.split('T')[0] || '',
        frequence: task.frequence || 'UNIQUE',
        importance: task.importance || 'MOYENNE',
        assigneIds: task.assignments ? task.assignments.map((a: any) => Number(a.utilisateur_id)) : (task.utilisateur ? [Number(task.utilisateur.id)] : []),
      });
    } else {
      setFormData({
        nom: '',
        description: '',
        date_debut: new Date().toISOString().split('T')[0],
        date_fin: '',
        frequence: 'UNIQUE',
        importance: 'MOYENNE',
        assigneIds: [],
      });
    }
  }, [task, open]);

  const [employees, setEmployees] = useState<{ id: number; nom: string; prenom: string }[]>([]);

  useEffect(() => {
    // load employees for multi-select
    let mounted = true;
    (async () => {
      try {
        const res = await api.users.list();
        const list = res?.data?.users || res?.data || [];
        if (!mounted) return;
        setEmployees(list.map((u: any) => ({ id: Number(u.id), nom: u.nom, prenom: u.prenom })));
      } catch (err) {
        // ignore; UI can still work if employees not loaded
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = {
        nom: formData.nom,
        description: formData.description,
        date_debut: formData.date_debut,
        date_fin: formData.date_fin || undefined,
        frequence: formData.frequence,
        importance: formData.importance,
        // send assigneIds as array of numbers if provided
        assigneIds: (formData.assigneIds && formData.assigneIds.length > 0) ? formData.assigneIds : undefined,
      };

      if (task) {
        await api.tasks.update(task.id, data);
        toast({ title: "Tâche modifiée avec succès" });
        try { window.dispatchEvent(new CustomEvent('notifications-updated')); } catch (e) {}
      } else {
        await api.tasks.create(data);
        toast({ title: "Tâche créée avec succès" });
        try { window.dispatchEvent(new CustomEvent('notifications-updated')); } catch (e) {}
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? 'Modifier' : 'Nouvelle'} Tâche</DialogTitle>
          <DialogDescription>
            Remplissez les informations de la tâche
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_debut">Date début *</Label>
                <Input
                  id="date_debut"
                  type="date"
                  value={formData.date_debut}
                  onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_fin">Date fin</Label>
                <Input
                  id="date_fin"
                  type="date"
                  value={formData.date_fin}
                  onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="frequence">Fréquence</Label>
                <Select value={formData.frequence} onValueChange={(value) => setFormData({ ...formData, frequence: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNIQUE">Unique</SelectItem>
                    <SelectItem value="QUOTIDIENNE">Quotidienne</SelectItem>
                    <SelectItem value="HEBDOMADAIRE">Hebdomadaire</SelectItem>
                    <SelectItem value="MENSUELLE">Mensuelle</SelectItem>
                    <SelectItem value="TRIMESTRIELLE">Trimestrielle</SelectItem>
                    <SelectItem value="ANNUELLE">Annuelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="importance">Importance</Label>
                <Select value={formData.importance} onValueChange={(value) => setFormData({ ...formData, importance: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BASSE">Basse</SelectItem>
                    <SelectItem value="MOYENNE">Moyenne</SelectItem>
                    <SelectItem value="HAUTE">Haute</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="utilisateur_id">ID Utilisateur assigné *</Label>
              <select
                id="assigneIds"
                multiple
                value={formData.assigneIds.map(String)}
                onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions).map(o => Number(o.value));
                  setFormData({ ...formData, assigneIds: opts });
                }}
                className="w-full border rounded p-2"
                required
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.prenom} {emp.nom} (#{emp.id})</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
