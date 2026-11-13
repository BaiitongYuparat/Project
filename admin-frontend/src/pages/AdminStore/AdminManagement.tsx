
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import {
  getBrandMembers,
  addBrandMember,
  removeBrandMember,
  getOwnerTransferStatus,
  requestOwnerTransfer,
} from "../../services/ShopAdmin/brandService";
import type {
  BrandMember,
  BrandMemberRole,
  OwnerTransferRequest,
} from "../../types/brand";

import Button from "../../components/Button";
import AddMemberForm from "../../components/shopadmin/admin/AddMemberForm";
import MemberTable from "../../components/shopadmin/admin/MemberTable";
import ConfirmRemoveModal from "../../components/shopadmin/admin/ConfirmRemoveModal";
import OwnerTransferModal from "../../components/shopadmin/admin/OwnerTransferModal";

type Toast = {
  type: "success" | "error";
  message: string;
};

// axios error ที่มี shape จาก response
type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

const getApiErrorMessage = (err: unknown, fallback: string) => {
  const apiError = err as ApiError;
  return apiError?.response?.data?.message || fallback;
};

const CURRENT_ROLE_META: Record<BrandMemberRole, { label: string; className: string }> = {
  OWNER: { label: "คุณ: เจ้าของร้าน", className: "bg-[#E9DFC9] text-[#332F29] ring-[#D9CDB9]" },
  ADMIN: { label: "คุณ: แอดมิน", className: "bg-blue-50 text-blue-700 ring-blue-200" },
};

