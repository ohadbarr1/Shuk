-- Seed data for development/testing
-- Replace with real TASE data after running the pipeline

-- ── Companies ──────────────────────────────────────────────────────────────

INSERT INTO companies (symbol, name_he, name_en, sector, industry, market_cap_ils, description_he, listing_date, is_active)
VALUES
  ('TEVA',  'טבע תעשיות פרמצבטיות', 'Teva Pharmaceutical Industries', 'בריאות',    'פרמצבטיקה',       56000000000, 'חברת תרופות גנריות ומקוריות, אחת מחמש חברות התרופות הגדולות בעולם.', '1951-01-01', TRUE),
  ('NICE',  'ניס מערכות',           'NICE Systems',                  'טכנולוגיה', 'תוכנה',            42000000000, 'ספקית פתרונות תוכנה לניהול חוויית לקוח ותאימות רגולטורית.', '1996-06-01', TRUE),
  ('CHKP',  'צ׳ק פוינט',           'Check Point Software',          'טכנולוגיה', 'אבטחת סייבר',      175000000000,'חברת אבטחת סייבר מובילה המגנה על רשתות, ענן ומשתמשי קצה.', '1996-06-01', TRUE),
  ('ICL',   'כיל',                  'ICL Group',                     'חומרים',    'כימייה',           32000000000, 'קבוצת מינרלים וכימיקלים מיוחדים, פועלת בתחומי חקלאות ותעשייה.', '1992-01-01', TRUE),
  ('BEZQ',  'בזק',                  'Bezeq',                         'תקשורת',    'טלקום',            14000000000, 'ספקית תשתיות ושירותי תקשורת מובילה בישראל.', '1990-01-01', TRUE),
  ('LUMI',  'לאומי',                'Bank Leumi',                    'פיננסים',   'בנקאות',           48000000000, 'אחד מחמשת הבנקים הגדולים בישראל, מציע שירותים פיננסיים מקיפים.', '1966-01-01', TRUE),
  ('HAPO',  'הפועלים',              'Bank Hapoalim',                 'פיננסים',   'בנקאות',           55000000000, 'הבנק הגדול ביותר בישראל לפי נפח פעילות ומספר לקוחות.', '1961-01-01', TRUE),
  ('ESLT',  'אלביט מערכות',         'Elbit Systems',                 'תעשייה',    'ביטחון ואווירה',   68000000000, 'חברת ביטחון ואלקטרוניקה בינלאומית מובילה בפיתוח מערכות הגנה.', '1996-01-01', TRUE)
ON CONFLICT (symbol) DO NOTHING;

-- ── Financial Statements (Annual, 2019–2023) ────────────────────────────────
-- All monetary values in ILS thousands (×1,000)

-- CHKP — Check Point (הכנסות גבוהות, מרווחים גבוהים)
INSERT INTO financial_statements
  (company_id, period_type, period_end, revenue, gross_profit, operating_income, net_income,
   ebitda, eps, total_assets, total_equity, total_debt, cash_and_equivalents,
   operating_cash_flow, capex, free_cash_flow, fetched_at)
SELECT c.id, 'annual', d.period_end,
       d.revenue, d.gross_profit, d.operating_income, d.net_income,
       d.ebitda, d.eps, d.total_assets, d.total_equity, d.total_debt, d.cash,
       d.ocf, d.capex, d.fcf, NOW()
FROM companies c,
     (VALUES
       ('2019-12-31'::date,  7200000,  6840000,  2520000,  2160000,  2900000,  6.15,  20000000, 14000000, 2400000,  3200000, 1980000, 180000, 1800000),
       ('2020-12-31'::date,  7800000,  7410000,  2730000,  2340000,  3150000,  6.72,  21500000, 15200000, 2200000,  3800000, 2145000, 190000, 1955000),
       ('2021-12-31'::date,  8500000,  8075000,  2975000,  2550000,  3400000,  7.35,  23000000, 16800000, 2000000,  4100000, 2380000, 200000, 2180000),
       ('2022-12-31'::date,  9200000,  8740000,  3220000,  2760000,  3680000,  8.05,  24800000, 18200000, 1800000,  4600000, 2576000, 210000, 2366000),
       ('2023-12-31'::date, 10100000,  9595000,  3535000,  3030000,  4040000,  8.98,  26500000, 19800000, 1600000,  5200000, 2828000, 220000, 2608000)
     ) AS d(period_end, revenue, gross_profit, operating_income, net_income, ebitda, eps,
            total_assets, total_equity, total_debt, cash, ocf, capex, fcf)
WHERE c.symbol = 'CHKP'
ON CONFLICT (company_id, period_type, period_end) DO NOTHING;

