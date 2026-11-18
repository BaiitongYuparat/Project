import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { Angle } from "../components/tryon/types";

export type TryOnMode = "model" | "me" | null;

/** สินค้าในลุค — color_id null = สินค้าไม่มีระบบสี */
export interface LookItem {
  product_id: string;
  color_id: string | null;
}

/** สถานะหน้า Try-On ที่คงไว้ตอน refresh / ออกจากหน้า (เก็บต่อบัญชี) */
export interface TryOnSession {
  /** เจ้าของ session — null = ยังไม่ login; ใช้กู้คืนเฉพาะเมื่อตรงกับผู้ใช้ปัจจุบัน */
  userId: string | null;
  mode: TryOnMode;
  subjectKey: string | null;
  angle: Angle;
  selectedIds: string[];
  /** productId → colorId */
  colorSelection: Record<string, string>;
  /** ภาพล่าสุด — เก็บแค่ id (URL ที่เซ็นไว้หมดอายุ ต้องขอใหม่จาก backend ตอนกู้คืน) */
  result: { id: string; signature: string; label: string } | null;
  /** งานที่ยังสร้างไม่เสร็จตอนออกจากหน้า — กลับมาแล้ว poll ต่อ */
  pendingJob: { id: string; signature: string; label: string } | null;
}

/** ลุค/ชุดที่ผู้ใช้บันทึกไว้ */
export interface SavedLook {
  id: string;
  name: string;
  created_at: string;
  mode: Exclude<TryOnMode, null>;
  subjectKey: string;
  subjectName: string;
  angle: Angle;
  items: LookItem[];
  /** id งาน try-on ของภาพลุคนี้ (ใช้ขอ URL ภาพใหม่ทุกครั้งที่เปิด) */
  resultId: string;
}

export interface TryOnState {
  session: TryOnSession | null;
  /** userId → ลุคที่บันทึกไว้ (ใหม่สุดก่อน) */
  looksByUser: Record<string, SavedLook[]>;
}

export const MAX_LOOKS_PER_USER = 30;

const initialState: TryOnState = { session: null, looksByUser: {} };

const tryonSlice = createSlice({
  name: "tryon",
  initialState,
  reducers: {
    saveSession: (state, action: PayloadAction<TryOnSession>) => {
      state.session = action.payload;
    },
    clearSession: (state) => {
      state.session = null;
    },
    addLook: (state, action: PayloadAction<{ userId: string; look: SavedLook }>) => {
      const { userId, look } = action.payload;
      state.looksByUser[userId] = [look, ...(state.looksByUser[userId] ?? [])].slice(0, MAX_LOOKS_PER_USER);
    },
    removeLook: (state, action: PayloadAction<{ userId: string; lookId: string }>) => {
      const { userId, lookId } = action.payload;
      state.looksByUser[userId] = (state.looksByUser[userId] ?? []).filter((l) => l.id !== lookId);
    },
  },
});

export const { saveSession, clearSession, addLook, removeLook } = tryonSlice.actions;
export default tryonSlice.reducer;
