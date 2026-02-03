-- =============================================
-- UNIFIED POS SYSTEM SCHEMA UPDATES
-- =============================================

-- 1. Locations Table (Tables & Rooms)
create table if not exists public.locations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null, -- e.g., "Table 1", "Room 101"
  type text not null check (type in ('table', 'room')),
  status text default 'available' check (status in ('available', 'occupied', 'dirty', 'reserved')),
  x_pos integer, -- For floor map positioning
  y_pos integer,
  width integer default 60,
  height integer default 60,
  rotation integer default 0,
  capacity integer default 2,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Modify Orders Table
alter table public.orders 
add column if not exists type text default 'dine_in' check (type in ('dine_in', 'room_service', 'takeaway')),
add column if not exists location_id uuid references public.locations(id);

-- 3. RLS for Locations
alter table public.locations enable row level security;

create policy "Users can view own locations" on locations for select using (auth.uid() = user_id);
create policy "Users can insert own locations" on locations for insert with check (auth.uid() = user_id);
create policy "Users can update own locations" on locations for update using (auth.uid() = user_id);
create policy "Users can delete own locations" on locations for delete using (auth.uid() = user_id);

-- 4. Realtime for Locations & Orders
alter publication supabase_realtime add table public.locations, public.orders, public.order_items;

-- 5. Helper Function to create sample locations if none exist
create or replace function public.initialize_sample_locations()
returns void as $$
declare
  target_user_id uuid;
begin
  -- Try to get the current authenticated user first
  target_user_id := auth.uid();
  
  -- Fallback to the first user if none authenticated (for local dev/testing)
  IF target_user_id IS NULL THEN
    SELECT id INTO target_user_id FROM auth.users LIMIT 1;
  END IF;

  IF target_user_id IS NOT NULL THEN
    -- Clear existing samples for this user to allow re-initialization if needed
    DELETE FROM locations WHERE user_id = target_user_id;

    -- Restaurant Floor Samples
    INSERT INTO locations (user_id, name, type, x_pos, y_pos, capacity) VALUES 
    (target_user_id, 'T-01', 'table', 20, 25, 2),
    (target_user_id, 'T-02', 'table', 40, 25, 4),
    (target_user_id, 'T-03', 'table', 60, 25, 4),
    (target_user_id, 'T-04', 'table', 80, 25, 2),
    (target_user_id, 'T-05', 'table', 30, 50, 6),
    (target_user_id, 'T-06', 'table', 50, 50, 4),
    (target_user_id, 'T-07', 'table', 70, 50, 6),
    (target_user_id, 'V-01', 'table', 20, 75, 4),
    (target_user_id, 'V-02', 'table', 50, 75, 8),
    (target_user_id, 'V-03', 'table', 80, 75, 4);
    
    -- In-Room Dining Samples
    INSERT INTO locations (user_id, name, type, capacity) VALUES 
    (target_user_id, '101', 'room', 2),
    (target_user_id, '102', 'room', 2),
    (target_user_id, '201', 'room', 4),
    (target_user_id, '202', 'room', 4),
    (target_user_id, '301', 'room', 6),
    (target_user_id, 'PH-01', 'room', 8);
  END IF;
end;
$$ language plpgsql security definer;

-- Support for table reservations
create table if not exists public.reservations (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    location_id uuid references public.locations(id) on delete cascade not null,
    guest_name text not null,
    guest_count integer not null default 1,
    reservation_time timestamptz not null,
    status text not null default 'confirmed', -- confirmed, seated, cancelled, noshow
    notes text,
    created_at timestamptz default now()
);

-- Enable RLS for reservations
alter table public.reservations enable row level security;

create policy "Users can manage their own reservations"
    on public.reservations for all
    using (auth.uid() = user_id);

-- Update orders for pre-order support
alter table public.orders 
add column if not exists is_preorder boolean default false,
add column if not exists scheduled_for timestamptz;

-- Refresh schema cache (Supabase Realtime)
comment on table public.reservations is 'Table for managing restaurant reservations';
comment on table public.locations is 'Physical tables and rooms in the POS system';
