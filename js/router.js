/**
 * router.js — Hash-based SPA router with SEO support
 * Routes: #home, #calculators, #about, #faq, #contact, #profile
 * Calculator deep links: #mortgage, #salary, #rent-vs-buy, #pension
 */
const Router = {
    pages: ['home', 'calculators', 'about', 'faq', 'contact', 'profile'],
    calculatorRoutes: ['mortgage', 'salary', 'rent-vs-buy', 'pension'],
    currentPage: null,

    // SEO meta data per route
    meta: {
        home: {
            title: 'חשבשבון — סימולטור החלטות פיננסיות',
            description: 'חשבשבון — כלי חכם לחישוב משכנתא, שכר נטו, שכירות מול קנייה ופנסיה. 4 מחשבונים מקצועיים, נתוני 2026, חינם ובלי הרשמה.'
        },
        calculators: {
            title: 'מחשבונים פיננסיים — חשבשבון',
            description: '4 מחשבונים פיננסיים מקצועיים: משכנתא, שכר נטו, שכירות מול קנייה ופנסיה. נתוני 2026.'
        },
        mortgage: {
            title: 'מחשבון משכנתא — חשבשבון | חישוב החזר משכנתא, לוח סילוקין ומסלולים',
            description: 'מחשבון משכנתא מתקדם עם תמהיל עד 5 מסלולים, פירעון מוקדם, ריביות בנק ישראל 2026. חינם ובלי הרשמה.'
        },
        salary: {
            title: 'מחשבון שכר נטו — חשבשבון | חישוב משכורת, מס הכנסה וביטוח לאומי',
            description: 'חשב שכר נטו ממשכורת ברוטו. מדרגות מס 2026, ביטוח לאומי, מס בריאות, פנסיה. שכיר ועצמאי.'
        },
        'rent-vs-buy': {
            title: 'שכירות מול קנייה — חשבשבון | השוואה פיננסית ל-20 שנה',
            description: 'השווה בין שכירות לקנייה ב-20 שנה. כולל מס רכישה, עליית ערך, תשואה על הון עצמי. נתוני 2026.'
        },
        pension: {
            title: 'מחשבון פנסיה — חשבשבון | תחזית חיסכון פנסיוני',
            description: 'חשב כמה תקבל בפנסיה. סימולציית חיסכון, יחס תחלופה, ניתוח רגישות. נתוני 2026.'
        },
        about: {
            title: 'איך זה עובד — חשבשבון',
            description: 'איך חשבשבון עובד: 4 מחשבונים פיננסיים בזמן אמת, נתוני 2026, בלי הרשמה.'
        },
        faq: {
            title: 'שאלות נפוצות — חשבשבון',
            description: 'שאלות נפוצות על חשבשבון: מחשבון משכנתא, שכר, שכירות מול קנייה ופנסיה.'
        },
        contact: {
            title: 'צור קשר — חשבשבון',
            description: 'צור קשר עם חשבשבון. שאלות, הצעות, דיווח על באגים.'
        },
        profile: {
            title: 'הפרופיל שלי — חשבשבון',
            description: 'הפרופיל הפיננסי שלך בחשבשבון. מלא פעם אחת והמחשבונים יתמלאו אוטומטית.'
        }
    },

    init() {
        window.addEventListener('hashchange', () => this.navigate());
        // Handle nav link clicks
        document.querySelectorAll('[data-nav]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.nav;
                window.location.hash = page;
                // Close mobile menu
                this.closeMobileMenu();
            });
        });
        // Close mobile menu on backdrop click
        const backdrop = document.getElementById('nav-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => this.closeMobileMenu());
        }
        // Update aria-expanded when toggle changes
        const toggle = document.getElementById('nav-toggle');
        if (toggle) {
            toggle.addEventListener('change', () => {
                const hamburger = document.querySelector('.nav-hamburger');
                if (hamburger) hamburger.setAttribute('aria-expanded', String(toggle.checked));
            });
        }
        // Initial route
        this.navigate();
    },

    closeMobileMenu() {
        const toggle = document.getElementById('nav-toggle');
        if (toggle) {
            toggle.checked = false;
            const hamburger = document.querySelector('.nav-hamburger');
            if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
        }
    },

    navigate() {
        const rawHash = window.location.hash.slice(1) || 'home';

        // Split hash from query params: #mortgage?amount=1000000 → hash=mortgage, params={amount:1000000}
        const qIndex = rawHash.indexOf('?');
        const hash = qIndex >= 0 ? rawHash.substring(0, qIndex) : rawHash;
        const hashParams = qIndex >= 0 ? new URLSearchParams(rawHash.substring(qIndex + 1)) : null;

        // Check if this is a calculator deep link
        let page, calcTab = null;
        if (this.calculatorRoutes.includes(hash)) {
            page = 'calculators';
            calcTab = hash;
        } else {
            page = this.pages.includes(hash) ? hash : 'home';
        }

        // Update meta tags for the effective route
        const metaKey = calcTab || page;
        this._updateMeta(metaKey);

        // Track page view
        if (typeof posthog !== 'undefined' && posthog.capture) {
            posthog.capture('$pageview', { page: metaKey });
        }

        if (page === this.currentPage && !calcTab) return;
        this.currentPage = page;

        // Hide all page sections
        this.pages.forEach(p => {
            const el = document.getElementById('page-' + p);
            if (el) {
                el.classList.remove('page-active');
                el.style.display = 'none';
            }
        });

        // Show target page
        const target = document.getElementById('page-' + page);
        if (target) {
            target.style.display = '';
            void target.offsetWidth; // force reflow
            target.classList.add('page-active');
        }

        // Update nav active state
        document.querySelectorAll('[data-nav]').forEach(link => {
            const isActive = link.dataset.nav === page ||
                (calcTab && link.dataset.nav === 'calculators');
            link.classList.toggle('nav-active', isActive);
        });

        // If calculator deep link, switch to the right tab and apply params
        if (calcTab) {
            setTimeout(() => {
                const btn = document.querySelector(`.tab-btn[data-tab="${calcTab}"]`);
                if (btn) btn.click();

                // Apply URL params as input values
                if (hashParams) {
                    this._applyHashParams(calcTab, hashParams);
                }
            }, 50);
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    _updateMeta(route) {
        const data = this.meta[route] || this.meta.home;

        // Update title
        document.title = data.title;

        // Update meta description
        const descMeta = document.querySelector('meta[name="description"]');
        if (descMeta) descMeta.setAttribute('content', data.description);

        // Update OG tags
        const ogTitle = document.querySelector('meta[property="og:title"]');
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogTitle) ogTitle.setAttribute('content', data.title);
        if (ogDesc) ogDesc.setAttribute('content', data.description);

        // Update canonical URL
        const canonical = document.getElementById('canonical-link');
        if (canonical) {
            const base = 'https://cheshbeshbon.co.il/';
            canonical.setAttribute('href', route === 'home' ? base : base + '#' + route);
        }
    },

    // Navigate to calculators and optionally select a specific tab
    goToCalculator(tabName) {
        if (tabName) {
            window.location.hash = tabName;
        } else {
            window.location.hash = 'calculators';
        }
    },

    /** Apply URL hash params to calculator inputs */
    _applyHashParams(calcId, params) {
        const section = document.getElementById(calcId + '-section');
        if (!section) return;

        // Map known short param names to input IDs
        const paramMap = {
            mortgage: {
                amount: '.track-amount', years: '.track-years', rate: '.track-rate', type: '.track-type'
            },
            salary: {
                gross: 'salary-gross'
            },
            'rent-vs-buy': {
                price: 'rvb-property-price', equity: 'rvb-equity', rent: 'rvb-rent'
            },
            pension: {
                age: 'pension-age', salary: 'pension-salary', savings: 'pension-current-savings'
            }
        };

        const map = paramMap[calcId] || {};
        let changed = false;

        for (const [key, value] of params.entries()) {
            const selector = map[key];
            if (!selector) continue;

            let el;
            if (selector.startsWith('.')) {
                // Class selector — apply to first matching element in section
                el = section.querySelector(selector);
            } else {
                el = document.getElementById(selector);
            }

            if (el) {
                el.value = value;
                changed = true;
            }
        }

        // Trigger recalculation if any params were applied
        if (changed) {
            const firstInput = section.querySelector('input');
            if (firstInput) {
                firstInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    },

    /**
     * Generate a shareable URL with current calculator state encoded in hash params.
     * Only encodes non-default, filled inputs.
     */
    getShareableURL(calcId) {
        const section = document.getElementById(calcId + '-section');
        if (!section) return window.location.href;

        const reverseMap = {
            mortgage: { '.track-amount': 'amount', '.track-years': 'years', '.track-rate': 'rate', '.track-type': 'type' },
            salary: { 'salary-gross': 'gross' },
            'rent-vs-buy': { 'rvb-property-price': 'price', 'rvb-equity': 'equity', 'rvb-rent': 'rent' },
            pension: { 'pension-age': 'age', 'pension-salary': 'salary', 'pension-current-savings': 'savings' }
        };

        const map = reverseMap[calcId] || {};
        const params = new URLSearchParams();

        for (const [selector, paramName] of Object.entries(map)) {
            let el;
            if (selector.startsWith('.')) {
                el = section.querySelector(selector);
            } else {
                el = document.getElementById(selector);
            }
            if (el && el.value) {
                params.set(paramName, el.value);
            }
        }

        const base = window.location.origin + window.location.pathname;
        const paramStr = params.toString();
        return base + '#' + calcId + (paramStr ? '?' + paramStr : '');
    }
};
