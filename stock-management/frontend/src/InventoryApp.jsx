import { useEffect, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  ArrowUpRight,
  Boxes,
  ChartNoAxesCombined,
  CircleAlert,
  ClipboardList,
  LayoutDashboard,
  Package,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react'
import './inventory.css'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '')
const currency = new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 2 })
const dateTime = new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium', timeStyle: 'short' })

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  let data = null
  if (response.status !== 204) data = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = data?.detail || Object.values(data || {}).flat()[0]
    throw new Error(typeof detail === 'string' ? detail : 'Une erreur est survenue. Veuillez reessayer.')
  }
  return data
}

function App() {
  const [activeView, setActiveView] = useState('stock')
  const [products, setProducts] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [movements, setMovements] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [stockStatus, setStockStatus] = useState('all')
  const [category, setCategory] = useState('all')
  const [movementProduct, setMovementProduct] = useState('all')
  const [dialog, setDialog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    if (stockStatus !== 'all') params.set('stock_status', stockStatus)
    if (category !== 'all') params.set('category', category)
    const productQuery = params.size ? `?${params}` : ''

    async function loadData() {
      setLoading(true)
      setError('')
      try {
        const [productData, allProductData, dashboardData] = await Promise.all([
          apiRequest(`/products/${productQuery}`, { signal: controller.signal }),
          apiRequest('/products/', { signal: controller.signal }),
          apiRequest('/dashboard/', { signal: controller.signal }),
        ])
        setProducts(productData)
        setAllProducts(allProductData)
        setDashboard(dashboardData)
        setCategories(dashboardData.categories || [])
        if (activeView === 'history') {
          const movementQuery = movementProduct === 'all' ? '' : `?product=${movementProduct}`
          setMovements(await apiRequest(`/movements/${movementQuery}`, { signal: controller.signal }))
        }
      } catch (requestError) {
        if (requestError.name !== 'AbortError') setError(requestError.message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadData()
    return () => controller.abort()
  }, [activeView, category, movementProduct, refreshKey, search, stockStatus])

  function showToast(message) {
    setToast(message)
    window.setTimeout(() => setToast(''), 3200)
  }

  function refresh() {
    setRefreshKey((key) => key + 1)
  }

  async function saveProduct(formData, product) {
    try {
      await apiRequest(product ? `/products/${product.id}/` : '/products/', {
        method: product ? 'PATCH' : 'POST',
        body: JSON.stringify(formData),
      })
      setDialog(null)
      showToast(product ? 'Produit mis a jour.' : 'Produit ajoute au catalogue.')
      refresh()
    } catch (requestError) {
      showToast(requestError.message)
    }
  }

  async function saveMovement(formData) {
    try {
      await apiRequest('/movements/', { method: 'POST', body: JSON.stringify(formData) })
      setDialog(null)
      showToast('Mouvement de stock enregistre.')
      refresh()
    } catch (requestError) {
      showToast(requestError.message)
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Retirer ${product.name} du catalogue ? Son historique de stock sera conserve.`)) return
    try {
      await apiRequest(`/products/${product.id}/`, { method: 'DELETE' })
      showToast('Produit retire du catalogue. Historique conserve.')
      refresh()
    } catch (requestError) {
      showToast(requestError.message)
    }
  }

  const title = activeView === 'history' ? 'Mouvements de stock' : 'Gestion des stocks'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setActiveView('stock')}>
          <span className="brand-mark"><Boxes size={21} strokeWidth={2.2} /></span>
          <span className="brand-name">Tuni<span>Supply</span></span>
        </button>
        <div className="workspace-label">ESPACE DE TRAVAIL</div>
        <nav className="side-nav" aria-label="Navigation principale">
          <button className={activeView === 'stock' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('stock')}>
            <LayoutDashboard size={18} /><span>Vue d'ensemble</span>
          </button>
          <button className={activeView === 'history' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('history')}>
            <ClipboardList size={18} /><span>Historique</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-status"><span className="status-dot" /> Systeme operationnel</div>
          <div className="workspace-card"><span className="workspace-avatar">TS</span><span><strong>TuniSupply</strong><small>Gestion des stocks</small></span></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Inventaire</span><span className="breadcrumb-divider">/</span><strong>{title}</strong></div>
          <div className="topbar-right"><span className="today-label">Espace de gestion</span><span className="user-avatar" aria-label="Utilisateur">TS</span></div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> PILOTAGE DES STOCKS</div>
              <h1>{title}</h1>
              <p>{activeView === 'history' ? 'Suivez chaque entree, sortie et ajustement enregistre.' : 'Suivez vos articles, vos niveaux et les mouvements recents.'}</p>
            </div>
            {activeView === 'stock' && <div className="heading-actions">
              <button className="button button-secondary" onClick={() => setDialog({ type: 'movement' })}><ArrowLeftRight size={17} /> Mouvement</button>
              <button className="button button-primary" onClick={() => setDialog({ type: 'product' })}><Plus size={18} /> Nouveau produit</button>
            </div>}
          </section>

          {error && <div className="error-banner" role="alert"><CircleAlert size={18} /><span>{error}</span><button onClick={refresh}>Reessayer</button></div>}

          {activeView === 'stock' ? <>
            <section className="stats-grid" aria-label="Statistiques du stock">
              <StatCard icon={Package} label="Produits actifs" value={dashboard?.total_products ?? '—'} detail={`${dashboard?.category_count ?? 0} categories`} tone="green" />
              <StatCard icon={Boxes} label="Unites en stock" value={dashboard?.total_units ?? '—'} detail={`${dashboard?.out_of_stock_products ?? 0} en rupture`} tone="blue" />
              <StatCard icon={ShieldAlert} label="Alertes de stock" value={dashboard?.low_stock_products ?? '—'} detail="Au seuil minimum ou en dessous" tone="orange" />
              <StatCard icon={ChartNoAxesCombined} label="Valeur du stock" value={dashboard ? currency.format(Number(dashboard.inventory_value)) : '—'} detail="Valorisation au prix unitaire" tone="violet" />
            </section>

            <section className="inventory-panel">
              <div className="panel-heading"><div><h2>Catalogue produits</h2><p>{loading ? 'Chargement...' : `${products.length} produit${products.length === 1 ? '' : 's'} affiche${products.length === 1 ? '' : 's'}`}</p></div><div className="live-indicator"><span className="status-dot" /> A jour</div></div>
              <div className="toolbar">
                <label className="search-box"><Search size={17} /><input type="search" placeholder="Rechercher un produit ou une reference..." value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Rechercher des produits" /></label>
                <label className="filter-select"><span className="sr-only">Categorie</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Toutes les categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                <label className="filter-select status-filter"><span className="sr-only">Etat du stock</span><select value={stockStatus} onChange={(event) => setStockStatus(event.target.value)}><option value="all">Tous les niveaux</option><option value="low">Stock bas</option><option value="out">En rupture</option></select></label>
              </div>
              <ProductTable products={products} loading={loading} onEdit={(product) => setDialog({ type: 'product', product })} onMove={(product) => setDialog({ type: 'movement', product })} onDelete={deleteProduct} onAdd={() => setDialog({ type: 'product' })} />
            </section>

            <section className="recent-panel">
              <div className="recent-heading"><div><h2>Activite recente</h2><p>Les derniers mouvements enregistres</p></div><button className="text-button" onClick={() => setActiveView('history')}>Tout l'historique <ArrowUpRight size={16} /></button></div>
              <MovementList movements={dashboard?.recent_movements || []} loading={loading} compact />
            </section>
          </> : <section className="inventory-panel history-panel">
            <div className="panel-heading"><div><h2>Journal des mouvements</h2><p>{loading ? 'Chargement...' : `${movements.length} mouvement${movements.length === 1 ? '' : 's'}`}</p></div>
              <label className="filter-select"><span className="sr-only">Filtrer par produit</span><select value={movementProduct} onChange={(event) => setMovementProduct(event.target.value)}><option value="all">Tous les produits</option>{allProducts.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</select></label>
            </div>
            <MovementList movements={movements} loading={loading} />
          </section>}
        </div>
      </main>

      {dialog?.type === 'product' && <ProductDialog product={dialog.product} onClose={() => setDialog(null)} onSave={saveProduct} />}
      {dialog?.type === 'movement' && <MovementDialog products={allProducts} selectedProduct={dialog.product} onClose={() => setDialog(null)} onSave={saveMovement} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, detail, tone }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19} strokeWidth={2} /></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></article>
}

function ProductTable({ products, loading, onEdit, onMove, onDelete, onAdd }) {
  if (loading && products.length === 0) return <div className="table-message"><span className="spinner" /> Chargement du catalogue...</div>
  if (!products.length) return <div className="empty-state"><div className="empty-icon"><Package size={23} /></div><h3>Aucun produit trouve</h3><p>Modifiez les filtres ou ajoutez votre premier article au catalogue.</p><button className="button button-primary" onClick={onAdd}><Plus size={17} /> Ajouter un produit</button></div>

  return <div className="table-scroll"><table className="product-table"><thead><tr><th>Produit</th><th>Categorie</th><th>Prix unitaire</th><th>Quantite</th><th>Statut</th><th><span className="sr-only">Actions</span></th></tr></thead>
    <tbody>{products.map((product) => <tr key={product.id}>
      <td><div className="product-cell"><span className="product-thumb"><Package size={18} /></span><span><strong>{product.name}</strong><small>{product.sku}</small></span></div></td>
      <td><span className="category-label">{product.category || 'Non classe'}</span></td>
      <td className="price-cell">{currency.format(Number(product.unit_price))}</td>
      <td><div className="quantity-cell"><strong>{product.quantity}</strong><span> / min. {product.minimum_stock}</span></div></td>
      <td><span className={product.is_low_stock ? 'stock-badge low' : 'stock-badge healthy'}><i />{product.quantity === 0 ? 'Rupture' : product.is_low_stock ? 'Stock bas' : 'Disponible'}</span></td>
      <td><div className="row-actions"><button className="icon-button" onClick={() => onMove(product)} aria-label={`Mouvement pour ${product.name}`} title="Enregistrer un mouvement"><ArrowLeftRight size={16} /></button><button className="icon-button" onClick={() => onEdit(product)} aria-label={`Modifier ${product.name}`} title="Modifier"><Pencil size={16} /></button><button className="icon-button danger-icon" onClick={() => onDelete(product)} aria-label={`Supprimer ${product.name}`} title="Supprimer"><Trash2 size={16} /></button></div></td>
    </tr>)}</tbody>
  </table></div>
}

function MovementList({ movements, loading, compact = false }) {
  if (loading && movements.length === 0) return <div className="table-message"><span className="spinner" /> Chargement des mouvements...</div>
  if (!movements.length) return <div className="empty-inline">Aucun mouvement enregistre pour le moment.</div>
  return <div className="table-scroll"><table className="movement-table"><thead><tr><th>Type</th><th>Produit</th><th>Quantite</th><th>Stock apres</th><th>Motif</th><th>Date</th></tr></thead><tbody>
    {movements.map((movement) => {
      const incoming = movement.movement_type === 'in'
      const adjustment = movement.movement_type === 'adjustment'
      const Icon = incoming ? ArrowDownToLine : adjustment ? ArrowLeftRight : ArrowUpFromLine
      const quantityLabel = adjustment ? `${movement.quantity > 0 ? '+' : ''}${movement.quantity}` : `${incoming ? '+' : '-'}${movement.quantity}`
      return <tr key={movement.id}>
        <td><span className={`movement-type ${incoming ? 'incoming' : adjustment ? 'adjustment' : 'outgoing'}`}><Icon size={15} />{incoming ? 'Entree' : adjustment ? 'Ajustement' : 'Sortie'}</span></td>
        <td><div className="movement-product"><strong>{movement.product_name}</strong><small>{movement.product_sku}</small></div></td>
        <td className={incoming || (adjustment && movement.quantity > 0) ? 'movement-amount positive' : 'movement-amount'}>{quantityLabel} unite{Math.abs(movement.quantity) === 1 ? '' : 's'}</td>
        <td><span className="after-stock">{movement.stock_after}</span></td><td className="reason-cell">{movement.reason || '—'}</td><td className="date-cell">{dateTime.format(new Date(movement.created_at))}</td>
      </tr>
    })}
  </tbody></table>
  {compact && <div className="mobile-movement-list">{movements.slice(0, 4).map((movement) => <div className="mobile-movement" key={movement.id}><span className={`movement-dot ${movement.movement_type}`} /><span><strong>{movement.product_name}</strong><small>{movement.product_sku} · {dateTime.format(new Date(movement.created_at))}</small></span><b className={movement.movement_type === 'out' ? '' : 'positive'}>{movement.movement_type === 'out' ? '-' : '+'}{Math.abs(movement.quantity)}</b></div>)}</div>}
  </div>
}

function ProductDialog({ product, onClose, onSave }) {
  const [form, setForm] = useState({ sku: product?.sku || '', name: product?.name || '', category: product?.category || '', description: product?.description || '', unit_price: product?.unit_price || '0.00', minimum_stock: product?.minimum_stock ?? 0, initial_quantity: 0 })
  const [saving, setSaving] = useState(false)
  function update(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })) }
  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    const payload = { ...form, sku: form.sku.trim(), name: form.name.trim(), category: form.category.trim(), unit_price: Number(form.unit_price), minimum_stock: Number(form.minimum_stock) }
    if (!product) payload.initial_quantity = Number(form.initial_quantity)
    else delete payload.initial_quantity
    await onSave(payload, product)
    setSaving(false)
  }
  return <Modal title={product ? 'Modifier le produit' : 'Nouveau produit'} onClose={onClose}><form className="form-grid" onSubmit={submit}>
    <label className="form-field"><span>Nom du produit <b>*</b></span><input name="name" value={form.name} onChange={update} required maxLength="160" autoFocus placeholder="Ex. Cahier grand format" /></label>
    <label className="form-field"><span>Reference SKU <b>*</b></span><input name="sku" value={form.sku} onChange={update} required maxLength="32" placeholder="Ex. PAP-001" /></label>
    <label className="form-field"><span>Categorie</span><input name="category" value={form.category} onChange={update} maxLength="80" placeholder="Ex. Papeterie" /></label>
    <label className="form-field"><span>Prix unitaire (TND)</span><input name="unit_price" type="number" min="0" step="0.01" value={form.unit_price} onChange={update} required /></label>
    <label className="form-field"><span>Seuil minimum</span><input name="minimum_stock" type="number" min="0" step="1" value={form.minimum_stock} onChange={update} required /></label>
    {!product && <label className="form-field"><span>Stock initial</span><input name="initial_quantity" type="number" min="0" step="1" value={form.initial_quantity} onChange={update} required /></label>}
    <label className="form-field full-field"><span>Description</span><textarea name="description" value={form.description} onChange={update} rows="3" placeholder="Informations complementaires sur l'article" /></label>
    <div className="form-footer full-field"><button type="button" className="button button-secondary" onClick={onClose}>Annuler</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Enregistrement...' : product ? 'Enregistrer' : 'Creer le produit'}</button></div>
  </form></Modal>
}

function MovementDialog({ products, selectedProduct, onClose, onSave }) {
  const [form, setForm] = useState({ product: selectedProduct?.id || products[0]?.id || '', movement_type: 'in', quantity: 1, reason: '' })
  const [saving, setSaving] = useState(false)
  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    await onSave({ ...form, product: Number(form.product), quantity: Number(form.quantity) })
    setSaving(false)
  }
  return <Modal title="Enregistrer un mouvement" onClose={onClose}>{products.length === 0 ? <div className="no-products"><Package size={21} /><p>Ajoutez d'abord un produit au catalogue.</p><button className="button button-secondary" onClick={onClose}>Fermer</button></div> : <form className="form-grid" onSubmit={submit}>
    <label className="form-field full-field"><span>Produit <b>*</b></span><select value={form.product} onChange={(event) => setForm((current) => ({ ...current, product: event.target.value }))} required>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku} · Stock: {product.quantity}</option>)}</select></label>
    <fieldset className="movement-picker full-field"><legend>Type de mouvement</legend>{[{ id: 'in', label: 'Entree', icon: ArrowDownToLine }, { id: 'out', label: 'Sortie', icon: ArrowUpFromLine }, { id: 'adjustment', label: 'Ajustement', icon: ArrowLeftRight }].map(({ id, label, icon: Icon }) => <button type="button" key={id} className={form.movement_type === id ? `movement-choice selected ${id}` : 'movement-choice'} onClick={() => setForm((current) => ({ ...current, movement_type: id }))}><Icon size={16} />{label}</button>)}</fieldset>
    <label className="form-field"><span>{form.movement_type === 'adjustment' ? 'Variation (+/-)' : 'Quantite'} <b>*</b></span><input type="number" step="1" min={form.movement_type === 'adjustment' ? undefined : '1'} value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} required /><small>{form.movement_type === 'adjustment' ? 'Valeur negative pour diminuer le stock.' : 'La quantite doit etre superieure a zero.'}</small></label>
    <label className="form-field"><span>Motif</span><input value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} maxLength="240" placeholder="Ex. Reception fournisseur" /></label>
    <div className="form-footer full-field"><button type="button" className="button button-secondary" onClick={onClose}>Annuler</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Enregistrement...' : 'Valider le mouvement'}</button></div>
  </form>}</Modal>
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    function onKeyDown(event) { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="modal-heading"><div><span className="eyebrow"><span className="eyebrow-line" /> CATALOGUE</span><h2 id="dialog-title">{title}</h2></div><button className="icon-button close-button" onClick={onClose} aria-label="Fermer"><X size={19} /></button></div>{children}</section></div>
}

export default App