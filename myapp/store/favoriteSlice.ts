import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { logout } from "./userSlice";

type FavoriteState = {
  ids: string[];
  /** โหลดรายการจาก backend เสร็จแล้วหรือยัง (ใช้โชว์สถานะหัวใจให้ถูกต้อง) */
  ready: boolean;
};

const initialState: FavoriteState = {
  ids: [],
  ready: false,
};

const favoriteSlice = createSlice({
  name: "favorite",
  initialState,
  reducers: {
    setFavorites: (state, action: PayloadAction<string[]>) => {
      state.ids = action.payload;
      state.ready = true;
    },
    addFavoriteLocal: (state, action: PayloadAction<string>) => {
      if (!state.ids.includes(action.payload)) state.ids.unshift(action.payload);
    },
    removeFavoriteLocal: (state, action: PayloadAction<string>) => {
      state.ids = state.ids.filter((id) => id !== action.payload);
    },
    resetFavorites: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(logout, () => initialState);
  },
});

export const {
  setFavorites,
  addFavoriteLocal,
  removeFavoriteLocal,
  resetFavorites,
} = favoriteSlice.actions;
export default favoriteSlice.reducer;
