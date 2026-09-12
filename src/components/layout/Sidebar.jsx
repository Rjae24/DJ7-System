import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  HiOutlineHome,
  HiOutlineShoppingCart,
  HiOutlineCube,
  HiOutlineUsers,
  HiOutlineTruck,
  HiOutlineDocumentText,
  HiOutlineCurrencyDollar,
  HiOutlineUserGroup,
  HiOutlineClipboardDocumentList,
  HiOutlineArrowRightOnRectangle,
  HiOutlineBars3,
  HiOutlineXMark,
  HiOutlineDocumentChartBar,
  HiOutlineCog6Tooth,
} from 'react-icons/hi2';

const adminLinks = [
  { to: '/dashboard', icon: HiOutlineHome, label: 'Dashboard' },
  { to: '/pos', icon: HiOutlineShoppingCart, label: 'Punto de Venta' },
  { to: '/reportes', icon: HiOutlineDocumentChartBar, label: 'Reportes' },
  { to: '/inventario', icon: HiOutlineCube, label: 'Inventario' },
  { to: '/clientes', icon: HiOutlineUsers, label: 'Clientes' },
  { to: '/proveedores', icon: HiOutlineTruck, label: 'Proveedores' },
  { to: '/ordenes-compra', icon: HiOutlineClipboardDocumentList, label: 'Órdenes de Compra' },
  { to: '/tasa-cambio', icon: HiOutlineCurrencyDollar, label: 'Tasa de Cambio' },
  { to: '/usuarios', icon: HiOutlineUserGroup, label: 'Usuarios' },
  { to: '/historial', icon: HiOutlineDocumentText, label: 'Historial Facturas' },
  { to: '/configuracion', icon: HiOutlineCog6Tooth, label: 'Configuración' },
];


const vendedorLinks = [
  { to: '/pos', icon: HiOutlineShoppingCart, label: 'Punto de Venta' },
  { to: '/dashboard', icon: HiOutlineHome, label: 'Mi Dashboard' },
];

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const links = isAdmin ? adminLinks : vendedorLinks;

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="sidebar-overlay sidebar-overlay--visible"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${mobileOpen ? 'sidebar--mobile-open' : ''}`}>
        {/* Header */}
        <div className="sidebar__header">
          <img src="/logo-dj7.jpg" alt="DJ7" className="sidebar__logo" />
          {!collapsed && (
            <div className="sidebar__brand">
              <h1>DJ7</h1>
              <span>Sistema</span>
            </div>
          )}

          {/* Toggle / Close button */}
          <button
            className="sidebar__toggle"
            onClick={() => {
              if (mobileOpen) {
                setMobileOpen(false);
              } else {
                setCollapsed(!collapsed);
              }
            }}
            aria-label={mobileOpen ? "Cerrar menú" : (collapsed ? "Expandir menú" : "Contraer menú")}
            title={mobileOpen ? "Cerrar menú" : (collapsed ? "Expandir menú" : "Contraer menú")}
          >
            {collapsed && !mobileOpen ? <HiOutlineBars3 /> : <HiOutlineXMark />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
              title={label}
            >
              <Icon className="sidebar__link-icon" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="sidebar__footer">
          {!collapsed && (
            <div className="sidebar__user">
              <div className="sidebar__avatar">
                {profile?.nombre_completo?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="sidebar__user-info">
                <span className="sidebar__user-name">{profile?.nombre_completo}</span>
                <span className={`sidebar__user-role sidebar__user-role--${profile?.rol}`}>
                  {profile?.rol === 'admin' ? 'Administrador' : 'Vendedor'}
                </span>
              </div>
            </div>
          )}
          <button className="sidebar__logout" onClick={handleSignOut} title="Cerrar Sesión">
            <HiOutlineArrowRightOnRectangle />
            {!collapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
