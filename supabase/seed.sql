-- ============================================
-- DUBAI CRM — SEED DATA FOR TESTING
-- Run this AFTER schema.sql in Supabase SQL Editor
-- NOTE: leads are inserted without assigned_agent_id
--       so they work without any auth.users rows.
-- ============================================

-- ============================================
-- LEADS (30 realistic Dubai leads)
-- ============================================
INSERT INTO leads (
  full_name, phone, area, property_type,
  nationality, nationality_flag, budget_tier, client_type,
  intent, status, lead_score, freshness_score,
  source, language, tags, notes,
  conversation_count, last_message_at, created_at
) VALUES

-- 🔥 HOT LEADS
('Mohammed Al Rashidi',    '+971501234001', 'Downtown Dubai',  'penthouse',   'Emirati',   '🇦🇪', '10m_plus',  'investor',       'buy',    'hot',       88, 95, 'whatsapp', 'ar', '{"vip","investor"}',          'Ready to close. Wants penthouse with Burj view.',         5, now() - interval '2 hours',   now() - interval '3 days'),
('Priya Sharma',           '+971502234002', 'Dubai Marina',    'apartment',   'Indian',    '🇮🇳', '1m_3m',     'end_user',       'buy',    'hot',       81, 90, 'facebook', 'en', '{"marina","family"}',         'Relocating from Mumbai. Needs 2BR by August.',            4, now() - interval '5 hours',   now() - interval '5 days'),
('Viktor Kovalenko',       '+971503234003', 'Palm Jumeirah',   'villa',       'Russian',   '🇷🇺', '10m_plus',  'investor',       'invest', 'hot',       92, 88, 'referral', 'en', '{"vip","palm","cash-buyer"}',  'Cash buyer. Looking for Palm villa, no mortgage.',        6, now() - interval '1 hour',    now() - interval '2 days'),
('Sarah Mitchell',         '+971504234004', 'DIFC',            'apartment',   'British',   '🇬🇧', '3m_5m',     'end_user',       'buy',    'hot',       79, 85, 'instagram','en', '{"difc","expat"}',            'Finance exec at DIFC. Needs ready unit ASAP.',            3, now() - interval '8 hours',   now() - interval '4 days'),
('Chen Wei',               '+971505234005', 'Business Bay',    'apartment',   'Chinese',   '🇨🇳', '5m_10m',    'investor',       'invest', 'hot',       85, 92, 'website',  'zh', '{"investor","off-plan"}',     'Buying 2 units for rental yield. Prefers off-plan.',      5, now() - interval '3 hours',   now() - interval '6 days'),

-- ✅ QUALIFIED LEADS
('Ahmed Al Mansoori',      '+971506234006', 'Jumeirah',        'villa',       'Emirati',   '🇦🇪', '5m_10m',    'end_user',       'buy',    'qualified', 72, 80, 'referral', 'ar', '{"jumeirah","villa"}',        'Upgrading from apartment. Family of 5.',                  3, now() - interval '1 day',    now() - interval '8 days'),
('Natasha Petrova',        '+971507234007', 'JBR',             'apartment',   'Russian',   '🇷🇺', '1m_3m',     'investor',       'invest', 'qualified', 68, 75, 'facebook', 'ru', '{"jbr","rental"}',           'Wants beachfront for holiday rental income.',             2, now() - interval '2 days',   now() - interval '10 days'),
('Rajesh Patel',           '+971508234008', 'Dubailand',       'townhouse',   'Indian',    '🇮🇳', 'under_1m',  'end_user',       'buy',    'qualified', 55, 70, 'whatsapp', 'hi', '{"family","affordable"}',    'First time buyer. School proximity is key.',              2, now() - interval '1 day',    now() - interval '12 days'),
('James O''Brien',         '+971509234009', 'Emirates Hills',  'villa',       'Irish',     '🇮🇪', '10m_plus',  'investor',       'buy',    'qualified', 76, 78, 'referral', 'en', '{"luxury","golf"}',          'Senior banker. Wants golf-course view villa.',            3, now() - interval '3 days',   now() - interval '7 days'),
('Fatima Al Zaabi',        '+971510234010', 'Mirdif',          'villa',       'Emirati',   '🇦🇪', '3m_5m',     'end_user',       'buy',    'qualified', 65, 72, 'website',  'ar', '{"family","mirdif"}',        'Wants compound-style villa near family.',                 2, now() - interval '2 days',   now() - interval '9 days'),

