import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatFecha } from '../utils/formatters';
import toast from 'react-hot-toast';
import Pagination from '../components/common/Pagination';
import { HiOutlinePlus, HiOutlinePencilSquare, HiOutlineMagnifyingGlass } from 'react-icons/hi2';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: '', documento_identidad: '', telefono: '', direccion: '', email: '' });

  useEffect(() => { loadClientes(); }, []);

  async function loadClientes() {
    setLoading(true);
    const { data } = await supabase.from('clientes').select('*').order('nombre');
    setClientes(data || []);
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editando) {
        const { error } = await supabase.from('clientes').update(form).eq('id', editando.id);
        if (error) throw error;
        toast.success('Cliente actualizado');
      } else {
        const { error } = await supabase.from('clientes').insert(form);
        if (error) throw error;
        toast.success('Cliente creado');
      }
      setShowModal(false);
      setEditando(null);
      setForm({ nombre: '', documento_identidad: '', telefono: '', direccion: '', email: '' });
      loadClientes();
    } catch (error) {
      toast.error(error.message);
    }
  }

  function editarCliente(cliente) {
    setEditando(cliente);
    setForm({
      nombre: cliente.nombre, documento_identidad: cliente.documento_identidad,
      telefono: cliente.telefono || '', direccion: cliente.direccion || '', email: cliente.email || '',
    });
    setShowModal(true);
  }

  const clientesFiltrados = clientes.filter(c =>
    !search || c.nombre.toLowerCase().includes(search.toLowerCase()) || c.documento_identidad.toLowerCase().includes(search.toLowerCase())
  );

  const pageSize = 20;
  const clientesPaginados = clientesFiltrados.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  if (loading) return <div className="page-loading"><div className="loading-spinner" /><p>Cargando clientes...</p></div>;

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Clientes</h1>
        <button className="btn btn--primary" onClick={() => { setEditando(null); setForm({ nombre: '', documento_identidad: '', telefono: '', direccion: '', email: '' }); setShowModal(true); }}>
          <HiOutlinePlus /> Nuevo Cliente
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <HiOutlineMagnifyingGlass className="search-box__icon" />
          <input placeholder="Buscar por nombre o cédula..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Documento</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Registrado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientesPaginados.map(c => (
                <tr key={c.id}>
                  <td>{c.nombre}</td>
                  <td><code>{c.documento_identidad}</code></td>
                  <td>{c.telefono || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td>{formatFecha(c.created_at)}</td>
                  <td>
                    <button className="btn btn--ghost btn--xs" onClick={() => editarCliente(c)}><HiOutlinePencilSquare /></button>
                  </td>
                </tr>
              ))}
              {clientesFiltrados.length === 0 && (
                <tr><td colSpan="6" className="table__empty">No se encontraron clientes</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={clientesFiltrados.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editando ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="modal__form">
              <div className="form-group">
                <label>Nombre Completo</label>
                <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Cédula / RIF</label>
                  <input value={form.documento_identidad} onChange={e => setForm({...form, documento_identidad: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Dirección</label>
                  <input value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="btn btn--primary btn--full">{editando ? 'Guardar' : 'Crear Cliente'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