-- TEVA — Teva (מכירות גדולות, רווחיות נמוכה)
INSERT INTO financial_statements
  (company_id, period_type, period_end, revenue, gross_profit, operating_income, net_income,
   ebitda, eps, total_assets, total_equity, total_debt, cash_and_equivalents,
   operating_cash_flow, capex, free_cash_flow, fetched_at)
SELECT c.id, 'annual', d.period_end,
       d.revenue, d.gross_profit, d.operating_income, d.net_income,
       d.ebitda, d.eps, d.total_assets, d.total_equity, d.total_debt, d.cash,
       d.ocf, d.capex, d.fcf, NOW()
FROM companies c,
     (VALUES
       ('2019-12-31'::date, 65200000, 29340000,  6520000, -1960000,  9780000, -1.77, 350000000, 65000000, 130000000, 12000000,  7700000, 1200000,  6500000),
       ('2020-12-31'::date, 66100000, 29745000,  6610000,  1322000, 10200000,  0.12, 340000000, 66000000, 122000000, 14000000,  8200000, 1100000,  7100000),
       ('2021-12-31'::date, 67400000, 30330000,  6740000,  2022000, 10900000,  0.18, 332000000, 68000000, 115000000, 16000000,  8600000, 1050000,  7550000),
       ('2022-12-31'::date, 69000000, 31050000,  6900000,  2070000, 11200000,  0.19, 325000000, 70000000, 108000000, 18000000,  9000000,  950000,  8050000),
       ('2023-12-31'::date, 71500000, 32175000,  7150000,  2145000, 11800000,  0.20, 318000000, 72000000, 100000000, 20000000,  9500000,  900000,  8600000)
     ) AS d(period_end, revenue, gross_profit, operating_income, net_income, ebitda, eps,
            total_assets, total_equity, total_debt, cash, ocf, capex, fcf)
WHERE c.symbol = 'TEVA'
ON CONFLICT (company_id, period_type, period_end) DO NOTHING;

-- NICE — NICE Systems
INSERT INTO financial_statements
  (company_id, period_type, period_end, revenue, gross_profit, operating_income, net_income,
   ebitda, eps, total_assets, total_equity, total_debt, cash_and_equivalents,
   operating_cash_flow, capex, free_cash_flow, fetched_at)
SELECT c.id, 'annual', d.period_end,
       d.revenue, d.gross_profit, d.operating_income, d.net_income,
       d.ebitda, d.eps, d.total_assets, d.total_equity, d.total_debt, d.cash,
       d.ocf, d.capex, d.fcf, NOW()
FROM companies c,
     (VALUES
       ('2019-12-31'::date,  5200000,  3640000,  1196000,  1092000,  1560000,  6.20,  18000000, 10000000,  2000000,  1500000,  1196000,  96000,  1100000),
       ('2020-12-31'::date,  5800000,  4060000,  1334000,  1218000,  1740000,  6.90,  20000000, 11500000,  1800000,  2000000,  1334000, 100000,  1234000),
       ('2021-12-31'::date,  6600000,  4620000,  1518000,  1386000,  1980000,  7.90,  22000000, 13000000,  1600000,  2400000,  1518000, 108000,  1410000),
       ('2022-12-31'::date,  7400000,  5180000,  1702000,  1554000,  2220000,  8.90,  24500000, 14800000,  1400000,  2800000,  1702000, 112000,  1590000),
       ('2023-12-31'::date,  8300000,  5810000,  1909000,  1743000,  2490000, 10.00,  27000000, 16800000,  1200000,  3200000,  1909000, 116000,  1793000)
     ) AS d(period_end, revenue, gross_profit, operating_income, net_income, ebitda, eps,
            total_assets, total_equity, total_debt, cash, ocf, capex, fcf)
WHERE c.symbol = 'NICE'
ON CONFLICT (company_id, period_type, period_end) DO NOTHING;

-- ICL — כיל
INSERT INTO financial_statements
  (company_id, period_type, period_end, revenue, gross_profit, operating_income, net_income,
   ebitda, eps, total_assets, total_equity, total_debt, cash_and_equivalents,
   operating_cash_flow, capex, free_cash_flow, fetched_at)
SELECT c.id, 'annual', d.period_end,
       d.revenue, d.gross_profit, d.operating_income, d.net_income,
       d.ebitda, d.eps, d.total_assets, d.total_equity, d.total_debt, d.cash,
       d.ocf, d.capex, d.fcf, NOW()
