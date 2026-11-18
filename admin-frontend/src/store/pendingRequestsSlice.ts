import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getAppeals } from "../services/SuperAdmin/appealService";
import { getOwnerTransferRequests } from "../services/SuperAdmin/ownerTransferService";

// จำนวนคำขอ PENDING ของแต่ละคิว — ไว้ให้ SuperAdminSidebar แสดง badge แบบอัปเดตสด
type PendingRequestsState = {
  pendingAppeals: number;
  pendingTransfers: number;
};

const initialState: PendingRequestsState = {
  pendingAppeals: 0,
  pendingTransfers: 0,
};

// ดึงจำนวนคำขอ PENDING ของทั้งสองคิว — เรียกซ้ำได้ทุกเมื่อ (เช่น หลัง superadmin ตัดสินคำขอแล้ว)
// ใช้ allSettled เพื่อให้คิวไหนล้มเหลวไม่บล็อกอีกคิว (คิวล้มเหลวจะคงค่าเดิม)
export const fetchPendingCounts = createAsyncThunk(
  "pendingRequests/fetch",
  async () => {
    const [appealsResult, transfersResult] = await Promise.allSettled([
      getAppeals("PENDING"),
      getOwnerTransferRequests("PENDING"),
    ]);

    return {
      pendingAppeals:
        appealsResult.status === "fulfilled" ? appealsResult.value.length : null,
      pendingTransfers:
        transfersResult.status === "fulfilled"
          ? transfersResult.value.length
          : null,
    };
  }
);

export const pendingRequestsSlice = createSlice({
  name: "pendingRequests",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchPendingCounts.fulfilled, (state, action) => {
      if (action.payload.pendingAppeals !== null) {
        state.pendingAppeals = action.payload.pendingAppeals;
      }
      if (action.payload.pendingTransfers !== null) {
        state.pendingTransfers = action.payload.pendingTransfers;
      }
    });
  },
});

export default pendingRequestsSlice.reducer;
