import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatFecha } from '../utils/formatters';
import toast from 'react-hot-toast';
import Pagination from '../components/common/Pagination';
import ConfirmModal from '../components/common/ConfirmModal';
import {
  HiOutlineUserPlus,
  HiOutlineLockClosed,
  HiOutlineLockOpen,
  HiOutlineTrash,
} from 'react-icons/hi2';

export default function Usuarios() {
  const { createUser, profile } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', nombre_completo: '', rol: 'vendedor' });
  const [creando, setCreando] = useState(false);

  // Confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => { loadUsuarios(); }, []);

  async function loadUsuarios() {
    setLoading(true);
    const { data } = await supabase.from('usuarios').select('*').order('created_at', { ascending: false });
    setUsuarios(data || []);
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password || !form.nombre_completo) {
      toast.error('Complete todos los campos');
      return;
    }
    if (form.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setCreando(true);
    try {
      await createUser(form.email, form.password, form.nombre_completo, form.rol);
      toast.success('Usuario creado correctamente');
      setShowModal(false);
      setForm({ email: '', password: '', nombre_completo: '', rol: 'vendedor' });
      // Wait a moment for the trigger to fire
      setTimeout(loadUsuarios, 1000);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreando(false);
    }
  }

  async function toggleActivo(usuario) {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ activo: !usuario.activo })
        .eq('id', usuario.id);
      if (error) throw error;
      toast.success(usuario.activo ? 'Usuario desactivado' : 'Usuario activado');
      loadUsuarios();
    } catch (error) {
      toast.error(error.message);
    }
  }

  function solicitarEliminacion(usuario) {
    if (usuario.id === profile?.id) {
      toast.error('No puedes eliminar tu propia cuenta');
      return;
    }
    setUsuarioAEliminar(usuario);
    setConfirmOpen(true);
  }

  async function confirmarEliminacion() {
    if (!usuarioAEliminar) return;
    setEliminando(true);
    try {
      const { error } = await supabase.rpc('eliminar_usuario', { p_user_id: usuarioAEliminar.id });
      if (error) throw error;
      toast.success(`Usuario "${usuarioAEliminar.nombre_completo}" eliminado permanentemente`);
      setConfirmOpen(false);
      setUsuarioAEliminar(null);
      await loadUsuarios();
    } catch (error) {
      toast.error('Error al eliminar usuario: ' + (error.message || 'Error desconocido'));
    } finally {
      setEliminando(false);
    }
  }

  if (loading) return <div className="page-loading"><div className="loading-spinner" /><p>Cargando usuarios...</p></div>;

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Gestión de Usuarios</h1>
          <p className="page__subtitle">{usuarios.length} usuario(s) registrado(s)</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowModal(true)}>
          <HiOutlineUserPlus /> Nuevo Vendedor
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Registrado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.slice((currentPage - 1) * 20, currentPage * 20).map(u => (
                <tr key={u.id} className={!u.activo ? 'table__row--muted' : ''}>
                  <td><strong>{u.nombre_completo}</strong></td>
                  <td style={{ color: '#A3A3A3' }}>{u.email}</td>
                  <td>
                    <span className={`badge badge--${u.rol === 'admin' ? 'primary' : 'info'}`}>
                      {u.rol === 'admin' ? 'Admin' : 'Vendedor'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.activo ? 'badge--success' : 'badge--danger'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ color: '#A3A3A3' }}>{formatFecha(u.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {u.rol !== 'admin' && (
                        <>
                          <button
                            className={`btn btn--ghost btn--xs ${u.activo ? 'text-danger' : 'text-success'}`}
                            onClick={() => toggleActivo(u)}
                            title={u.activo ? 'Desactivar acceso' : 'Activar acceso'}
                          >
                            {u.activo ? <HiOutlineLockClosed /> : <HiOutlineLockOpen />}
                          </button>
                          <button
                            className="btn btn--ghost btn--xs text-danger"
                            onClick={() => solicitarEliminacion(u)}
                            title="Eliminar usuario"
                            style={{ color: '#EF4444' }}
                          >
                            <HiOutlineTrash />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr><td colSpan="6" className="table__empty">No hay usuarios registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={usuarios.length}
          pageSize={20}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Modal crear usuario */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal__header"><h2>Crear Vendedor</h2></div>
            <form onSubmit={handleSubmit} className="modal__form">
              <div className="form-group">
                <label>Nombre Completo</label>
                <input value={form.nombre_completo} onChange={e => setForm({...form, nombre_completo: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Correo Electrónico</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Contraseña</label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} minLength={6} required />
              </div>
              <div className="form-group">
                <label>Rol</label>
                <select value={form.rol} onChange={e => setForm({...form, rol: e.target.value})}>
                  <option value="vendedor">Vendedor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <button type="submit" className="btn btn--primary btn--full" disabled={creando}>
                {creando ? 'Creando...' : 'Crear Usuario'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación */}
      <ConfirmModal
        isOpen={confirmOpen}
        title="Eliminar Usuario"
        message={
          usuarioAEliminar
            ? `¿Estás seguro de eliminar permanentemente al usuario "${usuarioAEliminar.nombre_completo}" (${usuarioAEliminar.email})?\n\nEsta acción borrará su acceso al sistema y desvinculará sus registros contables históricos de forma segura.`
            : ''
        }
        confirmText="Sí, Eliminar Permanentemente"
        variant="danger"
        loading={eliminando}
        onConfirm={confirmarEliminacion}
        onCancel={() => { if (!eliminando) { setConfirmOpen(false); setUsuarioAEliminar(null); } }}
      />
    </div>
  );
}
