import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import type { ProductDetailImage } from "../../service/productService";
import { pieceLabel, viewLabel } from "../../utils/product";

type Props = {
  images: ProductDetailImage[];
  productName: string;
  width: number;
};

/** แกลเลอรีรูปสินค้า — ปัดซ้าย/ขวาหรือกดลูกศร + thumbnail ทุกด้าน */
export default function ProductGallery({ images, productName, width }: Props) {
  const listRef = useRef<FlatList<ProductDetailImage>>(null);
  const [index, setIndex] = useState(0);

  const activeIndex = Math.min(index, Math.max(images.length - 1, 0));
  const activeImage = images[activeIndex];

  const goTo = (next: number) => {
    if (images.length === 0) return;
    const target = ((next % images.length) + images.length) % images.length;
    setIndex(target);
    listRef.current?.scrollToIndex({ index: target, animated: true });
  };

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const badge = [viewLabel(activeImage?.view), pieceLabel(activeImage?.piece)]
    .filter(Boolean)
    .join(" · ");

  if (images.length === 0) {
    return (
      <View
        style={{ width, height: width }}
        className="items-center justify-center rounded-2xl bg-[#F3E1D4]"
      >
        <Ionicons name="image-outline" size={32} color="#947D6D" />
        <Text className="mt-2 text-sm text-[#947D6D]">ไม่มีรูปภาพ</Text>
      </View>
    );
  }

  return (
    <View>
      <View
        style={{ width, height: width }}
        className="overflow-hidden rounded-2xl border border-[#DCC3B3] bg-[#F3E1D4]"
      >
        <FlatList
          ref={listRef}
          data={images}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          getItemLayout={(_, i) => ({
            length: width,
            offset: width * i,
            index: i,
          })}
          renderItem={({ item }) => (
            <Image
              source={item.image_url ? { uri: item.image_url } : undefined}
              style={{ width, height: width }}
              contentFit="cover"
              transition={200}
              accessibilityLabel={`${productName} - ${viewLabel(item.view) ?? "รูปสินค้า"}`}
            />
          )}
        />

        {badge ? (
          <View className="absolute left-3 top-3 rounded-full bg-white/85 px-3 py-1">
            <Text className="text-[11px] font-medium text-[#503C32]">
              {badge}
            </Text>
          </View>
        ) : null}

        {images.length > 1 && (
          <>
            <Pressable
              onPress={() => goTo(activeIndex - 1)}
              accessibilityLabel="รูปก่อนหน้า"
              className="absolute left-3 top-1/2 -mt-[18px] h-9 w-9 items-center justify-center rounded-full border border-[#DCC3B3] bg-white/85 active:opacity-70"
            >
              <Ionicons name="chevron-back" size={18} color="#49352D" />
            </Pressable>
            <Pressable
              onPress={() => goTo(activeIndex + 1)}
              accessibilityLabel="รูปถัดไป"
              className="absolute right-3 top-1/2 -mt-[18px] h-9 w-9 items-center justify-center rounded-full border border-[#DCC3B3] bg-white/85 active:opacity-70"
            >
              <Ionicons name="chevron-forward" size={18} color="#49352D" />
            </Pressable>

            <View className="absolute bottom-3 self-center flex-row rounded-full bg-black/25 px-2 py-1">
              {images.map((image, i) => (
                <View
                  key={image.id}
                  className={`mx-0.5 h-1.5 rounded-full ${
                    i === activeIndex ? "w-4 bg-white" : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </View>
          </>
        )}
      </View>

      {images.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ gap: 8 }}
        >
          {images.map((image, i) => (
            <Pressable
              key={image.id}
              onPress={() => goTo(i)}
              accessibilityLabel={`ดูรูป${viewLabel(image.view) ?? "สินค้า"}`}
              className={`h-20 w-20 overflow-hidden rounded-xl border-2 bg-[#F3E1D4] ${
                i === activeIndex ? "border-[#3E2C25]" : "border-[#DCC3B3]"
              }`}
            >
              {image.image_url ? (
                <Image
                  source={{ uri: image.image_url }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-xs text-[#947D6D]">ไม่มีรูป</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
