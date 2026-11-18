import { Pressable, Text, View } from "react-native";

import type { ProductDetailColor } from "../../service/productService";

type Props = {
  colors: ProductDetailColor[];
  selectedColorId: string | null;
  onSelect: (colorId: string | null) => void;
};

/** ตัวเลือกสีสินค้า — "ทั้งหมด" = แสดงด้านหน้าของทุกสี */
export default function ColorSwatches({
  colors,
  selectedColorId,
  onSelect,
}: Props) {
  if (colors.length === 0) return null;

  const selectedName =
    colors.find((color) => color.id === selectedColorId)?.name ?? "แสดงทุกสี";

  return (
    <View>
      <View className="mb-2.5 flex-row items-center justify-between">
        <Text className="text-xs font-medium text-[#947D6D]">สีสินค้า</Text>
        <Text className="text-xs font-medium text-[#3E2C25]">
          {selectedName}
        </Text>
      </View>

      <View className="flex-row flex-wrap items-center gap-2.5">
        <Pressable
          onPress={() => onSelect(null)}
          accessibilityLabel="ดูสินค้าทุกสี"
          className={`h-9 items-center justify-center rounded-full border px-3 ${
            selectedColorId === null
              ? "border-[#3E2C25] bg-[#3E2C25]"
              : "border-[#DCC3B3] bg-white"
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              selectedColorId === null ? "text-white" : "text-[#49352D]"
            }`}
          >
            ทั้งหมด
          </Text>
        </Pressable>

        {colors.map((color) => {
          const isSelected = color.id === selectedColorId;

          return (
            <Pressable
              key={color.id}
              onPress={() => onSelect(color.id)}
              accessibilityLabel={`เลือกสี${color.name}`}
              className={`h-10 w-10 items-center justify-center rounded-full border-2 ${
                isSelected ? "border-[#3E2C25]" : "border-transparent"
              }`}
            >
              <View
                className="h-8 w-8 rounded-full border border-[#DCC3B3]"
                style={{ backgroundColor: color.hex ?? "#EFE3D6" }}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
