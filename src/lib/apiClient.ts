const API_BASE = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

// Normalize list responses from various formats
export function normalizeList<T>(body: any): T[] {
  if (!body) return [];
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.data)) return body.data;
  if (body.data && typeof body.data === 'object') {
    // Check for nested arrays like body.data.clients, body.data.products, etc.
    const keys = Object.keys(body.data);
    for (const key of keys) {
      if (Array.isArray(body.data[key])) {
        return body.data[key];
      }
    }
  }
  // Check top-level properties
  const keys = Object.keys(body);
  for (const key of keys) {
    if (Array.isArray(body[key])) {
      return body[key];
    }
  }
  return [];
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('accessToken') || '';
  
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...(options.headers || {}),
    },
  });

  let body: any;
  try {
    body = await res.json();
  } catch {
    body = {};
  }

  // Handle 401 - unauthorized
  if (res.status === 401) {
    // Clear tokens and redirect to login
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expirée. Veuillez vous reconnecter.');
  }

  if (!res.ok) {
    const raw = body;
    // Normalize error message to a string so Error.message isn't "[object Object]"
    let errorMessage: string;
    if (body == null) {
      errorMessage = `Erreur HTTP ${res.status}`;
    } else if (typeof body === 'string') {
      errorMessage = body;
    } else if (typeof body === 'object') {
      // Prefer common fields
      errorMessage = String(body.error || body.message || JSON.stringify(body));
    } else {
      errorMessage = String(body);
    }

    try {
      // Broadcast a global alert event with both a readable message and raw payload
      const ev = new CustomEvent('global-alert', { detail: { level: 'error', message: errorMessage, raw } });
      window.dispatchEvent(ev);
    } catch (e) {
      // ignore in non-browser environments
    }

    // Throw an Error whose message is a string (not an object)
    throw new Error(errorMessage);
  }

  return body as T;
}

