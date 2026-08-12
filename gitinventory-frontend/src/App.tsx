import './App.css'
import { AuthPage } from './components/auth/AuthPage'
import { EmailVerificationBanner } from './components/auth/EmailVerificationBanner'
import { SubscriptionExpiredView } from './components/billing/SubscriptionExpiredView'
import { TrialBanner } from './components/billing/TrialBanner'
import { DrawerForm } from './components/DrawerForm'
import { ProductLabelSheet } from './components/ProductLabelSheet'
import { SettingsView } from './components/SettingsView'
import { TransactionDetailPanel } from './components/TransactionDetailPanel'
import { Drawer } from './components/layout/Drawer'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { DashboardView } from './components/views/DashboardView'
import { DirectoryView } from './components/views/DirectoryView'
import { ProductsView } from './components/views/ProductsView'
import { ReportsView } from './components/views/ReportsView'
import { StockView } from './components/views/StockView'
import { TransactionView } from './components/views/TransactionView'
import { Toast } from './components/ui'
import { useInventoryApp } from './hooks/useInventoryApp'

function App() {
  const app = useInventoryApp()

  if (!app.token) {
    return (
      <AuthPage
        authMode={app.authMode}
        setAuthMode={app.setAuthMode}
        loading={app.loading}
        toast={app.toast}
        resetEmail={app.resetEmail}
        onSubmit={app.submitAuth}
        onForgotPassword={app.submitForgotPassword}
        onResetPassword={app.submitResetPassword}
      />
    )
  }

  if (!app.emailVerified) {
    return (
      <>
        <EmailVerificationBanner
          email={app.user?.email}
          sending={app.resendingVerification}
          onResend={() => void app.resendVerification()}
          onLogout={app.logout}
        />
        <Toast message={app.toast} />
      </>
    )
  }

  return (
    <div className="app-shell">
      <Sidebar
        tenantName={app.user?.tenant?.name}
        userName={app.user?.name}
        page={app.page}
        visiblePages={app.visiblePages}
        onNavigate={app.navigate}
        onLogout={app.logout}
      />

      <main className="main">
        {app.trialDaysLeft > 0 && !app.subscriptionExpired && (
          <TrialBanner daysLeft={app.trialDaysLeft} onManage={app.openPlanSettings} />
        )}
        <Topbar
          title={app.pageMeta[1]}
          subtitle={app.pageMeta[2]}
          page={app.page}
          loading={app.loading}
          can={app.can}
          onRefresh={() => void app.loadPage(app.page)}
          onCreate={app.openCreate}
          onExport={() => void app.exportFinancialReport()}
          onExportPdf={() => void app.exportFinancialReportPdf()}
        />

        <section className="content">
          {app.page === 'dashboard' && (
            <DashboardView dashboard={app.data.dashboard} branches={app.data.branches} money={app.money} />
          )}
          {app.page === 'reports' && (
            <ReportsView
              report={app.data.financialReport}
              money={app.money}
              reportFrom={app.reportFrom}
              reportTo={app.reportTo}
              setReportFrom={app.setReportFrom}
              setReportTo={app.setReportTo}
              onRun={() => void app.loadPage('reports')}
            />
          )}
          {app.page === 'products' && (
            <ProductsView
              money={app.money}
              products={app.data.products}
              categories={app.data.categories}
              meta={app.productsMeta}
              search={app.search}
              setSearch={app.setSearch}
              loading={app.loading}
              onLoadMore={() => void app.loadPage('products', { append: true })}
              onCreateCategory={app.createCategory}
              onEdit={app.openProductDrawer}
              onDelete={app.deleteProduct}
              onPrintLabel={app.setLabelProduct}
              onDownloadLabelPdf={(product) => void app.downloadProductLabelPdf(product.id)}
            />
          )}
          {app.page === 'stock' && (
            <StockView
              movements={app.data.movements}
              lowStockProducts={app.data.lowStockProducts}
              movementsMeta={app.movementsMeta}
              stockMode={app.stockMode}
              setStockMode={app.setStockMode}
              loading={app.loading}
              onLoadMore={() => void app.loadPage('stock', { append: true })}
            />
          )}
          {app.page === 'sales' && (
            <TransactionView
              rows={app.data.sales}
              type="sales"
              money={app.money}
              meta={app.salesMeta}
              filters={app.saleFilters}
              setFilters={app.setSaleFilters}
              loading={app.loading}
              onLoadMore={() => void app.loadPage('sales', { append: true })}
              onOpen={(id) => void app.openTransactionDetail('sales', id)}
            />
          )}
          {app.page === 'purchases' && (
            <TransactionView
              rows={app.data.purchases}
              type="purchases"
              money={app.money}
              meta={app.purchasesMeta}
              filters={app.purchaseFilters}
              setFilters={app.setPurchaseFilters}
              loading={app.loading}
              onLoadMore={() => void app.loadPage('purchases', { append: true })}
              onOpen={(id) => void app.openTransactionDetail('purchases', id)}
            />
          )}
          {app.page === 'customers' && (
            <DirectoryView
              rows={app.data.customers}
              title="Customers"
              canEdit={app.can('customers.edit')}
              canDelete={app.can('customers.delete')}
              onEdit={(row) => app.openDirectoryDrawer('customers', row)}
              onDelete={(row) => void app.deleteDirectory('customers', row)}
            />
          )}
          {app.page === 'suppliers' && (
            <DirectoryView
              rows={app.data.suppliers}
              title="Suppliers"
              canEdit={app.can('suppliers.edit')}
              canDelete={app.can('suppliers.delete')}
              onEdit={(row) => app.openDirectoryDrawer('suppliers', row)}
              onDelete={(row) => void app.deleteDirectory('suppliers', row)}
            />
          )}
          {app.page === 'branches' && (
            <DirectoryView
              rows={app.data.branches}
              title="Branches"
              canEdit={app.can('branches.edit')}
              canDelete={app.can('branches.delete')}
              onEdit={(row) => app.openDirectoryDrawer('branches', row)}
              onDelete={(row) => void app.deleteDirectory('branches', row)}
            />
          )}
          {app.page === 'settings' && (
            <SettingsView
              settings={app.data.settings}
              teamUsers={app.data.teamUsers}
              billingPlans={app.billingPlans}
              canEdit={app.can('settings.edit')}
              canManageUsers={app.can('users.create')}
              canUpgrade={app.can('settings.edit')}
              canExportActivity={app.can('settings.view')}
              upgrading={app.upgrading}
              money={app.money}
              initialTab={app.settingsTab}
              onSaveSettings={app.saveSettings}
              onInviteUser={app.inviteTeamUser}
              onUpdateUser={app.updateTeamUser}
              onUpgrade={(planId) => void app.startCheckout(planId)}
              onExportActivity={(from, to) => void app.exportActivityLog(from, to)}
            />
          )}
        </section>
      </main>

      {app.drawer && (
        <Drawer title={app.drawerTitle()} onClose={app.closeDrawer} wide={app.drawer === 'sales'}>
          <DrawerForm
            drawer={app.drawer}
            data={app.data}
            editingProduct={app.editingProduct}
            editingDirectory={app.editingDirectory}
            stockMode={app.stockMode}
            setStockMode={app.setStockMode}
            saleLines={app.saleLines}
            setSaleLines={app.setSaleLines}
            purchaseLines={app.purchaseLines}
            setPurchaseLines={app.setPurchaseLines}
            onSubmit={app.submitDrawer}
            onCreateCategory={app.createCategory}
            fetchProductCodes={app.fetchProductCodes}
            lookupProduct={app.lookupProduct}
          />
        </Drawer>
      )}

      <Toast message={app.toast} />

      {app.transactionDetail && (
        <div className="drawer">
          <button
            className="drawer-backdrop"
            onClick={() => app.setTransactionDetail(null)}
            aria-label="Close detail"
          />
          <aside className="drawer-panel">
            <TransactionDetailPanel
              detail={app.transactionDetail}
              type={app.transactionDetailType}
              money={app.money}
              onClose={() => app.setTransactionDetail(null)}
              onDownloadPdf={
                app.transactionDetailType === 'sales'
                  ? () =>
                      void app.downloadSalePdf(
                        app.transactionDetail!.id,
                        app.transactionDetail!.invoice_number || `sale-${app.transactionDetail!.id}`,
                      )
                  : undefined
              }
            />
          </aside>
        </div>
      )}

      {app.subscriptionExpired && app.page !== 'settings' && (
        <SubscriptionExpiredView
          plans={app.billingPlans}
          money={app.money}
          canUpgrade={app.can('settings.edit')}
          upgrading={app.upgrading}
          onUpgrade={(planId) => void app.startCheckout(planId)}
          onOpenSettings={app.openPlanSettings}
          onLogout={app.logout}
        />
      )}

      {app.labelProduct && (
        <div className="drawer">
          <button
            className="drawer-backdrop"
            onClick={() => app.setLabelProduct(null)}
            aria-label="Close label"
          />
          <aside className="drawer-panel label-panel">
            <ProductLabelSheet
              product={app.labelProduct}
              money={app.money}
              onClose={() => app.setLabelProduct(null)}
            />
          </aside>
        </div>
      )}
    </div>
  )
}

export default App
