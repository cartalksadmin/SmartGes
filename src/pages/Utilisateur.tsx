import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api, normalizeList } from '@/lib/apiClient';
import { User } from '@/types/api';
import { Plus, Search, Users as UsersIcon, Edit, Trash2, Eye } from 'lucide-react';

const Utilisateur = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', telephone: '', role: 'EMPLOYE', password: '', actif: true });
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.users.list();
      const data = normalizeList<User>(res);
      setUsers(data);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message || 'Impossible de charger les utilisateurs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const openCreate = () => {
    if (!isAdmin) {
      toast({ title: 'Accès refusé', description: 'Seuls les administrateurs peuvent créer des utilisateurs', variant: 'destructive' });
      return;
    }
    setEditingUser(null);
    setForm({ nom: '', prenom: '', email: '', telephone: '', role: 'EMPLOYE', password: '', actif: true });
    setDialogOpen(true);
  };

  const openEdit = (u: User) => {
    if (!isAdmin) {
      toast({ title: 'Accès refusé', description: 'Seuls les administrateurs peuvent modifier des utilisateurs', variant: 'destructive' });
      return;
    }
    setEditingUser(u);
    setForm({ nom: u.nom, prenom: u.prenom, email: u.email || '', telephone: u.telephone || '', role: u.role || 'EMPLOYE', password: '', actif: !!u.actif });
    setDialogOpen(true);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      if (!isAdmin) throw new Error('Accès refusé');
      if (editingUser) {
        await api.users.update(editingUser.id, { nom: form.nom, prenom: form.prenom, email: form.email, telephone: form.telephone, role: form.role, actif: form.actif });
        toast({ title: 'Utilisateur modifié' });
      } else {
        await api.users.create({ nom: form.nom, prenom: form.prenom, email: form.email, telephone: form.telephone, role: form.role, password: form.password, actif: form.actif });
        toast({ title: 'Utilisateur créé' });
      }
      setDialogOpen(false);
      loadUsers();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message || 'Erreur', variant: 'destructive' });
    }
  };

  const handleDelete = async (u: User) => {
    if (!isAdmin) { toast({ title: 'Accès refusé', description: 'Seuls les administrateurs peuvent supprimer', variant: 'destructive' }); return; }
    if (!confirm(`Supprimer ${u.prenom} ${u.nom} ?`)) return;
    try {
      await api.users.delete(u.id);
      toast({ title: 'Utilisateur supprimé' });
      loadUsers();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message || 'Impossible de supprimer', variant: 'destructive' });
    }
  };

  const filtered = users.filter(u => `${u.prenom} ${u.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Utilisateurs</h1>
          <p className="text-muted-foreground">Gérez les comptes utilisateurs et rôles</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Button className="bg-gradient-primary" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvel utilisateur
            </Button>
          )}
          <Button variant="ghost" onClick={() => loadUsers()}>Rafraîchir</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recherche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un utilisateur..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(u => (
          <Card key={u.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{u.prenom} {u.nom}</CardTitle>
                  <CardDescription className="text-sm">{u.email}</CardDescription>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{u.role}</div>
                  {typeof u.actif !== 'undefined' && <Badge variant={u.actif ? 'default' : 'secondary'}>{u.actif ? 'Actif' : 'Inactif'}</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">Tel: {u.telephone || 'N/A'}</div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingUser(u); setForm({ nom: u.nom, prenom: u.prenom, email: u.email || '', telephone: u.telephone || '', role: u.role || 'EMPLOYE', password: '', actif: !!u.actif }); setDialogOpen(true); }}>
                    <Eye className="h-4 w-4 mr-1" /> Voir
                  </Button>
                  {isAdmin && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => openEdit(u)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(u)}><Trash2 className="h-4 w-4" /></Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog for create/edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Modifier utilisateur' : 'Nouveau utilisateur'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4 py-4">
            <div>
              <Label>Prénom</Label>
              <Input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required />
            </div>
            <div>
              <Label>Nom</Label>
              <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
            </div>
            <div>
              <Label>Rôle</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Rôle" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                  <SelectItem value="EMPLOYE">EMPLOYE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!editingUser && (
              <div>
                <Label>Mot de passe</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
            )}
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={form.actif} onChange={(e) => setForm({ ...form, actif: e.target.checked })} id="actif" />
              <Label htmlFor="actif">Actif</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit">{editingUser ? 'Enregistrer' : 'Créer'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Utilisateur;
