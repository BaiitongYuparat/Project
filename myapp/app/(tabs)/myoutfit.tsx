import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

import { useAuth } from "../../components/auth/AuthProvider";
import StateView from "../../components/common/StateView";
import ProductCard from "../../components/shop/ProductCard";
import {
  getFavoriteProducts,
  removeFavorite,
} from "../../service/favoriteService";
import type { Product } from "../../service/productService";
import type { RootState } from "../../store/store";
import {
  addFavoriteLocal,
  removeFavoriteLocal,
  setFavorites,
} from "../../store/favoriteSlice";
import { startWithProduct } from "../../store/tryOnSlice";

const TABS = [
  { key: "saved", label: "ที่บันทึกไว้" },
  { key: "history", label: "ประวัติการลอง" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function MyOutfitScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { requireAuth } = useAuth();

  const user = useSelector((state: RootState) => state.user.user);
  const favoriteIds = useSelector((state: RootState) => state.favorite.ids);

  const [tab, setTab] = useState<TabKey>("saved");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // โหลดรายการโปรดทุกครั้งที่กลับเข้าหน้านี้ (เผื่อกดหัวใจจากหน้าอื่นมา)
  useFocusEffect(
    useCallback(() => {
      if (!user) return;

      let cancelled = false;

      getFavoriteProducts()
        .then((data) => {
          if (cancelled) return;
          setProducts(data);
          setError("");
          dispatch(setFavorites(data.map((product) => product.id)));
        })
        .catch((err) => {
          console.log("Load favorites error:", err);
          if (!cancelled) setError("ไม่สามารถโหลดรายการโปรดได้");
        })
        .finally(() => {
          if (cancelled) return;
          setIsLoading(false);
          setIsRefreshing(false);
        });

      return () => {
        cancelled = true;
      };
      // reloadKey ใช้สั่งโหลดใหม่ตอนกด "ลองใหม่" / ดึงเพื่อรีเฟรช
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, dispatch, reloadKey]),
  );

  // ซ่อนชิ้นที่เพิ่งกดเอาหัวใจออกทันที โดยไม่ต้องรอโหลดใหม่
  const savedProducts = useMemo(
    () => products.filter((product) => favoriteIds.includes(product.id)),
    [products, favoriteIds],
  );

  const reload = (mode: "retry" | "refresh") => {
    if (mode === "retry") {
      setError("");
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setReloadKey((key) => key + 1);
  };

  const handleTryOn = (product: Product) => {
    if (!requireAuth()) return;

    dispatch(startWithProduct(product.id));
    router.navigate("/(tabs)/vto");
  };

  const handleRemoveFavorite = (product: Product) => {
    dispatch(removeFavoriteLocal(product.id));

    removeFavorite(product.id).catch((err) => {
      console.log("Remove favorite error:", err);
      dispatch(addFavoriteLocal(product.id));
      Alert.alert("ไม่สำเร็จ", "อัปเดตรายการโปรดไม่สำเร็จ กรุณาลองใหม่");
    });
  };

  const cardWidth = (width - 32 - 12) / 2;

  const header = (
    <View className="mb-5">
      <Text className="text-3xl font-bold text-[#3B2F2A]">ชุดของฉัน</Text>
      <Text className="mt-1 text-sm text-[#8A7B72]">
        ลุคที่คุณชอบ และทุกครั้งที่ได้ลองเป็นตัวเอง
      </Text>

      <View className="mt-5 flex-row gap-3">
        {TABS.map((item) => {
          const active = tab === item.key;

          return (
            <Pressable
              key={item.key}
              onPress={() => setTab(item.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className={`rounded-full border px-5 py-2.5 active:opacity-80 ${
                active
                  ? "border-[#3B2F2A] bg-[#3B2F2A]"
                  : "border-[#DCC3B3] bg-white"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  active ? "text-white" : "text-[#3B2F2A]"
                }`}
              >
                {item.label}
                {item.key === "saved" && user
                  ? ` (${savedProducts.length})`
                  : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const container = (children: React.ReactNode) => (
    <View
      className="flex-1 bg-[#FFFDFB] px-4"
      style={{ paddingTop: insets.top + 12 }}
    >
      {header}
      {children}
    </View>
  );

  // ยังไม่ได้เข้าสู่ระบบ
  if (!user) {
    return container(
      <StateView
        icon="person-circle-outline"
        title="เข้าสู่ระบบเพื่อดูชุดของคุณ"
        message="บันทึกชุดที่ชอบ และดูประวัติการลองใส่ได้ทุกอุปกรณ์"
        actionLabel="เข้าสู่ระบบ"
        onAction={() => requireAuth()}
      />,
    );
  }

  // ประวัติการลอง — ยังไม่มี API (เหมือนฝั่งเว็บ)
  if (tab === "history") {
    return container(
      <StateView
        icon="time-outline"
        title="ยังไม่มีประวัติการลอง"
        message="ภาพที่คุณสร้างจาก Virtual Try-On จะแสดงที่นี่"
        actionLabel="เริ่มลองชุด"
        onAction={() => router.navigate("/(tabs)/vto")}
      />,
    );
  }

  if (isLoading) {
    return container(
      <View className="items-center py-16">
        <ActivityIndicator color="#7B675A" />
        <Text className="mt-3 text-sm text-[#8A7B72]">
          กำลังโหลดรายการโปรด...
        </Text>
      </View>,
    );
  }

  if (error) {
    return container(
      <StateView
        icon="alert-circle-outline"
        title="โหลดข้อมูลไม่สำเร็จ"
        message={`${error} กรุณาลองใหม่อีกครั้ง`}
        actionLabel="ลองใหม่"
        onAction={() => reload("retry")}
      />,
    );
  }

  return (
    <View
      className="flex-1 bg-[#FFFDFB]"
      style={{ paddingTop: insets.top + 12 }}
    >
      <FlatList
        data={savedProducts}
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
              isFavorite
              onPress={() =>
                router.push({
                  pathname: "/product/[id]",
                  params: { id: item.id },
                })
              }
              onToggleFavorite={() => handleRemoveFavorite(item)}
              onTryOn={() => handleTryOn(item)}
            />
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => reload("refresh")}
            tintColor="#7B675A"
          />
        }
        ListEmptyComponent={
          <StateView
            icon="heart-outline"
            title="ยังไม่มีชุดที่บันทึกไว้"
            message="กดหัวใจที่สินค้าที่ชอบในหน้าร้าน แล้วจะมาอยู่ที่นี่"
            actionLabel="ไปเลือกสินค้า"
            onAction={() => router.navigate("/(tabs)/home")}
          />
        }
      />
    </View>
  );
}