-- 🔄 QUALIFYING LEADS
('Dmitri Volkov',          '+971511234011', 'JVC',             'apartment',   'Russian',   '🇷🇺', '1m_3m',     'investor',       'invest', 'qualifying',48, 65, 'instagram','ru', '{"jvc","yield"}',            'Asking about rental yields in JVC vs JBR.',               1, now() - interval '4 days',   now() - interval '14 days'),
('Ananya Krishnan',        '+971512234012', 'Al Furjan',       'townhouse',   'Indian',    '🇮🇳', '1m_3m',     'end_user',       'buy',    'qualifying',45, 60, 'facebook', 'en', '{"family","metro"}',         'Needs metro access. Considering Al Furjan.',              1, now() - interval '5 days',   now() - interval '15 days'),
('Omar Farouq',            '+971513234013', 'Silicon Oasis',   'apartment',   'Egyptian',  '🇪🇬', 'under_1m',  'end_user',       'rent',   'qualifying',35, 55, 'whatsapp', 'ar', '{"budget","it-hub"}',        'Works in DSO. Budget is tight — may pivot to rent.',      1, now() - interval '6 days',   now() - interval '16 days'),
('Lena Bauer',             '+971514234014', 'Jumeirah Lake Towers', 'apartment','German', '🇩🇪', '1m_3m',     'end_user',       'buy',    'qualifying',50, 62, 'website',  'de', '{"jlt","expat"}',            'Architect. Wants lake view, modern finishes.',             1, now() - interval '3 days',   now() - interval '13 days'),
('Ali Hassan Al Nuaimi',   '+971515234015', 'Yas Island',      'villa',       'Emirati',   '🇦🇪', '5m_10m',    'end_user',       'buy',    'qualifying',58, 68, 'referral', 'ar', '{"abu-dhabi","waterfront"}', 'Abu Dhabi base but wants Dubai weekend home.',            2, now() - interval '2 days',   now() - interval '11 days'),

-- 📞 CONTACTED LEADS
('Marco Rossi',            '+971516234016', 'City Walk',       'apartment',   'Italian',   '🇮🇹', '3m_5m',     'end_user',       'buy',    'contacted', 42, 50, 'instagram','it', '{"lifestyle","citywalk"}',   'Entrepreneur. Loves lifestyle areas.',                    1, now() - interval '7 days',   now() - interval '18 days'),
('Hana Park',              '+971517234017', 'Dubai Hills',     'apartment',   'Korean',    '🇰🇷', '1m_3m',     'end_user',       'buy',    'contacted', 40, 48, 'facebook', 'ko', '{"hills","green"}',          'Remote worker. Prefers community with parks.',            1, now() - interval '8 days',   now() - interval '20 days'),
('Khalid Al Suwaidi',      '+971518234018', 'Mudon',           'townhouse',   'Emirati',   '🇦🇪', '1m_3m',     'end_user',       'buy',    'contacted', 38, 45, 'whatsapp', 'ar', '{"community","family"}',     'Young family. First purchase.',                           1, now() - interval '9 days',   now() - interval '22 days'),
('Sophie Dubois',          '+971519234019', 'La Mer',          'apartment',   'French',    '🇫🇷', '3m_5m',     'end_user',       'buy',    'contacted', 44, 52, 'referral', 'fr', '{"beachfront","boutique"}',  'Interior designer. Wants unique boutique project.',       1, now() - interval '6 days',   now() - interval '17 days'),
('Yusuf Al Balushi',       '+971520234020', 'Arjan',           'apartment',   'Omani',     '🇴🇲', 'under_1m',  'investor',       'invest', 'contacted', 36, 44, 'website',  'ar', '{"arjan","studio"}',         'Looking for studio for rental investment.',               1, now() - interval '10 days',  now() - interval '25 days'),

