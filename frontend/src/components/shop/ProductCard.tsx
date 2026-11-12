import type { Product } from "../../services/productService";

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (productId: string) => void;
  onTryOn: (product: Product) => void;
}

// ตอนนี้สินค้ายังไม่มีข้อมูลเพศในฐานข้อมูล จึงแสดง Unisex เป็นค่าเริ่มต้น
// (ถ้า backend เพิ่ม field gender แล้ว ให้แสดงตามค่าจริงแทน)
const genderLabel = "Unisex";

// คีย์ต้องตรงกับค่า category ที่ shop admin บันทึกลง DB
const categoryLabel: Record<string, string> = {
  top: "เสื้อ",
  bottom: "กางเกง",
  dress: "เดรส",
  skirt: "กระโปรง",
  set: "ชุด",
  accessories: "กระเป๋า",
  accessory: "กระเป๋า",
};

export default function ProductCard({
  product,
  isFavorite,
  onToggleFavorite,
  onTryOn,
}: ProductCardProps) {
  const imageUrl = product.images?.[0]?.image_url;

  return (
    <article className="min-w-0">
      {/* Gender + Favorite */}
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="rounded-full bg-[#F4E2D6] px-3 py-1 text-xs text-[#503C32]">
          {genderLabel}
        </span>

        <button
          type="button"
          onClick={() => onToggleFavorite(product.id)}
          aria-label="เพิ่มหรือลบรายการโปรด"
          className="flex h-8 w-8 items-center justify-center text-2xl text-[#49352D] transition hover:scale-110"
        >
          {isFavorite ? "♥" : "♡"}
        </button>
      </div>

      {/* Card */}
      <div className="overflow-hidden rounded-2xl border border-[#DCC3B3] bg-white p-2">
        {/* Image */}
        <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[#F3E1D4]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition duration-300 hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[#947D6D]">
              {categoryLabel[product.category.toLowerCase()] ?? "สินค้า"}
            </div>
          )}
        </div>

        {/* Information */}
        <div className="px-1 pb-1 pt-3">
          <p className="truncate text-sm font-semibold text-[#49352D]">
            {product.name}
          </p>

          <p className="mt-1 truncate text-xs text-[#9A8577]">
            {[product.color, product.fit].filter(Boolean).join(" · ")}
          </p>

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="font-semibold text-[#49352D]">
              ฿{product.price.toLocaleString("th-TH")}
            </span>

            <button
              type="button"
              onClick={() => onTryOn(product)}
              className="shrink-0 rounded-full border border-[#DCC3B3] bg-[#F3E1D4] px-3 py-1.5 text-xs font-medium text-[#49352D] transition hover:bg-[#E8CEBD]"
            >
              ลองใส่
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
