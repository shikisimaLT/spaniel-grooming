-- Rollback: drop function public.update_invoice;
create function public.update_invoice(
  p_id uuid, p_date date, p_customer_name text, p_groomer_id uuid, p_items jsonb,
  p_voucher_code text default null, p_voucher_amount numeric default 0,
  p_bonus numeric default 0, p_notes text default null
) returns uuid language plpgsql set search_path = '' as $$
declare
  v_paid boolean; v_cust uuid; v_gr_rate numeric; it jsonb; v_price numeric; v_over numeric; v_pid uuid; v_rate numeric;
begin
  if not private.is_staff() then raise exception 'not allowed'; end if;
  select paid into v_paid from public.invoices where id = p_id for update;
  if not found then raise exception 'invoice not found'; end if;
  if v_paid then raise exception 'invoice sudah lunas dan terkunci'; end if;
  if jsonb_array_length(coalesce(p_items,'[]'::jsonb)) = 0 then raise exception 'invoice needs at least one item'; end if;
  select commission_rate into v_gr_rate from public.groomers where id = p_groomer_id;
  if v_gr_rate is null then raise exception 'groomer not found'; end if;

  select id into v_cust from public.customers where lower(trim(name)) = lower(trim(p_customer_name));
  if v_cust is null then
    insert into public.customers (name) values (trim(p_customer_name)) returning id into v_cust;
  end if;

  update public.invoices set invoice_date = p_date, customer_id = v_cust, groomer_id = p_groomer_id,
    voucher_code = p_voucher_code, voucher_amount = coalesce(p_voucher_amount,0),
    bonus = coalesce(p_bonus,0), notes = p_notes where id = p_id;
  delete from public.invoice_items where invoice_id = p_id;

  for it in select * from jsonb_array_elements(p_items) loop
    v_pid := (it->>'product_id')::uuid;
    v_price := (it->>'unit_price')::numeric;
    v_rate := (it->>'commission_rate')::numeric;
    if v_price is null then
      select price into v_price from public.product_prices
        where product_id = v_pid and active_from <= p_date and (active_to is null or active_to >= p_date)
        order by active_from desc limit 1;
      if v_price is null then raise exception 'no active price for product % on %', v_pid, p_date; end if;
    end if;
    if v_rate is null then
      select commission_override into v_over from public.products where id = v_pid;
      v_rate := coalesce(v_over, v_gr_rate);
    end if;
    insert into public.invoice_items (invoice_id, product_id, qty, unit_price, discount, commission_rate)
    values (p_id, v_pid, coalesce((it->>'qty')::int,1), v_price, coalesce((it->>'discount')::numeric,0), v_rate);
  end loop;
  return p_id;
end $$;
revoke execute on function public.update_invoice from anon, public;
grant execute on function public.update_invoice to authenticated;
