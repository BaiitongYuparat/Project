import api from "../api";
import type {
  OwnerTransferStatus,
  OwnerTransferRequestsResponse,
  DecideOwnerTransferResponse,
  OwnerTransferRequest,
} from "../../types/brand";

const baseUrl = "/admin/owner-transfer-requests";

// รายการคำขอเปลี่ยน OWNER ทั้งหมด (กรองตามสถานะได้)
export async function getOwnerTransferRequests(
  status?: OwnerTransferStatus | "ALL"
): Promise<OwnerTransferRequestsResponse["requests"]> {
  const query = status && status !== "ALL" ? `?status=${status}` : "";
  const response = await api.get<OwnerTransferRequestsResponse>(
    `${baseUrl}${query}`
  );
  return response.data.requests;
}

// ตัดสินคำขอ — APPROVED จะเปลี่ยนอีเมลใหม่เป็น OWNER และ owner เดิมเป็น ADMIN อัตโนมัติ
export async function decideOwnerTransferRequest(
  id: string,
  decision: "APPROVED" | "REJECTED"
): Promise<OwnerTransferRequest> {
  const response = await api.post<DecideOwnerTransferResponse>(
    `${baseUrl}/${encodeURIComponent(id)}/decision`,
    { decision }
  );
  return response.data.request;
}
