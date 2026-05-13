import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type PageKey =
  | 'dashboard'
  | 'products'
  | 'stock'
  | 'sales'
  | 'purchases'
  | 'customers'
  | 'suppliers'
  | 'branches'

type AuthMode = 'login' | 'register'
type StockMode = 'in' | 'out' | 'adjust'

type Tenant = {
  id: number
  name: string
  currency?: string
  trial_ends_at?: string
}

type User = {
  id: number
  name: string
  email: string
  tenant?: Tenant | null
}

type ApiList<T> = T[] | { data: T[] }

type Category = {
  id: number
  name: string
}

type Branch = {
  id: number
  name: string
  code?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  is_active?: boolean
}

type Product = {
  id: number
  name: string
  sku?: string | null
  barcode?: string | null
  unit?: string
  quantity: number
  min_stock_level?: number
  cost_price?: string | number
  selling_price?: string | number
  is_active?: boolean
  category?: Category | null
  branch?: Branch | null
}

type Person = {
  id: number
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  code?: string | null
  is_active?: boolean
}

type Transaction = {
  id: number
  invoice_number?: string | null
  reference_number?: string | null
  sale_date?: string
  purchase_date?: string
  total_amount: string | number
  amount_paid: string | number
  amount_due: string | number
  payment_status?: string
  customer?: Person | null
  supplier?: Person | null
}

type Movement = {
  id: number
  type: string
  quantity: number
  quantity_before: number
  quantity_after: number
  note?: string | null
  product?: Product | null
}

type Dashboard = {
  metrics?: {
    total_products?: number
    low_stock_count?: number
    expiring_soon?: number
    pending_receivables?: string | number
    today?: { sales_count?: number; revenue?: string | number }
    this_month?: {
      sales_count?: number
      revenue?: string | number
      profit?: string | number
    }
  }
  charts?: {
    sales_last_7_days?: Array<{
      sale_date: string
      revenue: string | number
      count: number
    }>
    top_products?: Array<{
      name: string
      total_qty: string | number
      total_revenue: string | number
    }>
  }
}

type AppData = {
  dashboard: Dashboard | null
  products: Product[]
  categories: Category[]
  customers: Person[]
  suppliers: Person[]
  branches: Branch[]
  sales: Transaction[]
  purchases: Transaction[]
  movements: Movement[]
}

const pages: Array<[PageKey, string, string]> = [
  ['dashboard', 'Dashboard', 'Overview and performance'],
  ['products', 'Products', 'Inventory catalog'],
  ['stock', 'Stock', 'Adjustments and history'],
  ['sales', 'Sales', 'Invoices and payments'],
  ['purchases', 'Purchases', 'Receiving and suppliers'],
  ['customers', 'Customers', 'Customer records'],
  ['suppliers', 'Suppliers', 'Supplier records'],
  ['branches', 'Branches', 'Locations and outlets'],
]

const units = ['piece', 'kg', 'litre', 'box', 'pack', 'dozen', 'carton']

function readJson<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : null
  } catch {
    return null
  }
}

function getList<T>(payload: ApiList<T>): T[] {
  return Array.isArray(payload) ? payload : payload.data
}

