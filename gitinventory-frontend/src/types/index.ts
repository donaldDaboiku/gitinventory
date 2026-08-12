export type PageKey =
  | 'dashboard'
  | 'products'
  | 'stock'
  | 'sales'
  | 'purchases'
  | 'customers'
  | 'suppliers'
  | 'branches'
  | 'reports'
  | 'settings'

export type AuthMode = 'login' | 'register'
export type StockMode = 'in' | 'out' | 'adjust'

export type Tenant = {
  id: number
  name: string
  email?: string
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  currency?: string
  timezone?: string
  logo?: string | null
  subscription_plan?: string
  trial_ends_at?: string | null
  subscription_expires_at?: string | null
  on_trial?: boolean
  has_active_subscription?: boolean
}

export type SettingsPreferences = {
  default_min_stock_level: number
  default_tax_rate: number
  invoice_prefix: string
  allow_negative_stock: boolean
}

export type SettingsPayload = {
  tenant: Tenant
  preferences: SettingsPreferences
  assignable_roles: string[]
}

export type TeamUser = {
  id: number
  name: string
  email: string
  phone?: string | null
  is_active: boolean
  roles: string[]
  last_login_at?: string | null
}

export type User = {
  id: number
  name: string
  email: string
  tenant?: Tenant | null
  permissions?: string[]
}

export type PaginatedMeta = {
  page: number
  lastPage: number
  total: number
}

export type PaginatedResponse<T> = {
  data: T[]
  current_page: number
  last_page: number
  total: number
}

export type ApiList<T> = T[] | PaginatedResponse<T>

export type Category = {
  id: number
  name: string
}

export type Branch = {
  id: number
  name: string
  code?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  is_active?: boolean
  is_main?: boolean
}

export type Product = {
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
  category_id?: number | null
  branch_id?: number | null
  description?: string | null
  expiry_date?: string | null
  category?: Category | null
  branch?: Branch | null
}

export type ProductLookup = {
  id: number
  name: string
  sku?: string | null
  barcode?: string | null
  selling_price: string | number
  quantity: number
  tax_rate?: string | number | null
  unit?: string
}

export type BillingPlan = {
  id: string
  name: string
  amount: number
  currency: string
  interval_days: number
  description: string
}

export type Person = {
  id: number
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  code?: string | null
  credit_limit?: string | number | null
  is_active?: boolean
}

export type TransactionLine = {
  id: number
  quantity?: number
  quantity_ordered?: number
  quantity_received?: number
  unit_price?: string | number
  unit_cost?: string | number
  subtotal: string | number
  product?: Product | null
}

export type Transaction = {
  id: number
  invoice_number?: string | null
  reference_number?: string | null
  sale_date?: string
  purchase_date?: string
  total_amount: string | number
  amount_paid: string | number
  amount_due: string | number
  payment_status?: string
  payment_method?: string
  subtotal?: string | number
  discount_amount?: string | number
  tax_amount?: string | number
  notes?: string | null
  customer?: Person | null
  supplier?: Person | null
  items?: TransactionLine[]
}

export type Movement = {
  id: number
  type: string
  quantity: number
  quantity_before: number
  quantity_after: number
  note?: string | null
  product?: Product | null
}

export type Dashboard = {
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

export type FinancialReport = {
  period: { date_from: string; date_to: string }
  summary: {
    revenue: string
    cost_of_goods_sold: string
    gross_profit: string
    gross_margin_pct: number
    sales_count: number
    purchases_total: string
    purchases_count: number
    receivables: string
    payables: string
    stock_valuation: string
  }
  daily_breakdown: Array<{
    date: string
    sales_count: number
    revenue: string
    gross_profit: string
  }>
}

export type AppData = {
  dashboard: Dashboard | null
  financialReport: FinancialReport | null
  settings: SettingsPayload | null
  teamUsers: TeamUser[]
  products: Product[]
  lowStockProducts: Product[]
  categories: Category[]
  customers: Person[]
  suppliers: Person[]
  branches: Branch[]
  sales: Transaction[]
  purchases: Transaction[]
  movements: Movement[]
}

export type TransactionFilters = {
  dateFrom: string
  dateTo: string
  paymentStatus: string
}
