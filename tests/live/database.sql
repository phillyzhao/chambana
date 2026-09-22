-- Live hosted acceptance checks in ONE transaction. No emails, real user changes,
-- or persistent test scores. Any failure aborts the transaction; success rolls back.
begin;
do $$
declare owner uuid:=gen_random_uuid(); member uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); admin uuid:=gen_random_uuid(); cat uuid:=gen_random_uuid(); i integer;
begin
  perform set_config('chambana.qa_owner',owner::text,true);
  perform set_config('chambana.qa_member',member::text,true);
  perform set_config('chambana.qa_outsider',outsider::text,true);
  perform set_config('chambana.qa_admin',admin::text,true);
  perform set_config('chambana.qa_category',cat::text,true);
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
    select id,'qa-'||id||'@illinois.edu',now(),'{"full_name":"Temporary QA"}'::jsonb from unnest(array[owner,member,outsider,admin]) as id;
  insert into public.platform_admins(email) values('qa-'||admin||'@illinois.edu');
  insert into public.categories(id,name) values(cat,'Temporary QA '||cat);
  for i in 1..4 loop
    insert into public.missions(category_id,title,instructions,proof_criteria,nuts,published)
      values(cat,'QA mission '||i,'Controlled database test only.','Visible red surface for test only.',20,true);
  end loop;
end; $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('chambana.qa_admin'),true);
select public.approve_organizer('qa-'||current_setting('chambana.qa_owner')||'@illinois.edu',true);
select set_config('request.jwt.claim.sub',current_setting('chambana.qa_owner'),true);
select set_config('chambana.qa_group', public.create_group('Temporary QA group','Controlled test, rolled back.','open','',array[current_setting('chambana.qa_category')::uuid])::text,true);
select set_config('request.jwt.claim.sub',current_setting('chambana.qa_member'),true);
select public.join_group(current_setting('chambana.qa_group')::uuid);
select public.refresh_missions(current_setting('chambana.qa_group')::uuid);
do $$
begin
  if (select count(*) from public.assignments where group_id=current_setting('chambana.qa_group')::uuid)<>3 then raise exception 'Slot count failed'; end if;
  perform set_config('chambana.qa_assignment',(select id::text from public.assignments where group_id=current_setting('chambana.qa_group')::uuid order by slot limit 1),true);
  perform set_config('chambana.qa_submission',gen_random_uuid()::text,true);
  perform public.begin_submission(current_setting('chambana.qa_assignment')::uuid,current_setting('chambana.qa_submission')::uuid);
  if has_function_privilege('authenticated','public.settle_submission(uuid,text,text,jsonb,uuid)','EXECUTE') then raise exception 'AI settlement exposed'; end if;
  if has_function_privilege('anon','public.replace_mission_catalog(jsonb)','EXECUTE') then raise exception 'Catalog mutation exposed'; end if;
  if has_table_privilege('anon','public.submissions','SELECT') then raise exception 'Private submissions exposed'; end if;
end; $$;
select set_config('request.jwt.claim.sub',current_setting('chambana.qa_outsider'),true);
do $$ begin
  if exists(select 1 from public.assignments where group_id=current_setting('chambana.qa_group')::uuid) then raise exception 'Cross-group assignment leak'; end if;
  if exists(select 1 from public.submissions where id=current_setting('chambana.qa_submission')::uuid) then raise exception 'Cross-user proof leak'; end if;
end; $$;
reset role;
select public.finish_upload(current_setting('chambana.qa_submission')::uuid,'qa-'||gen_random_uuid());
select set_config('chambana.qa_lease',(select lease_token::text from public.claim_submission(current_setting('chambana.qa_submission')::uuid)),true);
select public.settle_submission(current_setting('chambana.qa_submission')::uuid,'approved','Controlled test',null,current_setting('chambana.qa_lease')::uuid);
select public.settle_submission(current_setting('chambana.qa_submission')::uuid,'approved','Repeated test',null,current_setting('chambana.qa_lease')::uuid);
do $$ begin
  if (select count(*) from public.nut_transactions where assignment_id=current_setting('chambana.qa_assignment')::uuid)<>1 then raise exception 'Duplicate reward'; end if;
  if (select nuts from public.group_leaderboard where id=current_setting('chambana.qa_group')::uuid)<>20 then raise exception 'Group score mismatch'; end if;
  if (select nuts from public.player_leaderboard where id=current_setting('chambana.qa_member')::uuid)<>20 then raise exception 'Player score mismatch'; end if;
  if (select public from storage.buckets where id='mission-proof') then raise exception 'Proof bucket public'; end if;
end; $$;
rollback;
select 'Hosted acceptance checks passed; all fixture rows rolled back.' as result;
