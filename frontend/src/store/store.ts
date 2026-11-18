import { configureStore } from '@reduxjs/toolkit'
import bodyReducer from "./bodySlice";
import userReducer from "./userSlice";
import uiReducer from './uiSlice'
import bodyTypeReducer from './bodyTypeSlice';
import tryonReducer, { type TryOnState } from './tryonSlice';

// เก็บ tryon slice ลง localStorage เพื่อคงสถานะหลัง refresh / ลุคที่บันทึกไว้
const TRYON_STORAGE_KEY = 'vto:tryon:v1';

const loadTryOn = (): TryOnState | undefined => {
  try {
    const parsed = JSON.parse(localStorage.getItem(TRYON_STORAGE_KEY) ?? 'null');
    if (parsed && typeof parsed === 'object' && parsed.looksByUser && typeof parsed.looksByUser === 'object') {
      return { session: parsed.session ?? null, looksByUser: parsed.looksByUser };
    }
  } catch {
    // อ่านไม่ได้/ข้อมูลเสีย → เริ่มใหม่
  }
  return undefined;
};


// store ฝั่งลูกค้า — session ผู้ดูแลอยู่ใน admin-frontend/ (adminSlice)
export const store = configureStore({
  reducer: {
    user:userReducer,
    body: bodyReducer,
    ui:uiReducer,
    bodyType: bodyTypeReducer,
    tryon: tryonReducer,
  },
  preloadedState: { tryon: loadTryOn() },
})

let lastTryOn = store.getState().tryon;
store.subscribe(() => {
  const current = store.getState().tryon;
  if (current === lastTryOn) return;
  lastTryOn = current;
  try {
    localStorage.setItem(TRYON_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // โควต้าเต็ม/โหมดส่วนตัว → ข้าม
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