-- 🆕 NEW LEADS
('Ivan Petrov',            '+971521234021', 'MBR City',        'villa',       'Russian',   '🇷🇺', '5m_10m',    'investor',       'invest', 'new',        20, 100,'instagram','ru', '{"mbr","new"}',             'Fresh inquiry via Instagram DM.',                         0, NULL,                         now() - interval '1 day'),
('Kavya Nair',             '+971522234022', 'Sobha Hartland',  'apartment',   'Indian',    '🇮🇳', '1m_3m',     'end_user',       'buy',    'new',        18, 100,'facebook', 'en', '{"sobha","school"}',        'Moved kids here, needs home urgently.',                   0, NULL,                         now() - interval '2 days'),
('Tariq Al Hosani',        '+971523234023', 'Arabian Ranches', 'villa',       'Emirati',   '🇦🇪', '3m_5m',     'end_user',       'buy',    'new',        22, 98, 'referral', 'ar', '{"ranches","equestrian"}',  'Equestrian lifestyle seeker.',                            0, NULL,                         now() - interval '3 days'),
('Elena Morozova',         '+971524234024', 'Bluewaters',      'apartment',   'Russian',   '🇷🇺', '3m_5m',     'investor',       'invest', 'new',        25, 99, 'website',  'ru', '{"ain-dubai","sea-view"}',  'Wants Ain Dubai view unit.',                              0, NULL,                         now() - interval '12 hours'),
('Carlos Mendez',          '+971525234025', 'Sports City',     'apartment',   'Spanish',   '🇪🇸', 'under_1m',  'end_user',       'rent',   'new',        15, 97, 'whatsapp', 'es', '{"sports","affordable"}',   'Cricket coach. Needs affordable long-term rent.',         0, NULL,                         now() - interval '6 hours'),

-- 🔁 CONVERTED LEADS
('Abdullah Al Maktoum',    '+971526234026', 'Palm Jumeirah',   'villa',       'Emirati',   '🇦🇪', '10m_plus',  'investor',       'buy',    'converted',  99, 30, 'referral', 'ar', '{"converted","vip","palm"}', 'Signed MOU. Awaiting NOC.',                               8, now() - interval '20 days',  now() - interval '45 days'),
('Amanda Clarke',          '+971527234027', 'Dubai Marina',    'apartment',   'Australian','🇦🇺', '1m_3m',     'end_user',       'buy',    'converted',  82, 25, 'instagram','en', '{"converted","marina"}',    'SPA signed. Transfer next week.',                         6, now() - interval '25 days',  now() - interval '60 days'),
('Rajan Mehta',            '+971528234028', 'Business Bay',    'apartment',   'Indian',    '🇮🇳', '3m_5m',     'investor',       'invest', 'converted',  88, 20, 'facebook', 'en', '{"converted","bay"}',       'Bought 2 units. Potential for more.',                     7, now() - interval '30 days',  now() - interval '50 days'),

-- 💤 DORMANT / LOST LEADS
('Pierre Lefebvre',        '+971529234029', 'JVC',             'apartment',   'French',    '🇫🇷', '1m_3m',     'end_user',       'buy',    'dormant',    15, 10, 'facebook', 'fr', '{"dormant","unresponsive"}', 'No reply in 3 weeks. Marked dormant.',                    1, now() - interval '25 days',  now() - interval '40 days'),
('Nina Volkov',            '+971530234030', 'Dubai Sports City','apartment',  'Russian',   '🇷🇺', 'under_1m',  'end_user',       'rent',   'lost',        5, 5,  'whatsapp', 'ru', '{"lost","budget-issue"}',   'Could not match budget. Went with competitor.',           2, now() - interval '35 days',  now() - interval '55 days');


-- ============================================
-- CAMPAIGNS (4 realistic campaigns)
-- ============================================
INSERT INTO campaigns (
  name, description, status,
  target_areas, target_property_types, target_budget_tiers, target_nationalities, target_intents,
  message_template, message_template_ar, variant_label,
  total_sent, total_delivered, total_read, total_replied, total_qualified,
  daily_send_limit, created_at
) VALUES

