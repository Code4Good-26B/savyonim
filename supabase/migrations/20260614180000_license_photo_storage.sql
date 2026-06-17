-- [Invite-Auth 4] Storage: private license-photo bucket + RLS

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'license-photos',
  'license-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Each user uploads only into their own subfolder: {userId}/{filename}
create policy "Users can upload their own license photo"
on storage.objects for insert
with check (
  bucket_id = 'license-photos'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can read their own license photo"
on storage.objects for select
using (
  bucket_id = 'license-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Admins can read all license photos"
on storage.objects for select
using (
  bucket_id = 'license-photos'
  and public.get_auth_user_role() = 'admin'
);

create policy "Authorized representatives can read license photos"
on storage.objects for select
using (
  bucket_id = 'license-photos'
  and public.get_auth_user_role() = 'representative'
  and public.can_current_user_approve_drivers() = true
);