FROM companies c,
     (VALUES
       ('2019-12-31'::date, 19700000,  5910000,  2758000,  1576000,  3546000,  1.22,  60000000, 24000000, 14000000,  1200000,  2758000, 960000,  1798000),
       ('2020-12-31'::date, 20100000,  6030000,  2814000,  1608000,  3618000,  1.24,  61000000, 24800000, 13200000,  1400000,  2814000, 920000,  1894000),
       ('2021-12-31'::date, 24600000,  7380000,  3936000,  2214000,  4428000,  1.71,  65000000, 27000000, 12000000,  1800000,  3936000, 900000,  3036000),
       ('2022-12-31'::date, 32500000,  9750000,  6500000,  3900000,  7150000,  3.01,  70000000, 32000000, 10500000,  3000000,  6500000, 980000,  5520000),
       ('2023-12-31'::date, 27000000,  8100000,  4320000,  2700000,  5670000,  2.09,  66000000, 30000000, 10000000,  2400000,  4320000, 950000,  3370000)
     ) AS d(period_end, revenue, gross_profit, operating_income, net_income, ebitda, eps,
            total_assets, total_equity, total_debt, cash, ocf, capex, fcf)
WHERE c.symbol = 'ICL'
ON CONFLICT (company_id, period_type, period_end) DO NOTHING;

-- BEZQ — בזק
INSERT INTO financial_statements
  (company_id, period_type, period_end, revenue, gross_profit, operating_income, net_income,
   ebitda, eps, total_assets, total_equity, total_debt, cash_and_equivalents,
   operating_cash_flow, capex, free_cash_flow, fetched_at)
SELECT c.id, 'annual', d.period_end,
       d.revenue, d.gross_profit, d.operating_income, d.net_income,
       d.ebitda, d.eps, d.total_assets, d.total_equity, d.total_debt, d.cash,
       d.ocf, d.capex, d.fcf, NOW()
FROM companies c,
     (VALUES
       ('2019-12-31'::date,  8800000,  3520000,  1848000,  1056000,  2640000,  0.39,  30000000,  4000000, 18000000,   800000,  2464000, 900000,  1564000),
       ('2020-12-31'::date,  8600000,  3440000,  1806000,  1032000,  2580000,  0.38,  29000000,  4200000, 17000000,   900000,  2408000, 850000,  1558000),
       ('2021-12-31'::date,  8700000,  3480000,  1827000,  1044000,  2610000,  0.39,  28500000,  4400000, 16000000,  1000000,  2436000, 820000,  1616000),
       ('2022-12-31'::date,  8900000,  3560000,  1869000,  1068000,  2670000,  0.40,  28000000,  4600000, 15200000,  1100000,  2492000, 800000,  1692000),
       ('2023-12-31'::date,  9100000,  3640000,  1911000,  1092000,  2730000,  0.41,  27500000,  4800000, 14400000,  1200000,  2548000, 780000,  1768000)
     ) AS d(period_end, revenue, gross_profit, operating_income, net_income, ebitda, eps,
            total_assets, total_equity, total_debt, cash, ocf, capex, fcf)
WHERE c.symbol = 'BEZQ'
ON CONFLICT (company_id, period_type, period_end) DO NOTHING;

-- ESLT — אלביט מערכות
INSERT INTO financial_statements
  (company_id, period_type, period_end, revenue, gross_profit, operating_income, net_income,
   ebitda, eps, total_assets, total_equity, total_debt, cash_and_equivalents,
   operating_cash_flow, capex, free_cash_flow, fetched_at)
SELECT c.id, 'annual', d.period_end,
       d.revenue, d.gross_profit, d.operating_income, d.net_income,
       d.ebitda, d.eps, d.total_assets, d.total_equity, d.total_debt, d.cash,
       d.ocf, d.capex, d.fcf, NOW()
FROM companies c,
     (VALUES
       ('2019-12-31'::date, 13100000,  2882000,  1310000,  1048000,  1965000, 23.40,  32000000, 16000000,  4000000,  2000000,  1572000, 400000,  1172000),
       ('2020-12-31'::date, 14100000,  3102000,  1410000,  1128000,  2115000, 25.20,  34000000, 17500000,  3800000,  2200000,  1692000, 420000,  1272000),
       ('2021-12-31'::date, 16100000,  3542000,  1610000,  1288000,  2415000, 28.80,  38000000, 19500000,  3600000,  2400000,  1932000, 450000,  1482000),
       ('2022-12-31'::date, 19000000,  4180000,  1900000,  1520000,  2850000, 34.00,  43000000, 22000000,  3400000,  2600000,  2280000, 500000,  1780000),
       ('2023-12-31'::date, 22500000,  4950000,  2250000,  1800000,  3375000, 40.30,  50000000, 25000000,  3200000,  2800000,  2700000, 550000,  2150000)
     ) AS d(period_end, revenue, gross_profit, operating_income, net_income, ebitda, eps,
            total_assets, total_equity, total_debt, cash, ocf, capex, fcf)
