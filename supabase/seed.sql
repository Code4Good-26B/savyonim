-- Seed data for savionim project.
-- Requires: schema migration already applied.
-- Idempotent: safe to re-run (ON CONFLICT DO NOTHING).
-- Run via Supabase SQL Editor or: psql <connection-string> -f supabase/seed.sql

BEGIN;

-- ─── Service Zones (3) ───────────────────────────────────────────────────────

INSERT INTO public.service_zones (id, name, region_code, region, city, is_active) VALUES
  ('11111111-0000-0000-0000-000000000001', 'North Tel Aviv',    'TLV-N', 'Tel Aviv District', 'Tel Aviv', true),
  ('11111111-0000-0000-0000-000000000002', 'Central Tel Aviv',  'TLV-C', 'Tel Aviv District', 'Tel Aviv', true),
  ('11111111-0000-0000-0000-000000000003', 'South Tel Aviv',    'TLV-S', 'Tel Aviv District', 'Jaffa',    true),
  ('11111111-1000-0000-0000-000000000001', 'Test North Zone',   'TEST-N', 'Test District',     'Test City', true)
ON CONFLICT (id) DO NOTHING;

-- ─── Auth Users (5 drivers + 2 representatives + 1 admin + 1 pending driver) ──
-- Synthetic entries for local / staging only. Password: Seed1234!

