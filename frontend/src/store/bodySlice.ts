import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { BodyData } from "../services/bodyService";
import { logout } from "./userSlice";

type BodyState = {
  body: BodyData | null;
};

const initialState: BodyState = {
  body: null,
};

const bodySlice = createSlice({
  name: "body",
  initialState,
  reducers: {
    setBody: (state, action: PayloadAction<BodyData | null>) => {
      state.body = action.payload;
    },
    clearBody: (state) => {
      state.body = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logout, () => initialState);
  },
});

export const { setBody, clearBody } = bodySlice.actions;
export default bodySlice.reducer;