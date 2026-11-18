import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";

import { useAuth } from "../../components/auth/AuthProvider";
import StateView from "../../components/common/StateView";
import ColorSwatches from "../../components/product/ColorSwatches";
import ProductGallery from "../../components/product/ProductGallery";
import SectionTitle from "../../components/product/SectionTitle";
import ShopCard from "../../components/product/ShopCard";
import SizeTable, { hasSizeChartData } from "../../components/product/SizeTable";
import type { ProductDetail } from "../../service/productService";
import { getProductById } from "../../service/productService";
import { startWithProduct } from "../../store/tryOnSlice";
import { categoryLabel, formatPrice, genderLabel } from "../../utils/product";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { requireAuth } = useAuth();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // null = แสดงด้านหน้าของทุกสี
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    getProductById(id)
      .then((data) => {
        if (cancelled) return;
        setProduct(data);
        setSelectedColorId(null);
      })
      .catch((err) => {
        console.log("Load product error:", err);
        if (!cancelled) setError("ไม่สามารถโหลดข้อมูลสินค้าได้");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  // ไม่เลือกสี = ด้านหน้าของทุกสี, เลือกสี = ทุกด้านของสีนั้น
  const galleryImages = useMemo(() => {
    const images = product?.images ?? [];

    if (selectedColorId === null) {
      const front = images.filter((image) => image.view === "FRONT");
      return front.length > 0 ? front : images;
    }

    const colorImages = images.filter(
      (image) => image.color_id === selectedColorId,
    );
    return colorImages.length > 0 ? colorImages : images;
  }, [product, selectedColorId]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/home");
  };

  const handleRetry = () => {
    setError("");
    setIsLoading(true);
    setReloadKey((key) => key + 1);
  };

  const handleTryOn = () => {
    if (!product || !requireAuth()) return;

    dispatch(startWithProduct(product.id));
    router.navigate("/(tabs)/vto");
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FAF5EF]">
        <ActivityIndicator color="#7B675A" />
        <Text className="mt-3 text-sm text-[#947D6D]">กำลังโหลดสินค้า...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View
        className="flex-1 justify-center bg-[#FAF5EF] px-5"
        style={{ paddingTop: insets.top }}
      >
        <StateView
          icon="alert-circle-outline"
          title={error ? "โหลดข้อมูลไม่สำเร็จ" : "ไม่พบสินค้านี้"}
          message={
            error
              ? `${error} กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง`
              : "สินค้าอาจถูกลบ อัปเดตลิงก์ หรือปิดการขายชั่วคราว"
          }
          actionLabel={error ? "ลองใหม่อีกครั้ง" : "กลับหน้าหลัก"}
          onAction={error ? handleRetry : goBack}
        />
      </View>
    );
  }

  const colorCount = product.colors?.length ?? 0;
  const hasSizeTable = hasSizeChartData(product.size_charts ?? []);

  const specs = [
    { label: "หมวดหมู่", value: categoryLabel(product.category) },
    { label: "เพศ", value: genderLabel(product.gender) },
    { label: "เนื้อผ้า", value: product.fabric },
    { label: "ฤดู", value: product.seasons?.join(" / ") },
    { label: "โอกาส", value: product.occasions?.join(" / ") },
    { label: "รหัสสินค้า", value: product.sku },
  ].filter((row) => Boolean(row.value));

  // ขอบจอ 16 + padding การ์ด 12 ทั้งสองข้าง
  const galleryWidth = width - 32 - 24;

  return (
    <View className="flex-1 bg-[#FAF5EF]">
      {/* Top bar */}
      <View
        className="flex-row items-center justify-between border-b border-[#EADCCF] bg-[#FAF5EF] px-4 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable
          onPress={goBack}
          className="flex-row items-center rounded-full border border-[#DCC3B3] bg-white px-4 py-2 active:bg-[#F4EAE0]"
        >
          <Ionicons name="arrow-back" size={16} color="#49352D" />
          <Text className="ml-1.5 text-sm font-medium text-[#49352D]">
            ย้อนกลับ
          </Text>
        </Pressable>

        <Text
          numberOfLines={1}
          className="ml-4 flex-1 text-right text-xs text-[#947D6D]"
        >
          {categoryLabel(product.category)} / {product.name}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 120 + insets.bottom,
          gap: 24,
        }}
      >
        {/* Gallery */}
        <View className="rounded-3xl border border-[#DCC3B3] bg-white p-3">
          <ProductGallery
            key={selectedColorId ?? "all"}
            images={galleryImages}
            productName={product.name}
            width={galleryWidth}
          />
        </View>

        {/* ข้อมูลหลัก */}
        <View className="gap-5 rounded-3xl border border-[#DCC3B3] bg-white p-5">
          <View>
            <View className="flex-row flex-wrap items-center gap-2">
              <View className="rounded-full border border-[#DCC3B3] bg-[#FAF5EF] px-3 py-1">
                <Text className="text-xs font-medium text-[#503C32]">
                  {categoryLabel(product.category)}
                </Text>
              </View>
              <View className="rounded-full border border-[#DCC3B3] bg-[#FAF5EF] px-3 py-1">
                <Text className="text-xs font-medium text-[#503C32]">
                  {genderLabel(product.gender)}
                </Text>
              </View>
              {product.brand?.brand_name ? (
                <Text className="ml-auto text-xs font-medium text-[#947D6D]">
                  โดย {product.brand.brand_name}
                </Text>
              ) : null}
            </View>

            <Text className="mt-4 text-2xl font-bold leading-8 text-[#3E2C25]">
              {product.name}
            </Text>
          </View>

          <View className="flex-row items-center justify-between rounded-2xl border border-[#EFE3D6] bg-[#FAF5EF] px-5 py-4">
            <View>
              <Text className="text-[11px] font-medium uppercase tracking-wider text-[#947D6D]">
                ราคาสินค้า
              </Text>
              <Text className="mt-0.5 text-3xl font-bold text-[#3E2C25]">
                {formatPrice(product.price)}
              </Text>
            </View>

            {colorCount > 0 && (
              <View className="rounded-full border border-[#EADCCF] bg-white px-3 py-1">
                <Text className="text-xs font-medium text-[#6B5446]">
                  มีให้เลือก {colorCount} สี
                </Text>
              </View>
            )}
          </View>

          <ColorSwatches
            colors={product.colors ?? []}
            selectedColorId={selectedColorId}
            onSelect={setSelectedColorId}
          />
        </View>

        {/* คำอธิบาย */}
        {product.description ? (
          <View>
            <SectionTitle subtitle="รายละเอียดเนื้อผ้า การตัดเย็บ และคำแนะนำเพิ่มเติม">
              คำอธิบายสินค้า
            </SectionTitle>
            <View className="rounded-3xl border border-[#DCC3B3] bg-white p-5">
              <Text className="text-[15px] leading-7 text-[#49352D]">
                {product.description}
              </Text>
            </View>
          </View>
        ) : null}

        {/* ข้อมูลเพิ่มเติม */}
        {specs.length > 0 && (
          <View>
            <SectionTitle>ข้อมูลเพิ่มเติม</SectionTitle>
            <View className="rounded-3xl border border-[#DCC3B3] bg-white px-5">
              {specs.map((row, i) => (
                <View
                  key={row.label}
                  className={`flex-row py-3 ${
                    i < specs.length - 1 ? "border-b border-[#F0E4D8]" : ""
                  }`}
                >
                  <Text className="w-28 text-sm text-[#947D6D]">
                    {row.label}
                  </Text>
                  <Text className="flex-1 text-sm font-medium text-[#49352D]">
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ตารางไซส์ */}
        {hasSizeTable && (
          <View>
            <SectionTitle>ตารางไซส์</SectionTitle>
            <SizeTable rows={product.size_charts} />
          </View>
        )}

        {/* ร้านค้า */}
        {product.brand && (
          <View>
            <SectionTitle>ร้านค้า</SectionTitle>
            <ShopCard brand={product.brand} />
          </View>
        )}
      </ScrollView>

      {/* แถบราคา + ปุ่มลองใส่ ติดด้านล่าง */}
      <View
        className="absolute inset-x-0 bottom-0 flex-row items-center justify-between border-t border-[#EADCCF] bg-white px-5 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 14) }}
      >
        <View className="mr-4 flex-1">
          <Text numberOfLines={1} className="text-xs text-[#947D6D]">
            {product.name}
          </Text>
          <Text className="text-xl font-bold text-[#3E2C25]">
            {formatPrice(product.price)}
          </Text>
        </View>

        <Pressable
          onPress={handleTryOn}
          className="flex-row items-center rounded-full bg-[#3E2C25] px-6 py-3.5 active:opacity-85"
        >
          <Ionicons name="shirt-outline" size={18} color="#FFFFFF" />
          <Text className="ml-2 text-sm font-semibold text-white">
            ลองใส่ชุดนี้
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
