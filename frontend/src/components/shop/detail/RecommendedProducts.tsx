import type { Product } from "../../../services/productService";

import ProductCard from "../ProductCard";
import SectionTitle from "./SectionTitle";

interface RecommendedProductsProps {
  products: Product[];
  favorites: string[];
  onToggleFavorite: (productId: string) => void;
  onTryOn: (product: Product) => void;
}

/**
 * แถบ "สินค้าแนะนำ" ท้ายหน้า ProductDetail — เลื่อนแนวนอนได้
 * ใช้การ์ดสินค้าตัวเดียวกับหน้าร้าน (มีหัวใจรายการโปรด + ปุ่มลองใส่)
 */
export default function RecommendedProducts({
  products,
  favorites,
  onToggleFavorite,
  onTryOn,
}: RecommendedProductsProps) {
  // ไม่มีสินค้าให้แนะนำ = ไม่ต้องเหลือพื้นที่ว่างท้ายหน้า
  if (products.length === 0) {
    return null;
  }

  return (
    <section aria-label="สินค้าแนะนำ">
      <SectionTitle subtitle="สินค้าจากร้านนี้และหมวดใกล้เคียงที่คุณอาจชอบ">
        สินค้าแนะนำ
      </SectionTitle>

      <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[72%] shrink-0 snap-start sm:w-[44%] md:w-[30%] lg:w-[23%]"
          >
            <ProductCard
              product={product}
              isFavorite={favorites.includes(product.id)}
              onToggleFavorite={onToggleFavorite}
              onTryOn={onTryOn}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
