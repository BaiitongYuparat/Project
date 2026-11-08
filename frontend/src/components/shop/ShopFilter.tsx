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
    <div className="flex flex-col gap-2">
      <label className="text-sm text-left font-medium text-gray-700">
        เลือกร้านค้า
      </label>

      <select
        value={selectedShop}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
      >
        <option value="all">ทุกร้านค้า</option>

        {shops.map((shop) => (
          <option key={shop.id} value={shop.id}>
            {shop.brand_name}
          </option>
        ))}
      </select>
    </div>
  );
}