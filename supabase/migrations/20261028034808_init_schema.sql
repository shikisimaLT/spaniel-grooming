-- Purpose: initial schema for Spaniel Grooming admin
-- Rollback: drop schema private cascade; drop all public tables/functions created here.
create extension if not exists btree_gist with schema extensions;
create schema if not exists private;

create or replace function public.set_updated_at() returns trigger language plpgsql
set search_path = '' as $$ begin new.updated_at = now(); return new; end $$;

-- profiles & role helpers
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  role text not null default 'normal' check (role in ('owner','admin','normal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function private.user_role() returns text language sql stable security definer
set search_path = '' as $$ select role from public.profiles where id = (select auth.uid()) $$;
create function private.is_owner() returns boolean language sql stable security definer
set search_path = '' as $$ select coalesce(private.user_role() = 'owner', false) $$;
create function private.is_staff() returns boolean language sql stable security definer
set search_path = '' as $$ select coalesce(private.user_role() in ('owner','admin'), false) $$;
create function private.is_member() returns boolean language sql stable security definer
set search_path = '' as $$ select private.user_role() is not null $$;
grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

-- first signup becomes owner, others normal
create function private.handle_new_user() returns trigger language plpgsql security definer
set search_path = '' as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
          case when exists (select 1 from public.profiles) then 'normal' else 'owner' end);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- masters
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  phone text, address text, area text,
  customer_status text not null default 'Baru' check (customer_status in ('Baru','Lama')),
  repeat_order text check (repeat_order in ('Y','N','T')),
  repeat_days text,
  pet_breed text, pet_notes text, pet_count integer check (pet_count >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index customers_name_uq on public.customers (lower(trim(name)));

create table public.groomers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  commission_rate numeric(5,4) not null default 0.25 check (commission_rate between 0 and 1),
  active boolean not null default true,
  phone text, notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null default 'Jasa Utama' check (category in ('Jasa Utama','Add-on')),
  active boolean not null default true,
  commission_override numeric(5,4) check (commission_override between 0 and 1),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  price numeric(14,2) not null check (price >= 0),
  active_from date not null,
  active_to date,
  created_at timestamptz not null default now(),
  check (active_to is null or active_to >= active_from),
  constraint product_prices_no_overlap exclude using gist
    (product_id with =, daterange(active_from, active_to, '[]') with &&)
);
create index product_prices_lookup_idx on public.product_prices (product_id, active_from desc);

-- close previous open price when a newer one is added
create function public.close_previous_price() returns trigger language plpgsql
set search_path = '' as $$
begin
  update public.product_prices set active_to = new.active_from - 1
  where product_id = new.product_id and active_to is null and active_from < new.active_from;
  return new;
end $$;
create trigger product_prices_close_prev before insert on public.product_prices
  for each row execute function public.close_previous_price();

-- transactions
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null unique,
  invoice_date date not null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  groomer_id uuid not null references public.groomers(id) on delete restrict,
  voucher_code text,
  voucher_amount numeric(14,2) not null default 0 check (voucher_amount >= 0),
  bonus numeric(14,2) not null default 0 check (bonus >= 0),
  paid boolean not null default false,
  proof_done text, proof_transfer text, notes text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index invoices_date_idx on public.invoices (invoice_date);
create index invoices_customer_idx on public.invoices (customer_id);
create index invoices_groomer_idx on public.invoices (groomer_id);
create index invoices_created_by_idx on public.invoices (created_by);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  qty integer not null default 1 check (qty > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  discount numeric(14,2) not null default 0 check (discount >= 0),
  commission_rate numeric(5,4) not null,
  line_total numeric(14,2) generated always as (unit_price * qty - discount) stored,
  commission numeric(14,2) generated always as (round((unit_price * qty - discount) * commission_rate)) stored,
  notes text,
  created_at timestamptz not null default now()
);
create index invoice_items_invoice_idx on public.invoice_items (invoice_id);
create index invoice_items_product_idx on public.invoice_items (product_id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null,
  name text not null,
  amount numeric(14,2) not null check (amount >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index expenses_date_idx on public.expenses (expense_date);

create table public.fuel_logs (
  id uuid primary key default gen_random_uuid(),
  groomer_id uuid not null references public.groomers(id) on delete cascade,
  log_date date not null,
  trips integer not null check (trips >= 0),
  created_at timestamptz not null default now(),
  unique (groomer_id, log_date)
);

create table public.app_settings (
  key text primary key,
  value numeric not null
);
-- configuration (not business data): fuel allowance per trip, used by groomer_summary()
insert into public.app_settings values ('fuel_rate', 20000);

-- BOD (owner only)
create table public.bod_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.bod_settings (
  groomer_id uuid primary key references public.groomers(id) on delete cascade,
  bod_pct numeric(5,4) not null default 0 check (bod_pct between 0 and 1)
);

-- updated_at triggers
do $$ declare t text; begin
  foreach t in array array['profiles','customers','groomers','products','invoices','expenses'] loop
    execute format('create trigger %I_updated before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop; end $$;

-- RLS
do $$ declare t text; begin
  foreach t in array array['profiles','customers','groomers','products','product_prices','invoices','invoice_items','expenses','fuel_logs','app_settings','bod_members','bod_settings'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop; end $$;

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.is_owner());
create policy profiles_update on public.profiles for update to authenticated
  using (private.is_owner()) with check (private.is_owner());

-- read for any member, write for staff on masters
do $$ declare t text; begin
  foreach t in array array['groomers','products','product_prices','app_settings'] loop
    execute format('create policy %I on public.%I for select to authenticated using (private.is_member())', t||'_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.is_staff())', t||'_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (private.is_staff()) with check (private.is_staff())', t||'_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (private.is_staff())', t||'_delete', t);
  end loop; end $$;

create policy customers_select on public.customers for select to authenticated using (private.is_member());
create policy customers_insert on public.customers for insert to authenticated with check (private.is_member());
create policy customers_update on public.customers for update to authenticated using (private.is_staff()) with check (private.is_staff());
create policy customers_delete on public.customers for delete to authenticated using (private.is_staff());

create policy invoices_select on public.invoices for select to authenticated using (private.is_member());
create policy invoices_insert on public.invoices for insert to authenticated with check (private.is_member());
create policy invoices_update on public.invoices for update to authenticated using (private.is_staff()) with check (private.is_staff());
create policy invoices_delete on public.invoices for delete to authenticated using (private.is_staff());
create policy items_select on public.invoice_items for select to authenticated using (private.is_member());
create policy items_insert on public.invoice_items for insert to authenticated with check (private.is_member());
create policy items_update on public.invoice_items for update to authenticated using (private.is_staff()) with check (private.is_staff());
create policy items_delete on public.invoice_items for delete to authenticated using (private.is_staff());

do $$ declare t text; begin
  foreach t in array array['expenses','fuel_logs'] loop
    execute format('create policy %I on public.%I for all to authenticated using (private.is_staff()) with check (private.is_staff())', t||'_staff', t);
  end loop;
  foreach t in array array['bod_members','bod_settings'] loop
    execute format('create policy %I on public.%I for all to authenticated using (private.is_owner()) with check (private.is_owner())', t||'_owner', t);
  end loop; end $$;

-- views
create view public.invoice_totals with (security_invoker = true) as
select i.id as invoice_id, i.invoice_no, i.invoice_date, i.customer_id, i.groomer_id,
  i.voucher_amount, i.bonus, i.paid,
  coalesce(s.gross,0) as gross, coalesce(s.gross,0) - i.voucher_amount as total,
  coalesce(s.commission,0) as commission
from public.invoices i
left join (select invoice_id, sum(line_total) gross, sum(commission) commission
           from public.invoice_items group by invoice_id) s on s.invoice_id = i.id;

-- atomic invoice creation
create function public.create_invoice(
  p_date date, p_customer_name text, p_groomer_id uuid, p_items jsonb,
  p_customer_id uuid default null, p_voucher_code text default null,
  p_voucher_amount numeric default 0, p_bonus numeric default 0,
  p_paid boolean default false, p_notes text default null
) returns uuid language plpgsql set search_path = '' as $$
declare
  v_cust uuid := p_customer_id; v_inv uuid; v_no text; v_seq int;
  v_gr_rate numeric; it jsonb; v_price numeric; v_over numeric; v_pid uuid;
begin
  if not private.is_member() then raise exception 'not allowed'; end if;
  if jsonb_array_length(coalesce(p_items,'[]'::jsonb)) = 0 then raise exception 'invoice needs at least one item'; end if;
  select commission_rate into v_gr_rate from public.groomers where id = p_groomer_id;
  if v_gr_rate is null then raise exception 'groomer not found'; end if;

  if v_cust is null then
    select id into v_cust from public.customers where lower(trim(name)) = lower(trim(p_customer_name));
    if v_cust is null then
      insert into public.customers (name) values (trim(p_customer_name)) returning id into v_cust;
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtext('invoice_no_' || to_char(p_date,'YYYY-MM')));
  select coalesce(max(substring(invoice_no from '(\d+)$')::int), 0) + 1 into v_seq
    from public.invoices where invoice_no like 'INV-' || to_char(p_date,'YYYY-MM') || '-%';
  v_no := 'INV-' || to_char(p_date,'YYYY-MM') || '-' || lpad(v_seq::text, 3, '0');

  insert into public.invoices (invoice_no, invoice_date, customer_id, groomer_id, voucher_code,
    voucher_amount, bonus, paid, notes)
  values (v_no, p_date, v_cust, p_groomer_id, p_voucher_code, coalesce(p_voucher_amount,0),
    coalesce(p_bonus,0), p_paid, p_notes) returning id into v_inv;

  for it in select * from jsonb_array_elements(p_items) loop
    v_pid := (it->>'product_id')::uuid;
    select price into v_price from public.product_prices
      where product_id = v_pid and active_from <= p_date and (active_to is null or active_to >= p_date)
      order by active_from desc limit 1;
    if v_price is null then raise exception 'no active price for product % on %', v_pid, p_date; end if;
    select commission_override into v_over from public.products where id = v_pid;
    insert into public.invoice_items (invoice_id, product_id, qty, unit_price, discount, commission_rate)
    values (v_inv, v_pid, coalesce((it->>'qty')::int,1), v_price,
      coalesce((it->>'discount')::numeric,0), coalesce(v_over, v_gr_rate));
  end loop;
  return v_inv;
end $$;

-- per-groomer summary for any date range (salary / dashboard)
create function public.groomer_summary(p_from date, p_to date)
returns table (groomer_id uuid, groomer_name text, invoices bigint, gross numeric, voucher numeric,
  omzet numeric, commission numeric, bonus numeric, trips bigint, fuel numeric,
  take_home numeric, bersih numeric)
language plpgsql stable set search_path = '' as $$
begin
  if not private.is_staff() then raise exception 'not allowed'; end if;
  return query
  with inv as (
    select i.id, i.groomer_id, i.voucher_amount, i.bonus,
           coalesce(sum(it.line_total),0) gross, coalesce(sum(it.commission),0) comm
    from public.invoices i left join public.invoice_items it on it.invoice_id = i.id
    where i.invoice_date between p_from and p_to group by i.id),
  agg as (select groomer_id, count(*) n, sum(gross) gross, sum(voucher_amount) voucher,
                 sum(comm) comm, sum(bonus) bonus from inv group by groomer_id),
  fl as (select groomer_id, sum(trips) trips from public.fuel_logs
         where log_date between p_from and p_to group by groomer_id),
  rate as (select value from public.app_settings where key = 'fuel_rate')
  select g.id, g.name, coalesce(a.n,0), coalesce(a.gross,0), coalesce(a.voucher,0),
    coalesce(a.gross,0) - coalesce(a.voucher,0), coalesce(a.comm,0), coalesce(a.bonus,0),
    coalesce(f.trips,0), coalesce(f.trips,0) * (select value from rate),
    coalesce(a.comm,0) + coalesce(a.bonus,0) + coalesce(f.trips,0) * (select value from rate),
    coalesce(a.gross,0) - coalesce(a.voucher,0) - coalesce(a.comm,0) - coalesce(a.bonus,0)
      - coalesce(f.trips,0) * (select value from rate)
  from public.groomers g left join agg a on a.groomer_id = g.id left join fl f on f.groomer_id = g.id
  order by 6 desc;
end $$;

revoke execute on all functions in schema public from anon, public;
grant execute on function public.create_invoice, public.groomer_summary to authenticated;