// API methods
export const api = {
  // Auth
  auth: {
    login: async (email: string, password: string) => {
      const res = await apiFetch<any>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      
      // Backend returns tokens directly at root level
      const token = res.accessToken;
      const refreshToken = res.refreshToken;
      const user = res.user;

      if (token) {
        localStorage.setItem('accessToken', token);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        if (user) localStorage.setItem('user', JSON.stringify(user));
      }

      return res;
    },

    logout: () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    },

    getCurrentUser: () => {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    },
  },

  // Dashboard
  dashboard: {
    getStats: () => apiFetch<ApiResponse>('/api/dashboard/stats'),
    getTopProducts: () => apiFetch<ApiResponse>('/api/dashboard/top-products'),
    getRecentActivity: () => apiFetch<ApiResponse>('/api/dashboard/recent-activity'),
  },

  // Clients
  clients: {
    list: () => apiFetch<ApiResponse>('/api/clients'),
    get: (id: string) => apiFetch<ApiResponse>(`/api/clients/${id}`),
    create: (data: any) => apiFetch<ApiResponse>('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => apiFetch<ApiResponse>(`/api/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => apiFetch<ApiResponse>(`/api/clients/${id}`, {
      method: 'DELETE',
    }),
  },

  // Products
  products: {
    list: () => apiFetch<ApiResponse>('/api/produits'),
    get: (id: string) => apiFetch<ApiResponse>(`/api/produits/${id}`),
    create: (data: any) => apiFetch<ApiResponse>('/api/produits', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => apiFetch<ApiResponse>(`/api/produits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => apiFetch<ApiResponse>(`/api/produits/${id}`, {
      method: 'DELETE',
    }),
  },

  // Services
  services: {
    list: () => apiFetch<ApiResponse>('/api/services'),
    get: (id: string) => apiFetch<ApiResponse>(`/api/services/${id}`),
    create: (data: any) => apiFetch<ApiResponse>('/api/services', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => apiFetch<ApiResponse>(`/api/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => apiFetch<ApiResponse>(`/api/services/${id}`, {
      method: 'DELETE',
    }),
  },

  // Commandes
  commandes: {
    list: () => apiFetch<ApiResponse>('/api/commandes'),
    get: (id: string) => apiFetch<ApiResponse>(`/api/commandes/${id}`),
    create: (data: any) => apiFetch<ApiResponse>('/api/commandes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => apiFetch<ApiResponse>(`/api/commandes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    validate: (id: string) => apiFetch<ApiResponse>(`/api/commandes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ statut: 'VALIDE' }),
    }),
    delete: (id: string) => apiFetch<ApiResponse>(`/api/commandes/${id}`, {
      method: 'DELETE',
    }),
    generateInvoice: (id: string) => apiFetch<ApiResponse>(`/api/commandes/${id}/invoice`, {
      method: 'POST',
    }),
  pay: (id: string, data: { montant: number; statut_paiement: string; methode?: string; mode_paiement?: string }) => apiFetch<ApiResponse>(`/api/commandes/${id}/paiement`, { method: 'POST', body: JSON.stringify(data) }),
    produits: {
      add: (commandeId: string, data: { produitId: string; quantite: number }) => apiFetch<ApiResponse>(`/api/commandes/${commandeId}/produits`, { method: 'POST', body: JSON.stringify(data) }),
      update: (commandeId: string, itemId: string, data: any) => apiFetch<ApiResponse>(`/api/commandes/${commandeId}/produits/${itemId}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (commandeId: string, itemId: string) => apiFetch<ApiResponse>(`/api/commandes/${commandeId}/produits/${itemId}`, { method: 'DELETE' }),
    },
    services: {
      add: (commandeId: string, data: { serviceId: string; quantite: number }) => apiFetch<ApiResponse>(`/api/commandes/${commandeId}/services`, { method: 'POST', body: JSON.stringify(data) }),
      update: (commandeId: string, itemId: string, data: any) => apiFetch<ApiResponse>(`/api/commandes/${commandeId}/services/${itemId}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (commandeId: string, itemId: string) => apiFetch<ApiResponse>(`/api/commandes/${commandeId}/services/${itemId}`, { method: 'DELETE' }),
    },
  },

  // Ventes
  ventes: {
    list: () => apiFetch<ApiResponse>('/api/ventes'),
    get: (id: string) => apiFetch<ApiResponse>(`/api/ventes/${id}`),
    create: (data: {
      commandeId?: string;
      montant: number;
      statut: string;
      items: Array<{
        produit_id?: string;
        service_id?: string;
        nom: string;
        quantite: number;
        prix_unitaire: number;
        total: number;
      }>;
    }) => apiFetch<ApiResponse>('/api/ventes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => apiFetch<ApiResponse>(`/api/ventes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  },

  // Users (employees)
  users: {
    list: () => apiFetch<ApiResponse>('/api/users'),
    get: (id: string) => apiFetch<ApiResponse>(`/api/users/${id}`),
    create: (data: any) => apiFetch<ApiResponse>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => apiFetch<ApiResponse>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => apiFetch<ApiResponse>(`/api/users/${id}`, {
      method: 'DELETE',
    }),
  },

  // Tasks
  tasks: {
    list: () => apiFetch<ApiResponse>('/api/taches'),
    my: () => apiFetch<ApiResponse>('/api/taches/my'),
    get: (id: string) => apiFetch<ApiResponse>(`/api/taches/${id}`),
    create: (data: any) => apiFetch<ApiResponse>('/api/taches', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => apiFetch<ApiResponse>(`/api/taches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => apiFetch<ApiResponse>(`/api/taches/${id}`, {
      method: 'DELETE',
    }),
    complete: (id: string) => apiFetch<ApiResponse>(`/api/taches/${id}/complete`, {
      method: 'POST',
    }),
  },

  // Notifications (simple wrappers)
  notifications: {
    list: (limit = 10) => apiFetch<ApiResponse>(`/api/notifications?limit=${limit}`),
    markRead: (id: string) => apiFetch<ApiResponse>(`/api/notifications/${id}/read`, { method: 'POST' }),
  },

  // Settings
  settings: {
    uploadLogo: (data: { base64: string }) => apiFetch<ApiResponse>('/api/settings/logo', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },
  // Inventory / stock movements
  inventaire: {
    list: (params?: any) => {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
      return apiFetch<ApiResponse>(`/api/inventaire${qs}`);
    },
    create: (data: any) => apiFetch<ApiResponse>('/api/inventaire', { method: 'POST', body: JSON.stringify(data) }),
  },
};
