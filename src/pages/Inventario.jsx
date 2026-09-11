import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatUSD, formatFecha } from '../utils/formatters';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus, HiOutlinePencilSquare, HiOutlineTrash,
  HiOutlineMagnifyingGlass, HiOutlineFunnel,
} from 'react-icons/hi2';

export default function Inventario() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    sku: '', nombre: '', descripcion: '', precio_usd: '', stock: '', stock_minimo: '5', categoria_id: '', activo: true,
    aplica_iva: true, porcentaje_iva: '16',
  });
  const [catForm, setCatForm] = useState({ nombre: '', descripcion: '' });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [prodRes, catRes] = await Promise.all([
      supabase.from('productos').select('*, categorias(nombre)').order('nombre'),
      supabase.from('categorias').select('*').order('nombre'),
    ]);
    setProductos(prodRes.data || []);
    setCategorias(catRes.data || []);
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      precio_usd: parseFloat(form.precio_usd),
      stock: parseInt(form.stock),
      stock_minimo: parseInt(form.stock_minimo),
      categoria_id: form.categoria_id || null,
      aplica_iva: !!form.aplica_iva,
      porcentaje_iva: form.aplica_iva ? (parseFloat(form.porcentaje_iva) || 16) : 0,
    };

    try {
      if (editando) {
        const { error } = await supabase.from('productos').update(payload).eq('id', editando.id);
        if (error) throw error;
        toast.success('Producto actualizado');
      } else {
        const { error } = await supabase.from('productos').insert(payload);
        if (error) throw error;
        toast.success('Producto creado');
      }
      setShowModal(false);
      setEditando(null);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Producto eliminado'); loadData(); }
  }

  async function handleCatSubmit(e) {
    e.preventDefault();
    try {
      const { error } = await supabase.from('categorias').insert(catForm);
      if (error) throw error;
      toast.success('Categoría creada');
      setShowCatModal(false);
      setCatForm({ nombre: '', descripcion: '' });
      loadData();
    } catch (error) {
      toast.error(error.message);
    }
  }

  function editarProducto(producto) {
    setEditando(producto);
    setForm({
      sku: producto.sku, nombre: producto.nombre, descripcion: producto.descripcion || '',
      precio_usd: producto.precio_usd.toString(), stock: producto.stock.toString(),
      stock_minimo: producto.stock_minimo.toString(), categoria_id: producto.categoria_id || '',
      activo: producto.activo,
      aplica_iva: producto.aplica_iva !== false,
      porcentaje_iva: (producto.porcentaje_iva ?? 16).toString(),
    });
    setShowModal(true);
  }

  function resetForm() {
    setForm({
      sku: '', nombre: '', descripcion: '', precio_usd: '', stock: '', stock_minimo: '5',
      categoria_id: '', activo: true, aplica_iva: true, porcentaje_iva: '16'
    });
  }

  const productosFiltrados = productos.filter(p => {
    const matchSearch = !search || p.nombre.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filtroCategoria || p.categoria_id === filtroCategoria;
    return matchSearch && matchCat;
  });

  if (loading) return <div className="page-loading"><div className="loading-spinner" /><p>Cargando inventario...</p></div>;

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Inventario</h1>
        <div className="page__actions">
          <button className="btn btn--ghost" onClick={() => setShowCatModal(true)}>
            <HiOutlinePlus /> Categoría
          </button>
          <button className="btn btn--primary" onClick={() => { resetForm(); setEditando(null); setShowModal(true); }}>
            <HiOutlinePlus /> Producto
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <HiOutlineMagnifyingGlass className="search-box__icon" />
          <input placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      {/* Products Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio USD</th>
                <th>Impuesto</th>
                <th>Stock</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map(p => (
                <tr key={p.id}>
                  <td><code>{p.sku}</code></td>
                  <td>{p.nombre}</td>
                  <td>{p.categorias?.nombre || '—'}</td>
                  <td>{formatUSD(p.precio_usd)}</td>
                  <td>
                    <span className={`badge ${p.aplica_iva === false ? 'badge--ghost' : 'badge--primary'}`}>
                      {p.aplica_iva === false ? 'Exento (0%)' : `IVA ${p.porcentaje_iva ?? 16}%`}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${p.stock <= p.stock_minimo ? (p.stock === 0 ? 'badge--danger' : 'badge--warning') : 'badge--success'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${p.activo ? 'badge--success' : 'badge--ghost'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="table__actions">
                      <button className="btn btn--ghost btn--xs" onClick={() => editarProducto(p)}><HiOutlinePencilSquare /></button>
                      <button className="btn btn--ghost btn--xs text-danger" onClick={() => handleDelete(p.id)}><HiOutlineTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {productosFiltrados.length === 0 && (
                <tr><td colSpan="8" className="table__empty">No se encontraron productos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editando ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button className="btn btn--ghost btn--sm" onClick={() => setShowModal(false)}><HiOutlineTrash /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal__form">
              <div className="form-row">
                <div className="form-group">
                  <label>SKU</label>
                  <input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Nombre</label>
                  <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required />
                </div>
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} rows={2} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Precio USD</label>
                  <input type="number" step="0.01" min="0" value={form.precio_usd} onChange={e => setForm({...form, precio_usd: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Stock</label>
                  <input type="number" min="0" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Stock Mínimo</label>
                  <input type="number" min="0" value={form.stock_minimo} onChange={e => setForm({...form, stock_minimo: e.target.value})} required />
                </div>
              </div>
              
              <div className="form-row" style={{ background: '#181818', padding: '0.75rem', borderRadius: '6px', border: '1px solid #282828' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="checkbox-label" style={{ fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={form.aplica_iva}
                      onChange={e => setForm({ ...form, aplica_iva: e.target.checked })}
                    />
                    Aplica Impuesto (IVA)
                  </label>
                </div>
                {form.aplica_iva && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Porcentaje IVA (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.porcentaje_iva}
                      onChange={e => setForm({ ...form, porcentaje_iva: e.target.value })}
                      required
                    />
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Categoría</label>
                  <select value={form.categoria_id} onChange={e => setForm({...form, categoria_id: e.target.value})}>
                    <option value="">Sin categoría</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={form.activo} onChange={e => setForm({...form, activo: e.target.checked})} />
                    Producto activo
                  </label>
                </div>
              </div>
              <button type="submit" className="btn btn--primary btn--full">{editando ? 'Guardar Cambios' : 'Crear Producto'}</button>
            </form>
          </div>
        </div>
      )}


      {/* Category Modal */}
      {showCatModal && (
        <div className="modal-overlay" onClick={() => setShowCatModal(false)}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Nueva Categoría</h2>
            </div>
            <form onSubmit={handleCatSubmit} className="modal__form">
              <div className="form-group">
                <label>Nombre</label>
                <input value={catForm.nombre} onChange={e => setCatForm({...catForm, nombre: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <input value={catForm.descripcion} onChange={e => setCatForm({...catForm, descripcion: e.target.value})} />
              </div>
              <button type="submit" className="btn btn--primary btn--full">Crear Categoría</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
