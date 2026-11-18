import type { AdminRole, BrandMemberRole, BrandStatus } from "@prisma/client";

// TTL cache สิทธิ์ฝั่งผู้ดูแล — ใช้เฉพาะ request GET เท่านั้น
// mutation (POST/PUT/PATCH/DELETE) ต้อง query สิทธิ์จาก DB สดเสมอ ห้ามใช้ cache ตัดสินสิทธิ์

const ACCESS_TTL_MS = 60 * 1000;

// ข้อมูล admin ที่ middleware adminAuth ใช้ (ตรงกับ select ใน middleware)
export type CachedAdmin = {
  id: string;
  email: string;
  name: string | null;
  status: string;
  role: AdminRole;
};

// ผลลัพธ์ของ getBrandAccess (ตรงกับ type ใน brandAccessService)
export type CachedBrandAccess = {
  brand: {
    id: string;
    brand_name: string;
    slug: string;
    status: BrandStatus;
  };
  role: BrandMemberRole;
};

type CacheEntry<V> = {
  adminId: string;
  slug: string | null; // null = แคชระดับ admin (ไม่ผูกร้าน)
  value: V;
  expiresAt: number;
};

const adminCache = new Map<string, CacheEntry<CachedAdmin>>();
const brandCache = new Map<string, CacheEntry<CachedBrandAccess>>();

const isFresh = (entry: CacheEntry<unknown>, now: number) =>
  entry.expiresAt > now;

//--------------------- Admin ---------------------

export const getCachedAdmin = (adminId: string): CachedAdmin | undefined => {
  const entry = adminCache.get(adminId);

  if (!entry) return undefined;
  if (!isFresh(entry, Date.now())) {
    adminCache.delete(adminId);
    return undefined;
  }

  return entry.value;
};

export const setCachedAdmin = (adminId: string, admin: CachedAdmin): void => {
  adminCache.set(adminId, {
    adminId,
    slug: null,
    value: admin,
    expiresAt: Date.now() + ACCESS_TTL_MS,
  });
};

//--------------------- Brand access ---------------------

export const brandAccessCacheKey = (adminId: string, slug: string) =>
  `${adminId}:${slug}`;

export const getCachedBrandAccess = (
  adminId: string,
  slug: string
): CachedBrandAccess | undefined => {
  const entry = brandCache.get(brandAccessCacheKey(adminId, slug));

  if (!entry) return undefined;
  if (!isFresh(entry, Date.now())) {
    brandCache.delete(brandAccessCacheKey(adminId, slug));
    return undefined;
  }

  return entry.value;
};

export const setCachedBrandAccess = (
  adminId: string,
  slug: string,
  access: CachedBrandAccess
): void => {
  brandCache.set(brandAccessCacheKey(adminId, slug), {
    adminId,
    slug,
    value: access,
    expiresAt: Date.now() + ACCESS_TTL_MS,
  });
};

//--------------------- Invalidations ---------------------

// ล้าง cache ของ admin 1 คน (หรือทุกคนถ้าไม่ส่ง adminId)
// เรียกเมื่อสถานะ/role บัญชีผู้ดูแลเปลี่ยน
export const invalidateAdminAccess = (adminId?: string): void => {
  if (adminId) {
    adminCache.delete(adminId);
    return;
  }

  adminCache.clear();
};

// ล้าง cache สิทธิ์เข้าร้าน — เลือกได้ว่าจะล้างตาม slug / ตาม admin / ทั้งหมด
// เรียกทันทีหลัง mutation ที่กระทบสิทธิ์ (add/remove member, แก้ role, แก้สถานะร้าน, ลบร้าน)
export const invalidateBrandAccess = (options: {
  slug?: string | null;
  adminId?: string;
} = {}): void => {
  const { slug, adminId } = options;

  if (!slug && !adminId) {
    brandCache.clear();
    return;
  }

  for (const [key, entry] of brandCache) {
    const matchSlug = !slug || entry.slug === slug;
    const matchAdmin = !adminId || entry.adminId === adminId;

    if (matchSlug && matchAdmin) {
      brandCache.delete(key);
    }
  }
};
