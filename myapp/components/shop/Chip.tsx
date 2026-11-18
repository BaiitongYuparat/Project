import { Pressable, Text } from "react-native";

type Props = {
  label: string;
  active?: boolean;
  onPress: () => void;
};

/** ชิปตัวกรอง ใช้ร่วมกันทั้งหน้า Home และหน้ารายละเอียดสินค้า */
export default function Chip({ label, active = false, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-4 py-2 active:opacity-80 ${
        active
          ? "border-[#3B2F2A] bg-[#3B2F2A]"
          : "border-[#DCC3B3] bg-white"
      }`}
    >
      <Text
        className={`text-sm ${
          active ? "font-semibold text-white" : "text-[#3B2F2A]"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
