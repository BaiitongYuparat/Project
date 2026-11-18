import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { CustomButton } from "./Button";

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** สถานะว่าง / ผิดพลาด ใช้ซ้ำได้ทุกหน้า */
export default function StateView({
  icon = "sparkles-outline",
  title,
  message,
  actionLabel,
  onAction,
}: Props) {
  return (
    <View className="items-center justify-center rounded-3xl border border-dashed border-[#DCC3B3] bg-white px-6 py-12">
      <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-[#F0E4D8]">
        <Ionicons name={icon} size={26} color="#7B675A" />
      </View>

      <Text className="text-center text-base font-bold text-[#3B2F2A]">
        {title}
      </Text>

      {!!message && (
        <Text className="mt-2 text-center text-sm leading-6 text-[#8A7B72]">
          {message}
        </Text>
      )}

      {actionLabel && onAction && (
        <CustomButton
          title={actionLabel}
          onPress={onAction}
          size="sm"
          className="mt-5 px-6"
        />
      )}
    </View>
  );
}