(
  'Palm Jumeirah Investor Push',
  'Targeting high-net-worth investors for Palm Jumeirah villas and penthouses.',
  'active',
  '{"Palm Jumeirah"}',
  '{"villa","penthouse"}',
  '{"5m_10m","10m_plus"}',
  '{"Russian","British","Emirati"}',
  '{"invest","buy"}',
  'Hello {name}! 🌴 Exclusive Palm Jumeirah villas starting AED 8M — limited units with full sea view. Interested in a private tour? Reply YES.',
  'مرحباً {name}! 🌴 فلل حصرية في نخلة جميرا تبدأ من 8 مليون درهم. هل أنت مهتم بجولة خاصة؟ أرسل نعم.',
  'A',
  245, 238, 190, 47, 12,
  33,
  now() - interval '15 days'
),

(
  'Marina Apartments — Expat Families',
  'A/B tested campaign for expat families looking for 2-3BR in Marina & JBR.',
  'active',
  '{"Dubai Marina","JBR","JLT"}',
  '{"apartment"}',
  '{"1m_3m","3m_5m"}',
  '{"Indian","British","Australian","German"}',
  '{"buy","rent"}',
  'Hi {name} 👋 Looking for a home in Dubai Marina? We have stunning 2BR & 3BR apartments starting AED 1.8M — ready to move in! Book a free viewing today.',
  NULL,
  'B',
  312, 301, 235, 68, 18,
  33,
  now() - interval '10 days'
),

(
  'Off-Plan Investment Deals — Q2 2026',
  'Targeting investors with off-plan opportunities at developer prices.',
  'paused',
  '{"MBR City","Sobha Hartland","Dubai Hills"}',
  '{"apartment","townhouse","off_plan"}',
  '{"1m_3m","3m_5m","5m_10m"}',
  '{"Indian","Chinese","Russian"}',
  '{"invest"}',
  'Dear {name}, secure your off-plan unit now at developer price! 📈 10% down payment, 60/40 post-handover plan. Limited availability. Reply for details.',
  NULL,
  'A',
  120, 115, 88, 22, 7,
  33,
  now() - interval '25 days'
),

(
  'Emirati Family Villas — Ramadan Special',
  'Arabic-first campaign for Emirati families during Ramadan. Completed.',
  'completed',
  '{"Jumeirah","Mirdif","Arabian Ranches","Mudon"}',
  '{"villa","townhouse"}',
  '{"3m_5m","5m_10m"}',
  '{"Emirati","Omani","Kuwaiti"}',
  '{"buy"}',
  'السلام عليكم {name}، بمناسبة شهر رمضان المبارك 🌙 نقدم لكم عروض حصرية على فلل العائلات في أفضل مجتمعات دبي. تواصلوا معنا اليوم للحصول على أفضل الأسعار.',
  'السلام عليكم {name}، بمناسبة شهر رمضان المبارك 🌙 نقدم لكم عروض حصرية على فلل العائلات في أفضل مجتمعات دبي.',
  'A',
  180, 175, 155, 62, 15,
  33,
  now() - interval '45 days'
);


-- ============================================
-- MESSAGES (WhatsApp history for top leads)
-- ============================================
DO $$
DECLARE
  lead1 UUID;
  lead2 UUID;
  lead3 UUID;
