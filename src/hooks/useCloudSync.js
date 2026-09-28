import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const TABLE = 'planner_app_data';
const PUSH_DELAY_MS = 1200;
const RETRY_DELAY_MS = 5000;

// Key order shouldn't matter when checking "has anything changed?", so
// compare a canonical (sorted-key) serialization rather than raw JSON.
function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object') {
    return Object.keys(v)
      .sort()
      .reduce((out, k) => {
        out[k] = canonical(v[k]);
        return out;
      }, {});
  }
  return v;
}
function serialize(v) {
  return JSON.stringify(canonical(v));
}

/**
 * Keeps a single JSON blob of the whole app's state in sync with Supabase.
 *
 * - On login: pulls cloud data (cloud is the source of truth). If there's none
 *   yet, local data is pushed up instead. Nothing is pushed until this first
 *   pull has SUCCEEDED, so a failed load can never overwrite newer cloud data
 *   with stale local data.
 * - Local changes are pushed after a short debounce, retried if they fail, and
 *   flushed immediately when the tab is hidden/closed (phones pause timers in
 *   background tabs, which used to silently drop changes).
 * - When the tab becomes visible again, the cloud is re-checked and, if another
 *   device saved something newer and there are no unsaved local changes, it's
 *   pulled in — so an open tab doesn't go stale and overwrite newer data.
 */
export function useCloudSync(user, appState, applyCloudState) {
  const [status, setStatus] = useState('idle'); // idle | syncing | synced | error
  const [errorMessage, setErrorMessage] = useState('');

  const readyRef = useRef(false);
  const inFlightRef = useRef(false);
  const lastSyncedRef = useRef(null); // canonical JSON last confirmed in the cloud
  const lastSeenUpdatedAtRef = useRef(null); // ms timestamp of the cloud row we last saw/wrote
  const timerRef = useRef(null);

  const appStateRef = useRef(appState);
  const userRef = useRef(user);
  const applyRef = useRef(applyCloudState);
  const pushRef = useRef(null);
  const pullRef = useRef(null);
  appStateRef.current = appState;
  userRef.current = user;
  applyRef.current = applyCloudState;

  function schedulePush(delay = PUSH_DELAY_MS) {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (pushRef.current) pushRef.current();
    }, delay);
  }

  pushRef.current = async function push() {
    const u = userRef.current;
    if (!u || !readyRef.current) return;
    if (inFlightRef.current) {
      schedulePush(1500);
      return;
    }
    const snapshot = appStateRef.current;
    const json = serialize(snapshot);
    if (json === lastSyncedRef.current) {
      setStatus('synced');
      return;
    }

    inFlightRef.current = true;
    setStatus('syncing');
    const sentAt = new Date();
    const { error } = await supabase
      .from(TABLE)
      .upsert({ user_id: u.id, data: snapshot, updated_at: sentAt.toISOString() });
    inFlightRef.current = false;

    if (error) {
      // Don't mark as synced — keep it dirty and try again shortly.
      console.error('Cloud sync (save) failed:', error);
      setErrorMessage(error.message || 'Could not save');
      setStatus('error');
      schedulePush(RETRY_DELAY_MS);
      return;
    }

    lastSyncedRef.current = json;
    lastSeenUpdatedAtRef.current = sentAt.getTime();
    setErrorMessage('');
    // If more changes arrived while uploading, send those too.
    if (serialize(appStateRef.current) !== json) schedulePush(300);
    else setStatus('synced');
  };

  // Pull in newer cloud data — but only if there are no unsaved local changes.
  pullRef.current = async function pullIfClean() {
    const u = userRef.current;
    if (!u || !readyRef.current || inFlightRef.current) return;
    if (serialize(appStateRef.current) !== lastSyncedRef.current) return;

    // Cheap check first: has the cloud row changed at all since we last saw it?
    const { data: meta, error: metaError } = await supabase
      .from(TABLE)
      .select('updated_at')
      .eq('user_id', u.id)
      .maybeSingle();
    if (metaError || !meta) return;
    const cloudTime = new Date(meta.updated_at).getTime();
    if (cloudTime === lastSeenUpdatedAtRef.current) return;

    const { data: row, error } = await supabase
      .from(TABLE)
      .select('data, updated_at')
      .eq('user_id', u.id)
      .maybeSingle();
    if (error || !row || !row.data) return;

    // Re-check: the person may have edited while we were fetching.
    if (inFlightRef.current || serialize(appStateRef.current) !== lastSyncedRef.current) return;

    lastSeenUpdatedAtRef.current = new Date(row.updated_at).getTime();
    const cloudJson = serialize(row.data);
    if (cloudJson === lastSyncedRef.current) return;
    applyRef.current(row.data);
    lastSyncedRef.current = cloudJson;
  };

  // First sync whenever the signed-in user changes. Retries until it succeeds.
  useEffect(() => {
    if (!user) {
      readyRef.current = false;
      lastSyncedRef.current = null;
      lastSeenUpdatedAtRef.current = null;
      return;
    }
    let cancelled = false;
    readyRef.current = false;
    lastSyncedRef.current = null;
    lastSeenUpdatedAtRef.current = null;
    setStatus('syncing');

    function fail(message, error) {
      console.error('Cloud sync (load) failed:', error);
      setErrorMessage(message || 'Could not reach the cloud');
      setStatus('error');
      setTimeout(() => {
        if (!cancelled) initialSync();
      }, RETRY_DELAY_MS);
    }

    async function initialSync() {
      const { data: row, error } = await supabase
        .from(TABLE)
        .select('data, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        fail(error.message, error);
        return;
      }

      if (row && row.data) {
        applyRef.current(row.data);
        lastSyncedRef.current = serialize(row.data);
        lastSeenUpdatedAtRef.current = new Date(row.updated_at).getTime();
      } else {
        // First time signing in: push whatever's already on this device.
        const local = appStateRef.current;
        const sentAt = new Date();
        const { error: upsertError } = await supabase
          .from(TABLE)
          .upsert({ user_id: user.id, data: local, updated_at: sentAt.toISOString() });
        if (cancelled) return;
        if (upsertError) {
          fail(upsertError.message, upsertError);
          return;
        }
        lastSyncedRef.current = serialize(local);
        lastSeenUpdatedAtRef.current = sentAt.getTime();
      }

      readyRef.current = true;
      setErrorMessage('');
      setStatus('synced');
      // Pick up anything that changed while we were loading.
      schedulePush(600);
    }

    initialSync();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Debounced push whenever local state changes, once the first sync is done.
  useEffect(() => {
    if (!user || !readyRef.current) return;
    schedulePush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState, user]);

  // Flush on hide/close, re-check on show/focus/reconnect.
  useEffect(() => {
    if (!user) return undefined;

    function flush() {
      clearTimeout(timerRef.current);
      if (pushRef.current) pushRef.current();
    }
    function refresh() {
      if (pushRef.current) pushRef.current(); // send anything pending first
      if (pullRef.current) pullRef.current(); // then pick up newer cloud data
    }
    function onVisibility() {
      if (document.visibilityState === 'hidden') flush();
      else refresh();
    }

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [user?.id]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { status, errorMessage };
}
