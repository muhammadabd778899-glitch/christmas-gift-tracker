#!/usr/bin/env node
// Remote verification for the online edition.
//
// Creates two throwaway accounts in the dedicated test project, exercises the
// sync RPCs, attempts cross-account reads/writes, and deletes both accounts.
// Never point this at a project that holds real customer data.
//
// Usage: npm run verify:supabase
// Exit codes: 0 = all checks passed, 1 = a check failed, 2 = not run/skipped.

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL?.trim();
const anonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!url || !anonKey) {
  console.error(
    'SKIPPED: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.online.local (see docs/ONLINE_SETUP.md).',
  );
  process.exit(2);
}

class SkipError extends Error {}

const runId = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const password = `M11-verify-${crypto.randomUUID()}`;
const emailA = `m11-verify-${runId}-a@example.com`;
const emailB = `m11-verify-${runId}-b@example.com`;
const seasonId = `season-${runId}`;
const nowIso = () => new Date().toISOString();

let failures = 0;

function pass(name, detail = '') {
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  failures += 1;
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

function check(name, condition, detail = '') {
  if (condition) {
    pass(name, detail);
  } else {
    fail(name, detail);
  }
}

function makeClient() {
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'implicit',
    },
  });
}

async function createAccount(client, email) {
  const { data, error } = await client.auth.signUp({ email, password });

  if (error) {
    throw new Error(`Sign-up failed: ${error.message}`);
  }

  if (!data.session) {
    throw new SkipError(
      'Email confirmation is enabled. Confirm the test inbox or disable "Confirm email" in the test project, then rerun.',
    );
  }

  return data.user;
}

const clientA = makeClient();
const clientB = makeClient();
const anonClient = makeClient();
let accountA = null;
let accountB = null;

