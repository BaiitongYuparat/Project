import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { IonIcon } from "@ionic/react";
import {
  imageOutline,
  refreshOutline,
  storefrontOutline,
} from "ionicons/icons";

import {
  getBrandSettings,
  updateBrandSettings,
} from "../../services/ShopAdmin/brandService";
import type { BrandSettings } from "../../types/brand";

import Button from "../../components/Button";

type Toast = {
  type: "success" | "error";
  message: string;
};

// axios error ที่มี shape จาก response
type ApiError = {
  response?: {
    data?: {
      message?: string;
      field?: string;
    };
  };
};

const getApiErrorMessage = (err: unknown, fallback: string) => {
  const apiError = err as ApiError;
  return apiError?.response?.data?.message || fallback;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ไม่ผ่าน",
};

const inputClass =
  "w-full rounded-lg border border-[#E9DFC9] bg-white px-3 py-2.5 text-sm text-[#332F29] outline-none transition-colors placeholder:text-[#C4BBA9] focus:border-[#87947A] focus:ring-2 focus:ring-[#87947A]/25";

const readOnlyInputClass =
  "w-full rounded-lg border border-[#E9DFC9] bg-[#FCFAF6] px-3 py-2.5 text-sm text-[#786E5D] outline-none";

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#A99A87]";

// ตัวอักษรแรกของชื่อร้าน สำหรับ initial avatar กรณีไม่มีโลโก้
const getBrandInitial = (name: string) => {
  const first = Array.from(name.trim())[0];
  return first ? first.toUpperCase() : "";
};

// วงโลโก้ร้าน — ถ้าไม่มีรูปใช้ initial avatar เป็นค่า standard
function BrandLogo({
  name,
  logoUrl,
  className = "h-24 w-24 text-4xl",
}: {
  name: string;
  logoUrl: string | null;
  className?: string;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`โลโก้ร้าน${name}`}
        className={`rounded-2xl object-cover ring-1 ring-[#D9CDB9] ${className}`}
      />
    );
  }

  const initial = getBrandInitial(name);

  return (
    <span
      className={`flex items-center justify-center rounded-2xl bg-primary text-secondary ${className}`}
    >
      {initial || <IonIcon icon={storefrontOutline} />}
    </span>
  );
}

