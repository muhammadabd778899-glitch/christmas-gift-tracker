-- Milestone 11: online edition schema.
--
-- Each account owns a private mirror of its planner. Every record keeps a
-- per-record revision for compare-and-swap writes and a global server sequence
-- used as the pull cursor. Records are soft-deleted so other devices can
-- observe the deletion.

create sequence if not exists public.sync_server_seq as bigint start with 1 increment by 1;

create table if not exists public.sync_records (
  user_id uuid not null references auth.users (id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  revision integer not null default 1,
  server_seq bigint not null default nextval('public.sync_server_seq'),
  deleted_at timestamptz,
  updated_at timestamptz not null,
  data jsonb,
  constraint sync_records_pkey primary key (user_id, entity_type, entity_id),
  constraint sync_records_entity_type_check check (
    entity_type in ('season', 'recipient', 'gift', 'idea', 'settings')
  ),
  constraint sync_records_entity_id_check check (char_length(entity_id) between 1 and 200),
  constraint sync_records_settings_id_check check (
    entity_type <> 'settings' or entity_id = 'app'
  ),
  constraint sync_records_revision_check check (revision >= 0),
  constraint sync_records_data_check check ((deleted_at is null) = (data is not null))
);

alter table public.sync_records enable row level security;

create index if not exists sync_records_user_seq_idx
  on public.sync_records (user_id, server_seq);

-- Row-level security: an account can only ever see or change its own rows.
drop policy if exists "sync_records_select_own" on public.sync_records;
create policy "sync_records_select_own"
  on public.sync_records
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "sync_records_insert_own" on public.sync_records;
create policy "sync_records_insert_own"
  on public.sync_records
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "sync_records_update_own" on public.sync_records;
create policy "sync_records_update_own"
  on public.sync_records
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "sync_records_delete_own" on public.sync_records;
create policy "sync_records_delete_own"
  on public.sync_records
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.sync_records from anon;
grant select, insert, update, delete on table public.sync_records to authenticated;
grant usage, select on sequence public.sync_server_seq to authenticated;

-- Shared validation for both write functions. Returns the caller id.
create or replace function public.sync_assert_write(
  p_entity_type text,
  p_entity_id text,
  p_base_revision integer,
  p_updated_at timestamptz
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  if p_entity_type is null
     or p_entity_type not in ('season', 'recipient', 'gift', 'idea', 'settings') then
    raise exception 'Unknown entity type.' using errcode = '22023';
  end if;

  if p_entity_id is null or char_length(p_entity_id) not between 1 and 200 then
    raise exception 'The entity id is invalid.' using errcode = '22023';
  end if;

  if p_entity_type = 'settings' and p_entity_id <> 'app' then
    raise exception 'Settings must use the app entity id.' using errcode = '22023';
  end if;

  if p_base_revision is null or p_base_revision < 0 then
    raise exception 'The base revision is invalid.' using errcode = '22023';
  end if;

  if p_updated_at is null then
    raise exception 'The updated timestamp is required.' using errcode = '22023';
  end if;

  return v_uid;
end;
$$;

revoke all on function public.sync_assert_write(text, text, integer, timestamptz)
  from public, anon;
grant execute on function public.sync_assert_write(text, text, integer, timestamptz)
  to authenticated;

create or replace function public.sync_upsert(
  p_entity_type text,
  p_entity_id text,
  p_base_revision integer,
  p_data jsonb,
  p_updated_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid;
  v_row public.sync_records%rowtype;
  v_revision integer;
  v_seq bigint;
begin
  v_uid := public.sync_assert_write(p_entity_type, p_entity_id, p_base_revision, p_updated_at);

  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'The record data must be a JSON object.' using errcode = '22023';
  end if;

  if octet_length(p_data::text) > 262144 then
    raise exception 'The record data is too large.' using errcode = '22023';
  end if;

  select *
    into v_row
    from public.sync_records
   where user_id = v_uid
     and entity_type = p_entity_type
     and entity_id = p_entity_id
     for update;

  if not found then
    if p_base_revision <> 0 then
      return jsonb_build_object('status', 'conflict', 'remote', null);
    end if;

    v_revision := 1;
    v_seq := nextval('public.sync_server_seq');

    insert into public.sync_records (
      user_id,
      entity_type,
      entity_id,
      revision,
      server_seq,
      deleted_at,
      updated_at,
      data
    )
    values (
      v_uid,
      p_entity_type,
      p_entity_id,
      v_revision,
      v_seq,
      null,
      p_updated_at,
      p_data
    );

    return jsonb_build_object('status', 'applied', 'revision', v_revision, 'seq', v_seq);
  end if;

  if v_row.revision <> p_base_revision then
    return jsonb_build_object('status', 'conflict', 'remote', to_jsonb(v_row));
  end if;

  -- The same write arriving twice (for example after a lost response) is
  -- applied without bumping the revision or sequence.
  if v_row.deleted_at is null
     and date_trunc('milliseconds', v_row.updated_at)
         = date_trunc('milliseconds', p_updated_at)
     and v_row.data = p_data then
    return jsonb_build_object(
      'status', 'applied',
      'revision', v_row.revision,
      'seq', v_row.server_seq
    );
  end if;

  v_revision := v_row.revision + 1;
  v_seq := nextval('public.sync_server_seq');

  update public.sync_records
     set revision = v_revision,
         server_seq = v_seq,
         deleted_at = null,
         updated_at = p_updated_at,
         data = p_data
   where user_id = v_uid
     and entity_type = p_entity_type
     and entity_id = p_entity_id;

  return jsonb_build_object('status', 'applied', 'revision', v_revision, 'seq', v_seq);
end;
$$;

revoke all on function public.sync_upsert(text, text, integer, jsonb, timestamptz)
  from public, anon;
grant execute on function public.sync_upsert(text, text, integer, jsonb, timestamptz)
  to authenticated;

create or replace function public.sync_delete(
  p_entity_type text,
  p_entity_id text,
  p_base_revision integer,
  p_deleted_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid;
  v_row public.sync_records%rowtype;
  v_revision integer;
  v_seq bigint;
begin
  v_uid := public.sync_assert_write(p_entity_type, p_entity_id, p_base_revision, p_deleted_at);

  select *
    into v_row
    from public.sync_records
   where user_id = v_uid
     and entity_type = p_entity_type
     and entity_id = p_entity_id
     for update;

  if not found then
    if p_base_revision <> 0 then
      return jsonb_build_object('status', 'conflict', 'remote', null);
    end if;

    -- Nothing was ever uploaded, so the deletion is already complete.
    return jsonb_build_object('status', 'applied', 'revision', 0, 'seq', 0);
  end if;

  if v_row.revision <> p_base_revision then
    return jsonb_build_object('status', 'conflict', 'remote', to_jsonb(v_row));
  end if;

  if v_row.deleted_at is not null then
    return jsonb_build_object(
      'status', 'applied',
      'revision', v_row.revision,
      'seq', v_row.server_seq
    );
  end if;

  v_revision := v_row.revision + 1;
  v_seq := nextval('public.sync_server_seq');

  update public.sync_records
     set revision = v_revision,
         server_seq = v_seq,
         deleted_at = p_deleted_at,
         updated_at = p_deleted_at,
         data = null
   where user_id = v_uid
     and entity_type = p_entity_type
     and entity_id = p_entity_id;

  return jsonb_build_object('status', 'applied', 'revision', v_revision, 'seq', v_seq);
end;
$$;

revoke all on function public.sync_delete(text, text, integer, timestamptz)
  from public, anon;
grant execute on function public.sync_delete(text, text, integer, timestamptz)
  to authenticated;

create or replace function public.sync_list_changes(
  p_since_seq bigint default 0,
  p_limit integer default 200
)
returns table (
  entity_type text,
  entity_id text,
  revision integer,
  server_seq bigint,
  deleted_at timestamptz,
  updated_at timestamptz,
  data jsonb
)
language sql
security invoker
set search_path = ''
stable
as $$
  select
    r.entity_type,
    r.entity_id,
    r.revision,
    r.server_seq,
    r.deleted_at,
    r.updated_at,
    r.data
  from public.sync_records r
  where r.user_id = auth.uid()
    and r.server_seq > coalesce(p_since_seq, 0)
  order by r.server_seq
  limit least(greatest(coalesce(p_limit, 200), 1), 500);
$$;

revoke all on function public.sync_list_changes(bigint, integer) from public, anon;
grant execute on function public.sync_list_changes(bigint, integer) to authenticated;

create or replace function public.sync_count_rows()
returns integer
language sql
security invoker
set search_path = ''
stable
as $$
  select count(*)::integer
  from public.sync_records r
  where r.user_id = auth.uid();
$$;

revoke all on function public.sync_count_rows() from public, anon;
grant execute on function public.sync_count_rows() to authenticated;

create or replace function public.export_my_account()
returns jsonb
language sql
security invoker
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'exportedAt', now(),
    'accountEmail', auth.jwt() ->> 'email',
    'records', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'entityType', r.entity_type,
            'entityId', r.entity_id,
            'revision', r.revision,
            'updatedAt', r.updated_at,
            'data', r.data
          )
          order by r.entity_type, r.entity_id
        )
        from public.sync_records r
        where r.user_id = auth.uid()
          and r.deleted_at is null
      ),
      '[]'::jsonb
    )
  );
$$;

revoke all on function public.export_my_account() from public, anon;
grant execute on function public.export_my_account() to authenticated;

-- Account deletion removes the login and, by cascade, every mirrored record.
-- Local planner data on a device is untouched; the client disconnects itself.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

comment on table public.sync_records is
  'Per-account mirror of planner records. Soft deletes are kept so devices can observe removals.';
