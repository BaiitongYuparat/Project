import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getBrandById, updateBrandStatus } from "../../../services/brandService";
import type { BrandDetail, BrandStatus } from "../../../services/brandService";
import Button from "../../../components/Button";


const linkClass = "text-blue-700 hover:underline";

// แสดงข้อมูลแถวของร้านค้า
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 px-5 py-4 text-center sm:grid-cols-3 sm:items-center sm:gap-4">
      <dt className="text-stone-500">{label}</dt>
      <dd className="break-all text-stone-900 sm:col-span-2">
        {children || <span className="text-stone-400">-</span>}
      </dd>
    </div>
  );
}

// แสดงส่วนของร้านค้า
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-center text-sm font-semibold tracking-wide text-stone-500">
        {title}
      </h2>
      <dl className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        {children}
      </dl>
    </section>
  );
}

export default function StoreDetail() {
  const { id } = useParams<{ id: string; brandId: string }>();
  const [brand, setBrand] = useState<BrandDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // ดึงข้อมูลร้านค้าเมื่อ component ถูก mount หรือ id เปลี่ยน
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setBrand(await getBrandById(id));
      } catch (err) {
        console.error(err);
        setError("ไม่สามารถโหลดข้อมูลร้านค้าได้");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // จัดการการเปลี่ยนแปลงสถานะของร้านค้า
  const handleStatusChange = async (status: BrandStatus) => {
    if (!id || !brand) return;

    const confirmText =
      status === "APPROVED"
        ? `ยืนยันการอนุมัติร้าน "${brand.brand_name}" ?`
        : `ยืนยันการปฏิเสธร้าน "${brand.brand_name}" ?`;
    if (!window.confirm(confirmText)) return;

    try {
      setUpdating(true);
      setError(null);
      const updated = await updateBrandStatus(id, status);
      setBrand((prev) => (prev ? { ...prev, status: updated.status } : prev));
    } catch (err) {
      console.error(err);
      setError("ไม่สามารถอัปเดตสถานะได้");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-6 md:p-8">
      <Link
        to={`/superadmin/store-management`}
        className="text-sm text-blue-700 hover:underline"
      >
        ← กลับไปรายชื่อร้านค้า
      </Link>

      {loading && <p className="mt-6 text-stone-400">กำลังโหลด...</p>}
      {error && <p className="mt-6 text-red-600">{error}</p>}

      {brand && (
        <>
          <div className="mt-6 space-y-6">
            <Section title="ข้อมูลร้านค้า">
              <InfoRow label="ชื่อร้านค้า">{brand.brand_name}</InfoRow>
              <InfoRow label="เจ้าของ">{brand.owner_name}</InfoRow>
              <InfoRow label="อีเมล">
                {brand.email && (
                  <a href={`mailto:${brand.email}`} className={linkClass}>
                    {brand.email}
                  </a>
                )}
              </InfoRow>
              <InfoRow label="เบอร์โทรศัพท์">
                {brand.phone_number && (
                  <a href={`tel:${brand.phone_number}`} className={linkClass}>
                    {brand.phone_number}
                  </a>
                )}
              </InfoRow>
              <InfoRow label="เว็บไซต์ร้าน">
                {brand.store_url && (
                  <a href={brand.store_url} target="_blank" rel="noreferrer" className={linkClass}>
                    {brand.store_url}
                  </a>
                )}
              </InfoRow>
            </Section>

            <Section title="เอกสารและการสมัคร">
              <InfoRow label="เลขทะเบียนพาณิชย์">{brand.ebiz_reg_no}</InfoRow>
              <InfoRow label="ไฟล์ทะเบียนพาณิชย์">
                {brand.ebiz_file_url && (
                  <a href={brand.ebiz_file_url} target="_blank" rel="noreferrer" className={linkClass}>
                    เปิดไฟล์
                  </a>
                )}
              </InfoRow>
              <InfoRow label="วันที่สมัคร">
                {new Date(brand.created_at).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </InfoRow>
            </Section>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {brand.status !== "REJECTED" && (
              <Button
                variant="danger"
                onClick={() => handleStatusChange("REJECTED")}
                disabled={updating}
              >
                {brand.status === "APPROVED" ? "ระงับ" : "ปฏิเสธ"}
              </Button>
            )}
            {brand.status !== "APPROVED" && (
              <Button
                variant="secondary"
                onClick={() => handleStatusChange("APPROVED")}
                disabled={updating}
              >
                {updating ? "กำลังบันทึก..." : "อนุมัติ"}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}