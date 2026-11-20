import { useCallback, useEffect, useRef, useState } from "react";

import {
  peekCache,
  pendingQuery,
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

  const applyResult = useCallback((cacheKey: string, fallback?: T) => {
    if (!aliveRef.current || stateRef.current.key !== cacheKey) return;

    // ห้าม set เป็น null ตอนไม่มีใน cache (เช่น response ถูกทิ้งเพราะ invalidate ซ้อน) —
    // ไม่งั้นรายการที่โหลดเสร็จแล้วจะกลับไปเป็น "กำลังโหลด" ทั้งที่มีข้อมูลอยู่
    const cached = peekCache<T>(cacheKey);
    if (cached) {
      setEntry(cached);
    } else if (fallback !== undefined) {
      setEntry({ data: fallback, fetchedAt: Date.now(), stale: false });
    }
    setRefreshing(false);
  }, []);

  const run = useCallback(async (opts: QueryOptions = {}) => {
    const { key: currentKey, enabled: currentEnabled } = stateRef.current;

    if (!currentKey || !currentEnabled) return;

    setRefreshing(true);
    setError(null);

    try {
      const result = await fetcherRef.current(opts);
      applyResult(currentKey, result);

      // ได้ข้อมูลเก่าไปแสดงก่อน (refetch เบื้องหลังยังไม่เสร็จ) → รอแล้วอัปเดตเมื่อได้ข้อมูลใหม่
      const refetch = pendingQuery(currentKey);
      if (refetch) {
        await refetch.catch(() => undefined);
        applyResult(currentKey, result);
      }
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

        // ได้ข้อมูลเก่า (stale หลัง mutation) ไปแสดงก่อน → รอ refetch เบื้องหลังแล้วอัปเดตรายการ
        // ไม่งั้นหน้า list ค้างข้อมูลเก่า (เช่น ไม่เห็นรูปที่เพิ่งเพิ่ม) จนกว่าจะ refresh เอง
        const refetch = pendingQuery(key);
        if (refetch) {
          await refetch.catch(() => undefined);
          if (cancelled) return;
          const fresh = peekCache<T>(key);
          if (fresh) setEntry(fresh);
        }
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
    // error แล้วไม่ถือว่ากำลังโหลด — ไม่งั้นหน้าค้างที่ "กำลังโหลด" ตลอด ทั้งที่โหลดไม่สำเร็จ
    loading: entry === null && !refreshing && error === null,
    error,
    refreshing,
    refresh,
  };
}
