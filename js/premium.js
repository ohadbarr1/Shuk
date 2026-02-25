/**
 * premium.js — Premium feature gating, subscription modal, Stripe integration
 */
const Premium = {
    isActive: false,
    _selectedPlan: 'annual',

    async init() {
        const modal = document.getElementById('premium-modal');
        const premiumBtn = document.getElementById('premiumBtn');
        const modalClose = document.getElementById('modal-close');

        if (premiumBtn) premiumBtn.addEventListener('click', () => this.showModal());
        if (modalClose) modalClose.addEventListener('click', () => this.hideModal());
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideModal();
            });
        }

        // Escape key closes modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.classList.contains('active')) this.hideModal();
        });

        // Premium feature cards trigger modal
        document.querySelectorAll('.premium-feature-card').forEach(card => {
            card.addEventListener('click', () => this.showModal());
        });

        // Subscribe button
        const subscribeBtn = document.querySelector('.btn-subscribe');
        if (subscribeBtn) {
            subscribeBtn.addEventListener('click', () => this.activatePremium());
        }

        // Price card selection
        document.querySelectorAll('.price-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.price-card').forEach(c => c.classList.remove('featured'));
                card.classList.add('featured');
                this._selectedPlan = card.dataset.plan || 'annual';
            });
        });

        // Listen for auth changes to re-check subscription
        if (typeof Auth !== 'undefined') {
            Auth.onAuthChange(async (user) => {
                PremiumService.invalidateCache();
                if (user) {
                    const result = await PremiumService.checkSubscription();
                    if (result.valid) this.applyPremiumUI();
                    else this._removePremiumUI();
                } else {
                    this._removePremiumUI();
                }
            });
        }

        // Validate existing subscription
        const result = await PremiumService.validateToken();
        if (result.valid) {
            this.applyPremiumUI();
        }

        // Handle Stripe return
        const returnResult = await PremiumService.handleStripeReturn();
        if (returnResult.action === 'success' && returnResult.valid) {
            this.applyPremiumUI();
            this._showPremiumWelcome();
        }
    },

    _previousFocus: null,
    _focusTrapHandler: null,

    showModal() {
        const modal = document.getElementById('premium-modal');
        if (!modal) return;

        // Update modal state: show login prompt if not logged in
        this._updateModalState();

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

    hideModal() {
        const modal = document.getElementById('premium-modal');
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

    async activatePremium() {
        // If not logged in, prompt login first
        if (!Auth.isLoggedIn()) {
            this.hideModal();
            Auth.showLoginModal();
            return;
        }

        const subscribeBtn = document.querySelector('.btn-subscribe');
        if (subscribeBtn) {
            subscribeBtn.disabled = true;
            subscribeBtn.textContent = 'מעביר לעמוד תשלום...';
        }

        const result = await PremiumService.startCheckout(this._selectedPlan);

        if (!result.success) {
            if (subscribeBtn) {
                subscribeBtn.disabled = false;
                subscribeBtn.textContent = 'התחל תקופת ניסיון חינם — 7 ימים';
            }

            if (result.error === 'login_required') {
                this.hideModal();
                Auth.showLoginModal();
            }
        }
    },

    applyPremiumUI() {
        this.isActive = true;

        // Update premium feature cards
        document.querySelectorAll('.premium-feature-card').forEach(card => {
            card.style.borderColor = 'rgba(52, 211, 153, 0.3)';
            const badge = card.querySelector('.lock-badge');
            if (badge) {
                badge.textContent = '\u2713 \u05E4\u05E2\u05D9\u05DC';
                badge.style.background = 'rgba(52, 211, 153, 0.12)';
                badge.style.color = '#34d399';
            }
        });

        // Update header button
        const premiumBtn = document.getElementById('premiumBtn');
        if (premiumBtn) {
            premiumBtn.innerHTML = '<span class="premium-icon">\u2705</span> \u05E4\u05E8\u05D9\u05DE\u05D9\u05D5\u05DD \u05E4\u05E2\u05D9\u05DC';
            premiumBtn.style.background = 'linear-gradient(135deg, #34d399, #10b981)';
        }
    },

    _removePremiumUI() {
        this.isActive = false;

        document.querySelectorAll('.premium-feature-card').forEach(card => {
            card.style.borderColor = '';
            const badge = card.querySelector('.lock-badge');
            if (badge) {
                badge.textContent = '\uD83D\uDD12 \u05E4\u05E8\u05D9\u05DE\u05D9\u05D5\u05DD';
                badge.style.background = '';
                badge.style.color = '';
            }
        });

        const premiumBtn = document.getElementById('premiumBtn');
        if (premiumBtn) {
            premiumBtn.innerHTML = '<span class="premium-icon">\u2B50</span> \u05E4\u05E8\u05D9\u05DE\u05D9\u05D5\u05DD';
            premiumBtn.style.background = '';
        }
    },

    _updateModalState() {
        const loginPrompt = document.getElementById('premium-login-prompt');
        const paymentContent = document.getElementById('premium-payment-content');

        if (!loginPrompt || !paymentContent) return;

        if (Auth.isLoggedIn()) {
            loginPrompt.style.display = 'none';
            paymentContent.style.display = '';
        } else {
            loginPrompt.style.display = '';
            paymentContent.style.display = 'none';
        }
    },

    _showPremiumWelcome() {
        // Brief visual feedback
        const premiumBtn = document.getElementById('premiumBtn');
        if (premiumBtn) {
            premiumBtn.classList.add('premium-welcome-pulse');
            setTimeout(() => premiumBtn.classList.remove('premium-welcome-pulse'), 3000);
        }
    },

    checkFeature(featureName) {
        if (!this.isActive) {
            this.showModal();
            return false;
        }
        return true;
    }
};
