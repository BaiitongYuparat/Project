import { useEffect, useMemo, useState , } from "react";

import type { Shop } from "../../../services/shopService";
import type { Product } from "../../../services/productService";

import { getShops } from "../../../services/shopService";
import { getProducts } from "../../../services/productService";

import ProductGrid from "../../../components/shop/ProductGrid";
import Button from "../../../components/Button";
import ShopFilter from "../../../components/shop/ShopFilter";
import { useNavigate } from "react-router-dom";

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

  const navigate = useNavigate();

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
               {/* Hero Banner */}
        <section className="relative mb-8 overflow-hidden rounded-2xl border border-[#DCC3B3] bg-primary p-6 md:px-8 md:py-7">
          {/* Decorative Background */}
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/30 blur-2xl" />
          <div className="absolute -bottom-24 right-1/3 h-56 w-56 rounded-full bg-[#DDBBA6]/30 blur-2xl" />

          <div className="relative z-10 flex flex-col items-center justify-between gap-8 md:flex-row">
            {/* Text Content */}
            <div className="max-w-xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#D9BBA8] bg-white/50 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-[#A77D65]" />
                <span className="text-xs font-semibold tracking-widest text-[#806B5E]">
                  Become Our Partner
                </span>
              </div>

              <h1 className="text-3xl font-bold leading-tight text-[#49352D] md:text-5xl">
                เติบโตไปพร้อมกับ
                <br />
                <span className="text-[#A77D65]">LongDress</span>
              </h1>

              <p className="mt-5 max-w-lg text-sm leading-7 text-[#806B5E] md:text-base">
                ให้ร้านค้าของคุณเป็นที่รู้จักมากขึ้น
                เปิดโอกาสให้ลูกค้าได้ค้นพบสินค้า
                และทดลองสวมใส่เสื้อผ้าด้วยเทคโนโลยี AI
                ก่อนตัดสินใจซื้อ
              </p>

              {/* CTA */}
              <div className="mt-7">
                <Button
                  variant="secondary"
                  className="rounded-full bg-[#806B5E] px-8 py-3 text-white shadow-lg shadow-[#806B5E]/20 transition-all duration-300 hover:-translate-y-1 hover:bg-[#634B3F] hover:shadow-xl"
                  onClick={() => navigate("/brand/register")}
                >
                  สมัครเป็นร้านค้าเลย
                  <span className="ml-2">→</span>
                </Button>
              </div>
            </div>

            {/* Illustration */}
            <div className="relative hidden h-64 w-72 shrink-0 items-center justify-center md:flex">
              <div className="absolute h-60 w-60 rounded-full border border-white/60" />
              <div className="absolute h-48 w-48 rounded-full bg-white/30" />

              <div className="relative z-10 flex h-48 w-48 flex-col items-center justify-center rounded-full border-4 border-white/70 bg-[#E8CDBD] shadow-xl">
                <p className="mt-3 text-xs font-semibold tracking-widest text-[#694D3F]">
                  YOUR BRAND
                </p>
              </div>

              <div className="absolute right-0 top-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-lg">
                ✨
              </div>

              <div className="absolute bottom-5 left-0 flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl shadow-lg">
                ♡
              </div>
            </div>
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
              className="rounded-full border border-[#DCC3B3] bg-primary px-6 py-3 text-sm font-medium text-[#49352D] hover:bg-[#E8CEBD]"
              onClick={() => setSearch(search.trim())}
            >
              ค้นหาด้วยรูป
            </button>

            <button
              type="button"
              onClick={() => setSelectedShop("all")}
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
              className={`rounded-full border px-4 py-2 text-sm transition ${
                selectedCategory === category.value
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
              className={`rounded-full border px-4 py-2 text-sm transition ${
                selectedGender === gender.value
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
              onChange={setSelectedShop}/>
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
