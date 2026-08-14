import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { addLabel, pageViewPermission, pages } from '../config/navigation'
import { useDebouncedValue } from './useDebouncedValue'
import { createApiClient, csrfHeaders } from '../lib/api'
import { downloadWithSession } from '../lib/download'
import { createMoneyFormatter } from '../lib/format'
import { collectTransactionItems, normalizePayload } from '../lib/form'
import { appendQuery, getList, LIST_PAGE_SIZE, parsePaginated } from '../lib/list'
import type {
  ApiList,
  AppData,
  AuthMode,
  BillingPlan,
  Branch,
  Category,
  Dashboard,
  FinancialReport,
  Movement,
  PageKey,
  PaginatedMeta,
  Person,
  Product,
  ProductLookup,
  SettingsPayload,
  StockMode,
  TeamUser,
  Transaction,
  TransactionFilters,
  User,
} from '../types'

const emptyMeta: PaginatedMeta = { page: 1, lastPage: 1, total: 0 }

const emptyTransactionFilters: TransactionFilters = {
  dateFrom: '',
  dateTo: '',
  paymentStatus: '',
}

export function useInventoryApp() {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [resetToken, setResetToken] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [page, setPage] = useState<PageKey>('dashboard')
  const [drawer, setDrawer] = useState<PageKey | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingDirectory, setEditingDirectory] = useState<Person | Branch | null>(null)
  const [reportFrom, setReportFrom] = useState(() =>
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
  )
  const [reportTo, setReportTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 400)
  const [saleFilters, setSaleFilters] = useState<TransactionFilters>(emptyTransactionFilters)
  const [purchaseFilters, setPurchaseFilters] = useState<TransactionFilters>(emptyTransactionFilters)
  const [productsMeta, setProductsMeta] = useState<PaginatedMeta>(emptyMeta)
  const [salesMeta, setSalesMeta] = useState<PaginatedMeta>(emptyMeta)
  const [purchasesMeta, setPurchasesMeta] = useState<PaginatedMeta>(emptyMeta)
  const [movementsMeta, setMovementsMeta] = useState<PaginatedMeta>(emptyMeta)
  const [transactionDetail, setTransactionDetail] = useState<Transaction | null>(null)
  const [transactionDetailType, setTransactionDetailType] = useState<'sales' | 'purchases'>('sales')
  const [stockMode, setStockMode] = useState<StockMode>('in')
  const [saleLines, setSaleLines] = useState([0])
  const [purchaseLines, setPurchaseLines] = useState([0])
  const [labelProduct, setLabelProduct] = useState<Product | null>(null)
  const [subscriptionExpired, setSubscriptionExpired] = useState(false)
  const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([])
  const [upgrading, setUpgrading] = useState(false)
  const [resendingVerification, setResendingVerification] = useState(false)
  const [importingProducts, setImportingProducts] = useState(false)
  const [posMode, setPosMode] = useState(false)
  const [settingsTab, setSettingsTab] = useState<
    'profile' | 'inventory' | 'team' | 'plan' | 'help' | 'audit'
  >('profile')
  const [data, setData] = useState<AppData>({
    dashboard: null,
    financialReport: null,
    settings: null,
    teamUsers: [],
    products: [],
    lowStockProducts: [],
    categories: [],
    customers: [],
    suppliers: [],
    branches: [],
    sales: [],
    purchases: [],
    movements: [],
  })

  const pageMeta = useMemo(() => pages.find(([key]) => key === page) ?? pages[0], [page])

  const can = useCallback(
    (permission: string) => user?.permissions?.includes(permission) ?? false,
    [user?.permissions],
  )

  const visiblePages = useMemo(
    () => pages.filter(([key]) => can(pageViewPermission[key])),
    [can],
  )

  const money = useMemo(
    () => createMoneyFormatter(user?.tenant?.currency || 'NGN'),
    [user?.tenant?.currency],
  )

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3500)
  }

  const clearSession = useCallback(() => {
    setUser(null)
    setPage('dashboard')
    setDrawer(null)
    setEditingProduct(null)
    setEditingDirectory(null)
    setSubscriptionExpired(false)
  }, [])

  const api = useMemo(
    () =>
      createApiClient(clearSession, () => {
        setSubscriptionExpired(true)
        setPage('settings')
        setSettingsTab('plan')
      }),
    [clearSession],
  )

  const loadBasics = useCallback(async () => {
    const [categories, branches, customers, suppliers, products] = await Promise.all([
      api<ApiList<Category>>('categories'),
      api<ApiList<Branch>>('branches'),
      api<ApiList<Person>>('customers'),
      api<ApiList<Person>>('suppliers'),
      api<ApiList<Product>>(appendQuery('products', { per_page: 100 })),
    ])

    setData((current) => ({
      ...current,
      categories: getList(categories),
      branches: getList(branches),
      customers: getList(customers),
      suppliers: getList(suppliers),
      products: getList(products),
    }))
  }, [api])

  const loadProducts = useCallback(
    async (pageNum = 1, append = false) => {
      const response = await api<ApiList<Product>>(
        appendQuery('products', {
          per_page: LIST_PAGE_SIZE,
          page: pageNum,
          search: debouncedSearch || undefined,
        }),
      )
      const { items, meta } = parsePaginated(response)
      setProductsMeta(meta)
      setData((current) => ({
        ...current,
        products: append ? [...current.products, ...items] : items,
      }))
    },
    [api, debouncedSearch],
  )

  const loadSales = useCallback(
    async (pageNum = 1, append = false) => {
      const response = await api<ApiList<Transaction>>(
        appendQuery('sales', {
          per_page: LIST_PAGE_SIZE,
          page: pageNum,
          date_from: saleFilters.dateFrom || undefined,
          date_to: saleFilters.dateTo || undefined,
          payment_status: saleFilters.paymentStatus || undefined,
        }),
      )
      const { items, meta } = parsePaginated(response)
      setSalesMeta(meta)
      setData((current) => ({
        ...current,
        sales: append ? [...current.sales, ...items] : items,
      }))
    },
    [api, saleFilters],
  )

  const loadPurchases = useCallback(
    async (pageNum = 1, append = false) => {
      const response = await api<ApiList<Transaction>>(
        appendQuery('purchases', {
          per_page: LIST_PAGE_SIZE,
          page: pageNum,
          date_from: purchaseFilters.dateFrom || undefined,
          date_to: purchaseFilters.dateTo || undefined,
          payment_status: purchaseFilters.paymentStatus || undefined,
        }),
      )
      const { items, meta } = parsePaginated(response)
      setPurchasesMeta(meta)
      setData((current) => ({
        ...current,
        purchases: append ? [...current.purchases, ...items] : items,
      }))
    },
    [api, purchaseFilters],
  )

  const loadMovements = useCallback(
    async (pageNum = 1, append = false) => {
      const response = await api<ApiList<Movement>>(
        appendQuery('stock/movements', { per_page: LIST_PAGE_SIZE, page: pageNum }),
      )
      const { items, meta } = parsePaginated(response)
      setMovementsMeta(meta)
      setData((current) => ({
        ...current,
        movements: append ? [...current.movements, ...items] : items,
      }))
    },
    [api],
  )

  const loadLowStock = useCallback(async () => {
    const response = await api<ApiList<Product>>(appendQuery('products', { low_stock: 1, per_page: 50 }))
    setData((current) => ({ ...current, lowStockProducts: getList(response) }))
  }, [api])

  const loadPage = useCallback(
    async (nextPage = page, options: { append?: boolean; pageNum?: number } = {}) => {
      if (!user) return
      const { append = false, pageNum = append ? undefined : 1 } = options
      setLoading(true)

      try {
        if (nextPage === 'dashboard') {
          const dashboard = await api<Dashboard>('dashboard')
          await loadBasics()
          setData((current) => ({ ...current, dashboard }))
        }

        if (nextPage === 'products') {
          await loadBasics()
          await loadProducts(pageNum ?? (append ? productsMeta.page + 1 : 1), append)
        }

        if (nextPage === 'stock') {
          await loadBasics()
          await loadLowStock()
          await loadMovements(pageNum ?? (append ? movementsMeta.page + 1 : 1), append)
        }

        if (nextPage === 'sales') {
          await loadBasics()
          await loadSales(pageNum ?? (append ? salesMeta.page + 1 : 1), append)
        }

        if (nextPage === 'purchases') {
          await loadBasics()
          await loadPurchases(pageNum ?? (append ? purchasesMeta.page + 1 : 1), append)
        }

        if (['customers', 'suppliers', 'branches'].includes(nextPage)) {
          await loadBasics()
        }

        if (nextPage === 'reports') {
          const financialReport = await api<FinancialReport>(
            `reports/financial?date_from=${reportFrom}&date_to=${reportTo}`,
          )
          setData((current) => ({ ...current, financialReport }))
        }

      if (nextPage === 'settings') {
        const settings = await api<SettingsPayload>('settings')
        let teamUsers: TeamUser[] = []

        if (can('users.view') && !subscriptionExpired) {
          const usersResponse = await api<{ users: TeamUser[] }>('settings/users')
          teamUsers = usersResponse.users
        }

        await loadBillingPlans()
        setData((current) => ({ ...current, settings, teamUsers }))
      }
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Could not load data.')
      } finally {
        setLoading(false)
      }
    },
    [
      api,
      can,
      loadBasics,
      loadLowStock,
      loadMovements,
      loadProducts,
      loadPurchases,
      loadSales,
      movementsMeta.page,
      page,
      productsMeta.page,
      purchasesMeta.page,
      reportFrom,
      reportTo,
      salesMeta.page,
      user,
    ],
  )

  const trialDaysLeft = useMemo(() => {
    const trialEnds = user?.tenant?.trial_ends_at
    if (!trialEnds || user?.tenant?.has_active_subscription) return 0
    const end = new Date(trialEnds)
    const diff = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }, [user?.tenant?.trial_ends_at, user?.tenant?.has_active_subscription])

  const emailVerified = Boolean(user?.email_verified_at)

  const loadBillingPlans = useCallback(async () => {
    const response = await api<{ plans: BillingPlan[] }>('billing/plans')
    setBillingPlans(response.plans)
  }, [api])

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const body = await api<{ user: User }>('auth/me')
      if (body.user) {
        setUser(body.user)
        const tenant = body.user.tenant
        const active =
          tenant?.on_trial ||
          tenant?.has_active_subscription ||
          (tenant?.trial_ends_at && new Date(tenant.trial_ends_at) > new Date())
        if (active || tenant?.has_active_subscription) {
          setSubscriptionExpired(false)
        }
        return body.user
      }
    } catch {
      clearSession()
    }
    return null
  }, [api, clearSession])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshUser().finally(() => setAuthReady(true))
    }, 0)

    return () => window.clearTimeout(timer)
  }, [refreshUser])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('auth') === 'reset' && params.get('token') && params.get('email')) {
      setAuthMode('reset')
      setResetToken(params.get('token') ?? '')
      setResetEmail(params.get('email') ?? '')
      window.history.replaceState({}, '', window.location.pathname)
    }

    if (params.get('verified') === '1') {
      notify('Email verified. Welcome aboard.')
      window.history.replaceState({}, '', window.location.pathname)
      if (user) void refreshUser()
    } else if (params.get('verified') === '0') {
      notify('Verification link is invalid or expired.')
      window.history.replaceState({}, '', window.location.pathname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!user) return

    const params = new URLSearchParams(window.location.search)
    if (params.get('billing') === 'success') {
      setPage('settings')
      setSettingsTab('plan')
      const plan = params.get('plan') || 'starter'
      const demo = params.get('demo') === '1'

      void (async () => {
        try {
          if (demo) {
            await api('billing/confirm-demo', {
              method: 'POST',
              body: JSON.stringify({ plan, reference: params.get('reference') }),
            })
          }
          await refreshUser()
          setSubscriptionExpired(false)
          notify(demo ? 'Demo subscription activated.' : 'Payment received. Refreshing your plan…')
          await loadPage('settings')
        } catch (error) {
          notify(error instanceof Error ? error.message : 'Could not confirm billing.')
        } finally {
          window.history.replaceState({}, '', window.location.pathname)
        }
      })()
    }

    const timer = window.setTimeout(() => {
      void refreshUser().then((fresh) => {
        void loadBillingPlans().catch(() => undefined)
        if (fresh?.email_verified_at) {
          void loadPage('dashboard')
        }
      })
    }, 0)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (!user || page !== 'settings') return
    void loadPage('settings')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, subscriptionExpired])

  useEffect(() => {
    if (!user || page !== 'products') return
    void loadProducts(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  useEffect(() => {
    if (!user || page !== 'sales') return
    void loadSales(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleFilters])

  useEffect(() => {
    if (!user || page !== 'purchases') return
    void loadPurchases(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseFilters])

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (authMode !== 'login' && authMode !== 'register') return
    setLoading(true)

    try {
      const payload = normalizePayload(event.currentTarget)
      const response = await api<{ user: User; message?: string }>(`auth/${authMode}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setUser(response.user)
      notify(response.message || 'Welcome back.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  const submitForgotPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    try {
      const payload = normalizePayload(event.currentTarget)
      const response = await api<{ message?: string }>('auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      notify(response.message || 'Check your email for a reset link.')
      setAuthMode('login')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not send reset link.')
    } finally {
      setLoading(false)
    }
  }

  const submitResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    try {
      const form = new FormData(event.currentTarget)
      const response = await api<{ message?: string }>('auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('email'),
          token: resetToken,
          password: form.get('password'),
          password_confirmation: form.get('password_confirmation'),
        }),
      })
      notify(response.message || 'Password updated.')
      setAuthMode('login')
      setResetToken('')
      setResetEmail('')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not reset password.')
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    if (user) void api('auth/logout', { method: 'POST' }).catch(() => undefined)
    clearSession()
  }

  const createCategory = async (name: string) => {
    const response = await api<{ category: Category }>('categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    setData((current) => ({
      ...current,
      categories: [...current.categories, response.category],
    }))
    notify('Category created.')
  }

  const downloadProductImportTemplate = async () => {
    if (!user) return
    try {
      await downloadWithSession(
        'products/import/template',
        'product-import-template.csv',
        'text/csv',
      )
      notify('Template downloaded.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Template download failed.')
    }
  }

  const importProductsCsv = async (file: File) => {
    if (!user) return
    setImportingProducts(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const response = await fetch('/api/products/import', {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          ...(await csrfHeaders()),
        },
        body: form,
      })
      const body = (await response.json()) as {
        message?: string
        imported?: number
        failed?: number
        errors?: Array<{ row: number; message: string }>
      }
      if (!response.ok) {
        throw new Error(body.message || 'Import failed.')
      }
      const detail =
        body.failed && body.errors?.length
          ? ` First error (row ${body.errors[0].row}): ${body.errors[0].message}`
          : ''
      notify((body.message || 'Import complete.') + detail)
      await loadPage('products')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Import failed.')
    } finally {
      setImportingProducts(false)
    }
  }

  const fetchProductCodes = useCallback(
    () => api<{ sku: string; barcode: string }>('products/codes/preview'),
    [api],
  )

  const lookupProduct = useCallback(
    async (code: string) => {
      const response = await api<{ product: ProductLookup }>(`products/lookup?code=${encodeURIComponent(code)}`)
      return response.product
    },
    [api],
  )

  const saveSettings = async (payload: Record<string, unknown>) => {
    const response = await api<{ settings: SettingsPayload; message?: string }>('settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    setData((current) => ({ ...current, settings: response.settings }))
    if (response.settings.tenant.name) {
      const updatedTenant = response.settings.tenant
      setUser((current) => {
        if (!current) return current
        return {
          ...current,
          tenant: current.tenant
            ? { ...current.tenant, name: updatedTenant.name, currency: updatedTenant.currency }
            : updatedTenant,
        }
      })
    }
    notify(response.message || 'Settings saved.')
  }

  const inviteTeamUser = async (payload: Record<string, unknown>) => {
    await api('settings/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    notify('Team member invited.')
    await loadPage('settings')
  }

  const updateTeamUser = async (userId: number, payload: Record<string, unknown>) => {
    await api(`settings/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    notify('Team member updated.')
    await loadPage('settings')
  }

  const closeDrawer = () => {
    setDrawer(null)
    setEditingProduct(null)
    setEditingDirectory(null)
  }

  const openProductDrawer = (product: Product | null = null) => {
    setEditingProduct(product)
    setDrawer('products')
  }

  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return

    try {
      await api(`products/${product.id}`, { method: 'DELETE' })
      notify('Product deleted.')
      await loadPage('products')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Delete failed.')
    }
  }

  const openDirectoryDrawer = (target: PageKey, record: Person | Branch | null = null) => {
    setEditingDirectory(record)
    setDrawer(target)
  }

  const deleteDirectory = async (target: PageKey, record: Person | Branch) => {
    if (!window.confirm(`Delete "${record.name}"? This cannot be undone.`)) return

    try {
      await api(`${target}/${record.id}`, { method: 'DELETE' })
      notify('Deleted successfully.')
      await loadPage(target)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Delete failed.')
    }
  }

  const exportFinancialReport = async () => {
    if (!user) return

    try {
      await downloadWithSession(
        `reports/financial/export?date_from=${reportFrom}&date_to=${reportTo}`,
        `financial-report-${reportFrom}-to-${reportTo}.csv`,
        'text/csv',
      )
      notify('Report downloaded.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Export failed.')
    }
  }

  const exportFinancialReportPdf = async () => {
    if (!user) return

    try {
      await downloadWithSession(
        `reports/financial/export/pdf?date_from=${reportFrom}&date_to=${reportTo}`,
        `financial-report-${reportFrom}-to-${reportTo}.pdf`,
      )
      notify('PDF report downloaded.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'PDF export failed.')
    }
  }

  const downloadSalePdf = async (saleId: number, invoiceNumber: string) => {
    if (!user) return

    try {
      const safeName = invoiceNumber.replace(/[^A-Za-z0-9\-_]/g, '-')
      await downloadWithSession(`sales/${saleId}/pdf`, `receipt-${safeName}.pdf`)
      notify('Receipt downloaded.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Receipt download failed.')
    }
  }

  const downloadProductLabelPdf = async (productId: number) => {
    if (!user) return

    try {
      await downloadWithSession(`products/${productId}/label`, `label-${productId}.pdf`)
      notify('Label PDF downloaded.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Label download failed.')
    }
  }

  const startCheckout = async (planId: string) => {
    setUpgrading(true)
    try {
      const response = await api<{ authorization_url: string; demo_mode: boolean; reference: string }>(
        'billing/checkout',
        {
          method: 'POST',
          body: JSON.stringify({ plan: planId }),
        },
      )

      if (response.demo_mode) {
        await api('billing/confirm-demo', {
          method: 'POST',
          body: JSON.stringify({ plan: planId, reference: response.reference }),
        })
        setSubscriptionExpired(false)
        await refreshUser()
        notify('Subscription activated.')
        await loadPage('settings')
        return
      }

      window.location.href = response.authorization_url
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Checkout failed.')
    } finally {
      setUpgrading(false)
    }
  }

  const resendVerification = async () => {
    setResendingVerification(true)
    try {
      const response = await api<{ message?: string }>('auth/email/resend', { method: 'POST' })
      notify(response.message || 'Verification email sent.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not resend verification email.')
    } finally {
      setResendingVerification(false)
    }
  }

  const exportActivityLog = async (from?: string, to?: string) => {
    if (!user) return
    try {
      const query = new URLSearchParams()
      if (from) query.set('from', from)
      if (to) query.set('to', to)
      const suffix = query.toString() ? `?${query.toString()}` : ''
      await downloadWithSession(
        `settings/activity/export${suffix}`,
        `activity-log-${new Date().toISOString().slice(0, 10)}.csv`,
        'text/csv',
      )
      notify('Activity log downloaded.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Activity export failed.')
    }
  }

  const openPlanSettings = () => {
    setSettingsTab('plan')
    setPage('settings')
    void loadPage('settings')
  }

  const submitDrawer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!drawer) return

    try {
      let endpoint: string = drawer
      let method = 'POST'
      const payload: Record<string, unknown> = normalizePayload(event.currentTarget)

      if (drawer === 'stock') endpoint = stockMode === 'in' ? 'stock/in' : stockMode === 'out' ? 'stock/out' : 'stock/adjust'
      if (drawer === 'sales') payload.items = collectTransactionItems(event.currentTarget)
      if (drawer === 'purchases') payload.items = collectTransactionItems(event.currentTarget, true)

      if (drawer === 'products' && editingProduct) {
        endpoint = `products/${editingProduct.id}`
        method = 'PUT'
        delete payload.quantity
      }

      if (['customers', 'suppliers', 'branches'].includes(drawer) && editingDirectory) {
        endpoint = `${drawer}/${editingDirectory.id}`
        method = 'PUT'
      }

      await api(endpoint, {
        method,
        body: JSON.stringify(payload),
      })

      closeDrawer()
      notify('Saved successfully.')
      await loadPage(page)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Save failed.')
    }
  }

  const submitPosSale = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const payload: Record<string, unknown> = normalizePayload(event.currentTarget)
      payload.items = collectTransactionItems(event.currentTarget)
      await api('sales', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setSaleLines([Date.now()])
      notify('Sale saved.')
      await loadPage('sales')
      await loadBasics()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Sale failed.')
    }
  }

  const openPosMode = () => {
    setSaleLines([Date.now()])
    setPosMode(true)
  }

  const openTransactionDetail = async (type: 'sales' | 'purchases', id: number) => {
    try {
      const detail = await api<Transaction>(`${type}/${id}`)
      setTransactionDetailType(type)
      setTransactionDetail(detail)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not load details.')
    }
  }

  const navigate = (key: PageKey) => {
    setPage(key)
    setSearch('')
    void loadPage(key)
  }

  const openCreate = () => {
    if (page === 'products') openProductDrawer(null)
    else if (['customers', 'suppliers', 'branches'].includes(page)) openDirectoryDrawer(page, null)
    else setDrawer(page)
  }

  const drawerTitle = () => {
    if (drawer === 'products' && editingProduct) return 'Edit product'
    if (editingDirectory && drawer && ['customers', 'suppliers', 'branches'].includes(drawer)) {
      return `Edit ${drawer.slice(0, -1)}`
    }
    return drawer ? addLabel(drawer) : ''
  }

  return {
    authReady,
    user,
    authMode,
    setAuthMode,
    resetEmail,
    page,
    pageMeta,
    visiblePages,
    drawer,
    editingProduct,
    editingDirectory,
    reportFrom,
    setReportFrom,
    reportTo,
    setReportTo,
    loading,
    toast,
    search,
    setSearch,
    saleFilters,
    setSaleFilters,
    purchaseFilters,
    setPurchaseFilters,
    productsMeta,
    salesMeta,
    purchasesMeta,
    movementsMeta,
    transactionDetail,
    setTransactionDetail,
    transactionDetailType,
    stockMode,
    setStockMode,
    saleLines,
    setSaleLines,
    purchaseLines,
    setPurchaseLines,
    labelProduct,
    setLabelProduct,
    subscriptionExpired,
    emailVerified,
    resendingVerification,
    billingPlans,
    upgrading,
    settingsTab,
    trialDaysLeft,
    data,
    can,
    money,
    submitAuth,
    submitForgotPassword,
    submitResetPassword,
    logout,
    loadPage,
    createCategory,
    downloadProductImportTemplate,
    importProductsCsv,
    importingProducts,
    fetchProductCodes,
    lookupProduct,
    saveSettings,
    inviteTeamUser,
    updateTeamUser,
    closeDrawer,
    openProductDrawer,
    deleteProduct,
    openDirectoryDrawer,
    deleteDirectory,
    exportFinancialReport,
    exportFinancialReportPdf,
    downloadSalePdf,
    downloadProductLabelPdf,
    startCheckout,
    resendVerification,
    exportActivityLog,
    openPlanSettings,
    submitDrawer,
    submitPosSale,
    posMode,
    setPosMode,
    openPosMode,
    openTransactionDetail,
    navigate,
    openCreate,
    drawerTitle,
  }
}
