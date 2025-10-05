import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/apiClient';
import { Service } from '@/types/api';

interface ServiceFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  service?: Service | null;
}

export function ServiceForm({ open, onClose, onSuccess, service }: ServiceFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    prix_unitaire: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    if (service) {
      setFormData({
        nom: service.nom,
        description: service.description || '',
        prix_unitaire: service.prix_unitaire.toString(),
      });
    } else {
      setFormData({ nom: '', description: '', prix_unitaire: '' });
    }
  }, [service, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = {
        nom: formData.nom,
        description: formData.description,
        prix_unitaire: parseFloat(formData.prix_unitaire),
      };

      if (service) {
        await api.services.update(service.id, data);
        toast({ title: "Service modifié avec succès" });
      } else {
        await api.services.create(data);
        toast({ title: "Service créé avec succès" });
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{service ? 'Modifier' : 'Nouveau'} Service</DialogTitle>
          <DialogDescription>
            Remplissez les informations du service
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
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
            <div className="space-y-2">
              <Label htmlFor="prix_unitaire">Prix unitaire *</Label>
              <Input
                id="prix_unitaire"
                type="number"
                step="0.01"
                min="0"
                value={formData.prix_unitaire}
                onChange={(e) => setFormData({ ...formData, prix_unitaire: e.target.value })}
                required
              />
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
