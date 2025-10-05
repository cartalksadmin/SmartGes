import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Users, Edit, Trash2, Phone, Mail, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api, normalizeList } from '@/lib/apiClient';
import { Client } from '@/types/api';
import { ClientForm } from '@/components/forms/ClientForm';
import ClientDetail from '@/components/details/ClientDetail';

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const { toast } = useToast();
  const { isAdmin, user, role } = useAuth();

  const loadClients = async () => {
    try {
      setIsLoading(true);
      const response = await api.clients.list();
      const data = normalizeList<Client>(response);
      setClients(data);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de charger les clients',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleDelete = async () => {
    if (!clientToDelete || !isAdmin) {
      toast({
        title: 'Erreur',
        description: 'Seuls les administrateurs peuvent supprimer des clients.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await api.clients.delete(clientToDelete.id);
      toast({ title: 'Client supprimé avec succès' });
      loadClients();
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la suppression du client',
        variant: 'destructive',
      });
    }
  };

  const openDeleteDialog = (client: Client) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const openEditForm = (client: Client) => {
    if (!isAdmin) {
      toast({
        title: 'Erreur',
        description: 'Seuls les administrateurs peuvent modifier des clients.',
        variant: 'destructive',
      });
      return;
    }
    setSelectedClient(client);
    setFormOpen(true);
  };

  const openDetail = (client: Client) => {
    setDetailId(client.id);
    setDetailOpen(true);
  };

  const openCreateForm = () => {
    if (!isAdmin) {
      toast({
        title: 'Erreur',
        description: 'Seuls les administrateurs peuvent créer des clients.',
        variant: 'destructive',
      });
      return;
    }
    setSelectedClient(null);
    setFormOpen(true);
  };

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const filteredClients = clients.filter(
    (client) =>
      client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (nom: string, prenom: string) => {
    return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Gestion des Clients</h1>
          <p className="text-muted-foreground">
            Gérez vos relations clients et historique des commandes
          </p>
          {user && (
            <div className="mt-2 text-sm text-muted-foreground">Connecté en tant que <span className="font-medium">{user.prenom} {user.nom}</span> (<span className="uppercase">{role}</span>)</div>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <Button className="bg-gradient-primary hover:opacity-90" onClick={openCreateForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau client
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                if (!isAdmin) {
                  toast({
                    title: 'Erreur',
                    description: 'Seuls les administrateurs peuvent créer des clients.',
                    variant: 'destructive',
                  });
                  return;
                }
                const payload = {
                  nom: 'DIANKA',
                  prenom: 'Seydou',
                  email: 'seydou.dianka@example.com',
                  telephone: '78836863',
                };
                try {
                  await api.clients.create(payload);
                  toast({ title: 'Client exemple créé' });
                  loadClients();
                } catch (err: any) {
                  toast({
                    title: 'Erreur',
                    description: err?.message || 'Impossible de créer le client',
                    variant: 'destructive',
                  });
                }
              }}
            >
              Créer exemple
            </Button>
            <Button variant="ghost" onClick={() => loadClients()}>
              Rafraîchir
            </Button>
          </div>
        )}
        {!isAdmin && (
          <div className="text-sm text-muted-foreground">Les actions de création / modification / suppression sont réservées aux administrateurs.</div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recherche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12">Chargement...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-lg transition-shadow animate-scale-in">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(client.nom, client.prenom)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {client.prenom} {client.nom}
                      </CardTitle>
                      <CardDescription>ID: {client.id}</CardDescription>
                      {(client.createdAt || client.created_at) && (
                        <div className="text-xs text-muted-foreground">
                          Créé: {new Date(client.createdAt || client.created_at || '').toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  {typeof client.actif !== 'undefined' && (
                    <Badge variant={client.actif ? 'default' : 'secondary'}>
                      {client.actif ? 'Actif' : 'Inactif'}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {client.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.telephone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{client.telephone}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => openDetail(client)} aria-label="Voir détails">
                    <Eye className="h-4 w-4" />
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditForm(client)}
                        aria-label="Modifier client"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => openDeleteDialog(client)}
                        aria-label="Supprimer client"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredClients.length === 0 && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun client trouvé</h3>
            <p className="text-muted-foreground mb-4">
              Aucun client ne correspond à votre recherche
            </p>
            <Button variant="outline" onClick={() => setSearchTerm('')}>
              Effacer la recherche
            </Button>
          </CardContent>
        </Card>
      )}

      <ClientForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={loadClients}
        client={selectedClient}
      />

      <ClientDetail id={detailId} open={detailOpen} onOpenChange={setDetailOpen} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le client {clientToDelete?.prenom} {clientToDelete?.nom} ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Clients;