try {
  accountA = await createAccount(clientA, emailA);
  accountB = await createAccount(clientB, emailB);
  pass('two throwaway accounts created');

  const seasonData = {
    id: seasonId,
    name: 'Verification season',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const created = await clientA.rpc('sync_upsert', {
    p_entity_type: 'season',
    p_entity_id: seasonId,
    p_base_revision: 0,
    p_data: seasonData,
    p_updated_at: seasonData.updatedAt,
  });
  check(
    'account A creates its own record',
    !created.error && created.data?.status === 'applied' && created.data?.revision === 1,
    created.error?.message ?? `revision ${created.data?.revision}`,
  );

  const countA = await clientA.rpc('sync_count_rows');
  check('account A counts one record', !countA.error && countA.data === 1, String(countA.data));

  const bChanges = await clientB.rpc('sync_list_changes', { p_since_seq: 0, p_limit: 200 });
  check(
    'account B sees no changes from account A',
    !bChanges.error && Array.isArray(bChanges.data) && bChanges.data.length === 0,
    bChanges.error?.message ?? `${bChanges.data?.length} rows`,
  );

  const bSelect = await clientB.from('sync_records').select('entity_type, entity_id');
  check(
    'account B cannot read account A rows directly',
    !bSelect.error && bSelect.data.length === 0,
    bSelect.error?.message ?? `${bSelect.data?.length} rows`,
  );

  const bSelectById = await clientB
    .from('sync_records')
    .select('entity_id')
    .eq('entity_id', seasonId);
  check(
    'account B cannot read a known record id',
    !bSelectById.error && bSelectById.data.length === 0,
    bSelectById.error?.message ?? `${bSelectById.data?.length} rows`,
  );

  const bUpdate = await clientB
    .from('sync_records')
    .update({ data: { tampered: true } })
    .eq('entity_id', seasonId)
    .select('entity_id');
  check(
    'account B cannot update account A rows',
    (!bUpdate.error && bUpdate.data.length === 0) || Boolean(bUpdate.error),
    bUpdate.error?.message ?? `${bUpdate.data?.length} rows`,
  );

  const bDelete = await clientB
    .from('sync_records')
    .delete()
    .eq('entity_id', seasonId)
    .select('entity_id');
  check(
    'account B cannot delete account A rows',
    (!bDelete.error && bDelete.data.length === 0) || Boolean(bDelete.error),
    bDelete.error?.message ?? `${bDelete.data?.length} rows`,
  );

  const bInsertForA = await clientB.from('sync_records').insert({
    user_id: accountA.id,
    entity_type: 'season',
    entity_id: `inserted-${runId}`,
    updated_at: nowIso(),
    data: { id: `inserted-${runId}` },
  });
  check(
    'account B cannot insert rows for account A',
    Boolean(bInsertForA.error),
    bInsertForA.error?.message ?? 'insert unexpectedly succeeded',
  );

  const bOwn = await clientB.rpc('sync_upsert', {
    p_entity_type: 'season',
    p_entity_id: seasonId,
    p_base_revision: 0,
    p_data: { ...seasonData, name: 'Verification season B' },
    p_updated_at: nowIso(),
  });
  check(
    'account B can create the same entity id in its own account',
    !bOwn.error && bOwn.data?.status === 'applied' && bOwn.data?.revision === 1,
    bOwn.error?.message,
  );

  const aChanges = await clientA.rpc('sync_list_changes', { p_since_seq: 0, p_limit: 200 });
  const aRow = Array.isArray(aChanges.data) ? aChanges.data[0] : null;
  check(
    'account A data is unchanged by account B',
    !aChanges.error &&
      aChanges.data.length === 1 &&
      aRow?.entity_id === seasonId &&
      aRow?.revision === 1 &&
      aRow?.data?.name === 'Verification season',
    aChanges.error?.message,
  );

  const anonSelect = await anonClient.from('sync_records').select('entity_id');
  check(
    'signed-out clients cannot read records',
    Boolean(anonSelect.error) || anonSelect.data.length === 0,
    anonSelect.error?.message ?? `${anonSelect.data?.length} rows`,
  );

  const anonUpsert = await anonClient.rpc('sync_upsert', {
    p_entity_type: 'season',
    p_entity_id: `anon-${runId}`,
    p_base_revision: 0,
    p_data: { id: `anon-${runId}` },
    p_updated_at: nowIso(),
  });
  check('signed-out clients cannot write records', Boolean(anonUpsert.error));

  const badType = await clientA.rpc('sync_upsert', {
    p_entity_type: 'bogus',
    p_entity_id: 'x',
    p_base_revision: 0,
    p_data: { id: 'x' },
    p_updated_at: nowIso(),
  });
  check('invalid entity type is rejected', Boolean(badType.error), badType.error?.message);

  const emptyId = await clientA.rpc('sync_upsert', {
    p_entity_type: 'season',
    p_entity_id: '',
    p_base_revision: 0,
    p_data: { id: 'x' },
    p_updated_at: nowIso(),
  });
  check('empty entity id is rejected', Boolean(emptyId.error), emptyId.error?.message);

  const wrongSettingsId = await clientA.rpc('sync_upsert', {
    p_entity_type: 'settings',
    p_entity_id: 'other',
    p_base_revision: 0,
    p_data: { id: 'app' },
    p_updated_at: nowIso(),
  });
  check('settings must use the app id', Boolean(wrongSettingsId.error));

  const negativeBase = await clientA.rpc('sync_upsert', {
    p_entity_type: 'season',
    p_entity_id: seasonId,
    p_base_revision: -1,
    p_data: { id: seasonId },
    p_updated_at: nowIso(),
  });
  check('negative base revision is rejected', Boolean(negativeBase.error));

  const duplicate = await clientA.rpc('sync_upsert', {
    p_entity_type: 'season',
    p_entity_id: seasonId,
    p_base_revision: 1,
    p_data: aRow?.data,
    p_updated_at: aRow?.updated_at,
  });
  check(
    'a duplicate submission does not create another revision',
    !duplicate.error && duplicate.data?.status === 'applied' && duplicate.data?.revision === 1,
    duplicate.error?.message ?? `revision ${duplicate.data?.revision}`,
  );

  const editedAt = new Date(Date.parse(seasonData.updatedAt) + 1000).toISOString();
  const edit = await clientA.rpc('sync_upsert', {
    p_entity_type: 'season',
    p_entity_id: seasonId,
    p_base_revision: 1,
    p_data: { ...seasonData, name: 'Verification season edited', updatedAt: editedAt },
    p_updated_at: editedAt,
  });
  check(
    'a current write bumps the revision',
    !edit.error && edit.data?.status === 'applied' && edit.data?.revision === 2,
    edit.error?.message ?? `revision ${edit.data?.revision}`,
  );

  const stale = await clientA.rpc('sync_upsert', {
    p_entity_type: 'season',
    p_entity_id: seasonId,
    p_base_revision: 1,
    p_data: { ...seasonData, name: 'Stale device copy' },
    p_updated_at: nowIso(),
  });
  check(
    'a stale write returns both versions as a conflict',
    !stale.error &&
      stale.data?.status === 'conflict' &&
      stale.data?.remote?.revision === 2 &&
      stale.data?.remote?.data?.name === 'Verification season edited',
    stale.error?.message,
  );

  const deleted = await clientA.rpc('sync_delete', {
    p_entity_type: 'season',
    p_entity_id: seasonId,
    p_base_revision: 2,
    p_deleted_at: nowIso(),
  });
  check(
    'deletes are recorded as soft tombstones',
    !deleted.error && deleted.data?.status === 'applied' && deleted.data?.revision === 3,
    deleted.error?.message ?? `revision ${deleted.data?.revision}`,
  );

  const aAfterDelete = await clientA.rpc('sync_list_changes', { p_since_seq: 0, p_limit: 200 });
  const tombstone = Array.isArray(aAfterDelete.data) ? aAfterDelete.data[0] : null;
  check(
    'the tombstone is visible to the account',
    !aAfterDelete.error &&
      aAfterDelete.data.length === 1 &&
      tombstone?.deleted_at !== null &&
      tombstone?.data === null &&
      tombstone?.revision === 3,
    aAfterDelete.error?.message,
  );

  const bChangesAfter = await clientB.rpc('sync_list_changes', { p_since_seq: 0, p_limit: 200 });
  check(
    'account B still sees only its own record',
    !bChangesAfter.error &&
      bChangesAfter.data.length === 1 &&
      bChangesAfter.data[0].data?.name === 'Verification season B',
    bChangesAfter.error?.message,
  );

  const exported = await clientA.rpc('export_my_account');
  check(
    'account export returns only live records and the account email',
    !exported.error &&
      exported.data?.accountEmail === emailA &&
      Array.isArray(exported.data?.records) &&
      exported.data.records.length === 0,
    exported.error?.message,
  );

  const exportedB = await clientB.rpc('export_my_account');
  check(
    'account B export contains its own record only',
    !exportedB.error &&
      exportedB.data?.records?.length === 1 &&
      exportedB.data.records[0].entityId === seasonId &&
      exportedB.data.records[0].data?.name === 'Verification season B',
    exportedB.error?.message,
  );

  const deleteA = await clientA.rpc('delete_my_account');
  check('account deletion completes', !deleteA.error, deleteA.error?.message);

  const residualA = await clientA.from('sync_records').select('entity_id');
  check(
    'account deletion removes cloud records',
    (!residualA.error && residualA.data.length === 0) || Boolean(residualA.error),
    residualA.error?.message ?? `${residualA.data?.length} rows`,
  );

  const signInDeleted = await makeClient().auth.signInWithPassword({
    email: emailA,
    password,
  });
  check('a deleted account can no longer sign in', Boolean(signInDeleted.error));

  const bStillThere = await clientB.rpc('sync_count_rows');
  check(
    'account B data survives account A deletion',
    !bStillThere.error && bStillThere.data === 1,
    bStillThere.error?.message ?? String(bStillThere.data),
  );

  const cleanupB = await clientB.rpc('delete_my_account');
  check('account B cleanup completes', !cleanupB.error, cleanupB.error?.message);

  void accountA;
  void accountB;
} catch (error) {
  if (error instanceof SkipError) {
    console.error(`SKIPPED: ${error.message}`);
    process.exitCode = 2;
  } else {
    console.error(`FAIL  verification aborted — ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  }
} finally {
  if (failures > 0 && !process.exitCode) {
    process.exitCode = 1;
  }
}

if (failures === 0 && !process.exitCode) {
  console.log('\nAll remote checks passed against the test project.');
}
