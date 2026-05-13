const app = document.querySelector('#app');

const state = {
    token: localStorage.getItem('gitinventory_token'),
    user: readJson('gitinventory_user'),
    page: 'dashboard',
    authMode: 'login',
    loading: false,
    toast: '',
    drawer: null,
    data: {
        dashboard: null,
        products: [],
        categories: [],
        customers: [],
        suppliers: [],
        branches: [],
        sales: [],
        purchases: [],
        movements: [],
    },
    search: '',
    stockMode: 'in',
};

const pages = [
    ['dashboard', 'Dashboard', 'Overview and performance'],
    ['products', 'Products', 'Inventory catalog'],
    ['stock', 'Stock', 'Adjustments and history'],
    ['sales', 'Sales', 'Invoices and payments'],
    ['purchases', 'Purchases', 'Receiving and suppliers'],
    ['customers', 'Customers', 'Customer records'],
    ['suppliers', 'Suppliers', 'Supplier records'],
    ['branches', 'Branches', 'Locations and outlets'],
];

function readJson(key) {
    try {
        return JSON.parse(localStorage.getItem(key));
    } catch {
        return null;
    }
}

function money(value) {
    const amount = Number(value || 0);
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: state.user?.tenant?.currency || 'NGN',
        maximumFractionDigits: 0,
    }).format(amount);
}

