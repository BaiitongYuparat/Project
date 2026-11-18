import { useContext } from "react";

import { FavoritesContext } from "./favoritesStore";
import type { FavoritesContextValue } from "./favoritesStore";

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);

  if (!context) {
    throw new Error("useFavorites ต้องถูกเรียกภายใต้ FavoritesProvider เท่านั้น");
  }

  return context;
}
