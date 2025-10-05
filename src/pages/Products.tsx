import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, Package, Edit, Trash2, AlertTriangle, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api, normalizeList } from '@/lib/apiClient';
import { Product } from '@/types/api';
import { ProductForm } from '@/components/forms/ProductForm';
import ProductDetail from '@/components/details/ProductDetail';

const Products = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const response = await api.products.list();
      const data = normalizeList<Product>(response);
      setProducts(data);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger les produits",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleDelete = async () => {
    if (!productToDelete) return;
    
    try {
      await api.products.delete(productToDelete.id);
      toast({ title: "Produit supprimé avec succès" });
      loadProducts();
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredProducts = products.filter(product =>
    product.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: "Rupture", variant: "destructive" as const };
    if (stock < 5) return { label: "Stock faible", variant: "secondary" as const };
    return { label: "En stock", variant: "default" as const };
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Gestion des Produits</h1>
          <p className="text-muted-foreground">
            Gérez votre inventaire et catalogue produits
          </p>
        </div>
        {isAdmin && (
          <Button className="bg-gradient-primary hover:opacity-90" onClick={() => { setSelectedProduct(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un produit
          </Button>
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
              placeholder="Rechercher un produit..."
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
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product.stock_actuel);
            
            return (
              <Card key={product.id} className="hover:shadow-lg transition-shadow animate-scale-in">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{product.nom}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        ID: {product.id}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {!product.actif && (
                        <Badge variant="secondary">Inactif</Badge>
                      )}
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm font-medium">Prix unitaire</span>
                      <span className="text-lg font-bold text-primary">
                        {(() => {
                          const p = Number(product.prix_unitaire);
                          const val = Number.isFinite(p) ? p : 0;
                          return `${val.toFixed(2)} FCFA`;
                        })()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Stock</span>
                      <div className="flex items-center gap-2">
                        {product.stock_actuel < 5 && (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                        <span className="font-semibold">{product.stock_actuel}</span>
                        <Badge variant={stockStatus.variant}>
                          {stockStatus.label}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-2">
                    <div>
                      <Button variant="outline" size="sm" onClick={() => { setDetailId(product.id); setDetailOpen(true); }}>
                        <Eye className="h-4 w-4 mr-1" />
                        Voir
                      </Button>
                    </div>
                    {isAdmin ? (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedProduct(product); setFormOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => { setProductToDelete(product); setDeleteDialogOpen(true); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Seuls les admins peuvent modifier</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filteredProducts.length === 0 && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun produit trouvé</h3>
            <p className="text-muted-foreground mb-4">
              Aucun produit ne correspond à votre recherche
            </p>
            <Button variant="outline" onClick={() => setSearchTerm('')}>
              Effacer la recherche
            </Button>
          </CardContent>
        </Card>
      )}

      <ProductForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={loadProducts}
        product={selectedProduct}
      />

      <ProductDetail id={detailId} open={detailOpen} onOpenChange={setDetailOpen} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le produit {productToDelete?.nom} ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Products;
