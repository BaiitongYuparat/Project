
import { createSlice } from "@reduxjs/toolkit";

type UiState = {
  isLoginOpen: boolean;
};

const initialState: UiState = {
  isLoginOpen: false,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    openLogin: (state) => {
      state.isLoginOpen = true;
    },
    closeLogin: (state) => {
      state.isLoginOpen = false;
    },
  },
});

export const { openLogin, closeLogin } = uiSlice.actions;
export default uiSlice.reducer;