import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

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

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>(() =>
    readStoredFavorites(),
  );

  // sync ลง localStorage ทุกครั้งที่รายการเปลี่ยน
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.warn("บันทึกรายการโปรดลง localStorage ไม่สำเร็จ", error);
    }
  }, [favorites]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }, []);

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
