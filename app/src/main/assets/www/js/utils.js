const Utils = {
    showLoader(message = "🤠কাজ চলছে🤠") {
        let loader = document.getElementById('car-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'car-loader';
            loader.className = 'fixed inset-0 bg-white z-[999] hidden flex-col items-center justify-center p-6 text-center';
            loader.style.background = 'rgba(255,255,255,0.95)';
            loader.innerHTML = `
                <div class="car-anim mb-6">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2">
                        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
                        <circle cx="7" cy="18" r="2"/>
                        <circle cx="17" cy="18" r="2"/>
                        <path d="M15 18H9"/>
                        <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
                    </svg>
                </div>
                <h2 id="loader-msg" class="text-md font-bold text-gray-800">${message}</h2>
            `;
            document.body.appendChild(loader);
        }
        
        const loaderEl = document.getElementById('car-loader');
        const msgEl = document.getElementById('loader-msg');
        if (msgEl) msgEl.innerText = message;
        loaderEl.classList.remove('hidden');
        loaderEl.classList.add('flex');
        loaderEl.style.display = 'flex';
    },
    
    hideLoader() {
        const loader = document.getElementById('car-loader');
        if (loader) {
            loader.classList.add('hidden');
            loader.style.display = 'none';
        }
    },
    
    showToast(type, msg) {
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'fixed top-10 inset-x-6 mx-auto max-w-xs p-4 rounded-2xl shadow-2xl hidden items-center gap-3 z-[1100] border-2';
            toast.innerHTML = `
                <span id="toast-icon"></span>
                <span id="toast-msg" class="font-bold text-sm uppercase text-white"></span>
            `;
            document.body.appendChild(toast);
        }
        
        toast.className = `fixed top-10 inset-x-6 mx-auto max-w-xs p-4 rounded-2xl shadow-2xl flex items-center gap-3 z-[1100] border-2 ${type === 'success' ? 'bg-emerald-500 border-emerald-300' : 'bg-rose-500 border-rose-300'}`;
        document.getElementById('toast-msg').innerText = msg;
        document.getElementById('toast-icon').innerHTML = type === 'success' ? '✅' : '❌';
        toast.classList.remove('hidden');
        toast.style.display = 'flex';
        
        setTimeout(() => {
            toast.classList.add('hidden');
            toast.style.display = 'none';
        }, 3000);
    },
    
    handleDownload(url) {
        this.showLoader("🚀ডাউনলোড শুরু হচ্ছে🚀");
        
        setTimeout(() => {
            this.hideLoader();
            
            if (window.cordova && cordova.InAppBrowser) {
                cordova.InAppBrowser.open(url, '_system');
            } else {
                window.open(url, '_system');
            }
        }, 5000);
    },
    
    setupBackButton() {
        document.addEventListener('backbutton', (e) => {
            e.preventDefault();
            
            const currentHash = window.location.hash;
            
            if (currentHash === '#/' || currentHash === '#/dashboard' || currentHash === '') {
                if (confirm('অ্যাপ থেকে বের হবেন?')) {
                    navigator.app.exitApp();
                }
            } else {
                window.history.back();
            }
        }, false);
    },
    
    setupAutoLogout() {
        let logoutTimer;
        let timeLeft = 30 * 60;
        let timerInterval;
        
        const updateTimerDisplay = () => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            const timerElement = document.getElementById('timer-display');
            if (timerElement) {
                timerElement.innerHTML = `<i class="fas fa-clock"></i> ${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        };
        
        const resetTimer = () => {
            clearTimeout(logoutTimer);
            clearInterval(timerInterval);
            
            timeLeft = 30 * 60;
            updateTimerDisplay();
            
            logoutTimer = setTimeout(() => {
                Auth.logout();
                this.showToast('info', 'সেশন শেষ হয়েছে। আবার লগইন করুন।');
            }, 30 * 60 * 1000);
            
            timerInterval = setInterval(() => {
                timeLeft--;
                updateTimerDisplay();
                if (timeLeft <= 0) clearInterval(timerInterval);
            }, 1000);
        };
        
        ['click', 'touchstart', 'keydown'].forEach(event => {
            document.addEventListener(event, resetTimer);
        });
        
        resetTimer();
        this.addTimerToHeader();
    },
    
    addTimerToHeader() {
        const header = document.querySelector('.header');
        if (header && !document.getElementById('timer-display')) {
            const timerDiv = document.createElement('div');
            timerDiv.id = 'timer-display';
            timerDiv.className = 'timer-display';
            timerDiv.innerHTML = '<i class="fas fa-clock"></i> 30:00';
            header.appendChild(timerDiv);
        }
    },
    
    cache: {},
    
    setCache(key, data, ttl = 300000) {
        this.cache[key] = {
            data: data,
            timestamp: Date.now(),
            ttl: ttl
        };
    },
    
    getCache(key) {
        const item = this.cache[key];
        if (!item) return null;
        if (Date.now() - item.timestamp > item.ttl) {
            delete this.cache[key];
            return null;
        }
        return item.data;
    },
    
    getIcon(iconName) {
        const icons = {
            'IdCard': 'fa-id-card',
            'Fingerprint': 'fa-fingerprint',
            'Key': 'fa-key',
            'PhoneCall': 'fa-phone-alt',
            'MapPin': 'fa-map-pin',
            'Smartphone': 'fa-mobile-alt',
            'SimCard': 'fa-sim-card',
            'Server': 'fa-server',
            'UserPlus': 'fa-user-plus',
            'BookOpen': 'fa-book-open',
            'Contact': 'fa-address-book',
            'CheckCircle': 'fa-check-circle',
            'BookMarked': 'fa-bookmark'
        };
        return icons[iconName] || 'fa-circle';
    },
    
    parseInputFields(fieldsString) {
        try {
            return JSON.parse(fieldsString);
        } catch {
            return fieldsString ? fieldsString.split(',').map(f => f.trim()) : [];
        }
    },
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('bn-BD', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
};
