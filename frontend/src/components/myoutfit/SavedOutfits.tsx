import type { Product } from "../../services/productService";
import ProductGrid from "../shop/ProductGrid";

interface SavedOutfitsProps {
  products: Product[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onTryOn: (product: Product) => void;
}

export default function SavedOutfits({
  products,
  favorites,
  onToggleFavorite,
  onTryOn,
}: SavedOutfitsProps) {
  if (products.length === 0) {
    return (
      <div className="py-20 text-center text-secondary/60">
        ยังไม่มีชุดที่บันทึกไว้
      </div>
    );
  }

  return (
    <ProductGrid
      products={products}
      favorites={favorites}
      onToggleFavorite={onToggleFavorite}
      onTryOn={onTryOn}
    />
  );
}
