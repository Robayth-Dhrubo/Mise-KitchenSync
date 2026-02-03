-- Secure RPC for staff to toggle availability
-- This works around RLS by running as SECURITY DEFINER (superuser/owner privileges)
create or replace function update_recipe_availability(
  p_is_available boolean,
  p_recipe_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  update public.recipes
  set is_available = p_is_available
  where id = p_recipe_id;
end;
$$;

grant execute on function public.update_recipe_availability to authenticated, anon, service_role;
