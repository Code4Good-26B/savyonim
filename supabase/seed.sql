-- Seed data for savionim project.
-- Requires: schema migration already applied.
-- Idempotent: safe to re-run (ON CONFLICT DO NOTHING).
-- Run via Supabase SQL Editor or: psql <connection-string> -f supabase/seed.sql

BEGIN;

-- ─── Service Zones (3) ───────────────────────────────────────────────────────

INSERT INTO public.service_zones (id, name, region_code, region, city, is_active) VALUES
  ('11111111-0000-0000-0000-000000000001', 'North Tel Aviv',    'TLV-N', 'Tel Aviv District', 'Tel Aviv', true),
  ('11111111-0000-0000-0000-000000000002', 'Central Tel Aviv',  'TLV-C', 'Tel Aviv District', 'Tel Aviv', true),
  ('11111111-0000-0000-0000-000000000003', 'South Tel Aviv',    'TLV-S', 'Tel Aviv District', 'Jaffa',    true)
ON CONFLICT (id) DO NOTHING;

-- ─── Auth Users (admin, dispatcher, drivers) ──────────────────────────────────
-- Synthetic entries for local / staging only. Password: Seed1234!

INSERT INTO auth.users (
  id, instance_id,
  aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) VALUES
  ('22222222-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'admin@savionim.test', crypt('Seed1234!', gen_salt('bf', 10)), NOW(),
   '{"provider":"email","providers":["email"],"app_role":"admin"}'::jsonb, '{}'::jsonb, NOW(), NOW()),

  ('22222222-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'dispatcher@savionim.test', crypt('Seed1234!', gen_salt('bf', 10)), NOW(),
   '{"provider":"email","providers":["email"],"app_role":"dispatcher"}'::jsonb, '{}'::jsonb, NOW(), NOW()),

  ('22222222-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'avi.cohen@savionim.test',    crypt('Seed1234!', gen_salt('bf', 10)), NOW(),
   '{"provider":"email","providers":["email"],"app_role":"driver"}'::jsonb, '{}'::jsonb, NOW(), NOW()),

  ('22222222-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'noa.levi@savionim.test',     crypt('Seed1234!', gen_salt('bf', 10)), NOW(),
   '{"provider":"email","providers":["email"],"app_role":"driver"}'::jsonb, '{}'::jsonb, NOW(), NOW()),

  ('22222222-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'yossi.mizrahi@savionim.test', crypt('Seed1234!', gen_salt('bf', 10)), NOW(),
   '{"provider":"email","providers":["email"],"app_role":"driver"}'::jsonb, '{}'::jsonb, NOW(), NOW()),

  ('22222222-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'dana.shapiro@savionim.test', crypt('Seed1234!', gen_salt('bf', 10)), NOW(),
   '{"provider":"email","providers":["email"],"app_role":"driver"}'::jsonb, '{}'::jsonb, NOW(), NOW()),

  ('22222222-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'eran.peretz@savionim.test',  crypt('Seed1234!', gen_salt('bf', 10)), NOW(),
   '{"provider":"email","providers":["email"],"app_role":"driver"}'::jsonb, '{}'::jsonb, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ─── Auth Identities ─────────────────────────────────────────────────────────
-- Required by Supabase Auth email/password sign-in for local seeded users.

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES
  ('2aaaaaaa-0000-0000-0000-000000000010', '22222222-0000-0000-0000-000000000010',
   '{"sub":"22222222-0000-0000-0000-000000000010","email":"admin@savionim.test"}'::jsonb,
   'email', '22222222-0000-0000-0000-000000000010', NOW(), NOW(), NOW()),

  ('2aaaaaaa-0000-0000-0000-000000000011', '22222222-0000-0000-0000-000000000011',
   '{"sub":"22222222-0000-0000-0000-000000000011","email":"dispatcher@savionim.test"}'::jsonb,
   'email', '22222222-0000-0000-0000-000000000011', NOW(), NOW(), NOW()),

  ('2aaaaaaa-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001',
   '{"sub":"22222222-0000-0000-0000-000000000001","email":"avi.cohen@savionim.test"}'::jsonb,
   'email', '22222222-0000-0000-0000-000000000001', NOW(), NOW(), NOW()),

  ('2aaaaaaa-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002',
   '{"sub":"22222222-0000-0000-0000-000000000002","email":"noa.levi@savionim.test"}'::jsonb,
   'email', '22222222-0000-0000-0000-000000000002', NOW(), NOW(), NOW()),

  ('2aaaaaaa-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000003',
   '{"sub":"22222222-0000-0000-0000-000000000003","email":"yossi.mizrahi@savionim.test"}'::jsonb,
   'email', '22222222-0000-0000-0000-000000000003', NOW(), NOW(), NOW()),

  ('2aaaaaaa-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000004',
   '{"sub":"22222222-0000-0000-0000-000000000004","email":"dana.shapiro@savionim.test"}'::jsonb,
   'email', '22222222-0000-0000-0000-000000000004', NOW(), NOW(), NOW()),

  ('2aaaaaaa-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000005',
   '{"sub":"22222222-0000-0000-0000-000000000005","email":"eran.peretz@savionim.test"}'::jsonb,
   'email', '22222222-0000-0000-0000-000000000005', NOW(), NOW(), NOW())
ON CONFLICT (provider_id, provider) DO NOTHING;

-- ─── Public Users (admin, dispatcher, drivers) ────────────────────────────────

INSERT INTO public.users (id, full_name, phone, role, is_active) VALUES
  ('22222222-0000-0000-0000-000000000010', 'Local Admin',      '000-000-0010', 'admin', true),
  ('22222222-0000-0000-0000-000000000011', 'Local Dispatcher', '000-000-0011', 'dispatcher', true),
  ('22222222-0000-0000-0000-000000000001', 'Avi Cohen',       '050-1234567', 'driver', true),
  ('22222222-0000-0000-0000-000000000002', 'Noa Levi',        '052-2345678', 'driver', true),
  ('22222222-0000-0000-0000-000000000003', 'Yossi Mizrahi',   '054-3456789', 'driver', true),
  ('22222222-0000-0000-0000-000000000004', 'Dana Shapiro',    '053-4567890', 'driver', false),
  ('22222222-0000-0000-0000-000000000005', 'Eran Peretz',     '058-5678901', 'driver', true)
ON CONFLICT (id) DO NOTHING;

-- ─── Drivers (5) ─────────────────────────────────────────────────────────────

INSERT INTO public.drivers (id, user_id, contact_phone, service_zone_id, is_active) VALUES
  ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '050-1234567', '11111111-0000-0000-0000-000000000001', true),
  ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', '052-2345678', '11111111-0000-0000-0000-000000000002', true),
  ('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000003', '054-3456789', '11111111-0000-0000-0000-000000000001', true),
  ('33333333-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000004', '053-4567890', '11111111-0000-0000-0000-000000000003', false),
  ('33333333-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000005', '058-5678901', '11111111-0000-0000-0000-000000000002', true)
