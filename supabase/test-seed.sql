-- Synthetic local test data only. Do not add production data here.
-- This file intentionally uses example.test emails and placeholder phone values.

begin;

insert into public.service_zones (id, name, region_code, region, city, is_active) values
  ('11111111-1000-0000-0000-000000000001', 'Test North Zone', 'TEST-N', 'Test Region', 'Test City', true),
  ('11111111-1000-0000-0000-000000000002', 'Test South Zone', 'TEST-S', 'Test Region', 'Test City', true)
on conflict (id) do nothing;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    '22222222-1000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin.one@example.test',
    crypt('LocalTestPassword123!', gen_salt('bf', 10)),
    now(),
    '{"provider":"email","providers":["email"],"app_role":"admin"}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '22222222-1000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'dispatcher.one@example.test',
    crypt('LocalTestPassword123!', gen_salt('bf', 10)),
    now(),
    '{"provider":"email","providers":["email"],"app_role":"dispatcher"}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '22222222-1000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'driver.one@example.test',
    crypt('LocalTestPassword123!', gen_salt('bf', 10)),
    now(),
    '{"provider":"email","providers":["email"],"app_role":"driver"}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  )
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) values
  (
    '2aaaaaaa-1000-0000-0000-000000000010',
    '22222222-1000-0000-0000-000000000010',
    '{"sub":"22222222-1000-0000-0000-000000000010","email":"admin.one@example.test"}'::jsonb,
    'email',
    '22222222-1000-0000-0000-000000000010',
    now(),
    now(),
    now()
  ),
  (
    '2aaaaaaa-1000-0000-0000-000000000002',
    '22222222-1000-0000-0000-000000000002',
    '{"sub":"22222222-1000-0000-0000-000000000002","email":"dispatcher.one@example.test"}'::jsonb,
    'email',
    '22222222-1000-0000-0000-000000000002',
    now(),
    now(),
    now()
  ),
  (
    '2aaaaaaa-1000-0000-0000-000000000001',
    '22222222-1000-0000-0000-000000000001',
    '{"sub":"22222222-1000-0000-0000-000000000001","email":"driver.one@example.test"}'::jsonb,
    'email',
    '22222222-1000-0000-0000-000000000001',
    now(),
    now(),
    now()
  )
on conflict (provider_id, provider) do nothing;

insert into public.users (id, full_name, phone, role, is_active) values
  ('22222222-1000-0000-0000-000000000010', 'Test Admin One', '000-000-0010', 'admin', true),
  ('22222222-1000-0000-0000-000000000002', 'Test Dispatcher One', '000-000-0002', 'dispatcher', true),
  ('22222222-1000-0000-0000-000000000001', 'Test Driver One', '000-000-0001', 'driver', true)
on conflict (id) do nothing;

insert into public.drivers (id, user_id, contact_phone, service_zone_id, is_active) values
  (
    '33333333-1000-0000-0000-000000000001',
    '22222222-1000-0000-0000-000000000001',
    '000-000-0001',
    '11111111-1000-0000-0000-000000000001',
    true
  )
on conflict (id) do nothing;

insert into public.ambulances (id, license_plate, service_zone_id, is_available, is_active) values
  ('44444444-1000-0000-0000-000000000001', 'TEST-001', '11111111-1000-0000-0000-000000000001', true, true)
on conflict (id) do nothing;

insert into public.passengers (id, national_id, full_name, phone, emergency_contact, mobility_need, category) values
  ('55555555-1000-0000-0000-000000000001', 'TEST-0001', 'Test Passenger One', '000-000-0101', '000-000-0199', 'none', 'test')
on conflict (id) do nothing;

insert into public.ride_requests (
  id,
  passenger_id,
  requested_by_user_id,
  service_zone_id,
  status,
  source_address,
  destination_address,
  requested_pickup_at
) values (
  '66666666-1000-0000-0000-000000000001',
  '55555555-1000-0000-0000-000000000001',
  '22222222-1000-0000-0000-000000000002',
  '11111111-1000-0000-0000-000000000001',
  'approved',
  '100 Test Source Street',
  '200 Test Destination Street',
  '2026-05-12T10:00:00Z'
)
on conflict (id) do nothing;

commit;
