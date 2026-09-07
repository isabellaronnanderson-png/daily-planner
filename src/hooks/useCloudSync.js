import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const TABLE = 'planner_app_data';

/**
 * Keeps a single JSON blob of the whole app's state in sync with Supabase.
 * - On login: if the user already has cloud data, it overwrites local state
 *   (cloud is the source of truth). If they don't yet, whatever's already
 *   in local storage gets pushed up instead of being discarded.
 * - After that, local changes are pushed up (debounced) automatically.
 */
export function useCloudSync(user, appState, applyCloudState) {
  const [status, setStatus] = useState('idle'); // idle | syncing | synced | error

  const readyRef = useRef(false);
  const lastPushedRef = useRef(null);
  const pushTimeoutRef = useRef(null);
  const appStateRef = useRef(appState);
  appStateRef.current = appState;

  // Initial pull (or first-time push) whenever the signed-in user changes.
  useEffect(() => {
    if (!user) {
      readyRef.current = false;
      lastPushedRef.current = null;
      return;
    }
    let cancelled = false;
    readyRef.current = false;
    setStatus('syncing');

    (async () => {
      const { data: row, error } = await supabase
        .from(TABLE)
        .select('data')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setStatus('error');
        readyRef.current = true;
        return;
      }

      if (row && row.data) {
        applyCloudState(row.data);
        lastPushedRef.current = JSON.stringify(row.data);
      } else {
        const localData = appStateRef.current;
        const { error: upsertError } = await supabase
          .from(TABLE)
          .upsert({ user_id: user.id, data: localData, updated_at: new Date().toISOString() });
        if (!upsertError) lastPushedRef.current = JSON.stringify(localData);
      }

      if (!cancelled) {
        readyRef.current = true;
        setStatus('synced');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Debounced push whenever local state changes, once the initial sync is done.
  useEffect(() => {
    if (!user || !readyRef.current) return;

    clearTimeout(pushTimeoutRef.current);
    pushTimeoutRef.current = setTimeout(async () => {
      const json = JSON.stringify(appStateRef.current);
      if (json === lastPushedRef.current) return;

      setStatus('syncing');
      const { error } = await supabase
        .from(TABLE)
        .upsert({ user_id: user.id, data: appStateRef.current, updated_at: new Date().toISOString() });
      lastPushedRef.current = json;
      setStatus(error ? 'error' : 'synced');
    }, 1200);

    return () => clearTimeout(pushTimeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState, user]);

  return { status };
}