BEGIN
  SELECT id INTO lead1 FROM leads WHERE phone = '+971501234001'; -- Mohammed
  SELECT id INTO lead2 FROM leads WHERE phone = '+971502234002'; -- Priya
  SELECT id INTO lead3 FROM leads WHERE phone = '+971503234003'; -- Viktor

  -- Mohammed Al Rashidi conversation
  INSERT INTO messages (lead_id, direction, content, status, is_ai_generated, created_at) VALUES
  (lead1, 'inbound',  'السلام عليكم، أنا مهتم بشقة بنتهاوس في داون تاون دبي', 'read', false, now() - interval '3 days'),
  (lead1, 'outbound', 'وعليكم السلام محمد! يسعدنا مساعدتك. لدينا بنتهاوس رائع بإطلالة مباشرة على برج خليفة. ما هو ميزانيتك؟', 'read', true, now() - interval '3 days' + interval '5 minutes'),
  (lead1, 'inbound',  'الميزانية مفتوحة، أبحث عن شيء فوق الـ 15 مليون درهم', 'read', false, now() - interval '2 days'),
  (lead1, 'outbound', 'ممتاز! لدينا وحدة 4 غرف نوم على الطابق 58 بمساحة 8,500 قدم مربع. هل يمكنني ترتيب جولة خاصة هذا الأسبوع؟', 'read', true, now() - interval '2 days' + interval '10 minutes'),
  (lead1, 'inbound',  'نعم، يوم الخميس مناسب بعد المغرب', 'read', false, now() - interval '1 day'),
  (lead1, 'outbound', 'تم الحجز! سيتواصل معك المشرف الخاص غداً لتأكيد التفاصيل. شكراً محمد 🌟', 'delivered', false, now() - interval '2 hours');

  -- Priya Sharma conversation
  INSERT INTO messages (lead_id, direction, content, status, is_ai_generated, created_at) VALUES
  (lead2, 'inbound',  'Hi! I saw your listing for 2BR in Dubai Marina. Still available?', 'read', false, now() - interval '5 days'),
  (lead2, 'outbound', 'Hello Priya! Yes, we have beautiful 2BR units in Marina Gate from AED 2.1M. Are you looking for own-use or investment?', 'read', true, now() - interval '5 days' + interval '3 minutes'),
  (lead2, 'inbound',  'Own use — we are relocating from Mumbai in August. Need school nearby too', 'read', false, now() - interval '4 days'),
  (lead2, 'outbound', 'Perfect! Marina is close to Dubai International Academy. I can also shortlist units near JBR Walk for a lifestyle fit. Can we schedule a call?', 'read', true, now() - interval '4 days' + interval '5 minutes'),
  (lead2, 'inbound',  'Yes please! Tomorrow after 6pm works', 'read', false, now() - interval '3 days'),
  (lead2, 'outbound', 'Confirmed! I will call you at 6:30 PM tomorrow. Looking forward to finding your dream home 🏠', 'read', false, now() - interval '3 days' + interval '2 minutes'),
  (lead2, 'inbound',  'Great, thank you! One question — is there a payment plan option?', 'read', false, now() - interval '5 hours');

  -- Viktor Kovalenko conversation
  INSERT INTO messages (lead_id, direction, content, status, is_ai_generated, created_at) VALUES
  (lead3, 'inbound',  'Hello. I want Palm villa. Cash purchase. No broker games please', 'read', false, now() - interval '2 days'),
  (lead3, 'outbound', 'Hello Viktor! Understood — direct, no games. We have 5BR Palm Signature villa, AED 28M, ready title deed. Full sea view, private beach. Interested?', 'read', true, now() - interval '2 days' + interval '2 minutes'),
  (lead3, 'inbound',  'Send me the details and floor plan', 'read', false, now() - interval '2 days' + interval '30 minutes'),
  (lead3, 'outbound', 'Sending now via email and I will follow up with a private viewing link. Can we visit this Saturday morning?', 'read', false, now() - interval '1 day'),
  (lead3, 'inbound',  'Saturday 10am. Send me location', 'delivered', false, now() - interval '1 hour');
END $$;


-- ============================================
-- ACTIVITY LOG
-- ============================================
INSERT INTO activity_log (action, entity_type, metadata, created_at) VALUES
('lead_created',      'lead', '{"lead_name":"Mohammed Al Rashidi","source":"whatsapp"}',       now() - interval '3 days'),
('lead_status_change','lead', '{"lead_name":"Mohammed Al Rashidi","from":"qualifying","to":"hot"}', now() - interval '2 days'),
('lead_created',      'lead', '{"lead_name":"Priya Sharma","source":"facebook"}',              now() - interval '5 days'),
('lead_created',      'lead', '{"lead_name":"Viktor Kovalenko","source":"referral"}',          now() - interval '2 days'),
('campaign_launched', 'campaign', '{"campaign":"Palm Jumeirah Investor Push"}',                now() - interval '15 days'),
('campaign_launched', 'campaign', '{"campaign":"Marina Apartments — Expat Families"}',         now() - interval '10 days'),
('lead_converted',    'lead', '{"lead_name":"Abdullah Al Maktoum","deal_value":"28000000"}',   now() - interval '20 days'),
('lead_converted',    'lead', '{"lead_name":"Amanda Clarke","deal_value":"2100000"}',          now() - interval '25 days'),
('lead_created',      'lead', '{"lead_name":"Chen Wei","source":"website"}',                   now() - interval '6 days'),
('lead_status_change','lead', '{"lead_name":"Chen Wei","from":"new","to":"hot"}',              now() - interval '4 days');
