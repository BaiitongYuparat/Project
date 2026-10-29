import { createSlice } from "@reduxjs/toolkit";

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    isLoginOpen: false,
    isBodyOpen: false,
  },
  reducers: {
    openLogin: (state) => {
      state.isLoginOpen = true;
    },
    closeLogin: (state) => {
      state.isLoginOpen = false;
    },
    openBody: (state) => {
      state.isBodyOpen = true;
    },
    closeBody: (state) => {
      state.isBodyOpen = false;
    },
  },
});

export const {
  openLogin,
  closeLogin,
  openBody,
  closeBody,
} = uiSlice.actions;

export default uiSlice.reducer;