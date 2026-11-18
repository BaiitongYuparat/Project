import { Text, View } from "react-native";

type Props = {
  children: string;
  subtitle?: string;
};

/** หัวข้อ section ในหน้ารายละเอียดสินค้า — แถบสีด้านซ้าย + คำอธิบายเสริม */
export default function SectionTitle({ children, subtitle }: Props) {
  return (
    <View className="mb-3">
      <View className="flex-row items-center">
        <View className="mr-2.5 h-5 w-1.5 rounded-full bg-[#3E2C25]" />
        <Text className="text-lg font-bold text-[#3E2C25]">{children}</Text>
      </View>
      {subtitle ? (
        <Text className="mt-1 pl-4 text-xs text-[#947D6D]">{subtitle}</Text>
      ) : null}
    </View>
  );
}