export default function StoreSettings() {
  const { slug } = useParams<{ slug: string }>();

  const [brand, setBrand] = useState<BrandSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ฟอร์ม — เก็บเป็น string (ค่าว่าง = เคลียร์ค่า)
  const [form, setForm] = useState({
    brand_name: "",
    phone_number: "",
    address: "",
    description: "",
    facebook_url: "",
    instagram_url: "",
    line_id: "",
  });

  // โลโก้ — ไฟล์ใหม่ที่เลือก + preview
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;

    // setState ทั้งหมดอยู่ใน async callback (.then/.catch) ตาม react-hooks/set-state-in-effect
    getBrandSettings(slug)
      .then((data) => {
        if (cancelled) return;

        setBrand(data);
        setForm({
          brand_name: data.brand_name ?? "",
          phone_number: data.phone_number ?? "",
          address: data.address ?? "",
          description: data.description ?? "",
          facebook_url: data.facebook_url ?? "",
          instagram_url: data.instagram_url ?? "",
          line_id: data.line_id ?? "",
        });
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;

        console.error("Failed to load brand settings:", err);
        setLoadError(getApiErrorMessage(err, "ไม่สามารถโหลดข้อมูลร้านได้"));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const setField = (field: keyof typeof form, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSelectLogo = (file: File | null) => {
    // เคลียร์ preview เดิมก่อนเสมอ กัน object URL ค้าง
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
      setLogoPreview(null);
    }

    if (!file) return;

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleRemoveSelectedLogo = () => {
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoFile(null);
    setLogoPreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!slug || !brand) return;

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("brand_name", form.brand_name);
      formData.append("phone_number", form.phone_number);
      formData.append("address", form.address);
      formData.append("description", form.description);
      formData.append("facebook_url", form.facebook_url);
      formData.append("instagram_url", form.instagram_url);
      formData.append("line_id", form.line_id);

      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const response = await updateBrandSettings(slug, formData);

      setBrand(response.brand);
      handleRemoveSelectedLogo();
      showToast({ type: "success", message: "บันทึกข้อมูลร้านเรียบร้อยแล้ว" });
    } catch (err) {
      showToast({
        type: "error",
        message: getApiErrorMessage(err, "บันทึกข้อมูลร้านไม่สำเร็จ"),
      });
      console.error("Failed to save store settings:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl justify-center px-6 py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D9CDB9] border-t-[#6B7A5E]" />
      </div>
    );
  }

  if (loadError || !brand) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {loadError || "ไม่พบข้อมูลร้าน"}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#332F29]">Store Settings</h1>
        <p className="mt-1 text-sm text-[#8B806E]">
          จัดการข้อมูลร้านของคุณ — ชื่อร้าน, โลโก้, รายละเอียด และช่องทางติดต่อ
        </p>
      </div>

      {/* Logo */}
      <section className="mb-6 rounded-2xl border border-[#E9DFC9] bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-[#332F29]">
          โลโก้ร้าน
        </h2>

        <div className="flex flex-wrap items-center gap-5">
          <BrandLogo
            name={form.brand_name || brand.brand_name}
            logoUrl={logoPreview ?? brand.logo_url}
            className="h-24 w-24 text-4xl"
          />

          <div>
            <p className="text-xs text-[#8B806E]">
              แนะนำรูปสี่เหลี่ยมจัตุรัส อย่างน้อย 400×400 px (JPG, PNG, WEBP —
              ไม่เกิน 5MB)
            </p>

            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => fileInputRef.current?.click()}
              >
                <IonIcon
                  icon={logoPreview ? refreshOutline : imageOutline}
                  className="mr-1.5 text-base"
                />
                {logoPreview ? "เปลี่ยนรูป" : "เลือกรูปโลโก้"}
              </Button>

              {logoPreview && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={handleRemoveSelectedLogo}
                >
                  ยกเลิกรูปที่เลือก
                </Button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                handleSelectLogo(file);
              }}
            />
          </div>
        </div>
      </section>

      {/* ข้อมูลร้าน */}
      <section className="mb-6 rounded-2xl border border-[#E9DFC9] bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-[#332F29]">ข้อมูลร้าน</h2>

        <div className="grid gap-4">
          <div>
            <label htmlFor="brand_name" className={labelClass}>
              ชื่อร้าน
            </label>
            <input
              id="brand_name"
              type="text"
              value={form.brand_name}
              onChange={(event) => setField("brand_name", event.target.value)}
              placeholder="ชื่อร้านค้า"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="phone_number" className={labelClass}>
              เบอร์โทรศัพท์
            </label>
            <input
              id="phone_number"
              type="tel"
              value={form.phone_number}
              onChange={(event) => setField("phone_number", event.target.value)}
              placeholder="เช่น 0812345678"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="address" className={labelClass}>
              ที่อยู่
            </label>
            <input
              id="address"
              type="text"
              value={form.address}
              onChange={(event) => setField("address", event.target.value)}
              placeholder="ที่อยู่ร้านค้า"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="description" className={labelClass}>
              รายละเอียดร้าน
            </label>
            <textarea
              id="description"
              rows={4}
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
              placeholder="เล่าเกี่ยวกับร้านของคุณ เช่น ประเภทสินค้า จุดเด่น ฯลฯ"
              className={`${inputClass} resize-y`}
            />
          </div>
        </div>
      </section>

      {/* Social links */}
      <section className="mb-6 rounded-2xl border border-[#E9DFC9] bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-[#332F29]">
          ช่องทางติดตาม
        </h2>

        <div className="grid gap-4">
          <div>
            <label htmlFor="facebook_url" className={labelClass}>
              Facebook
            </label>
            <input
              id="facebook_url"
              type="url"
              value={form.facebook_url}
              onChange={(event) => setField("facebook_url", event.target.value)}
              placeholder="https://facebook.com/yourshop"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="instagram_url" className={labelClass}>
              Instagram
            </label>
            <input
              id="instagram_url"
              type="url"
              value={form.instagram_url}
              onChange={(event) => setField("instagram_url", event.target.value)}
              placeholder="https://instagram.com/yourshop"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="line_id" className={labelClass}>
              Line ID
            </label>
            <input
              id="line_id"
              type="text"
              value={form.line_id}
              onChange={(event) => setField("line_id", event.target.value)}
              placeholder="@yourshop"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* ข้อมูลระบบ (แก้ไม่ได้) */}
      <section className="mb-6 rounded-2xl border border-[#E9DFC9] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#332F29]">
            ข้อมูลระบบ (แก้ไขไม่ได้)
          </h2>
          <span className="rounded-full bg-[#F0F4EC] px-3 py-1 text-xs font-medium text-[#6B7A5E]">
            {STATUS_LABEL[brand.status] ?? brand.status}
          </span>
        </div>

        <div className="grid gap-4">
          <div>
            <label className={labelClass}>URL ร้าน (slug)</label>
            <input type="text" value={brand.slug} disabled className={readOnlyInputClass} />
            <p className="mt-1 text-xs text-[#A99A87]">
              URL ร้านใช้ในการเข้าหน้าจัดการร้าน จึงล็อกไว้ไม่ให้แก้ไข
            </p>
          </div>

          <div>
            <label className={labelClass}>เว็บไซต์ของร้าน</label>
            <input type="text" value={brand.store_url ?? "-"} disabled className={readOnlyInputClass} />
          </div>

          <div>
            <label className={labelClass}>อีเมลผู้ดูแลร้าน</label>
            <input type="text" value={brand.email ?? "-"} disabled className={readOnlyInputClass} />
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="primary"
          size="md"
          disabled={saving || !form.brand_name.trim()}
          onClick={handleSave}
        >
          {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
        </Button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "bg-[#6B7A5E] text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
