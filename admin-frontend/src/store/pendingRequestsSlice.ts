import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getAppeals } from "../services/SuperAdmin/appealService";
import { getOwnerTransferRequests } from "../services/SuperAdmin/ownerTransferService";
import { getAiReports } from "../services/SuperAdmin/aiReportService";

// จำนวนคำขอ PENDING ของแต่ละคิว — ไว้ให้ SuperAdminSidebar แสดง badge แบบอัปเดตสด
type PendingRequestsState = {
  pendingAppeals: number;
  pendingTransfers: number;
  pendingReports: number;
};

const initialState: PendingRequestsState = {
  pendingAppeals: 0,
  pendingTransfers: 0,
  pendingReports: 0,
};

// ดึงจำนวนคำขอ PENDING ของทุกคิว — เรียกซ้ำได้ทุกเมื่อ (เช่น หลัง superadmin ตัดสินคำขอแล้ว)
// ใช้ allSettled เพื่อให้คิวไหนล้มเหลวไม่บล็อกคิวอื่น (คิวล้มเหลวจะคงค่าเดิม)
export const fetchPendingCounts = createAsyncThunk(
  "pendingRequests/fetch",
  async () => {
    const [appealsResult, transfersResult, reportsResult] = await Promise.allSettled([
      getAppeals("PENDING"),
      getOwnerTransferRequests("PENDING"),
      getAiReports("PENDING"),
    ]);

    return {
      pendingAppeals:
        appealsResult.status === "fulfilled" ? appealsResult.value.length : null,
      pendingTransfers:
        transfersResult.status === "fulfilled"
          ? transfersResult.value.length
          : null,
      pendingReports:
        reportsResult.status === "fulfilled" ? reportsResult.value.length : null,
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
      if (action.payload.pendingReports !== null) {
        state.pendingReports = action.payload.pendingReports;
      }
    });
  },
});

export default pendingRequestsSlice.reducer;