WHERE c.symbol = 'ESLT'
ON CONFLICT (company_id, period_type, period_end) DO NOTHING;

-- ── Historical Prices (last 5 trading days mock) ────────────────────────────

INSERT INTO historical_prices (company_id, trade_date, open_price, high_price, low_price, close_price, adjusted_close, volume)
SELECT c.id, d.trade_date, d.open_p, d.high_p, d.low_p, d.close_p, d.close_p, d.vol
FROM companies c,
     (VALUES
       -- CHKP
       ('CHKP', '2024-01-02'::date,  680.00,  695.00,  675.00,  690.00,  690.00, 350000),
       ('CHKP', '2024-01-03'::date,  690.00,  705.00,  685.00,  700.00,  700.00, 380000),
       ('CHKP', '2024-01-04'::date,  700.00,  710.00,  692.00,  705.00,  705.00, 320000),
       -- TEVA
       ('TEVA', '2024-01-02'::date,   47.50,   49.00,   47.00,   48.20,   48.20,4500000),
       ('TEVA', '2024-01-03'::date,   48.20,   49.50,   47.80,   49.00,   49.00,4800000),
       ('TEVA', '2024-01-04'::date,   49.00,   50.00,   48.50,   49.50,   49.50,4200000),
       -- NICE
       ('NICE', '2024-01-02'::date,  650.00,  662.00,  645.00,  658.00,  658.00, 180000),
       ('NICE', '2024-01-03'::date,  658.00,  670.00,  655.00,  665.00,  665.00, 190000),
       ('NICE', '2024-01-04'::date,  665.00,  672.00,  660.00,  668.00,  668.00, 175000),
       -- ICL
       ('ICL',  '2024-01-02'::date,   16.50,   17.00,   16.30,   16.80,   16.80,2200000),
       ('ICL',  '2024-01-03'::date,   16.80,   17.20,   16.60,   17.00,   17.00,2400000),
       ('ICL',  '2024-01-04'::date,   17.00,   17.40,   16.80,   17.20,   17.20,2100000),
       -- BEZQ
       ('BEZQ', '2024-01-02'::date,    5.20,    5.35,    5.15,    5.28,    5.28,3200000),
       ('BEZQ', '2024-01-03'::date,    5.28,    5.40,    5.22,    5.35,    5.35,3400000),
       ('BEZQ', '2024-01-04'::date,    5.35,    5.45,    5.28,    5.40,    5.40,3100000),
       -- ESLT
       ('ESLT', '2024-01-02'::date,  850.00,  865.00,  845.00,  858.00,  858.00, 120000),
       ('ESLT', '2024-01-03'::date,  858.00,  875.00,  852.00,  870.00,  870.00, 135000),
       ('ESLT', '2024-01-04'::date,  870.00,  882.00,  865.00,  876.00,  876.00, 115000)
     ) AS d(symbol, trade_date, open_p, high_p, low_p, close_p, adj_close, vol)
JOIN companies c ON c.symbol = d.symbol
ON CONFLICT (company_id, trade_date) DO NOTHING;

-- ── Dividends ───────────────────────────────────────────────────────────────

INSERT INTO dividends (company_id, ex_date, payment_date, amount_ils, dividend_yield, dividend_type)
SELECT c.id, d.ex_date, d.pay_date, d.amount, d.dy, 'regular'
FROM companies c,
     (VALUES
       ('CHKP', '2023-03-15'::date, '2023-04-01'::date, 15.00, 0.021),
       ('CHKP', '2023-09-15'::date, '2023-10-01'::date, 15.00, 0.021),
       ('BEZQ', '2023-03-15'::date, '2023-04-01'::date,  0.18, 0.034),
       ('BEZQ', '2023-09-15'::date, '2023-10-01'::date,  0.18, 0.034),
       ('ICL',  '2023-03-01'::date, '2023-03-20'::date,  0.40, 0.024),
       ('ICL',  '2023-09-01'::date, '2023-09-20'::date,  0.38, 0.022),
       ('LUMI', '2023-03-01'::date, '2023-03-20'::date,  0.92, 0.019),
       ('LUMI', '2023-09-01'::date, '2023-09-20'::date,  0.95, 0.020),
       ('HAPO', '2023-03-01'::date, '2023-03-20'::date,  1.05, 0.019),
       ('HAPO', '2023-09-01'::date, '2023-09-20'::date,  1.10, 0.020)
     ) AS d(symbol, ex_date, pay_date, amount, dy)
JOIN companies c ON c.symbol = d.symbol
ON CONFLICT DO NOTHING;
