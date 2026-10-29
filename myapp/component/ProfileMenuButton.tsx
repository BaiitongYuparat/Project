import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

interface MenuButtonProps {
  title: string;
  icon: React.ReactNode;
  onPress: () => void;
  showDivider?: boolean;
}

export default function ProfileMenuButton({
  title,
  icon,
  onPress,
  showDivider = true,
}: MenuButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`bg-[#F0E4D8] px-5 py-4 ${
        showDivider ? "border-b border-[#E3D3C2]" : ""
      }`}
    >
      <View className="flex-row items-center">
        <View className="mr-3">{icon}</View>
        <Text className="flex-1 text-lg font-bold text-[#4A3728]">{title}</Text>
        <Ionicons name="chevron-forward" size={18} color="#8A7F76" />
      </View>
    </TouchableOpacity>
  );
}

