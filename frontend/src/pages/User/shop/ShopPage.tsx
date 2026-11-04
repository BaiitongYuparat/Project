import { useEffect, useMemo, useState } from "react";

import type { Shop } from "../../../services/shopService";
import type { Product } from "../../../services/productService";

import { getShops } from "../../../services/shopService";
import { getProducts } from "../../../services/productService";

import ProductGrid from "../../../components/shop/ProductGrid";
import Button from "../../../components/Button";

const categories = [
  { value: "all", label: "ทั้งหมด" },
  { value: "TOP", label: "เสื้อ" },
  { value: "BOTTOM", label: "กางเกง" },
  { value: "DRESS", label: "เดรส" },
  { value: "SKIRT", label: "กระโปรง" },
  { value: "ACCESSORY", label: "กระเป๋า" },
];

const genders = [
  { value: "all", label: "ทุกเพศ" },
  { value: "WOMEN", label: "ผู้หญิง" },
  { value: "MEN", label: "ผู้ชาย" },
  { value: "UNISEX", label: "Unisex" },
];

export default function ShopPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [selectedShop, setSelectedShop] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedGender, setSelectedGender] = useState("all");

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("recommended");

  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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
        selectedShop === "all" || product.shop_id === selectedShop;

      const matchCategory =
        selectedCategory === "all" || product.category === selectedCategory;

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

  const toggleFavorite = (id: string) => {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const handleTryOn = (product: Product) => {
    // ตอนนี้ยังไม่มี Try-On Flow จริง
    alert(`คุณเลือกลองใส่: ${product.name}`);
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
        {/* Hero Banner */}
        <section className="mb-8 flex flex-col justify-between gap-6 rounded-2xl border border-[#DCC3B3] bg-[#F3E1D4] p-6 md:flex-row md:items-center md:px-8 md:py-7">
          <div className="max-w-xl">
            <p className="mb-4 text-xs font-medium text-[#806B5E]">
              AI VIRTUAL TRY-ON · ลองเลย
            </p>

            <h1 className="text-2xl font-bold leading-tight text-[#49352D] md:text-4xl">
              ลองก่อนซื้อ บนรูปของคุณเอง
            </h1>

            <p className="m-4 text-sm text-[#947D6D]">
              แมตช์ชุดที่ชอบ ลองด้วย AI แล้วเลือกสไตล์ที่ใช่สำหรับคุณ
            </p>

            <Button
              variant="secondary"
              className="rounded-full hover:bg-secondary/70 hover:text-white"
              onClick={() => {
                "something";
              }}
            >
              เริ่มลองใส่เลย
            </Button>
          </div>
        </section>

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
              className="rounded-full border border-[#DCC3B3] bg-[#F3E1D4] px-6 py-3 text-sm font-medium text-[#49352D] hover:bg-[#E8CEBD]"
              onClick={() => setSearch(search.trim())}
            >
              ค้นหาด้วยรูป
            </button>

            <button
              type="button"
              onClick={() => setSelectedShop("all")}
              className="rounded-full border border-[#DCC3B3] bg-[#F3E1D4] px-6 py-3 text-sm font-medium text-[#49352D] hover:bg-[#E8CEBD]"
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
              className={`rounded-full border px-4 py-2 text-sm transition ${
                selectedCategory === category.value
                  ? "border-[#3E2C25] bg-[#3E2C25] text-white"
                  : "border-[#DCC3B3] bg-white text-[#49352D] hover:bg-[#F3E1D4]"
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
              className={`rounded-full border px-4 py-2 text-sm transition ${
                selectedGender === gender.value
                  ? "border-[#3E2C25] bg-[#3E2C25] text-white"
                  : "border-[#DCC3B3] bg-white text-[#49352D] hover:bg-[#F3E1D4]"
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

            <div className="mt-3">
              <label className="mb-1 block text-xs text-[#947D6D]">
                เลือกร้านค้า
              </label>

              <select
                value={selectedShop}
                onChange={(e) => setSelectedShop(e.target.value)}
                className="rounded-full border border-[#DCC3B3] bg-white px-4 py-2 text-sm text-[#49352D] outline-none focus:border-[#49352D]"
              >
                <option value="all">ทุกร้านค้า</option>

                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>
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
          onToggleFavorite={toggleFavorite}
          onTryOn={handleTryOn}
        />
      </div>
    </main>
  );
}
