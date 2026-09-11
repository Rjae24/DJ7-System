import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatFecha } from '../utils/formatters';
import toast from 'react-hot-toast';
import { HiOutlineUserPlus, HiOutlineLockClosed, HiOutlineLockOpen } from 'react-icons/hi2';

export default function Usuarios() {
  const { createUser } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', nombre_completo: '', rol: 'vendedor' });
  const [creando, setCreando] = useState(false);

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

  if (loading) return <div className="page-loading"><div className="loading-spinner" /><p>Cargando usuarios...</p></div>;

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Gestión de Usuarios</h1>
        <button className="btn btn--primary" onClick={() => setShowModal(true)}>
          <HiOutlineUserPlus /> Nuevo Vendedor
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Registrado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id}>
                  <td>{u.nombre_completo}</td>
                  <td>{u.email}</td>
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
                  <td>{formatFecha(u.created_at)}</td>
                  <td>
                    {u.rol !== 'admin' && (
                      <button
                        className={`btn btn--ghost btn--xs ${u.activo ? 'text-danger' : 'text-success'}`}
                        onClick={() => toggleActivo(u)}
                        title={u.activo ? 'Desactivar' : 'Activar'}
                      >
                        {u.activo ? <HiOutlineLockClosed /> : <HiOutlineLockOpen />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  );
}
