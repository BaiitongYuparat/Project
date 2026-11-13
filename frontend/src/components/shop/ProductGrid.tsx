import type { Product } from "../../services/productService";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onTryOn: (product: Product) => void;
}

export default function ProductGrid({
  products,
  favorites,
  onToggleFavorite,
  onTryOn,
}: ProductGridProps) {
  // หน้าที่เรียกใช้ (เช่น ShopPage) จัดการ empty state เอง — ไม่มีสินค้าจึงไม่ต้องแสดงอะไร
  if (products.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 md:gap-y-10 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isFavorite={favorites.includes(product.id)}
          onToggleFavorite={onToggleFavorite}
          onTryOn={onTryOn}
        />
      ))}
    </div>
  );
}