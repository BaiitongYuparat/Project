import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

import { useAuth } from "../../components/auth/AuthProvider";
import StateView from "../../components/common/StateView";
import Chip from "../../components/shop/Chip";
import ProductCard from "../../components/shop/ProductCard";
import ShopDropdown from "../../components/shop/ShopDropdown";
import type { Product } from "../../service/productService";
import { getProducts } from "../../service/productService";
import type { Shop } from "../../service/shopService";
import { getShops } from "../../service/shopService";
import {
  addFavorite,
  getFavoriteIds,
  removeFavorite,
} from "../../service/favoriteService";
import type { RootState } from "../../store/store";
import {
  addFavoriteLocal,
  removeFavoriteLocal,
  setFavorites,
} from "../../store/favoriteSlice";
import { startWithProduct } from "../../store/tryOnSlice";
import {
  CATEGORY_ORDER,
  categoryLabel,
  normalizeCategory,
} from "../../utils/product";

const GENDERS = [
  { value: "all", label: "ทั้งหมด" },
  { value: "MALE", label: "ชาย" },
  { value: "FEMALE", label: "หญิง" },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const dispatch = useDispatch();
  const { requireAuth } = useAuth();

  const user = useSelector((state: RootState) => state.user.user);
  const favoriteIds = useSelector((state: RootState) => state.favorite.ids);

  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedGender, setSelectedGender] = useState("all");
  const [selectedShop, setSelectedShop] = useState("all");

  const loadData = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setIsLoading(true);
      setError("");

      const [shopData, productData] = await Promise.all([
        getShops(),
        getProducts(),
      ]);

      setShops(shopData);
      setProducts(productData);
    } catch (err) {
      console.log("Load shop data error:", err);
      setError("ไม่สามารถโหลดข้อมูลสินค้าได้");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // โหลดสถานะหัวใจจาก backend ทุกครั้งที่กลับเข้าหน้านี้
  useFocusEffect(
    useCallback(() => {
      if (!user) return;

      let cancelled = false;

      getFavoriteIds()
        .then((ids) => {
          if (!cancelled) dispatch(setFavorites(ids));
        })
        .catch((err) => console.log("Load favorites error:", err));

      return () => {
        cancelled = true;
      };
    }, [user, dispatch]),
  );

  const availableCategories = useMemo(() => {
    const values = new Set(
      products.map((product) => normalizeCategory(product.category)),
    );

    return [
      "all",
      ...CATEGORY_ORDER.filter((value) => values.has(value)),
      ...Array.from(values)
        .filter((value) => !CATEGORY_ORDER.includes(value))
        .sort(),
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchShop =
        selectedShop === "all" || product.brand_id === selectedShop;
      const matchCategory =
        selectedCategory === "all" ||
        normalizeCategory(product.category) === selectedCategory;
      const matchGender =
        selectedGender === "all" || product.gender === selectedGender;
      const matchSearch =
        !keyword ||
        product.name.toLowerCase().includes(keyword) ||
        (product.brand?.brand_name ?? "").toLowerCase().includes(keyword) ||
        (product.description ?? "").toLowerCase().includes(keyword);

      return matchShop && matchCategory && matchGender && matchSearch;
    });
  }, [products, search, selectedCategory, selectedGender, selectedShop]);

  const hasActiveFilters =
    selectedCategory !== "all" ||
    selectedGender !== "all" ||
    selectedShop !== "all" ||
    search.trim() !== "";

  const clearFilters = () => {
    setSelectedCategory("all");
    setSelectedGender("all");
    setSelectedShop("all");
    setSearch("");
  };

  const handleTryOn = (product: Product) => {
    if (!requireAuth()) return;

    dispatch(startWithProduct(product.id));
    router.navigate("/(tabs)/vto");
  };

  const handleToggleFavorite = (product: Product) => {
    if (!requireAuth()) return;

    const wasFavorite = favoriteIds.includes(product.id);

    dispatch(
      wasFavorite
        ? removeFavoriteLocal(product.id)
        : addFavoriteLocal(product.id),
    );

    const request = wasFavorite
      ? removeFavorite(product.id)
      : addFavorite(product.id);

    request.catch((err) => {
      console.log("Toggle favorite error:", err);

      // ย้อนสถานะกลับถ้า API ไม่สำเร็จ
      dispatch(
        wasFavorite
          ? addFavoriteLocal(product.id)
          : removeFavoriteLocal(product.id),
      );
      Alert.alert("ไม่สำเร็จ", "อัปเดตรายการโปรดไม่สำเร็จ กรุณาลองใหม่");
    });
  };

  const cardWidth = (width - 32 - 12) / 2;

  const header = (
    <View>
      {/* Hero */}
      <View className="mb-5 overflow-hidden rounded-3xl bg-[#F0E4D8] p-5">
        <Text className="text-xs font-semibold uppercase tracking-widest text-[#8A7B72]">
          LongDress
        </Text>
        <Text className="mt-2 text-2xl font-bold leading-8 text-[#3B2F2A]">
          เลือกชิ้นที่ใช่{"\n"}แล้วลองทั้งลุคด้วย AI
        </Text>
        <Text className="mt-2 text-sm leading-6 text-[#8A7B72]">
          ผสมเสื้อ กางเกง เดรส และกระเป๋า แล้วสร้างภาพสวมใส่ได้ในครั้งเดียว
        </Text>

        <Pressable
          onPress={() => router.navigate("/(tabs)/vto")}
          className="mt-4 flex-row items-center self-start rounded-full bg-[#3B2F2A] px-5 py-2.5 active:opacity-80"
        >
          <Ionicons name="shirt-outline" size={16} color="#FFFFFF" />
          <Text className="ml-2 text-sm font-semibold text-white">
            เริ่มลองชุด
          </Text>
        </Pressable>
      </View>

      {/* Search */}
      <View className="mb-3 flex-row items-center rounded-full border border-[#DCC3B3] bg-white px-4">
        <Ionicons name="search-outline" size={18} color="#9C8B7E" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="ค้นหาชื่อสินค้า สไตล์ หรือสิ่งที่ชอบ"
          placeholderTextColor="#B0A093"
          className="ml-2 flex-1 py-3 text-sm text-[#3B2F2A]"
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#B0A093" />
          </Pressable>
        )}
      </View>

      {/* Shortcuts */}
      <View className="mb-4 flex-row gap-2">
        <Pressable
          onPress={() => router.navigate("/(tabs)/myoutfit")}
          className="flex-1 flex-row items-center justify-center rounded-full border border-[#DCC3B3] bg-[#F8F1EA] px-4 py-2.5 active:opacity-80"
        >
          <Ionicons name="heart-outline" size={16} color="#7B675A" />
          <Text className="ml-2 text-sm font-medium text-[#3B2F2A]">
            รายการโปรด ({favoriteIds.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => clearFilters()}
          className="flex-1 flex-row items-center justify-center rounded-full border border-[#DCC3B3] bg-[#F8F1EA] px-4 py-2.5 active:opacity-80"
        >
          <Ionicons name="options-outline" size={16} color="#7B675A" />
          <Text className="ml-2 text-sm font-medium text-[#3B2F2A]">
            ล้างตัวกรอง
          </Text>
        </Pressable>
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-3"
        contentContainerStyle={{ gap: 8 }}
      >
        {availableCategories.map((value) => (
          <Chip
            key={value}
            label={value === "all" ? "ทั้งหมด" : categoryLabel(value)}
            active={selectedCategory === value}
            onPress={() => setSelectedCategory(value)}
          />
        ))}
      </ScrollView>

      {/* Gender */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-3"
        contentContainerStyle={{ gap: 8 }}
      >
        {GENDERS.map((gender) => (
          <Chip
            key={gender.value}
            label={gender.label}
            active={selectedGender === gender.value}
            onPress={() => setSelectedGender(gender.value)}
          />
        ))}
      </ScrollView>

      {shops.length > 0 && (
        <View className="mb-5">
          <ShopDropdown
            shops={shops}
            selectedShop={selectedShop}
            onChange={setSelectedShop}
          />
        </View>
      )}


      <View className="mb-3 flex-row items-end justify-between">
        <View>
          <Text className="text-xl font-bold text-[#3B2F2A]">
            เลือกชิ้นที่ใช่ แล้วลองเลย
          </Text>
          <Text className="mt-1 text-sm text-[#8A7B72]">
            พบสินค้า {filteredProducts.length} รายการ
          </Text>
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFFDFB]">
        <ActivityIndicator color="#7B675A" />
        <Text className="mt-3 text-sm text-[#8A7B72]">กำลังโหลดสินค้า...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        className="flex-1 justify-center bg-[#FFFDFB] px-5"
        style={{ paddingTop: insets.top }}
      >
        <StateView
          icon="alert-circle-outline"
          title="โหลดข้อมูลไม่สำเร็จ"
          message={`${error} กรุณาลองใหม่อีกครั้ง`}
          actionLabel="ลองใหม่"
          onAction={() => void loadData()}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FFFDFB]" style={{ paddingTop: insets.top }}>
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 32,
          gap: 18,
        }}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <View style={{ width: cardWidth }}>
            <ProductCard
              product={item}
              isFavorite={favoriteIds.includes(item.id)}
              onPress={() =>
                router.push({
                  pathname: "/product/[id]",
                  params: { id: item.id },
                })
              }
              onToggleFavorite={() => handleToggleFavorite(item)}
              onTryOn={() => handleTryOn(item)}
            />
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              void loadData("refresh");
            }}
            tintColor="#7B675A"
          />
        }
        ListEmptyComponent={
          hasActiveFilters ? (
            <StateView
              icon="search-outline"
              title="ไม่พบสินค้าที่ตรงกับตัวกรอง"
              message="ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองทั้งหมดเพื่อดูสินค้าทุกชิ้น"
              actionLabel="ล้างตัวกรองทั้งหมด"
              onAction={clearFilters}
            />
          ) : (
            <StateView
              icon="storefront-outline"
              title="ยังไม่มีสินค้าในระบบ"
              message="เมื่อร้านค้าเพิ่มสินค้า รายการจะแสดงที่นี่"
            />
          )
        }
      />
    </View>
  );
}
