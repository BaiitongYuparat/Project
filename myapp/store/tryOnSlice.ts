import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { logout } from "./userSlice";

export const TRY_ON_ANGLES = [
  { key: "front", label: "หน้า" },
  { key: "left", label: "ซ้าย" },
  { key: "right", label: "ขวา" },
  { key: "back", label: "หลัง" },
] as const;

export type TryOnAngle = (typeof TRY_ON_ANGLES)[number]["key"];

export type AngleImages = Record<TryOnAngle, string | null>;

/** คนที่จะลองใส่ — โมเดลจาก Model Management หรือรูปของผู้ใช้เอง */
export interface TryOnSubject {
  /** "model:<id>" หรือ "me" */
  key: string;
  name: string;
  images: AngleImages;
  /** บรรทัดสรุปรูปร่าง เช่น "พิม · 165 ซม. · Hourglass" */
  info: string;
}

type TryOnState = {
  subject: TryOnSubject | null;
  angle: TryOnAngle;
  garmentIds: string[];
  /** สินค้าที่ส่งมาจากหน้า Home/My Outfit เพื่อเลือกไว้ล่วงหน้า */
  pendingProductId: string | null;
};

const initialState: TryOnState = {
  subject: null,
  angle: "front",
  garmentIds: [],
  pendingProductId: null,
};

const tryOnSlice = createSlice({
  name: "tryOn",
  initialState,
  reducers: {
    setSubject: (state, action: PayloadAction<TryOnSubject | null>) => {
      state.subject = action.payload;
    },
    setAngle: (state, action: PayloadAction<TryOnAngle>) => {
      state.angle = action.payload;
    },
    // มาจากหน้า Home/Product Detail: เลือกสินค้าชิ้นนั้นไว้ให้เลย
    startWithProduct: (state, action: PayloadAction<string>) => {
      state.pendingProductId = action.payload;
      state.garmentIds = [action.payload];
    },
    addGarment: (state, action: PayloadAction<string>) => {
      if (!state.garmentIds.includes(action.payload)) {
        state.garmentIds.push(action.payload);
      }
    },
    removeGarment: (state, action: PayloadAction<string>) => {
      state.garmentIds = state.garmentIds.filter(
        (id) => id !== action.payload,
      );
    },
    setGarments: (state, action: PayloadAction<string[]>) => {
      state.garmentIds = action.payload;
    },
    clearGarments: (state) => {
      state.garmentIds = [];
      state.pendingProductId = null;
    },
  },
  extraReducers: (builder) => {
    // ออกจากระบบแล้วไม่ต้องเก็บคนที่จะลอง/สินค้าที่เลือกไว้
    builder.addCase(logout, () => initialState);
  },
});

export const {
  setSubject,
  setAngle,
  startWithProduct,
  addGarment,
  removeGarment,
  setGarments,
  clearGarments,
} = tryOnSlice.actions;
export default tryOnSlice.reducer;
