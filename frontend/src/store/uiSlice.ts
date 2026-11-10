import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { BrandMembership } from "../types/user";

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    isLoginOpen: false,
    isBodyOpen: false,
    isEntryChoiceOpen: false,
    entryChoiceBrand: null as BrandMembership | null,
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
    openEntryChoice: (
      state,
      action: PayloadAction<BrandMembership | null>
    ) => {
      state.isEntryChoiceOpen = true;
      state.entryChoiceBrand = action.payload;
    },

    closeEntryChoice: (state) => {
      state.isEntryChoiceOpen = false;
      state.entryChoiceBrand = null;
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
  openEntryChoice,
  closeEntryChoice,
  openSuspended,  
  closeSuspended,  

} = uiSlice.actions;

export default uiSlice.reducer;