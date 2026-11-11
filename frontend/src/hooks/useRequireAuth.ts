import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import type { RootState } from "../store/store";
import { openLogin } from "../store/uiSlice";

/**
 * กันการใช้งานฟีเจอร์ที่ต้อง login — ถ้ายังไม่ login จะเด้ง LoginModal ขึ้นมาทันที
 * และไม่เรียก action ที่ส่งเข้ามา
 *
 * @example
 * const requireAuth = useRequireAuth();
 *
 * // แบบเช็คเอง
 * const handleTryOn = (product: Product) => {
 *   if (!requireAuth()) return;
 *   // ... ทำ action ต่อได้เลย (login อยู่แล้ว)
 * };
 *
 * // หรือแบบครอบ action
 * requireAuth(() => toggleFavorite(productId));
 */
export function useRequireAuth() {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user.user);

  return useCallback(
    (action?: () => void) => {
      if (user === null) {
        dispatch(openLogin());
        return false;
      }

      action?.();
      return true;
    },
    [dispatch, user],
  );
}
