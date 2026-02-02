-- Staff Roster / Shifts Table

create table if not exists shifts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  
  start_time timestamptz not null,
  end_time timestamptz not null,
  
  -- Metadata
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  
  -- Constraints
  constraint shifts_end_after_start check (end_time > start_time)
);

-- Enable RLS
alter table shifts enable row level security;

-- POLICIES --

-- 1. View: Everyone can see the roster (Transparency)
create policy "Everyone can view shifts" on shifts
  for select using ( auth.role() = 'authenticated' );

-- 2. Manage (Insert/Update/Delete): 
--    Admins can do anything.
--    Chefs can only manage shifts for OTHER users who are ALSO 'chef' role.

create policy "Admins manage all shifts" on shifts
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Chefs manage kitchen shifts" on shifts
  for all using (
    -- The acting user is a Chef
    (select role from profiles where id = auth.uid()) = 'chef'
    AND
    -- The target user (being scheduled) is ALSO a Chef (or Kitchen Staff)
    (select role from profiles where id = user_id) = 'chef'
  );