INSERT INTO auth.users (
  id, instance_id,
  aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) VALUES
  ('22222222-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'avi.cohen@savionim.test',    crypt('Seed1234!', gen_salt('bf', 10)), NOW(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW()),

  ('22222222-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'noa.levi@savionim.test',     crypt('Seed1234!', gen_salt('bf', 10)), NOW(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW()),

  ('22222222-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'yossi.mizrahi@savionim.test', crypt('Seed1234!', gen_salt('bf', 10)), NOW(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW()),

  ('22222222-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'dana.shapiro@savionim.test', crypt('Seed1234!', gen_salt('bf', 10)), NOW(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW()),

  ('22222222-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'eran.peretz@savionim.test',  crypt('Seed1234!', gen_salt('bf', 10)), NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW()),

    ('22222222-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'admin.dispatch@savionim.test', crypt('Seed1234!', gen_salt('bf', 10)), NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW()),

  ('22222222-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'rep.standard@savionim.test',  crypt('Seed1234!', gen_salt('bf', 10)), NOW(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW()),

  ('22222222-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'rep.approver@savionim.test',  crypt('Seed1234!', gen_salt('bf', 10)), NOW(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW()),

  ('22222222-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'driver.pending@savionim.test', crypt('Seed1234!', gen_salt('bf', 10)), NOW(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- GoTrue (v2.188+) cannot scan NULL into these token columns and returns
-- "Database error querying schema" (500) on login. The insert above leaves them
-- NULL, so normalize them to empty strings for the seeded accounts.
UPDATE auth.users SET
  confirmation_token         = COALESCE(confirmation_token, ''),
  recovery_token             = COALESCE(recovery_token, ''),
  email_change               = COALESCE(email_change, ''),
  email_change_token_new     = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change               = COALESCE(phone_change, ''),
  phone_change_token         = COALESCE(phone_change_token, ''),
  reauthentication_token     = COALESCE(reauthentication_token, '')
WHERE email LIKE '%@savionim.test';

  -- ─── Public Users (5 drivers + 2 representatives + 1 admin) ─────────────────

INSERT INTO public.users (id, full_name, phone, role, is_active) VALUES
  ('22222222-0000-0000-0000-000000000001', 'Avi Cohen',       '050-1234567', 'driver', true),
  ('22222222-0000-0000-0000-000000000002', 'Noa Levi',        '052-2345678', 'driver', true),
  ('22222222-0000-0000-0000-000000000003', 'Yossi Mizrahi',   '054-3456789', 'driver', true),
  ('22222222-0000-0000-0000-000000000004', 'Dana Shapiro',    '053-4567890', 'driver', false),
  ('22222222-0000-0000-0000-000000000005', 'Eran Peretz',     '058-5678901', 'driver', true),
  ('22222222-0000-0000-0000-000000000010', 'System Admin',    '050-0000010', 'admin',  true)
ON CONFLICT (id) DO NOTHING;

-- Representatives: seeded with can_approve_drivers so the column is set explicitly
INSERT INTO public.users (id, full_name, phone, role, is_active, can_approve_drivers) VALUES
  ('22222222-0000-0000-0000-000000000020', 'Ronit Cohen',    '050-2000020', 'representative', true, false),
  ('22222222-0000-0000-0000-000000000021', 'Yael Ben-Moshe', '050-2100021', 'representative', true, true)
ON CONFLICT (id) DO NOTHING;

-- ─── Drivers (5) ─────────────────────────────────────────────────────────────

INSERT INTO public.drivers (id, user_id, contact_phone, service_zone_id, is_active) VALUES
  ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '050-1234567', '11111111-0000-0000-0000-000000000001', true),
  ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', '052-2345678', '11111111-0000-0000-0000-000000000002', true),
  ('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000003', '054-3456789', '11111111-0000-0000-0000-000000000001', true),
  ('33333333-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000004', '053-4567890', '11111111-0000-0000-0000-000000000003', false),
  ('33333333-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000005', '058-5678901', '11111111-0000-0000-0000-000000000002', true)
ON CONFLICT (id) DO NOTHING;

-- ─── Ambulances (6) ──────────────────────────────────────────────────────────

INSERT INTO public.ambulances (id, license_plate, service_zone_id, is_available, is_active) VALUES
  ('44444444-0000-0000-0000-000000000001', '12-345-67', '11111111-0000-0000-0000-000000000001', true,  true),
  ('44444444-0000-0000-0000-000000000002', '98-765-43', '11111111-0000-0000-0000-000000000002', false, true),
  ('44444444-1000-0000-0000-000000000001', 'TEST-001', '11111111-1000-0000-0000-000000000001', true, true),
  ('44444444-1000-0000-0000-000000000002', 'TEST-002', '11111111-1000-0000-0000-000000000001', true, true),
  ('44444444-1000-0000-0000-000000000003', 'TEST-003', '11111111-1000-0000-0000-000000000001', true, true),
  ('44444444-1000-0000-0000-000000000004', 'TEST-004', '11111111-1000-0000-0000-000000000001', true, true)
ON CONFLICT (id) DO NOTHING;

-- ─── Passengers (10) ─────────────────────────────────────────────────────────

INSERT INTO public.passengers (id, national_id, full_name, phone, emergency_contact, mobility_need, category) VALUES
  ('55555555-0000-0000-0000-000000000001', '111111111', 'Miriam Katz',     '050-1111111', '050-9991111', 'walking',    'other'),
  ('55555555-0000-0000-0000-000000000002', '222222222', 'David Ben-David', '052-2222222', '052-9992222', 'wheelchair', 'idf_disabled'),
  ('55555555-0000-0000-0000-000000000003', '333333333', 'Rachel Goldberg', '054-3333333', '054-9993333', 'walker',     'holocaust_survivor'),
  ('55555555-0000-0000-0000-000000000004', '444444444', 'Moshe Friedman',  '053-4444444', '053-9994444', 'walking',    'other'),
  ('55555555-0000-0000-0000-000000000005', '555555555', 'Tamar Azoulay',   '058-5555555', '058-9995555', 'cane',       'cancer_patient'),
  ('55555555-0000-0000-0000-000000000006', '666666666', 'Ilan Schwartz',   '050-6666666', '050-9996666', 'walking',    'other'),
  ('55555555-0000-0000-0000-000000000007', '777777777', 'Shira Biton',     '052-7777777', '052-9997777', 'wheelchair', 'wounded_soldier'),
  ('55555555-0000-0000-0000-000000000008', '888888888', 'Ronen Hazan',     '054-8888888', '054-9998888', 'walking',    'dialysis_patient'),
  ('55555555-0000-0000-0000-000000000009', '999999999', 'Liora Ohayon',    '053-9999999', '053-9999999', 'walker',     'other'),
  ('55555555-0000-0000-0000-000000000010', '100000000', 'Gal Nachum',      '058-0000000', '058-9990000', 'walking',    'other')
ON CONFLICT (id) DO NOTHING;

-- ─── Open Driver Dashboard Ride Requests (10) ───────────────────────────────

INSERT INTO public.ride_requests (
  id,
  passenger_id,
  requested_by_user_id,
  service_zone_id,
  status,
  source_address,
  source_notes,
  destination_address,
  destination_notes,
  return_trip_required,
  requested_pickup_at,
  approved_at,
  caller_full_name,
  caller_id_number,
  caller_phone,
  request_for_self,
  trip_type,
  requested_arrival_at,
  estimated_departure_at,
  waiting_time_minutes
) VALUES
  (
    '66666666-0000-0000-0000-000000000101',
    '55555555-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000010',
    '11111111-1000-0000-0000-000000000001',
    'approved',
    '12 Arlozorov Street, Tel Aviv',
    'Meet at the main lobby entrance',
    'Ichilov Hospital, Weizmann Street, Tel Aviv',
    'Drop off near rehabilitation entrance',
    false,
    timezone('utc', now()) + interval '45 minutes',
    timezone('utc', now()) - interval '10 minutes',
    'Miriam Katz',
    '111111111',
    '050-1111111',
    true,
    'medical',
    timezone('utc', now()) + interval '90 minutes',
    null,
    30
  ),
  (
    '66666666-0000-0000-0000-000000000102',
    '55555555-0000-0000-0000-000000000002',
    '22222222-0000-0000-0000-000000000010',
    '11111111-1000-0000-0000-000000000001',
    'approved',
    '45 Dizengoff Street, Tel Aviv',
    'Wheelchair pickup from building ramp',
    'Assuta Ramat HaHayal, HaBarzel Street, Tel Aviv',
    'Escort to clinic reception',
    true,
    timezone('utc', now()) + interval '1 hour 15 minutes',
    timezone('utc', now()) - interval '10 minutes',
    'David Ben-David',
    '222222222',
    '052-2222222',
    true,
    'medical',
    timezone('utc', now()) + interval '2 hours',
    timezone('utc', now()) + interval '3 hours',
    45
  ),
  (
    '66666666-0000-0000-0000-000000000103',
    '55555555-0000-0000-0000-000000000003',
    '22222222-0000-0000-0000-000000000010',
    '11111111-1000-0000-0000-000000000001',
    'approved',
    '8 Basel Street, Tel Aviv',
    'Passenger uses a walker',
    'Maccabi Clinic, Pinkas Street, Tel Aviv',
    null,
    false,
    timezone('utc', now()) + interval '1 hour 40 minutes',
    timezone('utc', now()) - interval '9 minutes',
    'Rachel Goldberg',
    '333333333',
    '054-3333333',
    true,
    'medical',
    timezone('utc', now()) + interval '2 hours 20 minutes',
    null,
    30
  ),
  (
    '66666666-0000-0000-0000-000000000104',
    '55555555-0000-0000-0000-000000000004',
    '22222222-0000-0000-0000-000000000010',
    '11111111-1000-0000-0000-000000000001',
    'approved',
    '19 Nordau Boulevard, Tel Aviv',
    null,
    'Tel Aviv Sourasky Medical Center, Tel Aviv',
    'Family member will meet at entrance',
    false,
    timezone('utc', now()) + interval '2 hours 5 minutes',
    timezone('utc', now()) - interval '8 minutes',
    'Moshe Friedman',
    '444444444',
    '053-4444444',
    true,
    'medical',
    timezone('utc', now()) + interval '2 hours 50 minutes',
    null,
    30
  ),
  (
    '66666666-0000-0000-0000-000000000105',
    '55555555-0000-0000-0000-000000000005',
    '22222222-0000-0000-0000-000000000010',
    '11111111-1000-0000-0000-000000000001',
    'approved',
    '27 Ibn Gabirol Street, Tel Aviv',
    'Call on arrival',
    'Rabin Medical Center, Petah Tikva',
    'Oncology building entrance',
    true,
    timezone('utc', now()) + interval '2 hours 30 minutes',
    timezone('utc', now()) - interval '8 minutes',
    'Tamar Azoulay',
    '555555555',
    '058-5555555',
    true,
    'medical',
    timezone('utc', now()) + interval '3 hours 20 minutes',
    timezone('utc', now()) + interval '5 hours',
    60
  ),
  (
    '66666666-0000-0000-0000-000000000106',
    '55555555-0000-0000-0000-000000000006',
    '22222222-0000-0000-0000-000000000010',
    '11111111-1000-0000-0000-000000000001',
    'approved',
    '3 Yehuda HaMaccabi Street, Tel Aviv',
    null,
    'Beit Ariela Library, Shaul HaMelech Boulevard, Tel Aviv',
    'Leisure visit, wait nearby',
    true,
    timezone('utc', now()) + interval '3 hours',
    timezone('utc', now()) - interval '7 minutes',
    'Ilan Schwartz',
    '666666666',
    '050-6666666',
    true,
    'leisure',
    null,
    timezone('utc', now()) + interval '5 hours',
    90
  ),
  (
    '66666666-0000-0000-0000-000000000107',
    '55555555-0000-0000-0000-000000000007',
    '22222222-0000-0000-0000-000000000010',
    '11111111-1000-0000-0000-000000000001',
    'approved',
    '62 HaYarkon Street, Tel Aviv',
    'Accessible entrance on side street',
    'Sheba Medical Center, Ramat Gan',
    'Emergency follow-up clinic',
    false,
    timezone('utc', now()) + interval '3 hours 20 minutes',
    timezone('utc', now()) - interval '7 minutes',
    'Shira Biton',
    '777777777',
    '052-7777777',
    true,
    'medical',
    timezone('utc', now()) + interval '4 hours 10 minutes',
    null,
    45
  ),
  (
    '66666666-0000-0000-0000-000000000108',
    '55555555-0000-0000-0000-000000000008',
    '22222222-0000-0000-0000-000000000010',
    '11111111-1000-0000-0000-000000000001',
    'approved',
    '10 Namir Road, Tel Aviv',
    'Dialysis patient, bring folded chair',
    'Dialysis Center, Ramat Aviv, Tel Aviv',
    null,
    true,
    timezone('utc', now()) + interval '4 hours',
    timezone('utc', now()) - interval '6 minutes',
    'Ronen Hazan',
    '888888888',
    '054-8888888',
    true,
    'medical',
    timezone('utc', now()) + interval '4 hours 45 minutes',
    timezone('utc', now()) + interval '7 hours',
    120
  ),
  (
    '66666666-0000-0000-0000-000000000109',
    '55555555-0000-0000-0000-000000000009',
    '22222222-0000-0000-0000-000000000010',
    '11111111-1000-0000-0000-000000000001',
    'approved',
    '14 Bograshov Street, Tel Aviv',
    'Daughter will accompany passenger',
    'Clalit Clinic, Ben Yehuda Street, Tel Aviv',
    null,
    false,
    timezone('utc', now()) + interval '4 hours 30 minutes',
    timezone('utc', now()) - interval '6 minutes',
    'Liora Ohayon',
    '999999999',
    '053-9999999',
    true,
    'medical',
    timezone('utc', now()) + interval '5 hours 10 minutes',
    null,
    30
  ),
  (
    '66666666-0000-0000-0000-000000000110',
    '55555555-0000-0000-0000-000000000010',
    '22222222-0000-0000-0000-000000000010',
    '11111111-1000-0000-0000-000000000001',
    'approved',
    '5 Weizmann Street, Tel Aviv',
    null,
    'Tel Aviv Port, Hangar 11, Tel Aviv',
    'Community event drop-off',
    true,
    timezone('utc', now()) + interval '5 hours',
    timezone('utc', now()) - interval '5 minutes',
    'Gal Nachum',
    '100000000',
    '058-0000000',
    true,
    'leisure',
    null,
    timezone('utc', now()) + interval '8 hours',
    120
  )
ON CONFLICT (id) DO NOTHING;

-- Make sure all seeded users are approved so tests can run
UPDATE public.users SET status = 'approved';

-- ─── Pending Driver (for approvals page testing) ──────────────────────────────
-- Inserted AFTER the bulk-approve so status stays 'pending'
INSERT INTO public.users (id, full_name, phone, role, is_active, status) VALUES
  ('22222222-0000-0000-0000-000000000006', 'Moshe Pending', '050-6000006', 'driver', true, 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.drivers (id, user_id, contact_phone, service_zone_id, is_active) VALUES
  ('33333333-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000006', '050-6000006', '11111111-0000-0000-0000-000000000001', true)
ON CONFLICT (id) DO NOTHING;

COMMIT;
