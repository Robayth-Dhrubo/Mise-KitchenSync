-- =============================================
-- MISE - COMPLETE DATABASE SCHEMA
-- =============================================

-- 1. Profiles (Extends Supabase Auth)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  restaurant_name text,
  currency_symbol text default '$',
  role text default 'chef'
);

-- 2. Ingredients (The "Pantry")
create table if not exists public.ingredients (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  category text default 'General',
  purchase_price numeric not null,
  purchase_unit text not null,
  conversion_ratio numeric default 1,
  current_stock numeric default 0,
  par_level numeric default 0, -- NEW: Minimum stock level before reordering
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Recipes (The "Menu")
create table if not exists public.recipes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  description text,
  menu_price numeric not null,
  prep_time_minutes integer,
  target_food_cost_pct numeric default 30,
  image_url text,
  allergies text[], -- NEW: Array of allergens
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Recipe Items (The "Ingredients in a Recipe")
create table if not exists public.recipe_items (
  id uuid default gen_random_uuid() primary key,
  recipe_id uuid references public.recipes on delete cascade not null,
  ingredient_id uuid references public.ingredients on delete restrict not null,
  quantity_needed numeric not null,
  unit_used text not null
);

-- 5. Sales Logs (NEW: For "Close Service")
create table if not exists public.sales_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  recipe_id uuid references public.recipes not null,
  quantity_sold integer not null,
  sale_date date default CURRENT_DATE,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. Suppliers (NEW: For Ordering)
create table if not exists public.suppliers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  email text,
  delivery_days text[],
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 7. Shopping List (Smart Orders)
create table if not exists public.shopping_list (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  ingredient_id uuid references public.ingredients not null,
  quantity_to_order numeric not null,
  status text default 'pending', -- 'pending', 'ordered'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 8. POS & Guest Orders
create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  table_or_room text,
  source text default 'staff', -- 'guest', 'staff'
  status text default 'paid', -- 'open', 'paid', 'cancelled'
  preparation_status text default 'received', -- 'received', 'preparing', 'ready', 'delivered'
  total_amount numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders on delete cascade not null,
  recipe_id uuid references public.recipes not null,
  quantity integer not null,
  unit_price numeric not null
);

-- =============================================
-- SECURITY & POLICIES (RLS)
-- =============================================

alter table public.profiles enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_items enable row level security;
alter table public.sales_logs enable row level security;
alter table public.suppliers enable row level security;
alter table public.shopping_list enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Profiles Policies
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Ingredients Policies
create policy "Users can view own ingredients" on ingredients for select using (auth.uid() = user_id);
create policy "Users can insert own ingredients" on ingredients for insert with check (auth.uid() = user_id);
create policy "Users can update own ingredients" on ingredients for update using (auth.uid() = user_id);
create policy "Users can delete own ingredients" on ingredients for delete using (auth.uid() = user_id);

-- Recipes Policies
create policy "Users can view own recipes" on recipes for select using (true);
create policy "Users can insert own recipes" on recipes for insert with check (auth.uid() = user_id);
create policy "Users can update own recipes" on recipes for update using (auth.uid() = user_id);
create policy "Users can delete own recipes" on recipes for delete using (auth.uid() = user_id);

-- Recipe Items Policies
create policy "Users can view own recipe items" on recipe_items for select using (true);
create policy "Users can insert own recipe items" on recipe_items for insert with check (exists (select 1 from recipes where recipes.id = recipe_items.recipe_id and recipes.user_id = auth.uid()));
create policy "Users can update own recipe items" on recipe_items for update using (exists (select 1 from recipes where recipes.id = recipe_items.recipe_id and recipes.user_id = auth.uid()));
create policy "Users can delete own recipe items" on recipe_items for delete using (exists (select 1 from recipes where recipes.id = recipe_items.recipe_id and recipes.user_id = auth.uid()));

-- Sales Logs Policies
create policy "Users can view own sales" on sales_logs for select using (auth.uid() = user_id);
create policy "Users can insert own sales" on sales_logs for insert with check (auth.uid() = user_id);

-- Suppliers Policies
create policy "Users can view own suppliers" on suppliers for select using (auth.uid() = user_id);
create policy "Users can insert own suppliers" on suppliers for insert with check (auth.uid() = user_id);
create policy "Users can update own suppliers" on suppliers for update using (auth.uid() = user_id);
create policy "Users can delete own suppliers" on suppliers for delete using (auth.uid() = user_id);

-- Shopping List Policies
create policy "Users can view own shopping list" on shopping_list for select using (auth.uid() = user_id);
create policy "Users can insert own shopping list" on shopping_list for insert with check (auth.uid() = user_id);
create policy "Users can update own shopping list" on shopping_list for update using (auth.uid() = user_id);
create policy "Users can delete own shopping list" on shopping_list for delete using (auth.uid() = user_id);

-- POS Orders Policies
create policy "Users can view own orders" on orders for select using (true);
create policy "Users can insert own orders" on orders for insert with check (true);
create policy "Users can update own orders" on orders for update using (true);

create policy "Users can view own order items" on order_items for select using (true);
create policy "Users can insert own order items" on order_items for insert with check (true);



-- =============================================
-- LOGIC & TRIGGERS
-- =============================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Inventory Deduction Logic (RPC)
create or replace function deduct_inventory(sales jsonb)
returns void
language plpgsql
security definer
as $$
declare
  sale record;
  item record;
  current_user_id uuid;
begin
  current_user_id := auth.uid();
  
  for sale in select * from jsonb_to_recordset(sales) as x(recipe_id uuid, quantity int)
  loop
    -- Log Sale
    insert into sales_logs (user_id, recipe_id, quantity_sold)
    values (current_user_id, sale.recipe_id, sale.quantity);

    -- Deduct Ingredient Stock
    for item in 
      select * from recipe_items 
      where recipe_id = sale.recipe_id
    loop
      update ingredients
      set current_stock = current_stock - (item.quantity_needed * sale.quantity)
      where id = item.ingredient_id 
      and user_id = current_user_id;
    end loop;
  end loop;
end;
$$;
