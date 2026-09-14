import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatFecha } from '../utils/formatters';
import toast from 'react-hot-toast';
import Pagination from '../components/common/Pagination';
import { HiOutlinePlus, HiOutlinePencilSquare, HiOutlineMagnifyingGlass, HiOutlineTrash } from 'react-icons/hi2';
import { FaWhatsapp, FaPhone } from 'react-icons/fa';

import ConfirmModal from '../components/common/ConfirmModal';

function getWhatsAppUrl(tel) {
  if (!tel) return '';
  let clean = tel.replace(/\D/g, '');
  if (clean.startsWith('0') && clean.length === 11) {
    clean = '58' + clean.slice(1);
  } else if (!clean.startsWith('58') && clean.length === 10) {
    clean = '58' + clean;
  }
  return `https://wa.me/${clean}`;
}

function getPhoneCallUrl(tel) {
  if (!tel) return '';
  const clean = tel.replace(/[^0-9+]/g, '');
  return `tel:${clean}`;
}

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: '', documento_identidad: '', telefono: '', direccion: '', email: '' });
  const [clienteToDelete, setClienteToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  async function handleConfirmDeleteCliente() {
    if (!clienteToDelete) return;
    setDeleting(true);
    try {
      await supabase.from('facturas').update({ cliente_id: null }).eq('cliente_id', clienteToDelete.id);
      const { error } = await supabase.from('clientes').delete().eq('id', clienteToDelete.id);
      if (error) throw error;
      toast.success(`Cliente "${clienteToDelete.nombre}" eliminado`);
      setClienteToDelete(null);
      loadClientes();
    } catch (err) {
      toast.error(err.message || 'Error al eliminar el cliente');
    } finally {
      setDeleting(false);
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
                  <td>
                    {c.telefono ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>{c.telefono}</span>
                        <a
                          href={getWhatsAppUrl(c.telefono)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn--ghost btn--xs"
                          style={{ color: '#25D366', padding: '2px 5px', fontSize: '0.9rem' }}
                          title="Enviar WhatsApp"
                        >
                          <FaWhatsapp />
                        </a>
                        <a
                          href={getPhoneCallUrl(c.telefono)}
                          className="btn btn--ghost btn--xs"
                          style={{ color: '#3B82F6', padding: '2px 5px', fontSize: '0.75rem' }}
                          title="Llamar"
                        >
                          <FaPhone />
                        </a>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{c.email || '—'}</td>
                  <td>{formatFecha(c.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn--ghost btn--xs" onClick={() => editarCliente(c)} title="Editar"><HiOutlinePencilSquare /></button>
                      <button className="btn btn--ghost btn--xs text-danger" onClick={() => setClienteToDelete(c)} title="Eliminar Cliente"><HiOutlineTrash /></button>
                    </div>
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

      {/* Confirmation Modal for Client Deletion */}
      <ConfirmModal
        isOpen={!!clienteToDelete}
        title={`¿Eliminar al cliente "${clienteToDelete?.nombre}"?`}
        message="Las facturas emitidas a este cliente se conservarán en el historial como registro contable, desvinculando la referencia al cliente eliminado."
        confirmText="Sí, Eliminar Cliente"
        cancelText="Cancelar"
        variant="danger"
        loading={deleting}
        onConfirm={handleConfirmDeleteCliente}
        onCancel={() => !deleting && setClienteToDelete(null)}
      />
    </div>
  );
}
