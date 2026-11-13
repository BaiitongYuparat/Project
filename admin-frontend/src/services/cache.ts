// cache ฝั่ง client (module-level Map) — stale-while-revalidate แบบเขียนเอง ไม่พึ่ง react-query/swr
// กติกา: มี cache → คืนข้อมูลทันทีแล้ว refetch เงียบ ๆ ทันทีหลังทุก mutation ต้อง invalidate

export interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
  stale: boolean;
}

const store = new Map<string, CacheEntry<unknown>>();
// คำขอที่กำลังยิงอยู่ต่อ key — dedupe กันยิงซ้ำ (prefetch + หน้าจอเรียกพร้อมกันได้ครั้งเดียว)
const inFlight = new Map<string, Promise<unknown>>();
// ตัวนับ generation ต่อ key — response ที่ resolve หลัง invalidate จะไม่ถูกเขียนทับ cache
const generations = new Map<string, number>();

const nextGeneration = (key: string) => {
  const value = (generations.get(key) ?? 0) + 1;
  generations.set(key, value);
  return value;
};

export type QueryOptions = { force?: boolean };

// คืนข้อมูลจาก cache ถ้ายังไม่หมดอายุ, มี in-flight dedupe, force = refetch โดยไม่สน cache
export const cachedQuery = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number,
  opts: QueryOptions = {},
): Promise<T> => {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  const isFresh = entry && !entry.stale && Date.now() - entry.fetchedAt < ttlMs;

  // stale-while-revalidate: nếu có cache cũ vẫn sử dụng được, trả về ngay lập tức
  // rồi từ từ refetch ở phía sau (để dedupe trong trường hợp gọi cùng lúc nhiều nơi)
  if (!opts.force && entry) {
    if (isFresh) {
      return entry.data;
    }

    const existing = inFlight.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const generation = generations.get(key) ?? nextGeneration(key);
    const promise = (async () => {
      try {
        const data = await fetcher();

        if (generations.get(key) === generation) {
          store.set(key, { data, fetchedAt: Date.now(), stale: false });
        }

        return data;
      } catch (error) {
        throw error;
      }
    })();

    inFlight.set(key, promise);

    promise.finally(() => {
      if (inFlight.get(key) === promise) {
        inFlight.delete(key);
      }
    });

    // คืนผลเก่าทันทีเพื่อไม่ให้ UI ค้าง loading ขณะ refetch ทำงานเบื้องหลัง
    return entry.data;
  }

  if (!opts.force && isFresh) {
    return entry.data;
  }

  // force → bump generation แล้วยิงใหม่ (response เก่าที่ค้างอยู่จะเขียน cache ไม่ได้)
  if (opts.force) {
    nextGeneration(key);
    inFlight.delete(key);
  }

  const existing = inFlight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const generation = generations.get(key) ?? nextGeneration(key);
  const promise = (async () => {
    try {
      const data = await fetcher();

      // เขียน cache เฉพาะเมื่อยังเป็น generation ล่าสุด — กัน response เก่าจาก request ค้าง
      // กลับมาเขียนทับหลัง invalidate (เช่น ลบสินค้าแล้วข้อมูลเก่ากลับมาโชว์)
      if (generations.get(key) === generation) {
        store.set(key, { data, fetchedAt: Date.now(), stale: false });
      }

      return data;
    } catch (error) {
      throw error;
    }
  })();

  inFlight.set(key, promise);

  promise.finally(() => {
    if (inFlight.get(key) === promise) {
      inFlight.delete(key);
    }
  });

  return promise;
};

// อ่าน cache ที่มีอยู่โดยไม่ยิง request (ใช้ใน hook เพื่อแสดงข้อมูลเก่าทันทีตอน render แรก)
export const peekCache = <T>(key: string): CacheEntry<T> | undefined =>
  store.get(key) as CacheEntry<T> | undefined;

// invalidate ทุก key ที่ขึ้นต้นด้วย prefix
// keepStale = เก็บข้อมูลเก่าไว้แสดงระหว่าง refetch (ใช้หลัง mutation กัน skeleton กลับมาหน้า list)
// ไม่ keepStale = ลบทิ้ง (ใช้ตอน logout / เปลี่ยนบัญชี)
export const invalidate = (
  prefix: string,
  opts: { keepStale?: boolean } = {},
): void => {
  for (const key of [...store.keys()]) {
    if (key !== prefix && !key.startsWith(prefix)) continue;

    nextGeneration(key);
    inFlight.delete(key);

    if (opts.keepStale) {
      const entry = store.get(key);
      if (entry) store.set(key, { ...entry, stale: true });
    } else {
      store.delete(key);
    }
  }
};

// ล้างทั้งหมด — เรียกตอน logout / เปลี่ยนบัญชีผู้ดูแล (ข้อมูลร้านเก่าต้องไม่ค้างในเบราว์เซอร์)
export const invalidateAll = (): void => {
  store.clear();
  inFlight.clear();
  // เคลียร์ generations ด้วย → request ค้างที่ resolve ทีหลังเขียน cache ไม่ได้
  generations.clear();
};
