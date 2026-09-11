import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventario from './pages/Inventario';
import Clientes from './pages/Clientes';
import Proveedores from './pages/Proveedores';
import OrdenesCompra from './pages/OrdenesCompra';
import TasaCambio from './pages/TasaCambio';
import Usuarios from './pages/Usuarios';
import HistorialFacturas from './pages/HistorialFacturas';
import Reportes from './pages/Reportes';

function AppRoutes() {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Cargando DJ7 System...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      
      <Route element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/clientes" element={<Clientes />} />
        
        {/* Admin-only routes */}
        <Route path="/reportes" element={
          <ProtectedRoute requiereAdmin><Reportes /></ProtectedRoute>
        } />
        <Route path="/inventario" element={
          <ProtectedRoute requiereAdmin><Inventario /></ProtectedRoute>
        } />
        <Route path="/proveedores" element={
          <ProtectedRoute requiereAdmin><Proveedores /></ProtectedRoute>
        } />
        <Route path="/ordenes-compra" element={
          <ProtectedRoute requiereAdmin><OrdenesCompra /></ProtectedRoute>
        } />
        <Route path="/tasa-cambio" element={
          <ProtectedRoute requiereAdmin><TasaCambio /></ProtectedRoute>
        } />
        <Route path="/usuarios" element={
          <ProtectedRoute requiereAdmin><Usuarios /></ProtectedRoute>
        } />
        <Route path="/historial" element={
          <ProtectedRoute requiereAdmin><HistorialFacturas /></ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1A1A1A',
              color: '#F5F5F5',
              border: '1px solid #333',
            },
            success: { iconTheme: { primary: '#22C55E', secondary: '#1A1A1A' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#1A1A1A' } },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
