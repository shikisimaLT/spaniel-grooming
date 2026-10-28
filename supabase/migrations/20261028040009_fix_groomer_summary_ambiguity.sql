-- Rollback: re-create the previous version without the variable_conflict directive.
create or replace function public.groomer_summary(p_from date, p_to date)
returns table (groomer_id uuid, groomer_name text, invoices bigint, gross numeric, voucher numeric,
  omzet numeric, commission numeric, bonus numeric, trips bigint, fuel numeric,
  take_home numeric, bersih numeric)
language plpgsql stable set search_path = '' as $$
#variable_conflict use_column
begin
  if not private.is_staff() then raise exception 'not allowed'; end if;
  return query
  with inv as (
    select i.id, i.groomer_id, i.voucher_amount, i.bonus,
           coalesce(sum(it.line_total),0) gross, coalesce(sum(it.commission),0) comm
    from public.invoices i left join public.invoice_items it on it.invoice_id = i.id
    where i.invoice_date between p_from and p_to group by i.id),
  agg as (select inv.groomer_id gid, count(*) n, sum(inv.gross) gross, sum(inv.voucher_amount) voucher,
                 sum(inv.comm) comm, sum(inv.bonus) bonus from inv group by inv.groomer_id),
  fl as (select f.groomer_id gid, sum(f.trips) trips from public.fuel_logs f
         where f.log_date between p_from and p_to group by f.groomer_id),
  rate as (select s.value from public.app_settings s where s.key = 'fuel_rate')
  select g.id, g.name, coalesce(a.n,0), coalesce(a.gross,0), coalesce(a.voucher,0),
    coalesce(a.gross,0) - coalesce(a.voucher,0), coalesce(a.comm,0), coalesce(a.bonus,0),
    coalesce(f.trips,0), coalesce(f.trips,0) * (select value from rate),
    coalesce(a.comm,0) + coalesce(a.bonus,0) + coalesce(f.trips,0) * (select value from rate),
    coalesce(a.gross,0) - coalesce(a.voucher,0) - coalesce(a.comm,0) - coalesce(a.bonus,0)
      - coalesce(f.trips,0) * (select value from rate)
  from public.groomers g left join agg a on a.gid = g.id left join fl f on f.gid = g.id
  order by 6 desc;
end $$;
