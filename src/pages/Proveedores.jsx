import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatFecha } from '../utils/formatters';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencilSquare, HiOutlineMagnifyingGlass } from 'react-icons/hi2';

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: '', rif: '', telefono: '', email: '', direccion: '', contacto_nombre: '', activo: true });

  useEffect(() => { loadProveedores(); }, []);

  async function loadProveedores() {
    setLoading(true);
    const { data } = await supabase.from('proveedores').select('*').order('nombre');
    setProveedores(data || []);
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editando) {
        const { error } = await supabase.from('proveedores').update(form).eq('id', editando.id);
        if (error) throw error;
        toast.success('Proveedor actualizado');
      } else {
        const { error } = await supabase.from('proveedores').insert(form);
        if (error) throw error;
        toast.success('Proveedor creado');
      }
      setShowModal(false);
      setEditando(null);
      resetForm();
      loadProveedores();
    } catch (error) {
      toast.error(error.message);
    }
  }

  function editarProveedor(p) {
    setEditando(p);
    setForm({ nombre: p.nombre, rif: p.rif, telefono: p.telefono || '', email: p.email || '', direccion: p.direccion || '', contacto_nombre: p.contacto_nombre || '', activo: p.activo });
    setShowModal(true);
  }

  function resetForm() {
    setForm({ nombre: '', rif: '', telefono: '', email: '', direccion: '', contacto_nombre: '', activo: true });
  }

  const filtrados = proveedores.filter(p =>
    !search || p.nombre.toLowerCase().includes(search.toLowerCase()) || p.rif.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="page-loading"><div className="loading-spinner" /><p>Cargando proveedores...</p></div>;

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Proveedores</h1>
        <button className="btn btn--primary" onClick={() => { resetForm(); setEditando(null); setShowModal(true); }}>
          <HiOutlinePlus /> Nuevo Proveedor
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <HiOutlineMagnifyingGlass className="search-box__icon" />
          <input placeholder="Buscar por nombre o RIF..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Nombre</th><th>RIF</th><th>Teléfono</th><th>Contacto</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {filtrados.map(p => (
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td><code>{p.rif}</code></td>
                  <td>{p.telefono || '—'}</td>
                  <td>{p.contacto_nombre || '—'}</td>
                  <td><span className={`badge ${p.activo ? 'badge--success' : 'badge--ghost'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td><button className="btn btn--ghost btn--xs" onClick={() => editarProveedor(p)}><HiOutlinePencilSquare /></button></td>
                </tr>
              ))}
              {filtrados.length === 0 && <tr><td colSpan="6" className="table__empty">No se encontraron proveedores</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header"><h2>{editando ? 'Editar' : 'Nuevo'} Proveedor</h2></div>
            <form onSubmit={handleSubmit} className="modal__form">
              <div className="form-row">
                <div className="form-group"><label>Nombre</label><input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required /></div>
                <div className="form-group"><label>RIF</label><input value={form.rif} onChange={e => setForm({...form, rif: e.target.value})} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Teléfono</label><input value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} /></div>
                <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Contacto</label><input value={form.contacto_nombre} onChange={e => setForm({...form, contacto_nombre: e.target.value})} /></div>
                <div className="form-group"><label>Dirección</label><input value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} /></div>
              </div>
              <div className="form-group">
                <label className="checkbox-label"><input type="checkbox" checked={form.activo} onChange={e => setForm({...form, activo: e.target.checked})} /> Proveedor activo</label>
              </div>
              <button type="submit" className="btn btn--primary btn--full">{editando ? 'Guardar' : 'Crear Proveedor'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
