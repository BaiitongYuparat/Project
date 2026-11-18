import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import type { Product } from "../../service/productService";
import { formatPrice } from "../../utils/product";

type Props = {
  product: Product;
  isFavorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
  onTryOn: () => void;
};

export default function ProductCard({
  product,
  isFavorite,
  onPress,
  onToggleFavorite,
  onTryOn,
}: Props) {
  const image = product.images[0]?.image_url;

  return (
    <Pressable onPress={onPress} className="flex-1 active:opacity-80">
      <View className="overflow-hidden rounded-2xl border border-[#E7DCCF] bg-white">
        <View className="aspect-[4/5] w-full bg-[#F3EAE1]">
          {image ? (
            <Image
              source={{ uri: image }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Ionicons name="image-outline" size={28} color="#B9A897" />
            </View>
          )}
        </View>

        <Pressable
          onPress={onToggleFavorite}
          hitSlop={8}
          className="absolute right-2 top-2 h-9 w-9 items-center justify-center rounded-full bg-white/90 active:opacity-70"
        >
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={20}
            color={isFavorite ? "#C2645A" : "#7B675A"}
          />
        </Pressable>
      </View>

      <View className="mt-2 px-0.5">
        <Text
          numberOfLines={2}
          className="text-sm font-semibold leading-5 text-[#3B2F2A]"
        >
          {product.name}
        </Text>

        <Text numberOfLines={1} className="mt-0.5 text-xs text-[#8A7B72]">
          {product.brand?.brand_name ?? product.name}
        </Text>

        <View className="mt-1 flex-row items-center justify-between">
          <Text className="text-base font-bold text-[#3B2F2A]">
            {formatPrice(product.price)}
          </Text>

          <Pressable
            onPress={onTryOn}
            hitSlop={6}
            className="rounded-full bg-[#3B2F2A] px-3 py-1 active:opacity-80"
          >
            <Text className="text-[11px] font-semibold text-white">ลองใส่</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
