const App = {
    currentScreen: 'login',
    
    init() {
        Auth.init();
        this.setupEventListeners();
        this.handleRouting();
        Utils.setupBackButton();
        
        if (Auth.isLoggedIn()) {
            Utils.setupAutoLogout();
        }
        
        window.addEventListener('hashchange', () => this.handleRouting());
    },
    
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('#logout-btn')) {
                e.preventDefault();
                Auth.logout();
                this.navigateTo('login');
            }
            
            if (e.target.closest('.back-btn')) {
                e.preventDefault();
                window.history.back();
            }
        });
    },
    
    handleRouting() {
        const hash = window.location.hash || '#/';
        
        if (!Auth.isLoggedIn() && !hash.startsWith('#/login') && !hash.startsWith('#/register')) {
            this.navigateTo('login');
            return;
        }
        
        if (hash === '#/' || hash === '#/dashboard') {
            if (Auth.isAdmin()) {
                this.showAdminDashboard();
            } else {
                this.showUserDashboard();
            }
        } else if (hash === '#/login') {
            this.showLogin();
        } else if (hash === '#/register') {
            this.showRegister();
        } else if (hash === '#/orders') {
            this.showOrderHistory();
        } else if (hash.startsWith('#/service/')) {
            const serviceId = hash.split('/')[2];
            this.showServiceDetails(serviceId);
        } else if (hash.startsWith('#/admin')) {
            if (Auth.isAdmin()) {
                this.showAdminPanel(hash);
            } else {
                this.navigateTo('dashboard');
            }
        }
    },
    
    navigateTo(screen, params = '') {
        if (screen === 'dashboard') {
            window.location.hash = '#/';
        } else if (screen === 'login') {
            window.location.hash = '#/login';
        } else if (screen === 'register') {
            window.location.hash = '#/register';
        } else if (screen === 'orders') {
            window.location.hash = '#/orders';
        } else if (screen === 'service') {
            window.location.hash = `#/service/${params}`;
        }
    },
    
    async loadComponent(componentName, targetElement, callback) {
        try {
            const response = await fetch(`components/${componentName}.html`);
            const html = await response.text();
            document.getElementById('app').innerHTML = html;
            if (callback) callback();
        } catch (error) {
            console.error('Error loading component:', error);
        }
    },
    
    showLogin() {
        this.loadComponent('login', 'app', () => {
            const form = document.getElementById('login-form');
            
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
            
            newForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const phone = document.getElementById('phone').value;
                const password = document.getElementById('password').value;
                
                Utils.showLoader("🤠পরিচয় যাচাই করা হচ্ছে🤠");
                
                try {
                    const user = await Auth.login(phone, password);
                    
                    const [services, packages, orders, settings] = await Promise.all([
                        API.getServices(),
                        API.getPackages(),
                        API.getOrders(user.ID),
                        API.getSettings()
                    ]);
                    
                    Utils.setCache('services', services);
                    Utils.setCache('packages', packages);
                    Utils.setCache('orders', orders);
                    Utils.setCache('settings', settings);
                    
                    Utils.hideLoader();
                    Utils.showToast('success', 'লগইন সফল!');
                    
                    if (Auth.isAdmin()) {
                        window.location.hash = '#/admin';
                    } else {
                        window.location.hash = '#/';
                        Utils.setupAutoLogout();
                    }
                    
                } catch (error) {
                    Utils.hideLoader();
                    Utils.showToast('error', error.message);
                }
            });
        });
    },
    
    showRegister() {
        this.loadComponent('register', 'app', () => {
            const form = document.getElementById('register-form');
            
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
            
            newForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const userData = {
                    name: document.getElementById('name').value,
                    phone: document.getElementById('phone').value,
                    password: document.getElementById('password').value
                };
                
                Utils.showLoader("নিবন্ধন হচ্ছে");
                
                try {
                    await Auth.register(userData);
                    Utils.hideLoader();
                    Utils.showToast('success', 'সফল! লগইন করুন');
                    this.navigateTo('login');
                } catch (error) {
                    Utils.hideLoader();
                    Utils.showToast('error', error.message);
                }
            });
        });
    },
    
    async showUserDashboard() {
        this.loadComponent('user-dashboard', 'app', async () => {
            await Auth.refreshUser();
            const user = Auth.getUser();
            
            document.getElementById('user-balance').textContent = `${user.Balance} টাকা`;
            document.getElementById('user-name').textContent = user.Name;
            
            if (!Auth.isAdmin()) {
                Utils.setupAutoLogout();
            }
            
            this.loadUserDashboardData();
        });
    },
    
    async loadUserDashboardData() {
        try {
            let services = Utils.getCache('services');
            if (!services) {
                services = await API.getServices();
                Utils.setCache('services', services);
            }
            
            const activeServices = services.filter(s => s.IsActive === true);
            
            const servicesGrid = document.getElementById('services-grid');
            if (servicesGrid) {
                servicesGrid.innerHTML = activeServices.map(service => `
                    <div class="service-card" onclick="App.navigateTo('service', ${service.ID})">
                        <i class="fas ${Utils.getIcon(service.Icon)}"></i>
                        <span>${service.Name}</span>
                    </div>
                `).join('');
            }
            
            let orders = Utils.getCache('orders');
            if (!orders) {
                orders = await API.getOrders(Auth.getUserId());
                Utils.setCache('orders', orders);
            }
            
            const stats = {
                pending: orders.filter(o => o.Status === 'pending').length,
                complete: orders.filter(o => o.Status === 'complete').length,
                cancel: orders.filter(o => o.Status === 'cancel').length
            };
            
            document.getElementById('stats-pending').textContent = stats.pending;
            document.getElementById('stats-complete').textContent = stats.complete;
            document.getElementById('stats-cancel').textContent = stats.cancel;
            
            let settings = Utils.getCache('settings');
            if (!settings) {
                settings = await API.getSettings();
                Utils.setCache('settings', settings);
            }
            
            document.getElementById('notice-text').innerHTML = `<marquee>${settings.notice || ''}</marquee>`;
            
            const supportGrid = document.getElementById('support-grid');
            if (supportGrid) {
                supportGrid.innerHTML = `
                    ${settings.whatsapp ? `
                        <a href="${settings.whatsapp}" target="_blank" class="support-link whatsapp">
                            <i class="fab fa-whatsapp"></i>
                            <span>WhatsApp</span>
                        </a>
                    ` : ''}
                    ${settings.telegram ? `
                        <a href="${settings.telegram}" target="_blank" class="support-link telegram">
                            <i class="fab fa-telegram"></i>
                            <span>Telegram</span>
                        </a>
                    ` : ''}
                    ${settings.facebook ? `
                        <a href="${settings.facebook}" target="_blank" class="support-link facebook">
                            <i class="fab fa-facebook"></i>
                            <span>Facebook</span>
                        </a>
                    ` : ''}
                `;
            }
            
        } catch (error) {
            console.error('Failed to load dashboard data', error);
        }
    },
    
    async showServiceDetails(serviceId) {
        this.loadComponent('service-details', 'app', async () => {
            const backBtn = document.getElementById('back-btn');
            if (backBtn) {
                backBtn.addEventListener('click', () => window.history.back());
            }
            
            document.getElementById('user-balance').textContent = `${Auth.getUserBalance()} টাকা`;
            
            let packages = Utils.getCache('packages');
            if (!packages) {
                packages = await API.getPackages();
                Utils.setCache('packages', packages);
            }
            
            const servicePackages = packages.filter(p => p.ServiceID == serviceId);
            const packagesGrid = document.getElementById('packages-grid');
            const inputFields = document.getElementById('input-fields');
            const submitBtn = document.getElementById('submit-order');
            const priceDisplay = document.getElementById('selected-price');
            
            let selectedPackage = null;
            
            if (servicePackages.length === 0) {
                packagesGrid.innerHTML = '<div style="grid-column: span 2; text-align: center; padding: 20px;">এই সার্ভিসের জন্য সরাসরি অর্ডার করুন</div>';
                
                inputFields.style.display = 'block';
                submitBtn.style.display = 'block';
                
                const defaultFields = ['তথ্য'];
                
                inputFields.innerHTML = defaultFields.map(field => `
                    <div class="form-group">
                        <label>${field}</label>
                        <input type="text" class="order-input" data-field="${field}" required>
                    </div>
                `).join('');
                
                selectedPackage = {
                    id: 'direct',
                    price: 50,
                    fields: defaultFields
                };
                
                if (priceDisplay) {
                    priceDisplay.textContent = `মূল্য: ${selectedPackage.price} টাকা`;
                }
                
                submitBtn.onclick = async () => {
                    await this.submitDirectOrder(serviceId, selectedPackage);
                };
                
            } else {
                packagesGrid.innerHTML = servicePackages.map(pkg => `
                    <div class="package-card" data-id="${pkg.ID}" data-price="${pkg.Price}" data-fields='${pkg.InputFields}'>
                        <div class="name">${pkg.Name}</div>
                        <div class="price">${pkg.Price} টাকা</div>
                    </div>
                `).join('');
                
                document.querySelectorAll('.package-card').forEach(card => {
                    card.addEventListener('click', () => {
                        document.querySelectorAll('.package-card').forEach(c => c.classList.remove('selected'));
                        card.classList.add('selected');
                        
                        selectedPackage = {
                            id: card.dataset.id,
                            price: parseInt(card.dataset.price),
                            fields: Utils.parseInputFields(card.dataset.fields)
                        };
                        
                        if (priceDisplay) {
                            priceDisplay.textContent = `মূল্য: ${selectedPackage.price} টাকা`;
                        }
                        
                        if (selectedPackage.fields && selectedPackage.fields.length > 0) {
                            inputFields.innerHTML = selectedPackage.fields.map(field => `
                                <div class="form-group">
                                    <label>${field}</label>
                                    <input type="text" class="order-input" data-field="${field}" required>
                                </div>
                            `).join('');
                        } else {
                            inputFields.innerHTML = `
                                <div class="form-group">
                                    <label>তথ্য</label>
                                    <input type="text" class="order-input" data-field="তথ্য" required>
                                </div>
                            `;
                        }
                        
                        inputFields.style.display = 'block';
                        submitBtn.style.display = 'block';
                    });
                });
                
                submitBtn.addEventListener('click', async () => {
                    await this.submitPackageOrder(selectedPackage);
                });
            }
        });
    },
    
    async submitDirectOrder(serviceId, packageInfo) {
        const inputs = {};
        let isValid = true;
        
        document.querySelectorAll('.order-input').forEach(input => {
            if (!input.value) {
                isValid = false;
                input.style.borderColor = '#ef4444';
            } else {
                inputs[input.dataset.field] = input.value;
            }
        });
        
        if (!isValid) {
            Utils.showToast('error', 'সব তথ্য দিন');
            return;
        }
        
        if (Auth.getUserBalance() < packageInfo.price) {
            Utils.showToast('error', 'ব্যালেন্স নেই');
            return;
        }
        
        Utils.showLoader("🚀অর্ডার জমা হচ্ছে🚀");
        
        try {
            let packages = Utils.getCache('packages');
            if (!packages) {
                packages = await API.getPackages();
            }
            
            const servicePackages = packages.filter(p => p.ServiceID == serviceId);
            let packageId;
            
            if (servicePackages.length > 0) {
                packageId = servicePackages[0].ID;
            } else {
                Utils.hideLoader();
                Utils.showToast('error', 'সার্ভিস কনফিগারেশন ত্রুটি');
                return;
            }
            
            await API.createOrder({
                userId: Auth.getUserId(),
                packageId: packageId,
                inputData: inputs
            });
            
            Utils.hideLoader();
            Utils.showToast('success', 'অর্ডার সফল!');
            await Auth.refreshUser();
            
            Utils.setCache('orders', null);
            
            setTimeout(() => this.navigateTo('dashboard'), 1500);
        } catch (error) {
            Utils.hideLoader();
            Utils.showToast('error', error.message);
        }
    },
    
    async submitPackageOrder(selectedPackage) {
        if (!selectedPackage) {
            Utils.showToast('error', 'একটি প্যাকেজ নির্বাচন করুন');
            return;
        }
        
        const inputs = {};
        let isValid = true;
        
        document.querySelectorAll('.order-input').forEach(input => {
            if (!input.value) {
                isValid = false;
                input.style.borderColor = '#ef4444';
            } else {
                inputs[input.dataset.field] = input.value;
            }
        });
        
        if (!isValid) {
            Utils.showToast('error', 'সব তথ্য দিন');
            return;
        }
        
        if (Auth.getUserBalance() < selectedPackage.price) {
            Utils.showToast('error', 'ব্যালেন্স নেই');
            return;
        }
        
        Utils.showLoader("🚀অর্ডার জমা হচ্ছে🚀");
        
        try {
            await API.createOrder({
                userId: Auth.getUserId(),
                packageId: selectedPackage.id,
                inputData: inputs
            });
            
            Utils.hideLoader();
            Utils.showToast('success', 'অর্ডার সফল!');
            await Auth.refreshUser();
            
            Utils.setCache('orders', null);
            
            setTimeout(() => this.navigateTo('dashboard'), 1500);
        } catch (error) {
            Utils.hideLoader();
            Utils.showToast('error', error.message);
        }
    },
    
    async showOrderHistory() {
        this.loadComponent('order-history', 'app', async () => {
            const backBtn = document.getElementById('back-btn');
            if (backBtn) {
                backBtn.addEventListener('click', () => window.history.back());
            }
            
            let orders = Utils.getCache('orders');
            let services = Utils.getCache('services');
            let packages = Utils.getCache('packages');
            
            if (!orders || !services || !packages) {
                Utils.showLoader("অর্ডার লোড হচ্ছে...");
                
                orders = await API.getOrders(Auth.getUserId());
                services = await API.getServices();
                packages = await API.getPackages();
                
                Utils.setCache('orders', orders);
                Utils.setCache('services', services);
                Utils.setCache('packages', packages);
                
                Utils.hideLoader();
            }
            
            const ordersList = document.getElementById('orders-list');
            
            if (orders.length === 0) {
                ordersList.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;">কোন অর্ডার পাওয়া যায়নি</div>';
                return;
            }
            
            ordersList.innerHTML = orders.map(order => {
                const pkg = packages.find(p => p.ID == order.PackageID);
                const service = services.find(s => s.ID == pkg?.ServiceID);
                
                let inputData = {};
                try {
                    inputData = JSON.parse(order.InputData || '{}');
                } catch {
                    inputData = {};
                }
                
                return `
                    <div class="order-item">
                        <div class="order-header">
                            <strong>${service?.Name || 'Unknown'}</strong>
                            <span class="order-status status-${order.Status}">${order.Status}</span>
                        </div>
                        
                        <div class="order-data">
                            ${Object.entries(inputData).map(([key, value]) => `
                                <div><strong>${key}:</strong> ${value}</div>
                            `).join('')}
                        </div>
                        
                        ${order.Status === 'complete' && order.DeliveryData ? `
                            <div style="margin-top: 12px;">
                                ${order.DeliveryType === 'link' ? `
                                    <button class="download-btn" onclick="Utils.handleDownload('${order.DeliveryData}')">
                                        <i class="fas fa-download"></i> ডাউনলোড
                                    </button>
                                ` : `
                                    <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${order.DeliveryData.replace(/'/g, "\\'")}'); Utils.showToast('success','কপি হয়েছে!')" style="display: inline-block; width: auto; padding: 8px 16px;">
                                        <i class="fas fa-copy"></i> কপি
                                    </button>
                                `}
                            </div>
                        ` : ''}
                        
                        <div class="order-footer">
                            <span>অর্ডার #${order.ID}</span>
                            <span>${Utils.formatDate(order.CreatedAt)}</span>
                        </div>
                    </div>
                `;
            }).join('');
        });
    },
    
    async showAdminPanel(hash) {
        if (hash === '#/admin' || hash === '#/admin/') {
            this.showAdminDashboard();
        } else if (hash === '#/admin/users') {
            this.showAdminUsers();
        } else if (hash === '#/admin/orders') {
            this.showAdminOrders();
        } else if (hash === '#/admin/services') {
            this.showAdminServices();
        } else if (hash === '#/admin/settings') {
            this.showAdminSettings();
        }
    },
    
    async showAdminDashboard() {
        this.loadComponent('admin-dashboard', 'app', async () => {
            const orders = await API.getOrders();
            const users = await API.getUsers();
            
            const stats = {
                totalOrders: orders.length,
                pendingOrders: orders.filter(o => o.Status === 'pending').length,
                completedOrders: orders.filter(o => o.Status === 'complete').length,
                totalUsers: users.filter(u => u.Role !== 'admin').length
            };
            
            document.getElementById('stats-total-orders').textContent = stats.totalOrders;
            document.getElementById('stats-pending-orders').textContent = stats.pendingOrders;
            document.getElementById('stats-completed-orders').textContent = stats.completedOrders;
            document.getElementById('stats-total-users').textContent = stats.totalUsers;
        });
    },
    
    async showAdminOrders() {
        this.loadComponent('admin-orders', 'app', async () => {
            const orders = await API.getOrders();
            const users = await API.getUsers();
            const packages = await API.getPackages();
            const services = await API.getServices();
            
            const ordersList = document.getElementById('orders-list');
            
            if (!ordersList) return;
            
            orders.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));
            
            ordersList.innerHTML = orders.map(order => {
                const user = users.find(u => u.ID == order.UserID);
                const pkg = packages.find(p => p.ID == order.PackageID);
                const service = services.find(s => s.ID == pkg?.ServiceID);
                
                let inputData = {};
                try {
                    inputData = JSON.parse(order.InputData || '{}');
                } catch {
                    inputData = {};
                }
                
                return `
                    <tr>
                        <td>#${order.ID}</td>
                        <td>${user?.Name || 'Unknown'}<br><small>${user?.Phone || ''}</small></td>
                        <td>${service?.Name || ''}<br><small>${pkg?.Name || ''}</small></td>
                        <td><small>${Object.entries(inputData).map(([k,v]) => `${k}: ${v}`).join('<br>')}</small></td>
                        <td>
                            <span class="order-status status-${order.Status}">${order.Status}</span>
                        </td>
                        <td>${Utils.formatDate(order.CreatedAt)}</td>
                        <td>
                            ${order.Status === 'pending' ? `
                                <button class="btn btn-primary" style="width: auto; padding: 6px 12px;" onclick="App.showDeliveryModal(${order.ID})">
                                    <i class="fas fa-check"></i> ডেলিভারি
                                </button>
                            ` : order.Status === 'complete' ? `
                                <span style="color: #22c55e;">ডেলিভারি সম্পন্ন</span>
                            ` : `
                                <span style="color: #ef4444;">বাতিল</span>
                            `}
                        </td>
                    </tr>
                `;
            }).join('');
        });
    },
    
    showDeliveryModal(orderId) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'delivery-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3 style="margin-bottom: 20px;">ডেলিভারি তথ্য দিন</h3>
                
                <div class="form-group">
                    <label>ডেলিভারি টাইপ</label>
                    <select id="delivery-type">
                        <option value="link">লিংক (Download Link)</option>
                        <option value="text">টেক্সট (Information)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>ডেলিভারি ডাটা</label>
                    <textarea id="delivery-data" rows="4" placeholder="লিংক বা টেক্সট লিখুন..."></textarea>
                </div>
                
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-primary" onclick="App.deliverOrder(${orderId})">ডেলিভারি করুন</button>
                    <button class="btn btn-danger" onclick="App.closeModal('delivery-modal')">বাতিল</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    },
    
    async deliverOrder(orderId) {
        const type = document.getElementById('delivery-type').value;
        const data = document.getElementById('delivery-data').value;
        
        if (!data) {
            Utils.showToast('error', 'ডেলিভারি ডাটা দিন');
            return;
        }
        
        Utils.showLoader("🚀ডেলিভারি হচ্ছে🚀");
        
        try {
            await API.updateOrder(orderId, 'complete', type, data);
            Utils.hideLoader();
            Utils.showToast('success', 'অর্ডার ডেলিভারি সম্পন্ন');
            this.closeModal('delivery-modal');
            this.showAdminOrders();
        } catch (error) {
            Utils.hideLoader();
            Utils.showToast('error', error.message);
        }
    },
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.remove();
        }
    },
    
    async showAdminUsers() {
        this.loadComponent('admin-users', 'app', async () => {
            const users = await API.getUsers();
            const regularUsers = users.filter(u => u.Role !== 'admin');
            
            const usersList = document.getElementById('users-list');
            
            if (!usersList) return;
            
            usersList.innerHTML = regularUsers.map(user => `
                <tr>
                    <td>${user.Name}<br><small>${user.Phone}</small></td>
                    <td>${user.Balance} টাকা</td>
                    <td>
                        <span class="order-status status-${user.Status}">${user.Status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</span>
                    </td>
                    <td>
                        <button class="btn btn-primary" style="width: auto; padding: 6px 12px; margin-right: 4px;" onclick="App.updateUserStatus(${user.ID}, '${user.Status === 'active' ? 'inactive' : 'active'}')">
                            <i class="fas ${user.Status === 'active' ? 'fa-ban' : 'fa-check'}"></i>
                        </button>
                        <button class="btn btn-primary" style="width: auto; padding: 6px 12px; background-color: #f59e0b;" onclick="App.showBalanceModal(${user.ID}, '${user.Name}', ${user.Balance})">
                            <i class="fas fa-coins"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        });
    },
    
    async updateUserStatus(userId, newStatus) {
        Utils.showLoader("স্ট্যাটাস আপডেট হচ্ছে...");
        
        try {
            await API.updateUserStatus(userId, newStatus);
            Utils.hideLoader();
            Utils.showToast('success', 'ইউজার স্ট্যাটাস আপডেট হয়েছে');
            this.showAdminUsers();
        } catch (error) {
            Utils.hideLoader();
            Utils.showToast('error', error.message);
        }
    },
    
    showBalanceModal(userId, userName, currentBalance) {
        const amount = prompt(`${userName} এর জন্য টাকা যোগ/বিয়োগ করুন (বর্তমান: ${currentBalance} টাকা)\n+১০০ যোগ করতে, -১০০ বিয়োগ করতে:`);
        
        if (amount) {
            const num = parseInt(amount);
            if (!isNaN(num)) {
                this.updateBalance(userId, currentBalance + num);
            }
        }
    },
    
    async updateBalance(userId, newBalance) {
        Utils.showLoader("ব্যালেন্স আপডেট হচ্ছে...");
        
        try {
            await API.updateUserBalance(userId, newBalance);
            Utils.hideLoader();
            Utils.showToast('success', 'ব্যালেন্স আপডেট হয়েছে');
            this.showAdminUsers();
        } catch (error) {
            Utils.hideLoader();
            Utils.showToast('error', error.message);
        }
    },
    
    async showAdminServices() {
        this.loadComponent('admin-services', 'app', async () => {
            Utils.showToast('info', 'সার্ভিস ম্যানেজমেন্ট কনসোল তৈরি হচ্ছে...');
        });
    },
    
    async showAdminSettings() {
        this.loadComponent('admin-settings', 'app', async () => {
            const settings = await API.getSettings();
            
            const noticeInput = document.getElementById('notice');
            const whatsappInput = document.getElementById('whatsapp');
            const telegramInput = document.getElementById('telegram');
            const facebookInput = document.getElementById('facebook');
            
            if (noticeInput) noticeInput.value = settings.notice || '';
            if (whatsappInput) whatsappInput.value = settings.whatsapp || '';
            if (telegramInput) telegramInput.value = settings.telegram || '';
            if (facebookInput) facebookInput.value = settings.facebook || '';
            
            const form = document.getElementById('settings-form');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const settingsData = {
                        notice: noticeInput?.value || '',
                        whatsapp: whatsappInput?.value || '',
                        telegram: telegramInput?.value || '',
                        facebook: facebookInput?.value || ''
                    };
                    
                    Utils.showLoader("সেটিংস আপডেট হচ্ছে...");
                    
                    try {
                        await API.updateSettings(settingsData);
                        Utils.hideLoader();
                        Utils.showToast('success', 'সেটিংস আপডেট হয়েছে');
                    } catch (error) {
                        Utils.hideLoader();
                        Utils.showToast('error', error.message);
                    }
                });
            }
        });
    }
};

document.addEventListener('deviceready', () => {
    App.init();
});

if (!window.cordova) {
    window.addEventListener('DOMContentLoaded', () => {
        App.init();
    });
}

window.App = App;
