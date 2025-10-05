import Sidebar from '@/components/layout/Sidebar';
import GlobalAlert from '@/components/GlobalAlert';
import Dashboard from './Dashboard';
import Products from './Products';
import Clients from './Clients';
import Orders from './Orders';
import Services from './Services';
import Inventory from './Inventory';
import Utilisateur from './Utilisateur';
import Sales from './Sales';
import Tasks from './Tasks';
import Settings from './Settings';
import Reports from './Reports';
import { Routes, Route, Navigate } from 'react-router-dom';

const MainApp = () => {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto custom-scrollbar">
        <GlobalAlert />
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="clients" element={<Clients />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="orders" element={<Orders />} />
          <Route path="services" element={<Services />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="users" element={<Utilisateur />} />
          <Route path="sales" element={<Sales />} />
          <Route path="tasks" element={<Tasks />} />
          {/* fallback to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default MainApp;