const Auth = {
    currentUser: null,
    token: null,
    
    init() {
        const savedUser = localStorage.getItem('user');
        const savedToken = localStorage.getItem('token');
        
        if (savedUser && savedToken) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.token = savedToken;
                return true;
            } catch (e) {
                return false;
            }
        }
        return false;
    },
    
    async login(phone, password) {
        try {
            console.log('=== লগইন attempt ===');
            console.log('Input Phone:', phone);
            
            const users = await API.getUsers();
            
            let inputPhone = String(phone).replace(/\s+/g, '').trim();
            
            if (inputPhone.length === 10 && !inputPhone.startsWith('0')) {
                inputPhone = '0' + inputPhone;
            }
            
            const inputPass = String(password).trim();
            
            const foundUser = users.find(user => {
                const userPhone = String(user.Phone).replace(/\s+/g, '').trim();
                return userPhone === inputPhone;
            });
            
            if (!foundUser) {
                throw new Error('User not found');
            }
            
            if (foundUser.Password !== inputPass) {
                throw new Error('Invalid password');
            }
            
            if (foundUser.Role !== 'admin') {
                const status = String(foundUser.Status).toLowerCase();
                if (status !== 'active') {
                    throw new Error('Account is inactive. Please wait for admin approval.');
                }
            }
            
            const token = btoa(`${foundUser.ID}:${Date.now()}`);
            
            this.currentUser = foundUser;
            this.token = token;
            
            localStorage.setItem('user', JSON.stringify(foundUser));
            localStorage.setItem('token', token);
            
            return foundUser;
            
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },
    
    async register(userData) {
        try {
            const result = await API.register(userData);
            return result;
        } catch (error) {
            console.error('Register error:', error);
            throw error;
        }
    },
    
    logout() {
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        Utils.cache = {};
        window.location.hash = '#/login';
    },
    
    isLoggedIn() {
        return this.currentUser !== null;
    },
    
    isAdmin() {
        return this.currentUser && this.currentUser.Role === 'admin';
    },
    
    getUser() {
        return this.currentUser;
    },
    
    getUserId() {
        return this.currentUser ? this.currentUser.ID : null;
    },
    
    getUserBalance() {
        return this.currentUser ? parseInt(this.currentUser.Balance) || 0 : 0;
    },
    
    async refreshUser() {
        if (!this.currentUser) return;
        
        try {
            const users = await API.getUsers();
            const updatedUser = users.find(u => String(u.ID) === String(this.currentUser.ID));
            
            if (updatedUser) {
                this.currentUser = updatedUser;
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }
        } catch (error) {
            console.error('Refresh user error:', error);
        }
    }
};
