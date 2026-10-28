-- Purpose: expose ONLY active prices + top service areas to anonymous visitors (public landing page).
-- Rollback: drop function public.landing_data();
create function public.landing_data() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('code', p.code, 'name', p.name, 'price', pr.price) order by p.code)
      from public.products p
      join public.product_prices pr on pr.product_id = p.id
        and pr.active_from <= current_date and (pr.active_to is null or pr.active_to >= current_date)
      where p.active), '[]'::jsonb),
    'areas', coalesce((
      select jsonb_agg(a.area order by a.n desc)
      from (select initcap(lower(trim(area))) as area, count(*) n
            from public.customers where area is not null and trim(area) <> ''
            group by 1 order by n desc limit 8) a), '[]'::jsonb)
  )
$$;
revoke execute on function public.landing_data() from public;
grant execute on function public.landing_data() to anon, authenticated;
