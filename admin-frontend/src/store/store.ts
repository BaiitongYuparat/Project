import { configureStore } from '@reduxjs/toolkit'
import adminReducer from "./adminSlice";
import pendingRequestsReducer from "./pendingRequestsSlice";

// store ฝั่งผู้ดูแล — session ของลูกค้าอยู่ใน frontend/ เท่านั้น
// pendingRequests = จำนวนคำขอ PENDING (Appeals / Owner Transfer) ไว้แสดง badge ใน sidebar
export const store = configureStore({
  reducer: {
    admin: adminReducer,
    pendingRequests: pendingRequestsReducer,
  }
})

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
