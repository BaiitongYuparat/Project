import type { Product } from "../../services/productService";

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (productId: string) => void;
  onTryOn: (product: Product) => void;
}

const genderLabel = {
  WOMEN: "ผู้หญิง",
  MEN: "ผู้ชาย",
  UNISEX: "Unisex",
};

export default function ProductCard({
  product,
  isFavorite,
  onToggleFavorite,
  onTryOn,
}: ProductCardProps) {
  return (
    <article className="min-w-0">
      {/* Gender + Favorite */}
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="rounded-full bg-[#F4E2D6] px-3 py-1 text-xs text-[#503C32]">
          {product.gender ? genderLabel[product.gender] : "Unisex"}
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
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover transition duration-300 hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[#947D6D]">
              {product.category === "TOP" && "เสื้อ"}
              {product.category === "BOTTOM" && "กางเกง"}
              {product.category === "DRESS" && "เดรส"}
              {product.category === "SKIRT" && "กระโปรง"}
              {product.category === "ACCESSORY" && "กระเป๋า"}
              {!["TOP", "BOTTOM", "DRESS", "SKIRT", "ACCESSORY"].includes(
                product.category
              ) && "สินค้า"}
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