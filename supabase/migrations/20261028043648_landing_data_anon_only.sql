-- Rollback: grant execute on function public.landing_data() to authenticated;
revoke execute on function public.landing_data() from authenticated;
