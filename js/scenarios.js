/**
 * scenarios.js — Save/restore calculator scenarios to localStorage + cloud sync
 */
const Scenarios = {
    MAX_PER_CALC: 10,
    STORAGE_KEY: 'cheshbeshbon_scenarios',
    _syncing: false,

    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    init() {
        this.renderAll();

        // Listen for auth changes — sync on login
        if (typeof Auth !== 'undefined') {
            Auth.onAuthChange(async (user) => {
                if (user) {
                    await this.mergeCloudAndLocal();
                }
                this.renderAll();
            });
        }
    },

    getAll() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
        } catch { return {}; }
    },

    saveAll(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    },

    save(calcId, name) {
        if (!name || !name.trim()) return;
        const state = this.captureState(calcId);
        if (!state) return;

        const all = this.getAll();
        if (!all[calcId]) all[calcId] = [];

        // Limit per calculator
        if (all[calcId].length >= this.MAX_PER_CALC) {
            all[calcId].shift();
        }

        all[calcId].push({
            name: name.trim(),
            state,
            date: new Date().toLocaleDateString('he-IL'),
            updatedAt: Date.now()
        });

        this.saveAll(all);
        this.renderChips(calcId);

        // Cloud sync in background
        if (Auth.isLoggedIn()) {
            this._syncScenarioToCloud(calcId, name.trim(), state);
        }
    },

    remove(calcId, index) {
        const all = this.getAll();
        if (all[calcId]) {
            const removed = all[calcId].splice(index, 1)[0];
            this.saveAll(all);
            this.renderChips(calcId);

            // Remove from cloud too
            if (Auth.isLoggedIn() && removed) {
                this._removeFromCloud(calcId, removed.name);
            }
        }
    },

    restore(calcId, index) {
        const all = this.getAll();
        const scenario = all[calcId]?.[index];
        if (!scenario) return;
        this.applyState(calcId, scenario.state);
    },

    captureState(calcId) {
        const section = document.getElementById(calcId + '-section');
        if (!section) return null;

        const state = {};
        section.querySelectorAll('input, select').forEach(el => {
            if (!el.id) return;
            if (el.type === 'checkbox') {
                state[el.id] = el.checked;
            } else {
                state[el.id] = el.value;
            }
        });
        return state;
    },

    applyState(calcId, state) {
        const section = document.getElementById(calcId + '-section');
        if (!section) return;

        section.querySelectorAll('input, select').forEach(el => {
            if (!el.id) return;
            if (state[el.id] !== undefined) {
                if (el.type === 'checkbox') {
                    el.checked = state[el.id];
                } else {
                    el.value = state[el.id];
                }
            }
        });

        // Trigger recalculation
        const event = new Event('input', { bubbles: true });
        const firstInput = section.querySelector('input');
        if (firstInput) firstInput.dispatchEvent(event);
    },

    renderAll() {
        ['mortgage', 'salary', 'rent-vs-buy', 'pension'].forEach(id => {
            this.renderChips(id);
        });
    },

    renderChips(calcId) {
        const container = document.getElementById('scenarios-' + calcId);
        if (!container) return;

        const all = this.getAll();
        const scenarios = all[calcId] || [];

        if (scenarios.length === 0) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }

        const isLoggedIn = typeof Auth !== 'undefined' && Auth.isLoggedIn();

        container.style.display = 'flex';
        container.innerHTML = scenarios.map((s, i) => `
            <button class="scenario-chip" onclick="Scenarios.restore('${calcId}', ${i})" title="${this.escapeHTML(s.date)}">
                ${isLoggedIn ? '<span class="sync-icon" title="מסונכרן לענן">&#x2601;</span>' : ''}
                ${this.escapeHTML(s.name)}
                <span class="scenario-remove" onclick="event.stopPropagation(); Scenarios.remove('${calcId}', ${i})">&#x2715;</span>
            </button>
        `).join('');
    },

    // ===================== CLOUD SYNC =====================

    async _syncScenarioToCloud(calcId, name, state) {
        const sb = SupabaseClient.getClient();
        const user = Auth.getUser();
        if (!sb || !user || !SupabaseClient.isConfigured()) return;

        try {
            // Upsert by user_id + calc_type + name
            const { data: existing } = await sb
                .from('scenarios')
                .select('id')
                .eq('user_id', user.id)
                .eq('calc_type', calcId)
                .eq('name', name)
                .single();

            if (existing) {
                await sb.from('scenarios')
                    .update({ state, updated_at: new Date().toISOString() })
                    .eq('id', existing.id);
            } else {
                await sb.from('scenarios').insert({
                    user_id: user.id,
                    calc_type: calcId,
                    name,
                    state,
                    updated_at: new Date().toISOString()
                });
            }
        } catch (e) {
            console.warn('Scenarios: cloud sync failed', e);
        }
    },

    async _removeFromCloud(calcId, name) {
        const sb = SupabaseClient.getClient();
        const user = Auth.getUser();
        if (!sb || !user || !SupabaseClient.isConfigured()) return;

        try {
            await sb.from('scenarios')
                .delete()
                .eq('user_id', user.id)
                .eq('calc_type', calcId)
                .eq('name', name);
        } catch (e) {
            console.warn('Scenarios: cloud delete failed', e);
        }
    },

    async loadFromCloud() {
        const sb = SupabaseClient.getClient();
        const user = Auth.getUser();
        if (!sb || !user || !SupabaseClient.isConfigured()) return [];

        try {
            const { data, error } = await sb
                .from('scenarios')
                .select('*')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (e) {
            console.warn('Scenarios: cloud load failed', e);
            return [];
        }
    },

    async syncToCloud() {
        const sb = SupabaseClient.getClient();
        const user = Auth.getUser();
        if (!sb || !user || !SupabaseClient.isConfigured()) return;

        const all = this.getAll();
        for (const calcId of Object.keys(all)) {
            for (const scenario of all[calcId]) {
                await this._syncScenarioToCloud(calcId, scenario.name, scenario.state);
            }
        }
    },

    async mergeCloudAndLocal() {
        if (this._syncing) return;
        this._syncing = true;

        try {
            const cloudScenarios = await this.loadFromCloud();
            if (!cloudScenarios.length) {
                // No cloud data — push local to cloud
                await this.syncToCloud();
                this._syncing = false;
                return;
            }

            const local = this.getAll();

            // Build merged set: newest wins per name+calcId
            for (const cs of cloudScenarios) {
                const calcId = cs.calc_type;
                if (!local[calcId]) local[calcId] = [];

                const existingIdx = local[calcId].findIndex(s => s.name === cs.name);
                const cloudTime = new Date(cs.updated_at).getTime();

                if (existingIdx >= 0) {
                    const localTime = local[calcId][existingIdx].updatedAt || 0;
                    if (cloudTime > localTime) {
                        // Cloud is newer — replace local
                        local[calcId][existingIdx] = {
                            name: cs.name,
                            state: cs.state,
                            date: new Date(cs.updated_at).toLocaleDateString('he-IL'),
                            updatedAt: cloudTime
                        };
                    }
                } else {
                    // Not in local — add from cloud
                    if (local[calcId].length < this.MAX_PER_CALC) {
                        local[calcId].push({
                            name: cs.name,
                            state: cs.state,
                            date: new Date(cs.updated_at).toLocaleDateString('he-IL'),
                            updatedAt: cloudTime
                        });
                    }
                }
            }

            this.saveAll(local);

            // Push any local-only scenarios to cloud
            await this.syncToCloud();
        } catch (e) {
            console.warn('Scenarios: merge failed', e);
        }

        this._syncing = false;
    },

    promptSave(calcId) {
        const name = prompt('שם התרחיש:');
        if (name) this.save(calcId, name);
    },

    renderSaveButton(calcId) {
        return `<button class="btn-share" onclick="Scenarios.promptSave('${calcId}')">
            &#x1F4BE; שמור תרחיש
        </button>`;
    }
};
