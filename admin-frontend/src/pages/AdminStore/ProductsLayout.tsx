import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";

import { hasPendingDraft } from "../../pages/AdminStore/useProductForm";

// Tab bar ระดับหน้า Products: สลับ "ดูข้อมูล (list)" ↔ "เพิ่ม/แก้สินค้า (wizard)"
// ผูกกับ route — /products = ดูข้อมูล, /products/new และ /products/:id/edit = ฟอร์ม
export default function ProductsLayout() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const basePath = `/shopadmin/${slug}/products`;

  const onForm =
    location.pathname.startsWith(`${basePath}/new`) ||
    Boolean(
      location.pathname.match(new RegExp(`^${basePath}/[^/]+/edit$`)),
    );

  const editing =
    Boolean(
      location.pathname.match(new RegExp(`^${basePath}/[^/]+/edit$`)),
    );

  // มี draft ค้างอยู่ไหม (ฟอร์มกรอกค้างที่ยังไม่บันทึก)
  const hasDraft = slug ? hasPendingDraft(slug) : false;

  return (
    <div className="min-h-screen bg-[#FAF7F0] p-4 sm:p-6 lg:p-8">
      {/* Tab bar */}
      <div className="mb-6 flex w-full max-w-md overflow-x-auto rounded-xl border border-[#E9DFC9] bg-white p-1 sm:mb-8">
        <button
          type="button"
          aria-pressed={!onForm}
          onClick={() => navigate(basePath)}
          className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm transition-colors ${
            !onForm
              ? "bg-[#87947A] font-medium text-white"
              : "text-[#786E5D] hover:text-[#332F29]"
          }`}
        >
          ดูข้อมูล
        </button>

        <button
          type="button"
          aria-pressed={onForm}
          onClick={() => navigate(`${basePath}/new`)}
          className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm transition-colors ${
            onForm
              ? "bg-[#87947A] font-medium text-white"
              : "text-[#786E5D] hover:text-[#332F29]"
          }`}
        >
          {editing ? "แก้ไขสินค้า" : "เพิ่มสินค้า"}

          {hasDraft && (
            <span
              className="ml-2 inline-block h-2 w-2 rounded-full bg-amber-400"
              title="มีข้อมูลฟอร์มค้างไว้"
            />
          )}
        </button>
      </div>

      <Outlet />
    </div>
  );
}
