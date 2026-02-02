-- Change default role to 'pending' for SECURITY
-- This ensures new signups CANNOT access anything until Admin approves them.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'pending');
  return new;
end;
$$ language plpgsql security definer;