function normalizePayload(form: HTMLFormElement) {
  const payload = Object.fromEntries(new FormData(form).entries())
  const numeric = new Set([
    'quantity',
    'new_quantity',
    'cost_price',
    'selling_price',
    'min_stock_level',
    'amount_paid',
    'discount_amount',
    'unit_cost',
    'credit_limit',
    'quantity_ordered',
    'quantity_received',
    'unit_price',
  ])

  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if (value === '') return [key, null]
      if (numeric.has(key)) return [key, Number(value)]
      return [key, value]
    }),
  )
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('gitinventory_token'))
  const [user, setUser] = useState<User | null>(() => readJson<User>('gitinventory_user'))
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [page, setPage] = useState<PageKey>('dashboard')
  const [drawer, setDrawer] = useState<PageKey | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  const [stockMode, setStockMode] = useState<StockMode>('in')
  const [saleLines, setSaleLines] = useState([0])
  const [purchaseLines, setPurchaseLines] = useState([0])
  const [data, setData] = useState<AppData>({
    dashboard: null,
    products: [],
    categories: [],
    customers: [],
    suppliers: [],
    branches: [],
    sales: [],
    purchases: [],
    movements: [],
  })

  const pageMeta = useMemo(() => pages.find(([key]) => key === page) ?? pages[0], [page])

  const money = (value: string | number | undefined) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: user?.tenant?.currency || 'NGN',
      maximumFractionDigits: 0,
    }).format(Number(value || 0))

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3500)
  }

  const api = async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
    const response = await fetch(`/api/${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    })
    const text = await response.text()
    const body = text ? JSON.parse(text) : {}

    if (!response.ok) {
      const validation = body.errors ? Object.values(body.errors).flat().join(' ') : body.message
      throw new Error(validation || 'Request failed.')
    }

    return body as T
  }

  const loadBasics = async () => {
    const [categories, branches, customers, suppliers, products] = await Promise.all([
      api<ApiList<Category>>('categories'),
      api<ApiList<Branch>>('branches'),
      api<ApiList<Person>>('customers'),
      api<ApiList<Person>>('suppliers'),
      api<ApiList<Product>>('products?per_page=100'),
    ])

    setData((current) => ({
      ...current,
      categories: getList(categories),
      branches: getList(branches),
      customers: getList(customers),
      suppliers: getList(suppliers),
      products: getList(products),
    }))
  }

  const loadPage = async (nextPage = page) => {
    if (!token) return
    setLoading(true)

    try {
      if (nextPage === 'dashboard') {
        const dashboard = await api<Dashboard>('dashboard')
        await loadBasics()
        setData((current) => ({ ...current, dashboard }))
      }

      if (nextPage === 'products') {
        await loadBasics()
        const products = await api<ApiList<Product>>(
          `products?per_page=100&search=${encodeURIComponent(search)}`,
        )
        setData((current) => ({ ...current, products: getList(products) }))
      }

      if (nextPage === 'stock') {
        await loadBasics()
        const movements = await api<ApiList<Movement>>('stock/movements?per_page=50')
        setData((current) => ({ ...current, movements: getList(movements) }))
      }

      if (nextPage === 'sales') {
        await loadBasics()
        const sales = await api<ApiList<Transaction>>('sales?per_page=50')
        setData((current) => ({ ...current, sales: getList(sales) }))
      }

      if (nextPage === 'purchases') {
        await loadBasics()
        const purchases = await api<ApiList<Transaction>>('purchases?per_page=50')
        setData((current) => ({ ...current, purchases: getList(purchases) }))
      }

      if (['customers', 'suppliers', 'branches'].includes(nextPage)) {
        await loadBasics()
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not load data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) return

    const timer = window.setTimeout(() => {
      void loadPage('dashboard')
    }, 0)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    try {
      const payload = normalizePayload(event.currentTarget)
      const response = await api<{ token: string; user: User; message?: string }>(`auth/${authMode}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      localStorage.setItem('gitinventory_token', response.token)
      localStorage.setItem('gitinventory_user', JSON.stringify(response.user))
      setToken(response.token)
      setUser(response.user)
      notify(response.message || 'Welcome back.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    if (token) void api('auth/logout', { method: 'POST' }).catch(() => undefined)
    localStorage.removeItem('gitinventory_token')
    localStorage.removeItem('gitinventory_user')
    setToken(null)
    setUser(null)
    setPage('dashboard')
    setDrawer(null)
  }

  const collectItems = (form: HTMLFormElement, purchase = false) =>
    [...form.querySelectorAll<HTMLElement>('[data-line]')].map((line) => {
      const values = Object.fromEntries(
        [...line.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input,select')].map((field) => [
          field.name,
          field.value,
        ]),
      )

      if (purchase) {
        return {
          product_id: values.product_id,
          quantity_ordered: Number(values.quantity_ordered),
          quantity_received: Number(values.quantity_received),
          unit_cost: Number(values.unit_cost),
        }
      }

      return {
        product_id: values.product_id,
        quantity: Number(values.quantity),
        unit_price: Number(values.unit_price),
        discount: 0,
      }
    })

  const submitDrawer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!drawer) return

    try {
      let endpoint: string = drawer
      const payload: Record<string, unknown> = normalizePayload(event.currentTarget)

      if (drawer === 'stock') endpoint = stockMode === 'in' ? 'stock/in' : stockMode === 'out' ? 'stock/out' : 'stock/adjust'
      if (drawer === 'sales') payload.items = collectItems(event.currentTarget)
      if (drawer === 'purchases') payload.items = collectItems(event.currentTarget, true)

      await api(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setDrawer(null)
      notify('Saved successfully.')
      await loadPage(page)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Save failed.')
    }
  }

  if (!token) {
    return (
      <main className="auth-page">
        <section className="auth-visual">
          <div className="brand">
            <div className="brand-mark">GI</div>
            <div>
              <div className="brand-name">GITInventory</div>
              <div className="brand-meta">Inventory, sales, and receiving</div>
            </div>
          </div>
          <div>
            <h1>Run stock, sales, and purchasing from one live desk.</h1>
            <p>
              Track products, low stock, payments, suppliers, branches, and daily movement without
              leaving the workflow.
            </p>
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-tabs">
            <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
              Sign in
            </button>
            <button
              className={authMode === 'register' ? 'active' : ''}
              onClick={() => setAuthMode('register')}
            >
              Create account
            </button>
          </div>
          <form className="form-grid" onSubmit={submitAuth}>
            {authMode === 'register' && (
              <>
                <Field label="Business name" name="business_name" required />
                <Field label="Your name" name="name" autoComplete="name" required />
              </>
            )}
            <Field label="Email" name="email" type="email" autoComplete="email" required />
            {authMode === 'register' && <Field label="Phone" name="phone" autoComplete="tel" />}
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
              required
            />
            {authMode === 'register' && (
              <Field
                label="Confirm password"
                name="password_confirmation"
                type="password"
                autoComplete="new-password"
                required
              />
            )}
            <button className="btn primary" disabled={loading}>
              {loading ? 'Please wait' : authMode === 'login' ? 'Sign in' : 'Start trial'}
            </button>
          </form>
        </section>
        <Toast message={toast} />
      </main>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">GI</div>
          <div>
            <div className="brand-name">GITInventory</div>
            <div className="brand-meta">{user?.tenant?.name || 'Workspace'}</div>
          </div>
        </div>

        <nav className="nav">
          {pages.map(([key, label]) => (
            <button
              className={`nav-button ${page === key ? 'active' : ''}`}
              key={key}
              onClick={() => {
                setPage(key)
                setSearch('')
                void loadPage(key)
              }}
            >
              <span>{navIcon(key)}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span>Signed in</span>
          <strong>{user?.name}</strong>
          <button className="btn ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{pageMeta[1]}</h1>
            <p>{pageMeta[2]}</p>
          </div>
          <div className="button-row">
            <button className="btn ghost" onClick={() => void loadPage(page)}>
              {loading ? 'Loading' : 'Refresh'}
            </button>
            {page !== 'dashboard' && (
              <button className="btn primary" onClick={() => setDrawer(page)}>
                {addLabel(page)}
              </button>
            )}
          </div>
        </header>

        <section className="content">
          {page === 'dashboard' && <DashboardView dashboard={data.dashboard} branches={data.branches} money={money} />}
          {page === 'products' && (
            <ProductsView
              money={money}
              products={data.products}
              search={search}
              setSearch={setSearch}
              onSearch={() => void loadPage('products')}
            />
          )}
          {page === 'stock' && <StockView movements={data.movements} stockMode={stockMode} setStockMode={setStockMode} />}
          {page === 'sales' && <TransactionView rows={data.sales} type="sales" money={money} />}
          {page === 'purchases' && <TransactionView rows={data.purchases} type="purchases" money={money} />}
          {page === 'customers' && <DirectoryView rows={data.customers} title="Customers" />}
          {page === 'suppliers' && <DirectoryView rows={data.suppliers} title="Suppliers" />}
          {page === 'branches' && <DirectoryView rows={data.branches} title="Branches" />}
        </section>
      </main>

      {drawer && (
        <Drawer title={addLabel(drawer)} onClose={() => setDrawer(null)}>
          <DrawerForm
            drawer={drawer}
            data={data}
            stockMode={stockMode}
            setStockMode={setStockMode}
            saleLines={saleLines}
            setSaleLines={setSaleLines}
            purchaseLines={purchaseLines}
            setPurchaseLines={setPurchaseLines}
            onSubmit={submitDrawer}
          />
        </Drawer>
      )}

      <Toast message={toast} />
    </div>
  )
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props
  return (
    <label className="field">
      <span>{label}</span>
      <input className="input" {...inputProps} />
    </label>
  )
}

function SelectField({
  label,
  name,
  children,
  required,
}: {
  label: string
  name: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select className="input" name={name} required={required}>
        {children}
      </select>
    </label>
  )
}

function Options<T extends { id: number; name: string }>({ rows, placeholder }: { rows: T[]; placeholder: string }) {
  return (
    <>
      <option value="">{placeholder}</option>
      {rows.map((row) => (
        <option value={row.id} key={row.id}>
          {row.name}
        </option>
      ))}
    </>
  )
}

function DashboardView({
  dashboard,
  branches,
  money,
}: {
  dashboard: Dashboard | null
  branches: Branch[]
  money: (value: string | number | undefined) => string
}) {
  const metrics = dashboard?.metrics
  const today = metrics?.today
  const month = metrics?.this_month
  const chart = dashboard?.charts?.sales_last_7_days || []
  const max = Math.max(...chart.map((row) => Number(row.revenue || 0)), 1)

  return (
    <>
      <div className="metrics-grid">
        <Metric label="Today revenue" value={money(today?.revenue)} note={`${today?.sales_count || 0} sales`} tone="green" />
        <Metric label="Month revenue" value={money(month?.revenue)} note={`${month?.sales_count || 0} sales`} tone="blue" />
        <Metric label="Low stock" value={metrics?.low_stock_count || 0} note="Needs reorder attention" tone="amber" />
        <Metric label="Receivables" value={money(metrics?.pending_receivables)} note="Pending customer payments" tone="rose" />
      </div>

      <div className="grid-2">
        <section className="panel">
          <PanelTitle title="Last 7 days sales" note="Completed sales revenue by day" />
          {chart.length ? (
            <div className="chart-bars">
              {chart.map((row) => (
                <div className="bar-wrap" key={row.sale_date} title={money(row.revenue)}>
                  <div className="bar" style={{ height: Math.max(10, (Number(row.revenue) / max) * 190) }} />
                  <span>{row.sale_date.slice(5)}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="No chart data yet." />
          )}
        </section>

        <section className="panel">
          <PanelTitle title="Top products" note="Best sellers this month" />
          <SimpleTable
            empty="No completed sales yet."
            headers={['Product', 'Qty', 'Revenue']}
            rows={(dashboard?.charts?.top_products || []).map((row) => [
              row.name,
              row.total_qty,
              money(row.total_revenue),
            ])}
          />
        </section>
      </div>

      <div className="metrics-grid">
        <Metric label="Active products" value={metrics?.total_products || 0} note="Available catalog items" tone="blue" />
        <Metric label="Expiring soon" value={metrics?.expiring_soon || 0} note="Within 30 days" tone="amber" />
        <Metric label="Month profit" value={money(month?.profit)} note="Estimated gross profit" tone="green" />
        <Metric label="Branches" value={branches.length} note="Operating locations" tone="blue" />
      </div>
    </>
  )
}

function ProductsView({
  products,
  money,
  search,
  setSearch,
  onSearch,
}: {
  products: Product[]
  money: (value: string | number | undefined) => string
  search: string
  setSearch: (value: string) => void
  onSearch: () => void
}) {
  return (
    <>
      <section className="panel toolbar">
        <div className="toolbar-left">
          <input
            className="input search"
            placeholder="Search name, SKU, or barcode"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button className="btn ghost" onClick={onSearch}>
            Search
          </button>
        </div>
        <span className="tiny">{products.length} products loaded</span>
      </section>

      <section className="panel">
        <SimpleTable
          empty="No products found. Add your first stock item."
          headers={['Name', 'SKU', 'Category', 'Branch', 'Qty', 'Price', 'Status']}
          rows={products.map((product) => [
            product.name,
            product.sku || '-',
            product.category?.name || '-',
            product.branch?.name || '-',
            product.quantity,
            money(product.selling_price),
            product.quantity <= (product.min_stock_level || 0) ? 'Low stock' : product.is_active === false ? 'Inactive' : 'Active',
          ])}
        />
      </section>
    </>
  )
}

function StockView({
  movements,
  stockMode,
  setStockMode,
}: {
  movements: Movement[]
  stockMode: StockMode
  setStockMode: (mode: StockMode) => void
}) {
  return (
    <>
      <section className="panel compact">
        <Segmented
          value={stockMode}
          setValue={setStockMode}
          options={[
            ['in', 'Stock in'],
            ['out', 'Stock out'],
            ['adjust', 'Adjust'],
          ]}
        />
      </section>
      <section className="panel">
        <PanelTitle title="Stock movement history" note="Latest stock in, stock out, and manual adjustments" />
        <SimpleTable
          empty="No stock movements yet."
          headers={['Product', 'Type', 'Qty', 'Before', 'After', 'Note']}
          rows={movements.map((item) => [
            item.product?.name || '-',
            item.type,
            item.quantity,
            item.quantity_before,
            item.quantity_after,
            item.note || '-',
          ])}
        />
      </section>
    </>
  )
}

function TransactionView({
  rows,
  type,
  money,
}: {
  rows: Transaction[]
  type: 'sales' | 'purchases'
  money: (value: string | number | undefined) => string
}) {
  const isSales = type === 'sales'
  return (
    <section className="panel">
      <SimpleTable
        empty={`No ${type} recorded yet.`}
        headers={['Reference', 'Date', isSales ? 'Customer' : 'Supplier', 'Total', 'Paid', 'Due', 'Status']}
        rows={rows.map((row) => [
          row.invoice_number || row.reference_number || `${type}-${row.id}`,
          isSales ? row.sale_date || '-' : row.purchase_date || '-',
          isSales ? row.customer?.name || 'Walk-in' : row.supplier?.name || '-',
          money(row.total_amount),
          money(row.amount_paid),
          money(row.amount_due),
          row.payment_status || '-',
        ])}
      />
    </section>
  )
}

function DirectoryView({ rows, title }: { rows: Person[]; title: string }) {
  return (
    <section className="panel">
      <PanelTitle title={title} note={`Manage ${title.toLowerCase()} available to this tenant`} />
      <SimpleTable
        empty={`No ${title.toLowerCase()} added yet.`}
        headers={['Name', 'Email', 'Phone', 'Location', 'Status']}
        rows={rows.map((row) => [
          row.name,
          row.email || '-',
          row.phone || '-',
          row.address || row.city || row.state || '-',
          row.is_active === false ? 'Inactive' : 'Active',
        ])}
      />
    </section>
  )
}

function DrawerForm({
  drawer,
  data,
  stockMode,
  setStockMode,
  saleLines,
  setSaleLines,
  purchaseLines,
  setPurchaseLines,
  onSubmit,
}: {
  drawer: PageKey
  data: AppData
  stockMode: StockMode
  setStockMode: (mode: StockMode) => void
  saleLines: number[]
  setSaleLines: (lines: number[]) => void
  purchaseLines: number[]
  setPurchaseLines: (lines: number[]) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  if (drawer === 'products') {
    return (
      <form className="form-grid" onSubmit={onSubmit}>
        <Field label="Name" name="name" required />
        <div className="form-grid two">
          <Field label="SKU" name="sku" />
          <Field label="Barcode" name="barcode" />
        </div>
        <div className="form-grid two">
          <SelectField label="Category" name="category_id">
            <Options rows={data.categories} placeholder="Select category" />
          </SelectField>
          <SelectField label="Branch" name="branch_id">
            <Options rows={data.branches} placeholder="Select branch" />
          </SelectField>
        </div>
        <div className="form-grid two">
          <SelectField label="Unit" name="unit" required>
            {units.map((unit) => (
              <option value={unit} key={unit}>
                {unit}
              </option>
            ))}
          </SelectField>
          <Field label="Quantity" name="quantity" type="number" min={0} defaultValue={0} required />
        </div>
        <div className="form-grid two">
          <Field label="Cost price" name="cost_price" type="number" min={0} step="0.01" required />
          <Field label="Selling price" name="selling_price" type="number" min={0} step="0.01" required />
        </div>
        <div className="form-grid two">
          <Field label="Min stock" name="min_stock_level" type="number" min={0} defaultValue={0} />
          <Field label="Expiry date" name="expiry_date" type="date" />
        </div>
        <Textarea label="Description" name="description" />
        <button className="btn primary">Save product</button>
      </form>
    )
  }

  if (drawer === 'stock') {
    const isAdjust = stockMode === 'adjust'
    return (
      <form className="form-grid" onSubmit={onSubmit}>
        <Segmented
          value={stockMode}
          setValue={setStockMode}
          options={[
            ['in', 'Stock in'],
            ['out', 'Stock out'],
            ['adjust', 'Adjust'],
          ]}
        />
        <SelectField label="Product" name="product_id" required>
          <Options rows={data.products} placeholder="Select product" />
        </SelectField>
        <Field
          label={isAdjust ? 'New quantity' : 'Quantity'}
          name={isAdjust ? 'new_quantity' : 'quantity'}
          type="number"
          min={isAdjust ? 0 : 1}
          required
        />
        {stockMode === 'in' && <Field label="Unit cost" name="unit_cost" type="number" min={0} step="0.01" />}
        <Textarea label="Note" name="note" required={isAdjust} />
        <button className="btn primary">Save movement</button>
      </form>
    )
  }

  if (drawer === 'sales' || drawer === 'purchases') {
    const isPurchase = drawer === 'purchases'
    const lines = isPurchase ? purchaseLines : saleLines
    const setLines = isPurchase ? setPurchaseLines : setSaleLines

    return (
      <form className="form-grid" onSubmit={onSubmit}>
        <div className="form-grid two">
          <Field
            label="Date"
            name={isPurchase ? 'purchase_date' : 'sale_date'}
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
          <SelectField label="Branch" name="branch_id">
            <Options rows={data.branches} placeholder="Select branch" />
          </SelectField>
        </div>
        <SelectField label={isPurchase ? 'Supplier' : 'Customer'} name={isPurchase ? 'supplier_id' : 'customer_id'}>
          <Options rows={isPurchase ? data.suppliers : data.customers} placeholder={isPurchase ? 'Optional supplier' : 'Walk-in customer'} />
        </SelectField>
        {!isPurchase && (
          <SelectField label="Payment method" name="payment_method" required>
            {['cash', 'transfer', 'pos', 'wallet'].map((method) => (
              <option value={method} key={method}>
                {method}
              </option>
            ))}
          </SelectField>
        )}
        {isPurchase && <Field label="Reference number" name="reference_number" />}
        <div className="form-grid two">
          <Field label="Amount paid" name="amount_paid" type="number" min={0} step="0.01" defaultValue={0} required />
          {!isPurchase && <Field label="Discount" name="discount_amount" type="number" min={0} step="0.01" />}
        </div>
        <div className="panel inner-panel">
          <div className="panel-header">
            <h3>Items</h3>
            <button
              className="btn ghost"
              type="button"
              onClick={() => setLines([...lines, Date.now()])}
            >
              Add line
            </button>
          </div>
          <div className="form-grid">
            {lines.map((line) => (
              <div className="item-line" data-line key={line}>
                <SelectField label="Product" name="product_id" required>
                  <Options rows={data.products} placeholder="Select product" />
                </SelectField>
                <Field label="Qty" name={isPurchase ? 'quantity_ordered' : 'quantity'} type="number" min={1} defaultValue={1} required />
                {isPurchase && <Field label="Received" name="quantity_received" type="number" min={0} defaultValue={1} required />}
                <Field label={isPurchase ? 'Cost' : 'Price'} name={isPurchase ? 'unit_cost' : 'unit_price'} type="number" min={0} step="0.01" required />
                <button
                  className="btn ghost line-remove"
                  type="button"
                  onClick={() => lines.length > 1 && setLines(lines.filter((item) => item !== line))}
                >
                  X
                </button>
              </div>
            ))}
          </div>
        </div>
        <Textarea label="Notes" name="notes" />
        <button className="btn primary">Save {isPurchase ? 'purchase' : 'sale'}</button>
      </form>
    )
  }

  const fields: Record<string, string[]> = {
    customers: ['name', 'email', 'phone', 'address', 'city', 'credit_limit'],
    suppliers: ['name', 'email', 'phone', 'address'],
    branches: ['name', 'code', 'email', 'phone', 'address', 'city', 'state'],
  }

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      {fields[drawer].map((field) => (
        <Field
          label={field.replaceAll('_', ' ')}
          name={field}
          key={field}
          type={field === 'email' ? 'email' : field === 'credit_limit' ? 'number' : 'text'}
          min={field === 'credit_limit' ? 0 : undefined}
          step={field === 'credit_limit' ? '0.01' : undefined}
          required={field === 'name'}
        />
      ))}
      <button className="btn primary">Save {drawer.slice(0, -1)}</button>
    </form>
  )
}

function Textarea({
  label,
  name,
  required,
}: {
  label: string
  name: string
  required?: boolean
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea className="input textarea" name={name} required={required} />
    </label>
  )
}

function Drawer({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="drawer">
      <button className="drawer-backdrop" onClick={onClose} aria-label="Close drawer" />
      <aside className="drawer-panel">
        <div className="panel-header">
          <div>
            <h2>{title}</h2>
            <p>Saved directly through the Laravel API.</p>
          </div>
          <button className="btn ghost" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </aside>
    </div>
  )
}

function Segmented<T extends string>({
  value,
  setValue,
  options,
}: {
  value: T
  setValue: (value: T) => void
  options: Array<[T, string]>
}) {
  return (
    <div className="segmented">
      {options.map(([key, label]) => (
        <button
          className={value === key ? 'active' : ''}
          key={key}
          type="button"
          onClick={() => setValue(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function Metric({ label, value, note, tone }: { label: string; value: React.ReactNode; note: string; tone: string }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  )
}

function PanelTitle({ title, note }: { title: string; note: string }) {
  return (
    <div className="panel-title">
      <h2>{title}</h2>
      <p>{note}</p>
    </div>
  )
}

function SimpleTable({
  headers,
  rows,
  empty,
}: {
  headers: string[]
  rows: Array<Array<React.ReactNode>>
  empty: string
}) {
  if (!rows.length) return <Empty text={empty} />

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={`${index}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>
}

function Toast({ message }: { message: string }) {
  return message ? <div className="toast">{message}</div> : null
}

function navIcon(key: PageKey) {
  return {
    dashboard: '#',
    products: '[]',
    stock: '+/-',
    sales: '$',
    purchases: '<-',
    customers: '@',
    suppliers: 'S',
    branches: 'B',
  }[key]
}

function addLabel(page: PageKey) {
  return {
    dashboard: '',
    products: 'New product',
    stock: 'Record stock',
    sales: 'New sale',
    purchases: 'New purchase',
    customers: 'New customer',
    suppliers: 'New supplier',
    branches: 'New branch',
  }[page]
}

export default App
