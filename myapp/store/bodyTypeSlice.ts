import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { logout } from "./userSlice";

export interface BodyTypeData {
  id: string;
  user_id: string;
  body_type: string;
  description: string | null;
  analyzed_at: string;
}

type BodyTypeState = {
  bodyType: BodyTypeData | null;
};

const initialState: BodyTypeState = {
  bodyType: null,
};

const bodyTypeSlice = createSlice({
  name: "bodyType",
  initialState,
  reducers: {
    setBodyType: (state, action: PayloadAction<BodyTypeData | null>) => {
      state.bodyType = action.payload;
    },
    clearBodyType: (state) => {
      state.bodyType = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logout, () => initialState);
  },
});

export const { setBodyType, clearBodyType } = bodyTypeSlice.actions;
export default bodyTypeSlice.reducer;