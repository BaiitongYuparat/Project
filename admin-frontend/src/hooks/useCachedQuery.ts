import { useCallback, useEffect, useRef, useState } from "react";

import {
  peekCache,
  type CacheEntry,
  type QueryOptions,
} from "../services/cache";

type UseCachedQueryOptions = {
  // false = ไม่ยิง request และไม่แสดงข้อมูล (เช่น slug ยังไม่พร้อม)
  enabled?: boolean;
};

// stale-while-revalidate hook:
// - ไม่มี cache → loading=true แล้วค่อย fetch
// - มี cache → set data ทันที (ไม่มี skeleton flash) แล้ว refetch เบื้องหลัง
// - fetch จริงผ่าน service (cache + dedupe อยู่ที่ services/cache.ts)
export function useCachedQuery<T>(
  key: string | null,
  fetcher: (opts: QueryOptions) => Promise<T>,
  { enabled = true }: UseCachedQueryOptions = {},
) {
  // อ่าน cache sync ตั้งแต่ render แรก — มีข้อมูลเก่าจะไม่โชว์ loading เฟรมเดียว
  const [entry, setEntry] = useState<CacheEntry<T> | null>(() =>
    key && enabled ? peekCache<T>(key) ?? null : null,
  );
  const [error, setError] = useState<unknown>(null);
  const [refreshing, setRefreshing] = useState(false);

  // เก็บ key/fetcher ล่าสุดใน ref — fetcher เป็น inline function ที่เปลี่ยนทุก render
  // ถ้าเอาลง dependency ของ effect จะ refetch รัว ๆ
  const stateRef = useRef({ key, enabled });
  stateRef.current = { key, enabled };

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;

    return () => {
      aliveRef.current = false;
    };
  }, []);

  const applyResult = useCallback((cacheKey: string) => {
    if (!aliveRef.current || stateRef.current.key !== cacheKey) return;

    setEntry(peekCache<T>(cacheKey) ?? null);
    setRefreshing(false);
  }, []);

  const run = useCallback(async (opts: QueryOptions = {}) => {
    const { key: currentKey, enabled: currentEnabled } = stateRef.current;

    if (!currentKey || !currentEnabled) return;

    setRefreshing(true);
    setError(null);

    try {
      const result = await fetcherRef.current(opts);
      applyResult(currentKey);
      return result;
    } catch (err) {
      if (!aliveRef.current || stateRef.current.key !== currentKey) return;

      // ไม่ล้างข้อมูลเก่า — โชว์ error แล้วให้ผู้ใช้กด refresh เอง
      setError(err);
      setRefreshing(false);
      console.error("Cached query error:", err);
    }
  }, [applyResult]);

  useEffect(() => {
    if (!key || !enabled) {
      setEntry(null);
      setError(null);
      setRefreshing(false);
      return;
    }

    const cached = peekCache<T>(key);

    // ถ้ามี cache เดิม ให้แสดงทันทีและไม่ให้ loading ค้างเวลา refetch
    setEntry(cached ?? null);
    setError(null);

    let cancelled = false;

    (async () => {
      try {
        const data = await fetcherRef.current({});
        if (cancelled) return;

        const cachedNow = peekCache<T>(key);
        if (cachedNow) {
          setEntry(cachedNow);
        } else if (data) {
          setEntry({ data, fetchedAt: Date.now(), stale: false });
        }
        setRefreshing(false);
      } catch (err) {
        if (cancelled) return;

        setError(err);
        setRefreshing(false);
        console.error("Cached query error:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, applyResult]);

  const refresh = useCallback((opts: QueryOptions = {}) => run(opts), [run]);

  return {
    data: entry?.data ?? null,
    loading: entry === null && !refreshing,
    error,
    refreshing,
    refresh,
  };
}
