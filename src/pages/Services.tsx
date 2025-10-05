import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api, normalizeList } from '@/lib/apiClient';
import { Service } from '@/types/api';
import { 
  Plus, 
  Search, 
  Wrench, 
  Edit, 
  Trash2, 
  Eye,
  Loader2
} from 'lucide-react';

const Services = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    prix_unitaire: '',
    actif: true
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await api.services.list();
      const servicesList = normalizeList<Service>(response);
      setServices(servicesList);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger les services",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const serviceData = {
        nom: formData.nom,
        description: formData.description || '',
        prix_unitaire: parseFloat(formData.prix_unitaire),
        actif: formData.actif
      };

      if (editingService) {
        await api.services.update(editingService.id, serviceData);
        toast({
          title: "Succès",
          description: "Service modifié avec succès"
        });
      } else {
        await api.services.create(serviceData);
        toast({
          title: "Succès",
          description: "Service créé avec succès"
        });
      }
      
      setIsDialogOpen(false);
      resetForm();
      loadServices();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      nom: service.nom,
      description: service.description || '',
      prix_unitaire: String(Number(service.prix_unitaire) || ''),
      actif: service.actif
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) return;
    
    try {
      await api.services.delete(id);
      toast({
        title: "Succès",
        description: "Service supprimé avec succès"
      });
      loadServices();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le service",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      description: '',
      prix_unitaire: '',
      actif: true
    });
    setEditingService(null);
  };

  const filteredServices = services.filter(service =>
    service.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Gestion des Services</h1>
          <p className="text-muted-foreground">
            Gérez votre catalogue de services
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau service
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingService ? 'Modifier' : 'Nouveau'} Service</DialogTitle>
                <DialogDescription>
                  {editingService ? 'Modifiez les informations du service' : 'Ajoutez un nouveau service à votre catalogue'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nom">Nom du service *</Label>
                  <Input
                    id="nom"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="prix_unitaire">Prix unitaire (F CFA) *</Label>
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
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="actif"
                    checked={formData.actif}
                    onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="actif">Service actif</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}>
                    Annuler
                  </Button>
                  <Button type="submit">
                    {editingService ? 'Modifier' : 'Créer'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recherche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service) => (
          <Card key={service.id} className="hover:shadow-lg transition-shadow animate-scale-in">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">{service.nom}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {!service.actif && (
                    <Badge variant="secondary">Inactif</Badge>
                  )}
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Wrench className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {service.description || 'Aucune description'}
              </p>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium">Prix unitaire</span>
                  <span className="text-lg font-bold text-primary">
                    {(() => {
                      const p = Number(service.prix_unitaire);
                      const val = Number.isFinite(p) ? p : 0;
                      return `F CFA ${val.toFixed(2)}`;
                    })()}
                  </span>
                </div>
              </div>
              
              {isAdmin && (
                <div className="flex justify-between pt-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    Voir
                  </Button>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(service)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(service.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun service trouvé</h3>
            <p className="text-muted-foreground mb-4">
              Aucun service ne correspond à votre recherche
            </p>
            <Button variant="outline" onClick={() => setSearchTerm('')}>
              Effacer la recherche
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Services;
