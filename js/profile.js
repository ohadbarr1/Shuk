/**
 * profile.js — Financial profile page: CRUD + calculator pre-fill
 */
const Profile = {
    STORAGE_KEY: 'cheshbeshbon_profile',
    _saveTimer: null,

    init() {
        this._setupForm();
        this._loadProfile();

        // Listen for auth changes
        if (typeof Auth !== 'undefined') {
            Auth.onAuthChange(async (user) => {
                if (user) {
                    await this._loadFromCloud();
                }
                this._updateProgressBar();
            });
        }

        // "Fill from profile" buttons
        document.querySelectorAll('.btn-fill-profile').forEach(btn => {
            btn.addEventListener('click', () => {
                const calcId = btn.dataset.calc;
                if (calcId) this.applyToCalculator(calcId);
            });
        });
    },

    _setupForm() {
        const form = document.getElementById('profile-form');
        if (!form) return;

        // Debounced auto-save on any input change
        form.addEventListener('input', () => {
            clearTimeout(this._saveTimer);
            this._saveTimer = setTimeout(() => this.save(), 800);
        });

        form.addEventListener('change', () => {
            clearTimeout(this._saveTimer);
            this._saveTimer = setTimeout(() => this.save(), 400);
        });
    },

    _getFormData() {
        return {
            age: this._getVal('profile-age'),
            family_status: this._getVal('profile-family-status'),
            num_children: this._getVal('profile-children') || 0,
            employment_type: this._getVal('profile-employment'),
            gross_salary: this._getVal('profile-salary'),
            housing_status: this._getVal('profile-housing'),
            current_rent: this._getVal('profile-rent'),
            mortgage_balance: this._getVal('profile-mortgage-balance'),
            pension_savings: this._getVal('profile-pension-savings'),
            keren_hishtalmut: this._getVal('profile-keren'),
            other_savings: this._getVal('profile-other-savings')
        };
    },

    _getVal(id) {
        const el = document.getElementById(id);
        if (!el) return null;
        if (el.type === 'number' || el.type === 'range') {
            const v = parseFloat(el.value);
            return isNaN(v) ? null : v;
        }
        return el.value || null;
    },

    _setVal(id, value) {
        const el = document.getElementById(id);
        if (!el || value === null || value === undefined) return;
        el.value = value;
    },

    _applyFormData(data) {
        if (!data) return;
        this._setVal('profile-age', data.age);
        this._setVal('profile-family-status', data.family_status);
        this._setVal('profile-children', data.num_children);
        this._setVal('profile-employment', data.employment_type);
        this._setVal('profile-salary', data.gross_salary);
        this._setVal('profile-housing', data.housing_status);
        this._setVal('profile-rent', data.current_rent);
        this._setVal('profile-mortgage-balance', data.mortgage_balance);
        this._setVal('profile-pension-savings', data.pension_savings);
        this._setVal('profile-keren', data.keren_hishtalmut);
        this._setVal('profile-other-savings', data.other_savings);
        this._updateProgressBar();
    },

    save() {
        const data = this._getFormData();

        // Always save to localStorage
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        this._updateProgressBar();

        // Save to cloud if logged in
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
            this._saveToCloud(data);
        }
    },

    async _saveToCloud(data) {
        const sb = SupabaseClient.getClient();
        const user = Auth.getUser();
        if (!sb || !user || !SupabaseClient.isConfigured()) return;

        try {
            await sb.from('financial_profiles').upsert({
                user_id: user.id,
                ...data,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        } catch (e) {
            console.warn('Profile: cloud save failed', e);
        }
    },

    _loadProfile() {
        // Load from localStorage
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this._applyFormData(JSON.parse(stored));
            }
        } catch (e) {
            console.warn('Profile: localStorage load failed', e);
        }
    },

    async _loadFromCloud() {
        const sb = SupabaseClient.getClient();
        const user = Auth.getUser();
        if (!sb || !user || !SupabaseClient.isConfigured()) return;

        try {
            const { data, error } = await sb
                .from('financial_profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (!error && data) {
                this._applyFormData(data);
                // Also update localStorage
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            }
        } catch (e) {
            console.warn('Profile: cloud load failed', e);
        }
    },

    getPreFillData() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    },

    applyToCalculator(calcId) {
        const data = this.getPreFillData();
        if (!data) {
            alert('לא נמצא פרופיל. מלא את הפרטים בעמוד הפרופיל קודם.');
            return;
        }

        switch (calcId) {
            case 'mortgage':
                if (data.mortgage_balance) {
                    const amountInput = document.querySelector('.track-amount');
                    if (amountInput) amountInput.value = data.mortgage_balance;
                }
                break;

            case 'salary':
                if (data.gross_salary) {
                    const el = document.getElementById('salary-gross');
                    if (el) el.value = data.gross_salary;
                }
                if (data.employment_type === 'self-employed') {
                    const toggle = document.getElementById('salary-employment-toggle');
                    if (toggle) toggle.checked = true;
                }
                break;

            case 'rent-vs-buy':
                if (data.current_rent) {
                    const el = document.getElementById('rvb-rent');
                    if (el) el.value = data.current_rent;
                }
                if (data.other_savings) {
                    const el = document.getElementById('rvb-equity');
                    if (el) el.value = data.other_savings;
                }
                break;

            case 'pension':
                if (data.age) {
                    const el = document.getElementById('pension-age');
                    if (el) el.value = data.age;
                }
                if (data.gross_salary) {
                    const el = document.getElementById('pension-salary');
                    if (el) el.value = data.gross_salary;
                }
                if (data.pension_savings) {
                    const el = document.getElementById('pension-current-savings');
                    if (el) el.value = data.pension_savings;
                }
                break;
        }

        // Trigger recalculation
        const section = document.getElementById(calcId + '-section');
        if (section) {
            const firstInput = section.querySelector('input');
            if (firstInput) {
                firstInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    },

    _updateProgressBar() {
        const bar = document.getElementById('profile-progress-bar');
        const text = document.getElementById('profile-progress-text');
        if (!bar) return;

        const data = this._getFormData();
        const fields = ['age', 'family_status', 'employment_type', 'gross_salary', 'housing_status',
                        'pension_savings', 'keren_hishtalmut', 'other_savings'];
        const filled = fields.filter(f => data[f] !== null && data[f] !== '' && data[f] !== 0).length;
        const pct = Math.round((filled / fields.length) * 100);

        bar.style.width = pct + '%';
        if (text) text.textContent = pct + '% הושלם';
    }
};
