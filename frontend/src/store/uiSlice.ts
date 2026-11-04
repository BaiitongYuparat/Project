import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { BrandMembership } from "../types/auth";

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    isLoginOpen: false,
    isBodyOpen: false,
    isEntryChoiceOpen: false,
    entryChoiceBrand: null as BrandMembership | null,
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
      action: PayloadAction<BrandMembership>
    ) => {
      state.isEntryChoiceOpen = true;
      state.entryChoiceBrand = action.payload;
    },

    closeEntryChoice: (state) => {
      state.isEntryChoiceOpen = false;
      state.entryChoiceBrand = null;
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
} = uiSlice.actions;

export default uiSlice.reducer;