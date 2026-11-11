import { createSlice } from "@reduxjs/toolkit";

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    isLoginOpen: false,
    isBodyOpen: false,
    isSuspendedOpen: false,
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
    openSuspended: (state) => {
      state.isSuspendedOpen = true;
    },
    closeSuspended: (state) => {
      state.isSuspendedOpen = false;
    },
  },
});

export const {
  openLogin,
  closeLogin,
  openBody,
  closeBody,
  openSuspended,
  closeSuspended,
} = uiSlice.actions;

export default uiSlice.reducer;
