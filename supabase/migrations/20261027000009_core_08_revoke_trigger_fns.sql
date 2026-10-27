-- Trigger functions must not be callable through the REST API.
revoke all on function public.enforce_single_user() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
