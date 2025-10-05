import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/apiClient';
import { Product } from '@/types/api';

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product | null;
}

export function ProductForm({ open, onClose, onSuccess, product }: ProductFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    prix_unitaire: '',
    stock_actuel: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    if (product) {
      setFormData({
        nom: product.nom,
        description: product.description || '',
        prix_unitaire: product.prix_unitaire.toString(),
        stock_actuel: product.stock_actuel.toString(),
      });
    } else {
      setFormData({ nom: '', description: '', prix_unitaire: '', stock_actuel: '0' });
    }
  }, [product, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = {
        nom: formData.nom,
        description: formData.description,
        prix_unitaire: parseFloat(formData.prix_unitaire),
        stock_actuel: parseInt(formData.stock_actuel),
      };

      if (product) {
        await api.products.update(product.id, data);
        toast({ title: "Produit modifié avec succès" });
        try { window.dispatchEvent(new CustomEvent('notifications-updated')); } catch (e) {}
      } else {
        await api.products.create(data);
        toast({ title: "Produit créé avec succès" });
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? 'Modifier' : 'Nouveau'} Produit</DialogTitle>
          <DialogDescription>
            Remplissez les informations du produit
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
            <div className="space-y-2">
              <Label htmlFor="stock_actuel">Stock actuel *</Label>
              <Input
                id="stock_actuel"
                type="number"
                min="0"
                value={formData.stock_actuel}
                onChange={(e) => setFormData({ ...formData, stock_actuel: e.target.value })}
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
