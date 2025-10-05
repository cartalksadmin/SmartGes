import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api, normalizeList } from '@/lib/apiClient';
import { Task } from '@/types/api';
import { 
  Plus, 
  Search, 
  CheckSquare, 
  Edit, 
  Trash2, 
  Eye,
  Calendar,
  User,
  Loader2,
  Clock
} from 'lucide-react';
import TaskDetail from '@/components/details/TaskDetail';
import { TaskForm } from '@/components/forms/TaskForm';

const Tasks = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    date_debut: '',
    date_fin: '',
    frequence: 'UNIQUE',
    importance: 'MOYENNE',
    statut: 'EN_ATTENTE'
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      let response;
      if (!isAdmin) {
        response = await api.tasks.my();
      } else {
        response = await api.tasks.list();
      }
      const tasksList = normalizeList<Task>(response);
      setTasks(tasksList);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger les tâches",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (taskId: string) => {
    try {
      await api.tasks.complete(taskId);
      toast({ title: 'Tâche marquée comme terminée' });
      loadTasks();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Impossible de marquer la tâche', variant: 'destructive' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const taskData = {
        nom: formData.nom,
        description: formData.description || '',
        date_debut: formData.date_debut,
        date_fin: formData.date_fin || undefined,
        frequence: formData.frequence,
        importance: formData.importance,
        statut: formData.statut,
        // Prefer assigneIds array. If none provided, set single assignee to current user
        assigneIds: user?.id ? [parseInt(user.id)] : [2]
      };

      if (editingTask) {
        await api.tasks.update(editingTask.id, taskData);
        toast({
          title: "Succès",
          description: "Tâche modifiée avec succès"
        });
      } else {
        await api.tasks.create(taskData);
        toast({
          title: "Succès",
          description: "Tâche créée avec succès"
        });
      }
      
      setIsDialogOpen(false);
      resetForm();
      loadTasks();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      nom: task.nom,
      description: task.description || '',
      date_debut: task.date_debut ? task.date_debut.split('T')[0] : '',
      date_fin: task.date_fin ? task.date_fin.split('T')[0] : '',
      frequence: task.frequence || 'UNIQUE',
      importance: task.importance || 'MOYENNE',
      statut: task.statut
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) return;
    
    try {
      await api.tasks.delete(id);
      toast({
        title: "Succès",
        description: "Tâche supprimée avec succès"
      });
      loadTasks();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer la tâche",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      description: '',
      date_debut: '',
      date_fin: '',
      frequence: 'UNIQUE',
      importance: 'MOYENNE',
      statut: 'EN_ATTENTE'
    });
    setEditingTask(null);
  };

  const filteredTasks = tasks.filter(task =>
    task.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants = {
      EN_ATTENTE: "secondary" as const,
      EN_COURS: "default" as const, 
      TERMINEE: "outline" as const,
      ANNULEE: "destructive" as const
    };
    return variants[status as keyof typeof variants] || "secondary" as const;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      EN_ATTENTE: "En attente",
      EN_COURS: "En cours", 
      TERMINEE: "Terminée",
      ANNULEE: "Annulée"
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getImportanceBadge = (importance?: string) => {
    const variants = {
      BASSE: "outline" as const,
      MOYENNE: "secondary" as const,
      HAUTE: "default" as const
    };
    return variants[importance as keyof typeof variants] || "secondary" as const;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

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
          <h1 className="text-3xl font-bold text-primary mb-2">Gestion des Tâches</h1>
          <p className="text-muted-foreground">
            Organisez et suivez vos tâches
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            {isAdmin && (
            <Button className="bg-gradient-primary hover:opacity-90" >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle tâche
            </Button>
            )}
          </DialogTrigger>
            <TaskForm
              open={isDialogOpen}
              onClose={() => { setIsDialogOpen(false); resetForm(); }}
              onSuccess={() => { setIsDialogOpen(false); resetForm(); loadTasks(); }}
              task={editingTask}
            />
        </Dialog>
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
              placeholder="Rechercher une tâche..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.map((task) => (
          <Card key={task.id} className="hover:shadow-lg transition-shadow animate-scale-in">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-xl text-primary">{task.nom}</CardTitle>
                  <CardDescription className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(task.date_debut)} - {formatDate(task.date_fin)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {task.frequence}
                    </span>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getImportanceBadge(task.importance)}>
                    {task.importance}
                  </Badge>
                  <Badge variant={getStatusBadge(task.statut)}>
                    {getStatusLabel(task.statut)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {task.description && (
                <p className="text-sm text-muted-foreground mb-4">{task.description}</p>
              )}
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {task.utilisateur && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {task.utilisateur.prenom} {task.utilisateur.nom}
                    </span>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setDetailId(task.id); setDetailOpen(true); }}>
                    <Eye className="h-4 w-4 mr-1" />
                    Détails
                  </Button>
                  {isAdmin ? (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(task)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    // employee actions: mark complete if not already
                    <>
                      <Button variant="outline" size="sm" onClick={() => { setDetailId(task.id); setDetailOpen(true); }}>
                        <Eye className="h-4 w-4 mr-1" />
                        Détails
                      </Button>
                      {!task.est_terminee && (
                        <Button variant="secondary" size="sm" onClick={() => handleComplete(task.id)}>
                          Marquer comme faite
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune tâche trouvée</h3>
            <p className="text-muted-foreground mb-4">
              Aucune tâche ne correspond à votre recherche
            </p>
            <Button variant="outline" onClick={() => setSearchTerm('')}>
              Effacer la recherche
            </Button>
          </CardContent>
        </Card>
      )}
      <TaskDetail id={detailId} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
};

export default Tasks;
