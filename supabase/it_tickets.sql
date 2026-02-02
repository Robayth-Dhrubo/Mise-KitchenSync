-- IT Support Ticket Module & Hospitality IT Ops

-- Enums
create type ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');
create type ticket_priority as enum ('low', 'medium', 'high', 'critical');
create type ticket_category as enum ('hardware', 'software', 'network', 'access', 'guest_request', 'printer', 'pos', 'other');

-- Main Tickets Table
create table if not exists it_tickets (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  category ticket_category not null default 'other',
  priority ticket_priority not null default 'medium',
  status ticket_status not null default 'open',
  
  -- Foreign Keys to PROFILES for easier frontend joins
  created_by uuid references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  
  location text, -- e.g. "Kitchen Main", "Table 4", "Room 202"
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table it_tickets enable row level security;

-- Policies
create policy "Admins full access" on it_tickets
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Staff view own" on it_tickets
  for select using (created_by = auth.uid());

create policy "Staff create" on it_tickets
  for insert with check (auth.uid() = created_by);

-- Trigger to auto-set updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_it_tickets_modtime
  before update on it_tickets
  for each row execute function update_updated_at();
