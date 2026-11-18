import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useSelector } from "react-redux";

import type { RootState } from "../store/store";
import {
  addFavorite,
  getFavoriteIds,
  removeFavorite,
} from "../services/favoriteService";

// รายการโปรดเก็บฝั่ง backend (ใช้ร่วมกับแอป) — localStorage เก็บเฉพาะตอนยังไม่ login
// เพื่อไม่ให้รายการของ guest หาย และ merge เข้าบัญชีครั้งแรกที่ login
const STORAGE_KEY = "vto:favorites";

interface FavoritesContextValue {
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function readStoredFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is string => typeof item === "string");
  } catch (error) {
    console.warn("อ่านรายการโปรดจาก localStorage ไม่สำเร็จ", error);
    return [];
  }
}

function clearStoredFavorites() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("ล้างรายการโปรดใน localStorage ไม่สำเร็จ", error);
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const user = useSelector((state: RootState) => state.user.user);

  // รายการของ guest (ยังไม่ login)
  const [guestFavorites, setGuestFavorites] = useState<string[]>(() =>
    readStoredFavorites(),
  );

  // รายการจาก backend — ผูกกับ user id เพื่อไม่ให้ข้อมูลบัญชีเก่าค้างหลังสลับบัญชี
  const [serverFavorites, setServerFavorites] = useState<{
    userId: string;
    ids: string[];
  } | null>(null);

  const serverIds =
    user && serverFavorites?.userId === user.id ? serverFavorites.ids : null;

  // โหลดรายการโปรดจาก backend เมื่อ login (merge รายการของ guest ก่อน)
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const load = async () => {
      const guest = readStoredFavorites();

      if (guest.length > 0) {
        // merge แบบไม่ให้ทั้ง flow ล้มถ้ารายการใดใช้ไม่ได้ (เช่นสินค้าถูกปิดขาย)
        await Promise.all(
          guest.map((id) => addFavorite(id).catch(() => undefined)),
        );
        clearStoredFavorites();
      }

      try {
        const ids = await getFavoriteIds();
        if (!cancelled) setServerFavorites({ userId: user.id, ids });
      } catch (error) {
        console.error("โหลดรายการโปรดไม่สำเร็จ", error);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // guest: เก็บลง localStorage ตามเดิม
  useEffect(() => {
    if (user) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(guestFavorites));
    } catch (error) {
      console.warn("บันทึกรายการโปรดลง localStorage ไม่สำเร็จ", error);
    }
  }, [guestFavorites, user]);

  const favorites = useMemo(
    () => (user ? (serverIds ?? []) : guestFavorites),
    [user, serverIds, guestFavorites],
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      const wasFavorite = favorites.includes(id);
      const next = wasFavorite
        ? favorites.filter((item) => item !== id)
        : [...favorites, id];

      if (!user) {
        setGuestFavorites(next);
        return;
      }

      // optimistic update — UI ตอบสนองทันที
      setServerFavorites({ userId: user.id, ids: next });

      const request = wasFavorite ? removeFavorite(id) : addFavorite(id);

      request.catch((error) => {
        console.error("อัปเดตรายการโปรดไม่สำเร็จ", error);

        // ย้อนสถานะกลับถ้า API ไม่สำเร็จ
        setServerFavorites({ userId: user.id, ids: favorites });
      });
    },
    [favorites, user],
  );

  const isFavorite = useCallback(
    (id: string) => favorites.includes(id),
    [favorites],
  );

  const value = useMemo(
    () => ({ favorites, toggleFavorite, isFavorite }),
    [favorites, toggleFavorite, isFavorite],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

/* eslint-disable react-refresh/only-export-components -- hook และ Provider อยู่ไฟล์เดียวกันตาม convention ของ context */
export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);

  if (!context) {
    throw new Error("useFavorites ต้องถูกเรียกภายใต้ FavoritesProvider เท่านั้น");
  }

  return context;
}
