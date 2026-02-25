/**
 * auth.js — Auth module: login/signup/logout/session management
 * Uses Supabase Auth (email + Google OAuth)
 */
const Auth = {
    _user: null,
    _listeners: [],

    async init() {
        const sb = SupabaseClient.getClient();
        if (!sb || !SupabaseClient.isConfigured()) {
            console.log('Auth: Supabase not configured — anonymous mode');
            this._setupModalEvents();
            return;
        }

        // Check existing session
        try {
            const { data: { session } } = await sb.auth.getSession();
            if (session) {
                this._user = session.user;
                this._updateUI();
                this._notifyListeners();
            }
        } catch (e) {
            console.warn('Auth: session check failed', e);
        }

        // Listen for auth state changes
        sb.auth.onAuthStateChange((event, session) => {
            const prevUser = this._user;
            this._user = session?.user || null;
            this._updateUI();

            if (event === 'SIGNED_IN' && !prevUser) {
                this._notifyListeners();
            } else if (event === 'SIGNED_OUT') {
                this._notifyListeners();
            }
        });

        this._setupModalEvents();

        // Handle OAuth redirect (e.g. after Google sign-in)
        this._handleRedirect();
    },

    _setupModalEvents() {
        const modal = document.getElementById('auth-modal');
        if (!modal) return;

        const closeBtn = document.getElementById('auth-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideLoginModal());
        }
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.hideLoginModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                this.hideLoginModal();
            }
        });

        // Tab switching (login / signup)
        const loginTab = document.getElementById('auth-tab-login');
        const signupTab = document.getElementById('auth-tab-signup');
        const loginForm = document.getElementById('auth-login-form');
        const signupForm = document.getElementById('auth-signup-form');

        if (loginTab && signupTab) {
            loginTab.addEventListener('click', () => {
                loginTab.classList.add('active');
                signupTab.classList.remove('active');
                if (loginForm) loginForm.style.display = '';
                if (signupForm) signupForm.style.display = 'none';
                this._clearAuthErrors();
            });
            signupTab.addEventListener('click', () => {
                signupTab.classList.add('active');
                loginTab.classList.remove('active');
                if (signupForm) signupForm.style.display = '';
                if (loginForm) loginForm.style.display = 'none';
                this._clearAuthErrors();
            });
        }

        // Login form submit
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('auth-login-email')?.value;
                const password = document.getElementById('auth-login-password')?.value;
                if (email && password) await this.signInWithEmail(email, password);
            });
        }

        // Signup form submit
        if (signupForm) {
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('auth-signup-email')?.value;
                const password = document.getElementById('auth-signup-password')?.value;
                if (email && password) await this.signUpWithEmail(email, password);
            });
        }

        // Google sign-in button
        const googleBtn = document.getElementById('auth-google-btn');
        if (googleBtn) {
            googleBtn.addEventListener('click', () => this.signInWithGoogle());
        }

        // Login button in header
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showLoginModal());
        }

        // User menu
        const userMenuBtn = document.getElementById('user-menu-btn');
        if (userMenuBtn) {
            userMenuBtn.addEventListener('click', () => {
                const dropdown = document.getElementById('user-dropdown');
                if (dropdown) dropdown.classList.toggle('active');
            });
        }

        // Close dropdown on outside click
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('user-dropdown');
            const btn = document.getElementById('user-menu-btn');
            if (dropdown && btn && !btn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });

        // Logout button
        const logoutBtn = document.getElementById('user-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.signOut());
        }
    },

    _previousFocus: null,
    _focusTrapHandler: null,

    showLoginModal() {
        const modal = document.getElementById('auth-modal');
        if (!modal) return;
        this._previousFocus = document.activeElement;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Focus trap
        const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length > 0) {
            focusable[0].focus();
            this._focusTrapHandler = (e) => {
                if (e.key !== 'Tab') return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey) {
                    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
                } else {
                    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
                }
            };
            modal.addEventListener('keydown', this._focusTrapHandler);
        }
    },

    hideLoginModal() {
        const modal = document.getElementById('auth-modal');
        if (!modal) return;
        if (this._focusTrapHandler) {
            modal.removeEventListener('keydown', this._focusTrapHandler);
            this._focusTrapHandler = null;
        }
        modal.classList.remove('active');
        document.body.style.overflow = '';
        if (this._previousFocus) {
            this._previousFocus.focus();
            this._previousFocus = null;
        }
    },

    async signUpWithEmail(email, password) {
        const sb = SupabaseClient.getClient();
        if (!sb) return;
        this._clearAuthErrors();
        this._setAuthLoading(true);

        const { data, error } = await sb.auth.signUp({ email, password });
        this._setAuthLoading(false);

        if (error) {
            this._showAuthError(error.message);
            return;
        }

        if (data.user && !data.session) {
            // Email confirmation required
            this._showAuthSuccess('נשלח אליך מייל אימות. בדוק את תיבת הדואר.');
        } else {
            this.hideLoginModal();
        }
    },

    async signInWithEmail(email, password) {
        const sb = SupabaseClient.getClient();
        if (!sb) return;
        this._clearAuthErrors();
        this._setAuthLoading(true);

        const { error } = await sb.auth.signInWithPassword({ email, password });
        this._setAuthLoading(false);

        if (error) {
            this._showAuthError(error.message === 'Invalid login credentials' ? 'אימייל או סיסמה שגויים' : error.message);
            return;
        }

        this.hideLoginModal();
    },

    async signInWithGoogle() {
        const sb = SupabaseClient.getClient();
        if (!sb) return;

        const { error } = await sb.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });

        if (error) {
            this._showAuthError(error.message);
        }
    },

    async signOut() {
        const sb = SupabaseClient.getClient();
        if (!sb) return;

        await sb.auth.signOut();
        this._user = null;
        this._updateUI();

        // Close user dropdown
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) dropdown.classList.remove('active');
    },

    getUser() {
        return this._user;
    },

    isLoggedIn() {
        return !!this._user;
    },

    onAuthChange(callback) {
        this._listeners.push(callback);
    },

    _notifyListeners() {
        this._listeners.forEach(cb => {
            try { cb(this._user); } catch (e) { console.warn('Auth listener error:', e); }
        });
    },

    _updateUI() {
        const loginBtn = document.getElementById('loginBtn');
        const userMenu = document.getElementById('user-menu');
        const userName = document.getElementById('user-display-name');
        const profileNavItem = document.getElementById('nav-profile-item');

        if (this._user) {
            // Logged in: show user menu, hide login button
            if (loginBtn) loginBtn.style.display = 'none';
            if (userMenu) userMenu.style.display = '';
            if (userName) {
                userName.textContent = this._user.user_metadata?.full_name || this._user.email?.split('@')[0] || 'משתמש';
            }
            if (profileNavItem) profileNavItem.style.display = '';
        } else {
            // Logged out: show login button, hide user menu
            if (loginBtn) loginBtn.style.display = '';
            if (userMenu) userMenu.style.display = 'none';
            if (profileNavItem) profileNavItem.style.display = 'none';
        }
    },

    async _handleRedirect() {
        // Handle Stripe return
        const params = new URLSearchParams(window.location.search);
        if (params.has('session_id')) {
            // Stripe checkout completed — premium.js will handle this
            return;
        }
    },

    _showAuthError(msg) {
        const el = document.getElementById('auth-error-msg');
        if (el) {
            el.textContent = msg;
            el.style.display = '';
        }
    },

    _showAuthSuccess(msg) {
        const el = document.getElementById('auth-success-msg');
        if (el) {
            el.textContent = msg;
            el.style.display = '';
        }
    },

    _clearAuthErrors() {
        const err = document.getElementById('auth-error-msg');
        const suc = document.getElementById('auth-success-msg');
        if (err) { err.textContent = ''; err.style.display = 'none'; }
        if (suc) { suc.textContent = ''; suc.style.display = 'none'; }
    },

    _setAuthLoading(loading) {
        const btns = document.querySelectorAll('#auth-modal .btn-auth-submit');
        btns.forEach(btn => {
            btn.disabled = loading;
            if (loading) {
                btn.dataset.originalText = btn.textContent;
                btn.textContent = 'טוען...';
            } else if (btn.dataset.originalText) {
                btn.textContent = btn.dataset.originalText;
            }
        });
    }
};
