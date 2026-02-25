/**
 * premiumService.js — Premium subscription service via Supabase
 * Checks subscription status and handles Stripe Checkout redirects
 */
const PremiumService = {
    STORAGE_KEY: 'cheshbeshbon_premium_token',
    _cachedStatus: null,
    _cacheTime: 0,
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes

    /**
     * Check if user has active premium subscription.
     * Uses Supabase subscriptions table, falls back to localStorage token for offline.
     */
    async checkSubscription() {
        // Return cached result if fresh
        if (this._cachedStatus && (Date.now() - this._cacheTime) < this.CACHE_TTL) {
            return this._cachedStatus;
        }

        const sb = SupabaseClient.getClient();
        const user = Auth.getUser();

        // If logged in with Supabase configured, check server
        if (sb && user && SupabaseClient.isConfigured()) {
            try {
                const { data, error } = await sb
                    .from('subscriptions')
                    .select('plan, status, current_period_end')
                    .eq('user_id', user.id)
                    .single();

                if (!error && data && data.plan === 'premium' && data.status === 'active') {
                    const result = { valid: true, plan: 'premium', periodEnd: data.current_period_end };
                    this._cachedStatus = result;
                    this._cacheTime = Date.now();
                    // Also cache locally for offline
                    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ plan: 'premium', ts: Date.now() }));
                    return result;
                }

                // Not premium
                const result = { valid: false };
                this._cachedStatus = result;
                this._cacheTime = Date.now();
                localStorage.removeItem(this.STORAGE_KEY);
                return result;
            } catch (e) {
                console.warn('PremiumService: server check failed, using local cache', e);
            }
        }

        // Fallback: check localStorage (offline mode or not logged in)
        return this._checkLocalToken();
    },

    /** Backward-compatible alias */
    async validateToken() {
        return this.checkSubscription();
    },

    /**
     * Start Stripe Checkout flow.
     * Calls create-checkout edge function and redirects to Stripe.
     */
    async startCheckout(plan = 'annual') {
        const sb = SupabaseClient.getClient();
        if (!sb || !Auth.isLoggedIn()) {
            return { success: false, error: 'login_required' };
        }

        try {
            const { data: { session } } = await sb.auth.getSession();
            if (!session) {
                return { success: false, error: 'login_required' };
            }

            const response = await sb.functions.invoke('create-checkout', {
                body: { plan }
            });

            if (response.error) {
                console.error('Checkout error:', response.error);
                return { success: false, error: response.error.message };
            }

            const { url } = response.data;
            if (url) {
                window.location.href = url;
                return { success: true };
            }

            return { success: false, error: 'no_url' };
        } catch (e) {
            console.error('PremiumService: startCheckout error', e);
            return { success: false, error: e.message };
        }
    },

    /** Backward-compatible alias — now redirects to Stripe */
    async activateSubscription(plan = 'annual') {
        return this.startCheckout(plan);
    },

    /**
     * Handle Stripe return URL with session_id parameter.
     * Validates the session and refreshes subscription status.
     */
    async handleStripeReturn() {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('session_id');
        const canceled = params.get('canceled');

        if (canceled) {
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname + window.location.hash);
            return { action: 'canceled' };
        }

        if (!sessionId) return { action: 'none' };

        // Clean URL
        window.history.replaceState({}, '', window.location.pathname + window.location.hash);

        // Invalidate cache and re-check subscription
        this._cachedStatus = null;
        this._cacheTime = 0;

        // Give Stripe webhook a moment to process
        await new Promise(resolve => setTimeout(resolve, 2000));

        const status = await this.checkSubscription();
        return { action: 'success', ...status };
    },

    /** Check localStorage token (offline fallback) */
    _checkLocalToken() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return { valid: false };

            const data = JSON.parse(stored);
            // Old mock JWT format
            if (typeof data === 'string') {
                return this._parseLegacyToken(data);
            }
            // New format: { plan, ts }
            if (data.plan === 'premium' && data.ts) {
                // Consider local cache valid for 30 days
                const age = Date.now() - data.ts;
                if (age < 30 * 24 * 60 * 60 * 1000) {
                    return { valid: true, plan: 'premium' };
                }
            }
            return { valid: false };
        } catch {
            return { valid: false };
        }
    },

    /** Parse legacy mock JWT token for backward compat */
    _parseLegacyToken(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return { valid: false };
            const payload = JSON.parse(atob(parts[1]));
            if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
                localStorage.removeItem(this.STORAGE_KEY);
                return { valid: false };
            }
            return { valid: true, plan: payload.plan };
        } catch {
            return { valid: false };
        }
    },

    /** Invalidate cache (e.g., after login/logout) */
    invalidateCache() {
        this._cachedStatus = null;
        this._cacheTime = 0;
    }
};