function escapeHtml(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function getList(payload) {
    return Array.isArray(payload) ? payload : payload?.data || [];
}

async function api(path, options = {}) {
    const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (state.token) {
        headers.Authorization = `Bearer ${state.token}`;
    }

    const response = await fetch(`/api/${path}`, {
        ...options,
        headers,
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) : {};

    if (!response.ok) {
        const validation = body.errors
            ? Object.values(body.errors).flat().join(' ')
            : body.message;
        throw new Error(validation || 'Request failed.');
    }

    return body;
}

function notify(message) {
    state.toast = message;
    render();
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => {
        state.toast = '';
        render();
    }, 3500);
}

async function loadBasics() {
    if (!state.token) return;

    const [categories, branches, customers, suppliers, products] = await Promise.all([
        api('categories'),
        api('branches'),
        api('customers'),
        api('suppliers'),
        api('products?per_page=100'),
    ]);

    state.data.categories = getList(categories);
    state.data.branches = getList(branches);
    state.data.customers = getList(customers);
    state.data.suppliers = getList(suppliers);
    state.data.products = getList(products);
}

async function loadPage(page = state.page) {
    if (!state.token) return;

    state.loading = true;
    render();

    try {
        if (page === 'dashboard') {
            const [dashboard] = await Promise.all([api('dashboard'), loadBasics()]);
            state.data.dashboard = dashboard;
        }

        if (page === 'products') {
            await loadBasics();
            const products = await api(`products?per_page=100&search=${encodeURIComponent(state.search)}`);
            state.data.products = getList(products);
        }

        if (page === 'stock') {
            await loadBasics();
            const movements = await api('stock/movements?per_page=50');
            state.data.movements = getList(movements);
        }

        if (page === 'sales') {
            await loadBasics();
            const sales = await api('sales?per_page=50');
            state.data.sales = getList(sales);
        }

        if (page === 'purchases') {
            await loadBasics();
            const purchases = await api('purchases?per_page=50');
            state.data.purchases = getList(purchases);
        }

        if (['customers', 'suppliers', 'branches'].includes(page)) {
            await loadBasics();
        }
    } catch (error) {
        notify(error.message);
        if (/Unauthenticated/i.test(error.message)) logout(false);
    } finally {
        state.loading = false;
        render();
    }
}

function setSession(payload) {
    state.token = payload.token;
    state.user = payload.user;
    localStorage.setItem('gitinventory_token', payload.token);
    localStorage.setItem('gitinventory_user', JSON.stringify(payload.user));
}

function logout(callApi = true) {
    if (callApi && state.token) {
        api('auth/logout', { method: 'POST' }).catch(() => {});
    }

    state.token = null;
    state.user = null;
    state.page = 'dashboard';
    state.drawer = null;
    localStorage.removeItem('gitinventory_token');
    localStorage.removeItem('gitinventory_user');
    render();
}

function currentPageMeta() {
    return pages.find(([key]) => key === state.page) || pages[0];
}

function render() {
    app.innerHTML = state.token ? renderShell() : renderAuth();
}

function renderAuth() {
    const isLogin = state.authMode === 'login';
    return `
        <main class="auth-page">
            <section class="auth-visual">
                <div class="brand">
                    <div class="brand-mark">GI</div>
                    <div>
                        <div class="brand-name">GITInventory</div>
                        <div class="brand-meta">Inventory, sales, and receiving</div>
                    </div>
                </div>
                <div>
                    <h1>Run stock, sales, and purchasing from one live desk.</h1>
                    <p>Track products, low stock, payments, suppliers, branches, and daily movement without leaving the workflow.</p>
                </div>
            </section>
            <section class="auth-panel">
                <div class="auth-tabs">
                    <button class="tab-button ${isLogin ? 'active' : ''}" data-auth-mode="login">Sign in</button>
                    <button class="tab-button ${!isLogin ? 'active' : ''}" data-auth-mode="register">Create account</button>
                </div>
                <form id="auth-form" class="form-grid" style="margin-top:18px">
                    ${isLogin ? renderLoginFields() : renderRegisterFields()}
                    <button class="btn primary" type="submit" ${state.loading ? 'disabled' : ''}>
                        ${state.loading ? 'Please wait' : (isLogin ? 'Sign in' : 'Start trial')}
                    </button>
                </form>
                <p class="panel-note" style="margin-top:14px">
                    ${isLogin ? 'Use the owner account created by the API seed or registration flow.' : 'Registration requires roles to be seeded on the backend.'}
                </p>
            </section>
        </main>
        ${renderToast()}
    `;
}

function renderLoginFields() {
    return `
        <div class="field">
            <label>Email</label>
            <input class="input" name="email" type="email" autocomplete="email" required>
        </div>
        <div class="field">
            <label>Password</label>
            <input class="input" name="password" type="password" autocomplete="current-password" required>
        </div>
    `;
}

function renderRegisterFields() {
    return `
        <div class="field">
            <label>Business name</label>
            <input class="input" name="business_name" required>
        </div>
        <div class="field">
            <label>Your name</label>
            <input class="input" name="name" autocomplete="name" required>
        </div>
        <div class="field">
            <label>Email</label>
            <input class="input" name="email" type="email" autocomplete="email" required>
        </div>
        <div class="field">
            <label>Phone</label>
            <input class="input" name="phone" autocomplete="tel">
        </div>
        <div class="field">
            <label>Password</label>
            <input class="input" name="password" type="password" autocomplete="new-password" required>
        </div>
        <div class="field">
            <label>Confirm password</label>
            <input class="input" name="password_confirmation" type="password" autocomplete="new-password" required>
        </div>
    `;
}

function renderShell() {
    const [, title, subtitle] = currentPageMeta();
    return `
        <div class="app-shell">
            <aside class="sidebar">
                <div class="brand">
                    <div class="brand-mark">GI</div>
                    <div>
                        <div class="brand-name">GITInventory</div>
                        <div class="brand-meta">${escapeHtml(state.user?.tenant?.name || 'Workspace')}</div>
                    </div>
                </div>
                <nav class="nav">
                    ${pages.map(([key, label]) => `
                        <button class="nav-button ${state.page === key ? 'active' : ''}" data-page="${key}">
                            <span>${navIcon(key)}</span><span>${label}</span>
                        </button>
                    `).join('')}
                </nav>
                <div class="sidebar-footer">
                    <div>
                        <div class="nav-label">Signed in</div>
                        <strong>${escapeHtml(state.user?.name || 'User')}</strong>
                    </div>
                    <button class="btn ghost" data-action="logout">Sign out</button>
                </div>
            </aside>
            <main class="main">
                <header class="topbar">
                    <div>
                        <h1 class="page-title">${title}</h1>
                        <p class="page-subtitle">${subtitle}</p>
                    </div>
                    ${renderTopActions()}
                </header>
                <section class="content">
                    ${renderPage()}
                </section>
            </main>
        </div>
        ${renderDrawer()}
        ${renderToast()}
    `;
}

function navIcon(key) {
    return {
        dashboard: '#',
        products: '[]',
        stock: '+/-',
        sales: '$',
        purchases: '<-',
        customers: '@',
        suppliers: 'S',
        branches: 'B',
    }[key];
}

function renderTopActions() {
    const addLabels = {
        products: 'New product',
        stock: 'Record stock',
        sales: 'New sale',
        purchases: 'New purchase',
        customers: 'New customer',
        suppliers: 'New supplier',
        branches: 'New branch',
    };

    return `
        <div class="button-row">
            <button class="btn ghost" data-action="refresh">${state.loading ? 'Loading' : 'Refresh'}</button>
            ${addLabels[state.page] ? `<button class="btn primary" data-drawer="${state.page}">${addLabels[state.page]}</button>` : ''}
        </div>
    `;
}

function renderPage() {
    if (state.loading && !state.data.dashboard && state.page === 'dashboard') {
        return `<div class="panel empty">Loading dashboard...</div>`;
    }

    return {
        dashboard: renderDashboard,
        products: renderProducts,
        stock: renderStock,
        sales: renderSales,
        purchases: renderPurchases,
        customers: () => renderDirectory('customers'),
        suppliers: () => renderDirectory('suppliers'),
        branches: () => renderDirectory('branches'),
    }[state.page]();
}

function renderDashboard() {
    const dashboard = state.data.dashboard || {};
    const metrics = dashboard.metrics || {};
    const today = metrics.today || {};
    const month = metrics.this_month || {};
    const chart = dashboard.charts?.sales_last_7_days || [];
    const topProducts = dashboard.charts?.top_products || [];

    return `
        <div class="metrics-grid">
            ${metric('Today revenue', money(today.revenue), `${today.sales_count || 0} sales`, 'green')}
            ${metric('Month revenue', money(month.revenue), `${month.sales_count || 0} sales`, 'blue')}
            ${metric('Low stock', metrics.low_stock_count || 0, 'Needs reorder attention', 'amber')}
            ${metric('Receivables', money(metrics.pending_receivables), 'Pending customer payments', 'rose')}
        </div>
        <div class="grid-2">
            <section class="panel">
                <div class="panel-header">
                    <div>
                        <h2 class="panel-title">Last 7 days sales</h2>
                        <p class="panel-note">Completed sales revenue by day</p>
                    </div>
                </div>
                ${renderChart(chart)}
            </section>
            <section class="panel">
                <div class="panel-header">
                    <div>
                        <h2 class="panel-title">Top products</h2>
                        <p class="panel-note">Best sellers this month</p>
                    </div>
                </div>
                ${topProducts.length ? `
                    <div class="table-wrap">
                        <table>
                            <thead><tr><th>Product</th><th>Qty</th><th>Revenue</th></tr></thead>
                            <tbody>
                                ${topProducts.map(item => `
                                    <tr>
                                        <td>${escapeHtml(item.name)}</td>
                                        <td>${item.total_qty}</td>
                                        <td>${money(item.total_revenue)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `<div class="empty">No completed sales yet.</div>`}
            </section>
        </div>
        <section class="panel">
            <div class="panel-header">
                <div>
                    <h2 class="panel-title">Inventory snapshot</h2>
                    <p class="panel-note">Active products, expiry risk, and estimated profit</p>
                </div>
            </div>
            <div class="metrics-grid">
                ${metric('Active products', metrics.total_products || 0, 'Available catalog items', 'blue')}
                ${metric('Expiring soon', metrics.expiring_soon || 0, 'Within 30 days', 'amber')}
                ${metric('Month profit', money(month.profit), 'Estimated gross profit', 'green')}
                ${metric('Branches', state.data.branches.length, 'Operating locations', 'blue')}
            </div>
        </section>
    `;
}

function metric(label, value, note, tone) {
    return `
        <div class="metric ${tone}">
            <div class="label">${label}</div>
            <div class="value">${value}</div>
            <div class="tiny">${note}</div>
        </div>
    `;
}

function renderChart(rows) {
    if (!rows.length) return `<div class="empty">No chart data yet.</div>`;

    const max = Math.max(...rows.map(row => Number(row.revenue || 0)), 1);
    return `
        <div class="chart-bars">
            ${rows.map(row => {
                const height = Math.max(10, (Number(row.revenue || 0) / max) * 190);
                return `
                    <div class="bar-wrap" title="${money(row.revenue)}">
                        <div class="bar" style="height:${height}px"></div>
                        <div class="bar-label">${String(row.sale_date).slice(5)}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderProducts() {
    const products = state.data.products || [];
    return `
        <section class="panel">
            <div class="toolbar">
                <div class="toolbar-left">
                    <input class="input search" data-search="products" value="${escapeHtml(state.search)}" placeholder="Search name, SKU, or barcode">
                    <button class="btn ghost" data-action="search-products">Search</button>
                </div>
                <div class="tiny">${products.length} products loaded</div>
            </div>
        </section>
        <section class="panel">
            ${products.length ? `
                <div class="table-wrap">
                    <table>
                        <thead><tr><th>Name</th><th>SKU</th><th>Category</th><th>Branch</th><th>Qty</th><th>Price</th><th>Status</th></tr></thead>
                        <tbody>
                            ${products.map(product => `
                                <tr>
                                    <td><strong>${escapeHtml(product.name)}</strong><div class="tiny">${escapeHtml(product.unit || '')}</div></td>
                                    <td>${escapeHtml(product.sku || '-')}</td>
                                    <td>${escapeHtml(product.category?.name || '-')}</td>
                                    <td>${escapeHtml(product.branch?.name || '-')}</td>
                                    <td>${product.quantity ?? 0}</td>
                                    <td>${money(product.selling_price)}</td>
                                    <td>${stockStatus(product)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : `<div class="empty">No products found. Add your first stock item.</div>`}
        </section>
    `;
}

function stockStatus(product) {
    if (Number(product.quantity) <= Number(product.min_stock_level || 0)) {
        return `<span class="status warn">Low stock</span>`;
    }
    if (product.is_active === false) {
        return `<span class="status bad">Inactive</span>`;
    }
    return `<span class="status good">Active</span>`;
}

function renderStock() {
    const movements = state.data.movements || [];
    return `
        <section class="panel">
            <div class="segmented three" style="max-width:420px">
                <button class="segment-button ${state.stockMode === 'in' ? 'active' : ''}" data-stock-mode="in">Stock in</button>
                <button class="segment-button ${state.stockMode === 'out' ? 'active' : ''}" data-stock-mode="out">Stock out</button>
                <button class="segment-button ${state.stockMode === 'adjust' ? 'active' : ''}" data-stock-mode="adjust">Adjust</button>
            </div>
        </section>
        <section class="panel">
            <div class="panel-header">
                <div>
                    <h2 class="panel-title">Stock movement history</h2>
                    <p class="panel-note">Latest stock in, stock out, and manual adjustments</p>
                </div>
            </div>
            ${movements.length ? `
                <div class="table-wrap">
                    <table>
                        <thead><tr><th>Product</th><th>Type</th><th>Qty</th><th>Before</th><th>After</th><th>Note</th></tr></thead>
                        <tbody>
                            ${movements.map(item => `
                                <tr>
                                    <td>${escapeHtml(item.product?.name || '-')}</td>
                                    <td><span class="status">${escapeHtml(item.type)}</span></td>
                                    <td>${item.quantity}</td>
                                    <td>${item.quantity_before}</td>
                                    <td>${item.quantity_after}</td>
                                    <td>${escapeHtml(item.note || '-')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : `<div class="empty">No stock movements yet.</div>`}
        </section>
    `;
}

function renderSales() {
    return renderTransactionTable('sales', state.data.sales, 'invoice_number', 'sale_date', 'customer');
}

function renderPurchases() {
    return renderTransactionTable('purchases', state.data.purchases, 'reference_number', 'purchase_date', 'supplier');
}

function renderTransactionTable(type, rows, referenceKey, dateKey, relationKey) {
    return `
        <section class="panel">
            ${rows.length ? `
                <div class="table-wrap">
                    <table>
                        <thead><tr><th>Reference</th><th>Date</th><th>${relationKey}</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th></tr></thead>
                        <tbody>
                            ${rows.map(row => `
                                <tr>
                                    <td><strong>${escapeHtml(row[referenceKey] || `${type}-${row.id}`)}</strong></td>
                                    <td>${escapeHtml(row[dateKey] || '-')}</td>
                                    <td>${escapeHtml(row[relationKey]?.name || 'Walk-in')}</td>
                                    <td>${money(row.total_amount)}</td>
                                    <td>${money(row.amount_paid)}</td>
                                    <td>${money(row.amount_due)}</td>
                                    <td><span class="status ${row.payment_status === 'paid' ? 'good' : 'warn'}">${escapeHtml(row.payment_status || '-')}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : `<div class="empty">No ${type} recorded yet.</div>`}
        </section>
    `;
}

function renderDirectory(type) {
    const rows = state.data[type] || [];
    const title = type[0].toUpperCase() + type.slice(1);

    return `
        <section class="panel">
            <div class="panel-header">
                <div>
                    <h2 class="panel-title">${title}</h2>
                    <p class="panel-note">Manage ${type} available to this tenant</p>
                </div>
            </div>
            ${rows.length ? `
                <div class="table-wrap">
                    <table>
                        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Location</th><th>Status</th></tr></thead>
                        <tbody>
                            ${rows.map(row => `
                                <tr>
                                    <td><strong>${escapeHtml(row.name)}</strong><div class="tiny">${escapeHtml(row.code || row.city || '')}</div></td>
                                    <td>${escapeHtml(row.email || '-')}</td>
                                    <td>${escapeHtml(row.phone || '-')}</td>
                                    <td>${escapeHtml(row.address || row.state || '-')}</td>
                                    <td><span class="status ${row.is_active === false ? 'bad' : 'good'}">${row.is_active === false ? 'Inactive' : 'Active'}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : `<div class="empty">No ${type} added yet.</div>`}
        </section>
    `;
}

function renderDrawer() {
    if (!state.drawer) return '';

    const title = {
        products: 'New product',
        stock: 'Record stock movement',
        sales: 'New sale',
        purchases: 'New purchase',
        customers: 'New customer',
        suppliers: 'New supplier',
        branches: 'New branch',
    }[state.drawer];

    return `
        <div class="drawer open">
            <div class="drawer-backdrop" data-action="close-drawer"></div>
            <aside class="drawer-panel">
                <div class="panel-header">
                    <div>
                        <h2 class="panel-title">${title}</h2>
                        <p class="panel-note">Saved directly through the Laravel API.</p>
                    </div>
                    <button class="btn ghost" data-action="close-drawer">Close</button>
                </div>
                ${renderDrawerForm(state.drawer)}
            </aside>
        </div>
    `;
}

function renderDrawerForm(type) {
    if (type === 'products') return renderProductForm();
    if (type === 'stock') return renderStockForm();
    if (type === 'sales') return renderSaleForm();
    if (type === 'purchases') return renderPurchaseForm();
    return renderDirectoryForm(type);
}

function optionRows(rows, placeholder = 'Select') {
    return `<option value="">${placeholder}</option>${rows.map(row => `<option value="${row.id}">${escapeHtml(row.name)}</option>`).join('')}`;
}

function renderProductForm() {
    return `
        <form id="product-form" class="form-grid">
            <div class="field"><label>Name</label><input class="input" name="name" required></div>
            <div class="form-grid two">
                <div class="field"><label>SKU</label><input class="input" name="sku"></div>
                <div class="field"><label>Barcode</label><input class="input" name="barcode"></div>
            </div>
            <div class="form-grid two">
                <div class="field"><label>Category</label><select class="select" name="category_id">${optionRows(state.data.categories)}</select></div>
                <div class="field"><label>Branch</label><select class="select" name="branch_id">${optionRows(state.data.branches)}</select></div>
            </div>
            <div class="form-grid two">
                <div class="field"><label>Unit</label><select class="select" name="unit" required>
                    ${['piece','kg','litre','box','pack','dozen','carton'].map(unit => `<option value="${unit}">${unit}</option>`).join('')}
                </select></div>
                <div class="field"><label>Quantity</label><input class="input" name="quantity" type="number" min="0" value="0" required></div>
            </div>
            <div class="form-grid two">
                <div class="field"><label>Cost price</label><input class="input" name="cost_price" type="number" min="0" step="0.01" required></div>
                <div class="field"><label>Selling price</label><input class="input" name="selling_price" type="number" min="0" step="0.01" required></div>
            </div>
            <div class="form-grid two">
                <div class="field"><label>Min stock</label><input class="input" name="min_stock_level" type="number" min="0" value="0"></div>
                <div class="field"><label>Expiry date</label><input class="input" name="expiry_date" type="date"></div>
            </div>
            <div class="field"><label>Description</label><textarea class="textarea" name="description"></textarea></div>
            <button class="btn primary" type="submit">Save product</button>
        </form>
    `;
}

function renderStockForm() {
    const isAdjust = state.stockMode === 'adjust';
    return `
        <form id="stock-form" class="form-grid">
            <div class="segmented three">
                <button type="button" class="segment-button ${state.stockMode === 'in' ? 'active' : ''}" data-stock-mode="in">Stock in</button>
                <button type="button" class="segment-button ${state.stockMode === 'out' ? 'active' : ''}" data-stock-mode="out">Stock out</button>
                <button type="button" class="segment-button ${state.stockMode === 'adjust' ? 'active' : ''}" data-stock-mode="adjust">Adjust</button>
            </div>
            <div class="field"><label>Product</label><select class="select" name="product_id" required>${optionRows(state.data.products)}</select></div>
            <div class="field">
                <label>${isAdjust ? 'New quantity' : 'Quantity'}</label>
                <input class="input" name="${isAdjust ? 'new_quantity' : 'quantity'}" type="number" min="${isAdjust ? '0' : '1'}" required>
            </div>
            ${state.stockMode === 'in' ? `<div class="field"><label>Unit cost</label><input class="input" name="unit_cost" type="number" min="0" step="0.01"></div>` : ''}
            <div class="field"><label>Note</label><textarea class="textarea" name="note" ${isAdjust ? 'required' : ''}></textarea></div>
            <button class="btn primary" type="submit">Save movement</button>
        </form>
    `;
}

function renderSaleForm() {
    return renderTransactionForm('sale-form', 'sales', 'sale_date', 'customer_id', state.data.customers, [
        ['payment_method', 'Payment method', 'select', ['cash', 'transfer', 'pos', 'wallet']],
        ['amount_paid', 'Amount paid', 'number'],
        ['discount_amount', 'Discount', 'number'],
    ]);
}

function renderPurchaseForm() {
    return renderTransactionForm('purchase-form', 'purchases', 'purchase_date', 'supplier_id', state.data.suppliers, [
        ['reference_number', 'Reference number', 'text'],
        ['amount_paid', 'Amount paid', 'number'],
    ], true);
}

function renderTransactionForm(formId, type, dateField, partyField, partyRows, extraFields, purchase = false) {
    return `
        <form id="${formId}" class="form-grid">
            <div class="form-grid two">
                <div class="field"><label>Date</label><input class="input" name="${dateField}" type="date" value="${new Date().toISOString().slice(0, 10)}" required></div>
                <div class="field"><label>Branch</label><select class="select" name="branch_id">${optionRows(state.data.branches)}</select></div>
            </div>
            <div class="field"><label>${purchase ? 'Supplier' : 'Customer'}</label><select class="select" name="${partyField}">${optionRows(partyRows, purchase ? 'Optional supplier' : 'Walk-in customer')}</select></div>
            ${extraFields.map(([name, label, inputType, values]) => `
                <div class="field">
                    <label>${label}</label>
                    ${inputType === 'select'
                        ? `<select class="select" name="${name}" required>${values.map(value => `<option value="${value}">${value}</option>`).join('')}</select>`
                        : `<input class="input" name="${name}" type="${inputType}" min="0" step="0.01" ${name === 'amount_paid' ? 'value="0" required' : ''}>`}
                </div>
            `).join('')}
            <div class="panel" style="padding:12px">
                <div class="panel-header">
                    <h3 class="panel-title">Items</h3>
                    <button class="btn ghost" type="button" data-action="add-item">Add line</button>
                </div>
                <div id="items-list" class="form-grid">
                    ${renderItemLine(purchase)}
                </div>
            </div>
            <div class="field"><label>Notes</label><textarea class="textarea" name="notes"></textarea></div>
            <button class="btn primary" type="submit">Save ${type.slice(0, -1)}</button>
        </form>
    `;
}

function renderItemLine(purchase = false) {
    return `
        <div class="item-line" data-item-line>
            <div class="field"><label>Product</label><select class="select" name="product_id" required>${optionRows(state.data.products)}</select></div>
            <div class="field"><label>Qty</label><input class="input" name="${purchase ? 'quantity_ordered' : 'quantity'}" type="number" min="1" value="1" required></div>
            ${purchase
                ? `<div class="field"><label>Received</label><input class="input" name="quantity_received" type="number" min="0" value="1" required></div>
                   <div class="field"><label>Cost</label><input class="input" name="unit_cost" type="number" min="0" step="0.01" required></div>`
                : `<div class="field"><label>Price</label><input class="input" name="unit_price" type="number" min="0" step="0.01" required></div>`}
            <button class="btn ghost" type="button" data-action="remove-item">X</button>
        </div>
    `;
}

function renderDirectoryForm(type) {
    const fields = {
        customers: ['name', 'email', 'phone', 'address', 'city', 'credit_limit'],
        suppliers: ['name', 'email', 'phone', 'address'],
        branches: ['name', 'code', 'email', 'phone', 'address', 'city', 'state'],
    }[type];

    return `
        <form id="directory-form" class="form-grid" data-type="${type}">
            ${fields.map(field => `
                <div class="field">
                    <label>${field.replaceAll('_', ' ')}</label>
                    <input class="input" name="${field}" ${field === 'email' ? 'type="email"' : field === 'credit_limit' ? 'type="number" min="0" step="0.01"' : 'type="text"'} ${field === 'name' ? 'required' : ''}>
                </div>
            `).join('')}
            <button class="btn primary" type="submit">Save ${type.slice(0, -1)}</button>
        </form>
    `;
}

function renderToast() {
    return state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : '';
}

function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
}

function cleanPayload(payload) {
    Object.keys(payload).forEach(key => {
        if (payload[key] === '') payload[key] = null;
        if (['quantity', 'new_quantity', 'cost_price', 'selling_price', 'min_stock_level', 'tax_rate', 'amount_paid', 'discount_amount', 'unit_cost', 'credit_limit', 'quantity_ordered', 'quantity_received', 'unit_price'].includes(key) && payload[key] !== null) {
            payload[key] = Number(payload[key]);
        }
    });
    return payload;
}

function collectItems(form, purchase = false) {
    return [...form.querySelectorAll('[data-item-line]')].map(line => {
        const row = Object.fromEntries([...line.querySelectorAll('input, select')].map(input => [input.name, input.value]));
        return purchase ? cleanPayload({
            product_id: row.product_id,
            quantity_ordered: row.quantity_ordered,
            quantity_received: row.quantity_received,
            unit_cost: row.unit_cost,
        }) : cleanPayload({
            product_id: row.product_id,
            quantity: row.quantity,
            unit_price: row.unit_price,
            discount: 0,
        });
    });
}

async function submitAuth(form) {
    state.loading = true;
    render();

    try {
        const payload = cleanPayload(formData(form));
        const data = await api(`auth/${state.authMode}`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        setSession(data);
        notify(data.message || 'Welcome back.');
        await loadPage('dashboard');
    } catch (error) {
        notify(error.message);
    } finally {
        state.loading = false;
        render();
    }
}

async function submitDrawer(form) {
    try {
        let endpoint = state.drawer;
        let payload = cleanPayload(formData(form));

        if (state.drawer === 'stock') {
            endpoint = state.stockMode === 'in' ? 'stock/in' : state.stockMode === 'out' ? 'stock/out' : 'stock/adjust';
        }

        if (state.drawer === 'sales') {
            endpoint = 'sales';
            payload.items = collectItems(form);
        }

        if (state.drawer === 'purchases') {
            endpoint = 'purchases';
            payload.items = collectItems(form, true);
        }

        await api(endpoint, {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        state.drawer = null;
        notify('Saved successfully.');
        await loadPage(state.page);
    } catch (error) {
        notify(error.message);
    }
}

document.addEventListener('click', event => {
    const authMode = event.target.closest('[data-auth-mode]')?.dataset.authMode;
    if (authMode) {
        state.authMode = authMode;
        render();
        return;
    }

    const page = event.target.closest('[data-page]')?.dataset.page;
    if (page) {
        state.page = page;
        state.search = '';
        loadPage(page);
        return;
    }

    const drawer = event.target.closest('[data-drawer]')?.dataset.drawer;
    if (drawer) {
        state.drawer = drawer;
        render();
        return;
    }

    const stockMode = event.target.closest('[data-stock-mode]')?.dataset.stockMode;
    if (stockMode) {
        state.stockMode = stockMode;
        render();
        return;
    }

    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;

    if (action === 'logout') logout();
    if (action === 'refresh') loadPage(state.page);
    if (action === 'close-drawer') {
        state.drawer = null;
        render();
    }
    if (action === 'search-products') loadPage('products');
    if (action === 'add-item') {
        const list = document.querySelector('#items-list');
        list.insertAdjacentHTML('beforeend', renderItemLine(state.drawer === 'purchases'));
    }
    if (action === 'remove-item') {
        const line = event.target.closest('[data-item-line]');
        if (document.querySelectorAll('[data-item-line]').length > 1) line.remove();
    }
});

document.addEventListener('input', event => {
    if (event.target.matches('[data-search="products"]')) {
        state.search = event.target.value;
    }
});

document.addEventListener('submit', event => {
    event.preventDefault();

    if (event.target.id === 'auth-form') {
        submitAuth(event.target);
        return;
    }

    if (['product-form', 'stock-form', 'sale-form', 'purchase-form', 'directory-form'].includes(event.target.id)) {
        submitDrawer(event.target);
    }
});

render();
if (state.token) loadPage(state.page);
