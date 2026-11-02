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
  if (products.length === 0) {
    return (
      <div className="py-20 text-center text-[#947D6D]">
        ไม่พบสินค้าที่ตรงกับเงื่อนไข
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-3 lg:grid-cols-4">
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