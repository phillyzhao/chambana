-- Anonymous catalog browsing must not depend on private authorization helpers.
drop policy published_missions on public.missions;
create policy published_missions_anon on public.missions for select to anon using (published);
create policy published_missions_authenticated on public.missions for select to authenticated
  using (published or public.is_admin());
revoke execute on function public.is_admin(), public.is_campus(), public.is_member(uuid),
  public.is_organizer(), public.owns_group(uuid) from anon;
