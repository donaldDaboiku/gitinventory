import type { PageKey } from '../types'

export const pages: Array<[PageKey, string, string]> = [
  ['dashboard', 'Dashboard', 'Overview and performance'],
  ['reports', 'Reports', 'Financial summary and export'],
  ['products', 'Products', 'Inventory catalog'],
  ['stock', 'Stock', 'Adjustments and history'],
  ['sales', 'Sales', 'Invoices and payments'],
  ['purchases', 'Purchases', 'Receiving and suppliers'],
  ['customers', 'Customers', 'Customer records'],
  ['suppliers', 'Suppliers', 'Supplier records'],
  ['branches', 'Branches', 'Locations and outlets'],
  ['settings', 'Settings', 'Business profile and team'],
]

export const pageViewPermission: Record<PageKey, string> = {
  dashboard: 'reports.view',
  reports: 'reports.view',
  settings: 'settings.view',
  products: 'products.view',
  stock: 'stock.view',
  sales: 'sales.view',
  purchases: 'purchases.view',
  customers: 'customers.view',
  suppliers: 'suppliers.view',
  branches: 'branches.view',
}

export const pageCreatePermission: Partial<Record<PageKey, string>> = {
  products: 'products.create',
  stock: 'stock.in',
  sales: 'sales.create',
  purchases: 'purchases.create',
  customers: 'customers.create',
  suppliers: 'suppliers.create',
  branches: 'branches.create',
}

export const units = ['piece', 'kg', 'litre', 'box', 'pack', 'dozen', 'carton']

export function navIcon(key: PageKey) {
  return {
    dashboard: '#',
    reports: 'R',
    products: '[]',
    stock: '+/-',
    sales: '$',
    purchases: '<-',
    customers: '@',
    suppliers: 'S',
    branches: 'B',
    settings: '⚙',
  }[key]
}

export function addLabel(page: PageKey) {
  return {
    dashboard: '',
    reports: '',
    products: 'New product',
    stock: 'Record stock',
    sales: 'New sale',
    purchases: 'New purchase',
    customers: 'New customer',
    suppliers: 'New supplier',
    branches: 'New branch',
    settings: '',
  }[page]
}
