import { createContext } from "react";

// แยก context object ออกจาก FavoritesContext.tsx เพื่อให้ไฟล์ .tsx export แต่ component (Vite Fast Refresh)
export interface FavoritesContextValue {
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

export const FavoritesContext = createContext<FavoritesContextValue | null>(null);
