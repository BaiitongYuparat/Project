import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Linking, Pressable, Text, View } from "react-native";

import type { ProductDetailBrand } from "../../service/productService";

/** การ์ดร้านค้า — โลโก้ ชื่อร้าน และลิงก์ช่องทางติดต่อ */
export default function ShopCard({ brand }: { brand: ProductDetailBrand }) {
  const links = [
    { key: "store", label: "เว็บไซต์ร้าน", url: brand.store_url },
    { key: "facebook", label: "Facebook", url: brand.facebook_url },
    { key: "instagram", label: "Instagram", url: brand.instagram_url },
    {
      key: "line",
      label: "LINE",
      url: brand.line_id ? `https://line.me/ti/p/~${brand.line_id}` : null,
    },
  ].filter((link): link is typeof link & { url: string } => Boolean(link.url));

  return (
    <View className="rounded-3xl border border-[#DCC3B3] bg-white p-5">
      <View className="flex-row items-center">
        {brand.logo_url ? (
          <Image
            source={{ uri: brand.logo_url }}
            style={{ width: 64, height: 64, borderRadius: 16 }}
            contentFit="cover"
            accessibilityLabel={`โลโก้ร้าน ${brand.brand_name}`}
          />
        ) : (
          <View className="h-16 w-16 items-center justify-center rounded-2xl border border-[#EADCCF] bg-[#FAF5EF]">
            <Text className="text-2xl font-bold text-[#3E2C25]">
              {brand.brand_name?.charAt(0)?.toUpperCase() ?? "ร"}
            </Text>
          </View>
        )}

        <View className="ml-4 flex-1">
          <Text numberOfLines={1} className="text-base font-bold text-[#3E2C25]">
            {brand.brand_name}
          </Text>
          <Text className="mt-0.5 text-xs font-medium text-[#947D6D]">
            ร้านค้าที่ผ่านการยืนยันตัวตน
          </Text>
        </View>
      </View>

      {links.length > 0 && (
        <View className="mt-5 flex-row flex-wrap gap-2 border-t border-[#F0E4D8] pt-4">
          {links.map((link) => (
            <Pressable
              key={link.key}
              onPress={() => void Linking.openURL(link.url)}
              className="flex-row items-center rounded-full border border-[#DCC3B3] bg-[#FAF5EF] px-4 py-2 active:bg-[#EFE3D6]"
            >
              <Text className="text-xs font-medium text-[#49352D]">
                {link.label}
              </Text>
              <Ionicons
                name="open-outline"
                size={12}
                color="#947D6D"
                style={{ marginLeft: 4 }}
              />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
