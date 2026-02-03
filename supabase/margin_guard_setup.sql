-- =============================================
-- THE MARGIN GUARD (INFLATION PROTECTION)
-- =============================================

-- 1. Margin Alerts Table
create table if not exists public.margin_alerts (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    recipe_id uuid references public.recipes on delete cascade not null,
    ingredient_id uuid references public.ingredients on delete cascade, -- Ingredient that caused the hike
    old_cost numeric not null,
    new_cost numeric not null,
    current_menu_price numeric not null,
    suggested_price numeric not null,
    status text default 'pending', -- 'pending', 'applied', 'ignored'
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Price History Table (Audit Log)
create table if not exists public.price_history (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    recipe_id uuid references public.recipes on delete cascade not null,
    old_price numeric not null,
    new_price numeric not null,
    change_type text default 'margin_guard', -- 'manual', 'margin_guard'
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.margin_alerts enable row level security;
alter table public.price_history enable row level security;

create policy "Users can view own margin alerts" on margin_alerts for select using (auth.uid() = user_id);
create policy "Users can update own margin alerts" on margin_alerts for update using (auth.uid() = user_id);

create policy "Users can view own price history" on price_history for select using (auth.uid() = user_id);
create policy "Users can insert own price history" on price_history for insert with check (auth.uid() = user_id);

-- 3. Helper Function: Calculate Recipe Cost
create or replace function public.calculate_recipe_cost(p_recipe_id uuid)
returns numeric as $$
declare
    total_cost numeric := 0;
begin
    select sum(ri.quantity_needed * i.purchase_price)
    into total_cost
    from public.recipe_items ri
    join public.ingredients i on ri.ingredient_id = i.id
    where ri.recipe_id = p_recipe_id;
    
    return coalesce(total_cost, 0);
end;
$$ language plpgsql security definer;

-- 4. Trigger Function: Check Margin Impact
create or replace function public.check_margin_impact()
returns trigger as $$
declare
    r record;
    v_new_cost numeric;
    v_old_cost numeric;
    v_target_pct numeric;
    v_current_pct numeric;
    v_suggested_price numeric;
begin
    -- Look for all recipes that use this ingredient
    for r in (
        select ri.recipe_id, rec.name, rec.menu_price, rec.target_food_cost_pct
        from public.recipe_items ri
        join public.recipes rec on ri.recipe_id = rec.id
        where ri.ingredient_id = NEW.id
    ) loop
        -- Recalculate cost with the NEW ingredient price
        v_new_cost := public.calculate_recipe_cost(r.recipe_id);
        
        -- Calculate the "old" cost (before this update)
        -- Note: This is slightly tricky as we don't have a snapshot of old prices easily available in the loop
        -- except for NEW.purchase_price vs OLD.purchase_price.
        -- Old cost = New cost - (New Price * Qty) + (Old Price * Qty)
        select (v_new_cost - (NEW.purchase_price * ri.quantity_needed) + (OLD.purchase_price * ri.quantity_needed))
        into v_old_cost
        from public.recipe_items ri
        where ri.recipe_id = r.recipe_id and ri.ingredient_id = NEW.id;

        -- Calculate food cost % (Cost / Price * 100)
        if r.menu_price > 0 then
            v_current_pct := (v_new_cost / r.menu_price) * 100;
        else
            v_current_pct := 0;
        end if;

        -- If cost % exceeds target, or if price hike is significant (> 5% of recipe cost)
        if v_current_pct > r.target_food_cost_pct then
            
            -- Suggested Price = Cost / (Target % / 100)
            -- e.g. if cost is $10 and target is 25%, suggested is 10 / 0.25 = $40
            if r.target_food_cost_pct > 0 then
                v_suggested_price := v_new_cost / (r.target_food_cost_pct / 100);
            else
                v_suggested_price := r.menu_price; -- Fallback
            end if;

            -- Insert Alert
            insert into public.margin_alerts (
                user_id,
                recipe_id,
                ingredient_id,
                old_cost,
                new_cost,
                current_menu_price,
                suggested_price,
                status
            ) values (
                NEW.user_id,
                r.recipe_id,
                NEW.id,
                v_old_cost,
                v_new_cost,
                r.menu_price,
                ceiling(v_suggested_price), -- Round up to nearest dollar for clean pricing
                'pending'
            );
        end if;
    end loop;
    
    return NEW;
end;
$$ language plpgsql security definer;

-- 5. Create Trigger
drop trigger if exists tr_check_margin_on_price_update on public.ingredients;
create trigger tr_check_margin_on_price_update
    after update of purchase_price on public.ingredients
    for each row
    when (OLD.purchase_price is distinct from NEW.purchase_price)
    execute function public.check_margin_impact();
