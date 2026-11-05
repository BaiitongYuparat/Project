
import type { BrandMembership } from "../types/user";

interface EntryChoiceModalProps {
  brand: BrandMembership;
  onSelectWebsite: () => void | Promise<void>;
  onSelectDashboard: (brand: BrandMembership) => void;
}

export default function EntryChoiceModal({
  brand,
  onSelectWebsite,
  onSelectDashboard,
}: EntryChoiceModalProps) {

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl">

        <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
          Welcome to LongDress
        </h2>

        <p className="mb-2 text-center text-gray-600">
          คุณเป็นเจ้าของร้าน {brand.brandName}
        </p>

        <p className="mb-6 text-center text-sm text-gray-500">
          ต้องการเข้าใช้งานในส่วนไหน?
        </p>

        <div className="grid grid-cols-2 gap-4">

          {/* Website */}
          <button
            type="button"
            onClick={onSelectWebsite}
            className="rounded-xl border border-gray-200 p-5 text-center transition hover:border-blue-500 hover:bg-blue-50"
          >
            <div className="mb-3 text-3xl">🛍️</div>

            <h3 className="font-semibold text-gray-900">
              Website
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              เข้าใช้งานในมุมมองลูกค้า
            </p>
          </button>

          {/* Shop Dashboard */}
          <button
            type="button"
            onClick={() => onSelectDashboard(brand)}
            className="rounded-xl border border-gray-200 p-5 text-center transition hover:border-blue-500 hover:bg-blue-50"
          >
            <div className="mb-3 text-3xl">📊</div>

            <h3 className="font-semibold text-gray-900">
              Shop Dashboard
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              จัดการร้านค้าของคุณ
            </p>
          </button>

        </div>
      </div>
    </div>
  );
}