function CurrentRoleBadge({ role }: { role: BrandMemberRole }) {
  const meta = CURRENT_ROLE_META[role] ?? CURRENT_ROLE_META.ADMIN;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

export default function ShopAdminManagement() {
  const { slug } = useParams<{ slug: string }>();

  const [members, setMembers] = useState<BrandMember[]>([]);
  const [currentRole, setCurrentRole] = useState<BrandMemberRole>("ADMIN");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // toggle แสดงฟอร์มเพิ่มสมาชิก
  const [showAddForm, setShowAddForm] = useState(false);

  const [confirmMember, setConfirmMember] = useState<BrandMember | null>(null);
  const [removing, setRemoving] = useState(false);

  // คำขอเปลี่ยน OWNER (ยื่นได้เฉพาะ OWNER ปัจจุบัน — รอ Super Admin อนุมัติ)
  const [ownerTransferRequest, setOwnerTransferRequest] =
    useState<OwnerTransferRequest | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimerRef = useRef<number | undefined>(undefined);

  const showToast = useCallback((next: Toast) => {
    setToast(next);

    // auto-dismiss ใน 4 วินาที
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    return () => window.clearTimeout(toastTimerRef.current);
  }, []);

  const fetchMembers = useCallback(async () => {
    if (!slug) return;

    try {
      setLoading(true);
      setError("");

      const membersResponse = await getBrandMembers(slug);
      setMembers(membersResponse.members);
      setCurrentRole(membersResponse.currentRole);

      // โหลดสถานะคำขอเปลี่ยน OWNER ล่าสุด (ไว้แสดง "รออนุมัติ" / ปิดปุ่มยื่นซ้ำ)
      try {
        const transferResponse = await getOwnerTransferStatus(slug);
        setOwnerTransferRequest(transferResponse.request);
      } catch (transferErr) {
        // โหลดสถานะคำขอไม่ได้ไม่ควรบล็อกการใช้หน้า — แค่ซ่อนสถานะไว้
        setOwnerTransferRequest(null);
        console.error("Failed to load owner transfer status:", transferErr);
      }
    } catch (err) {
      setMembers([]);
      setError(getApiErrorMessage(err, "ไม่สามารถโหลดรายชื่อสมาชิกได้"));
      console.error("Failed to load members:", err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  // เริ่มโหลดรายการสมาชิกเมื่อเข้าหน้า / เปลี่ยน slug
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAddMember = async (email: string) => {
    if (!slug) return;

    try {
      await addBrandMember(slug, email);
      showToast({ type: "success", message: `${email} ถูกเพิ่มเป็น ADMIN แล้ว` });
      setShowAddForm(false);
    } finally {
      // ถ้าเพิ่มไม่สำเร็จ error จะไปโชว์ใน AddMemberForm แต่ยัง refetch รายการให้ใหม่
      await fetchMembers();
    }
  };

  const handleRemoveClick = (member: BrandMember) => {
    setConfirmMember(member);
  };

  const handleConfirmRemove = async () => {
    if (!slug || !confirmMember) return;

    try {
      setRemoving(true);
      await removeBrandMember(slug, confirmMember.id);
      showToast({
        type: "success",
        message: `${
          confirmMember.name || confirmMember.email
        } ถูกลบออกจากร้านแล้ว`,
      });
      setConfirmMember(null);
      await fetchMembers();
    } catch (err) {
      showToast({
        type: "error",
        message: getApiErrorMessage(err, "ลบสมาชิกไม่สำเร็จ"),
      });
      setConfirmMember(null);
    } finally {
      setRemoving(false);
    }
  };

  const handleSubmitOwnerTransfer = async (email: string) => {
    if (!slug) return;

    const res = await requestOwnerTransfer(slug, email);
    showToast({
      type: "success",
      message: res.message || "ส่งคำขอเปลี่ยน OWNER แล้ว รอ Super Admin อนุมัติ",
    });
    setOwnerTransferRequest(res.request);
    setShowTransferModal(false);
    await fetchMembers();
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#332F29]">
            จัดการผู้ดูแลร้าน
          </h1>

          <p className="text-sm text-[#8B806E] mt-1">
            จัดการผู้ใช้ที่สามารถเข้าถึงร้านของคุณได้
          </p>

          {/* บทบาทของผู้ใช้ปัจจุบัน + ปุ่มจัดการ (เพิ่มสมาชิก / ขอเปลี่ยน OWNER) */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <CurrentRoleBadge role={currentRole} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {currentRole === "OWNER" &&
                (!ownerTransferRequest ||
                  ownerTransferRequest.status !== "PENDING") && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTransferModal(true)}
                  >
                    ขอเปลี่ยน OWNER
                  </Button>
                )}

              <Button
                type="button"
                variant={showAddForm ? "outline" : "primary"}
                size="sm"
                onClick={() => setShowAddForm((prev) => !prev)}
              >
                {showAddForm ? "ยกเลิก" : "+ เพิ่มสมาชิก"}
              </Button>
            </div>
          </div>

          {/* แถบสถานะคำขอเปลี่ยน OWNER ที่กำลังรอ Super Admin อนุมัติ */}
          {currentRole === "OWNER" &&
            ownerTransferRequest?.status === "PENDING" && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                มีคำขอเปลี่ยน OWNER ไปยัง{" "}
                <span className="font-medium">
                  {ownerTransferRequest.new_owner_email}
                </span>{" "}
                ที่กำลังรอ Super Admin อนุมัติ
              </div>
            )}
        </div>

        {/* Add Member: กดปุ่มเพื่อเปิดฟอร์มเพิ่มสมาชิก (OWNER / ADMIN) */}
        {showAddForm && (
          <AddMemberForm onAdd={handleAddMember} />
        )}

        {/* Member Table */}
        {loading ? (
          <div className="bg-white rounded-xl p-10 text-center text-[#8B806E]">
            กำลังโหลดรายชื่อสมาชิก...
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>

            <button
              onClick={fetchMembers}
              className="text-blue-700 font-medium hover:underline"
            >
              ลองอีกครั้ง
            </button>
          </div>
        ) : (
          <MemberTable
            members={members}
            onRemove={handleRemoveClick}
          />
        )}

      </div>

      {/* Owner transfer modal — ยื่นคำขอเปลี่ยน OWNER (เฉพาะ OWNER ปัจจุบัน) */}
      {showTransferModal && (
        <OwnerTransferModal
          currentOwnerEmail={
            members.find(
              (m) => m.role === "OWNER" && m.email
            )?.email ?? ""
          }
          onSubmit={handleSubmitOwnerTransfer}
          onCancel={() => setShowTransferModal(false)}
        />
      )}

      {/* Confirm remove modal */}
      <ConfirmRemoveModal
        member={confirmMember}
        loading={removing}
        onCancel={() => setConfirmMember(null)}
        onConfirm={handleConfirmRemove}
      />

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-6 right-6 z-50 max-w-sm rounded-xl px-4 py-3 shadow-lg text-sm ${
            toast.type === "success"
              ? "bg-green-700 text-white"
              : "bg-red-700 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}