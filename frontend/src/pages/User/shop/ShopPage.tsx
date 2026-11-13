import { useEffect, useMemo, useState } from "react";

import type { Shop } from "../../../services/shopService";
import type { Product } from "../../../services/productService";

import { getShops } from "../../../services/shopService";
import { getProducts } from "../../../services/productService";

import ProductGrid from "../../../components/shop/ProductGrid";
import ShopFilter from "../../../components/shop/ShopFilter";

import { useFavorites } from "../../../context/FavoritesContext";
import { useRequireAuth } from "../../../hooks/useRequireAuth";

import { useNavigate } from "react-router-dom";
import HeroBannerCarousel from "../../../components/shop/HeroBannerCarousel";



// ค่า value ต้องตรงกับที่ฟอร์มสร้างสินค้าฝั่ง shop admin (ProductFormModal) บันทึกลง DB
const categories = [
  { value: "all", label: "ทั้งหมด" },
  { value: "top", label: "เสื้อ" },
  { value: "bottom", label: "กางเกง" },
  { value: "dress", label: "เดรส" },
  { value: "skirt", label: "กระโปรง" },
  { value: "set", label: "ชุด" },
  { value: "accessories", label: "กระเป๋า" },
];

// ปรับค่าหมวดหมู่ที่เก็บใน DB ให้เทียบกันได้ เช่น "accessory" = "accessories"
const normalizeCategory = (category?: string) => {
  const value = category?.trim().toLowerCase() ?? "";
  return value === "accessory" ? "accessories" : value;
};

// ค่า value ต้องตรงกับ enum Gender ใน Prisma schema (MALE / FEMALE — ไม่มี unisex แล้ว)
const genders = [
  { value: "all", label: "ทั้งหมด" },
  { value: "MALE", label: "ชาย" },
  { value: "FEMALE", label: "หญิง" },
];

export default function ShopPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [selectedShop, setSelectedShop] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedGender, setSelectedGender] = useState("all");

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("recommended");

  const { favorites, toggleFavorite } = useFavorites();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const requireAuth = useRequireAuth();

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError("");

        const [shopData, productData] = await Promise.all([
          getShops(),
          getProducts(),
        ]);

        setShops(shopData);
        setProducts(productData);
      } catch (err) {
        console.error(err);
        setError("ไม่สามารถโหลดข้อมูลสินค้าได้");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter + Search
  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const matchShop =
        selectedShop === "all" || product.brand_id === selectedShop;

      const matchCategory =
        selectedCategory === "all" ||
        normalizeCategory(product.category) === selectedCategory;

      // สินค้าที่ยังไม่ได้ระบุเพศ (gender = null) จะแสดงเฉพาะตอนเลือก "ทั้งหมด"
      const matchGender =
        selectedGender === "all" || product.gender === selectedGender;

      const keyword = search.trim().toLowerCase();

      const matchSearch =
        !keyword ||
        product.name.toLowerCase().includes(keyword) ||
        product.shop_name.toLowerCase().includes(keyword) ||
        product.description?.toLowerCase().includes(keyword);

      return matchShop && matchCategory && matchGender && matchSearch;
    });

    if (sortBy === "price-low") {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
      result = [...result].sort((a, b) => b.price - a.price);
    } else if (sortBy === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name, "th"));
    }

    return result;
  }, [
    products,
    selectedShop,
    selectedCategory,
    selectedGender,
    search,
    sortBy,
  ]);

  // ทุก action ที่ต้องใช้บัญชี — ถ้ายังไม่ login จะเด้ง LoginModal แทน
  const handleTryOn = (product: Product) => {
    if (!requireAuth()) return;

    // ตอนนี้ยังไม่มี Try-On Flow จริง
    alert(`คุณเลือกลองใส่: ${product.name}`);
  };

  const handleToggleFavorite = (productId: string) => {
    if (!requireAuth()) return;

    toggleFavorite(productId);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-[#947D6D]">
        กำลังโหลดสินค้า...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1400px] px-5 py-7 md:px-10 lg:px-14">
       

        <HeroBannerCarousel />
        
        {/* Search */}
        <section className="mb-6">
          <label className="mb-2 block text-sm text-left font-semibold text-secondary">
            ค้นหาสินค้า
          </label>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อสินค้า สไตล์ หรือสิ่งที่ชอบ"
              className="min-w-0 flex-1 rounded-xl border border-[#DCC3B3] px-4 py-3 text-sm outline-none placeholder:text-[#A58E7F] focus:border-[#49352D]"
            />

            <button
              type="button"
              className="rounded-full border border-[#DCC3B3] bg-primary px-6 py-3 text-sm font-medium text-[#49352D] hover:bg-[#E8CEBD]"
              onClick={() => setSearch(search.trim())}
            >
              ค้นหาด้วยรูป
            </button>

            <button
              type="button"
              onClick={() => navigate("/my-outfit")}
              className="rounded-full border border-[#DCC3B3] bg-primary px-6 py-3 text-sm font-medium text-[#49352D] hover:bg-[#E8CEBD]"
            >
              ♡ รายการโปรด ({favorites.length})
            </button>
          </div>
        </section>

        {/* Category Filter */}
        <section className="mb-5 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.value}
              type="button"
              onClick={() => setSelectedCategory(category.value)}
              className={`rounded-full border px-4 py-2 text-sm transition ${selectedCategory === category.value
                ? "border-[#3E2C25] bg-[#3E2C25] text-white"
                : "border-[#DCC3B3] bg-white text-[#49352D] hover:bg-primary"
                }`}
            >
              {category.label}
            </button>
          ))}
        </section>

        {/* Gender Filter */}
        <section className="mb-7 flex flex-wrap items-center gap-2">
          <span className="mr-2 text-xs font-medium text-[#947D6D]">เพศ</span>

          {genders.map((gender) => (
            <button
              key={gender.value}
              type="button"
              onClick={() => setSelectedGender(gender.value)}
              className={`rounded-full border px-4 py-2 text-sm transition ${selectedGender === gender.value
                ? "border-[#3E2C25] bg-[#3E2C25] text-white"
                : "border-[#DCC3B3] bg-white text-[#49352D] hover:bg-primary"
                }`}
            >
              {gender.label}
            </button>
          ))}
        </section>

        {/* Shop + Product Heading */}
        <section className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl font-bold text-[#49352D] md:text-2xl">
              เลือกชิ้นที่ใช่ แล้วลองเลย
            </h2>

            <ShopFilter shops={shops}
              selectedShop={selectedShop}
              onChange={setSelectedShop} />
          </div>

          <div className="flex items-center gap-2 text-sm text-[#947D6D]">
            <span>{filteredProducts.length} สินค้า</span>
            <span>·</span>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-sm outline-none"
            >
              <option value="recommended">แนะนำ</option>
              <option value="price-low">ราคาต่ำไปสูง</option>
              <option value="price-high">ราคาสูงไปต่ำ</option>
              <option value="name">ชื่อสินค้า</option>
            </select>
          </div>
        </section>

        {/* Product Cards */}
        <ProductGrid
          products={filteredProducts}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onTryOn={handleTryOn}
        />

        {filteredProducts.length === 0 && (
          <div className="py-16 text-center text-sm text-[#947D6D]">
            ไม่พบสินค้าที่ตรงกับตัวกรอง
          </div>
        )}
      </div>
    </main>
  );
}