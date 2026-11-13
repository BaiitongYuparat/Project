import type { Shop } from "../../services/shopService";

interface ShopFilterProps {
  shops: Shop[];
  selectedShop: string;
  onChange: (shopId: string) => void;
}

export default function ShopFilter({
  shops,
  selectedShop,
  onChange,
}: ShopFilterProps) {
  return (
    <div className="relative w-full sm:w-auto">
      <select
        value={selectedShop}
        onChange={(e) => onChange(e.target.value)}
        aria-label="เลือกร้านค้า"
        className="w-full appearance-none rounded-full border border-[#DCC3B3] bg-white py-2.5 pl-4 pr-9 text-sm text-[#49352D] outline-none transition focus:border-[#49352D]"
      >
        <option value="all">ทุกร้านค้า</option>

        {shops.map((shop) => (
          <option key={shop.id} value={shop.id}>
            {shop.brand_name}
          </option>
        ))}
      </select>

      {/* ลูกศรเลือก (เพราะซ่อน arrow เดิมด้วย appearance-none) */}
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#947D6D]">
        ▾
      </span>
    </div>
  );
}
