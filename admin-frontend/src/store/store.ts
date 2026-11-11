import { configureStore } from '@reduxjs/toolkit'
import adminReducer from "./adminSlice";

// store ฝั่งผู้ดูแล — มีแค่ adminSlice (session ของลูกค้าอยู่ใน frontend/ เท่านั้น)
export const store = configureStore({
  reducer: {
    admin: adminReducer,
  }
})

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
