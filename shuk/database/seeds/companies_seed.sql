-- Sample seed data for development/testing
-- Replace with real TASE data after running the pipeline

INSERT INTO companies (symbol, name_he, name_en, sector, industry) VALUES
  ('TEVA',  'טבע תעשיות פרמצבטיות',    'Teva Pharmaceutical Industries', 'בריאות',      'פרמצבטיקה'),
  ('NICE',  'ניס מערכות',               'NICE Systems',                  'טכנולוגיה',   'תוכנה'),
  ('CHKP',  'צ׳ק פוינט',                'Check Point Software',          'טכנולוגיה',   'אבטחת סייבר'),
  ('ICL',   'כיל',                      'ICL Group',                     'חומרים',      'כימייה'),
  ('BEZQ',  'בזק',                      'Bezeq',                         'תקשורת',      'טלקום'),
  ('LUMI',  'לאומי',                    'Bank Leumi',                    'פיננסים',     'בנקאות'),
  ('HAPO',  'הפועלים',                  'Bank Hapoalim',                 'פיננסים',     'בנקאות'),
  ('PERI',  'פריון',                    'Perion Network',                'טכנולוגיה',   'פרסום דיגיטלי')
ON CONFLICT (symbol) DO NOTHING;
