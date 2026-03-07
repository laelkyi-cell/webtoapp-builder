const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbzmPHEvSGZlTXZ7E8kIbh5TAXfaVNUhAGI6--tP7ivPAGv-l8P7asKMAPk-obsDLb4e7w/exec';

const API = {
    async request(action, method = 'GET', data = null) {
        let url = `${API_BASE_URL}?action=${action}`;
        
        const options = {
            method: method,
            redirect: 'follow'
        };
        
        if (method === 'POST' && data) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            return result;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    async getUsers() {
        const users = await this.request('getUsers');
        
        if (!Array.isArray(users)) {
            return [];
        }
        
        return users.map(user => {
            let phone = String(user.Phone || '').replace(/\s+/g, '').trim();
            
            if (phone.length === 10 && !phone.startsWith('0')) {
                phone = '0' + phone;
            }
            
            return {
                ID: String(user.ID || '').trim(),
                Name: String(user.Name || '').trim(),
                Phone: phone,
                Password: String(user.Password || '').trim(),
                Role: String(user.Role || 'user').toLowerCase().trim(),
                Status: String(user.Status || 'inactive').toLowerCase().trim(),
                Balance: parseInt(user.Balance) || 0,
                CreatedAt: user.CreatedAt || ''
            };
        });
    },
    
    async getServices() {
        const services = await this.request('getServices');
        return services.map(service => ({
            ID: String(service.ID || '').trim(),
            Name: String(service.Name || '').trim(),
            Icon: String(service.Icon || '').trim(),
            IsActive: String(service.IsActive || 'FALSE').toUpperCase() === 'TRUE'
        }));
    },
    
    async getPackages(serviceId = null) {
        const packages = await this.request('getPackages');
        let filteredPackages = packages.map(pkg => ({
            ID: String(pkg.ID || '').trim(),
            ServiceID: String(pkg.ServiceID || '').trim(),
            Name: String(pkg.Name || '').trim(),
            Price: parseInt(pkg.Price) || 0,
            InputFields: pkg.InputFields || '[]'
        }));
        
        if (serviceId) {
            filteredPackages = filteredPackages.filter(p => p.ServiceID === String(serviceId).trim());
        }
        
        return filteredPackages;
    },
    
    async getOrders(userId = null) {
        const orders = await this.request('getOrders');
        let filteredOrders = orders.map(order => ({
            ID: String(order.ID || '').trim(),
            UserID: String(order.UserID || '').trim(),
            PackageID: String(order.PackageID || '').trim(),
            InputData: order.InputData || '{}',
            Status: String(order.Status || 'pending').toLowerCase().trim(),
            DeliveryType: order.DeliveryType || '',
            DeliveryData: order.DeliveryData || '',
            CreatedAt: order.CreatedAt || ''
        }));
        
        if (userId) {
            filteredOrders = filteredOrders.filter(o => o.UserID === String(userId).trim());
        }
        
        return filteredOrders;
    },
    
    async getSettings() {
        const settings = await this.request('getSettings');
        const result = {};
        settings.forEach(s => {
            result[String(s.Key || '').trim()] = String(s.Value || '').trim();
        });
        return result;
    },
    
    async register(userData) {
        return this.request('registerUser', 'POST', userData);
    },
    
    async createOrder(orderData) {
        return this.request('createOrder', 'POST', {
            userId: String(orderData.userId || '').trim(),
            packageId: String(orderData.packageId || '').trim(),
            inputData: orderData.inputData || {}
        });
    },
    
    async updateUserStatus(userId, status) {
        return this.request('updateUserStatus', 'POST', { 
            id: String(userId).trim(), 
            status: String(status).trim() 
        });
    },
    
    async updateUserBalance(userId, balance) {
        return this.request('updateUserBalance', 'POST', { 
            id: String(userId).trim(), 
            balance: parseInt(balance) || 0 
        });
    },
    
    async updateOrder(orderId, status, deliveryType, deliveryData) {
        return this.request('updateOrder', 'POST', {
            id: String(orderId).trim(),
            status: String(status).trim(),
            deliveryType: String(deliveryType || '').trim(),
            deliveryData: String(deliveryData || '').trim()
        });
    },
    
    async updateService(serviceData) {
        return this.request('updateService', 'POST', {
            id: String(serviceData.id || '').trim(),
            name: String(serviceData.name || '').trim(),
            icon: String(serviceData.icon || '').trim(),
            isActive: serviceData.isActive ? 'TRUE' : 'FALSE'
        });
    },
    
    async updatePackage(packageData) {
        return this.request('updatePackage', 'POST', {
            id: String(packageData.id || '').trim(),
            serviceId: String(packageData.serviceId || '').trim(),
            name: String(packageData.name || '').trim(),
            price: parseInt(packageData.price) || 0,
            inputFields: packageData.inputFields || '[]'
        });
    },
    
    async updateSettings(settingsData) {
        return this.request('updateSettings', 'POST', settingsData);
    }
};