ON CONFLICT (id) DO NOTHING;

-- ─── Ambulances (2) ──────────────────────────────────────────────────────────

INSERT INTO public.ambulances (id, license_plate, service_zone_id, is_available, is_active) VALUES
  ('44444444-0000-0000-0000-000000000001', '12-345-67', '11111111-0000-0000-0000-000000000001', true,  true),
  ('44444444-0000-0000-0000-000000000002', '98-765-43', '11111111-0000-0000-0000-000000000002', false, true)
ON CONFLICT (id) DO NOTHING;

-- ─── Passengers (10) ─────────────────────────────────────────────────────────

INSERT INTO public.passengers (id, national_id, full_name, phone, emergency_contact, mobility_need, category) VALUES
  ('55555555-0000-0000-0000-000000000001', '111111111', 'Miriam Katz',     '050-1111111', '050-9991111', 'none',       'elderly'),
  ('55555555-0000-0000-0000-000000000002', '222222222', 'David Ben-David', '052-2222222', '052-9992222', 'wheelchair', 'elderly'),
  ('55555555-0000-0000-0000-000000000003', '333333333', 'Rachel Goldberg', '054-3333333', '054-9993333', 'walker',     'elderly'),
  ('55555555-0000-0000-0000-000000000004', '444444444', 'Moshe Friedman',  '053-4444444', '053-9994444', 'none',       'general'),
  ('55555555-0000-0000-0000-000000000005', '555555555', 'Tamar Azoulay',   '058-5555555', '058-9995555', 'cane',       'elderly'),
  ('55555555-0000-0000-0000-000000000006', '666666666', 'Ilan Schwartz',   '050-6666666', '050-9996666', 'none',       'general'),
  ('55555555-0000-0000-0000-000000000007', '777777777', 'Shira Biton',     '052-7777777', '052-9997777', 'wheelchair', 'disability'),
  ('55555555-0000-0000-0000-000000000008', '888888888', 'Ronen Hazan',     '054-8888888', '054-9998888', 'none',       'general'),
  ('55555555-0000-0000-0000-000000000009', '999999999', 'Liora Ohayon',    '053-9999999', '053-9999999', 'walker',     'elderly'),
  ('55555555-0000-0000-0000-000000000010', '100000000', 'Gal Nachum',      '058-0000000', '058-9990000', 'none',       'general')
ON CONFLICT (id) DO NOTHING;

COMMIT;
