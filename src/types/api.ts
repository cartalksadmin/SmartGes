export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  role: 'ADMIN' | 'EMPLOYE';
  actif: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Client {
  id: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  // Some backends use `actif`, others may not. Keep optional.
  actif?: boolean;
  // Support both snake_case and camelCase timestamps depending on backend
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  nom: string;
  description?: string;
  prix_unitaire: number;
  stock_actuel: number;
  actif: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Service {
  id: string;
  nom: string;
  description?: string;
  prix_unitaire: number;
  actif: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Commande {
  id: string;
  code: string;
  numero: string;
  client_id?: string;
  utilisateur_id: string;
  total_cmd: number;
  statut: 'EN_ATTENTE' | 'VALIDE' | 'TERMINEE' | 'ANNULEE';
  created_at?: string;
  updated_at?: string;
  client?: Client;
  utilisateur?: User;
  items?: CommandeItem[];
}

export interface CommandeItem {
  id: string;
  commande_id: string;
  produit_id?: string;
  service_id?: string;
  nom: string;
  quantite: number;
  prix_unitaire: number;
  total: number;
}

export interface Vente {
  id: string;
  code: string;
  numero: string;
  commande_id?: string;
  utilisateur_id: string;
  montant: number;
  statut: 'PAYEE' | 'PARTIELLEMENT_PAYEE' | 'EN_ATTENTE';
  created_at?: string;
  updated_at?: string;
  commande?: Commande;
  utilisateur?: User;
  recu?: Recu;
}

export interface Recu {
  id: string;
  vente_id: string;
  code: string;
  numero: string;
  fichier: string;
  created_at?: string;
}

export interface Task {
  id: string;
  nom: string;
  description?: string;
  utilisateur_id?: string;
  date_debut?: string;
  date_fin?: string;
  frequence?: 'UNIQUE' | 'QUOTIDIENNE' | 'HEBDOMADAIRE' | 'MENSUELLE' | 'TRIMESTRIELLE' | 'ANNUELLE';
  importance?: 'BASSE' | 'MOYENNE' | 'HAUTE';
  statut: 'EN_ATTENTE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
  created_at?: string;
  updated_at?: string;
  utilisateur?: User;
}

export interface DashboardStats {
  totalRevenue?: number;
  totalOrders?: number;
  totalClients?: number;
  totalProducts?: number;
  // number of employees (computed client-side from users endpoint)
  totalEmployees?: number;
  revenueChange?: string;
  ordersChange?: string;
  clientsChange?: string;
  productsChange?: string;
  monthlyRevenueSeries?: Array<{ month: string; total: number }>;
}

export interface TopProduct {
  id: string;
  nom: string;
  total_vendu: number;
  quantite_totale: number;
}

export interface RecentActivity {
  id: string;
  type: string;
  description: string;
  created_at: string;
  user?: string;
}
