import { View, Text, Pressable } from "react-native";
import { useAuth } from "../../components/auth/AuthProvider";

export default function TryOn() {
  const { requireAuth } = useAuth();

  const startTryOn = () => {

  };

  return (
    <View className="flex-1 items-center justify-center">
      <Text className="mb-6">Try-On</Text>

      {/* เปิดหน้าได้ แต่กดใช้งานต้องล็อกอิน */}
      <Pressable
        onPress={() => requireAuth(startTryOn)}
        className="rounded-full bg-[#3B2F2A] px-8 py-4"
      >
        <Text className="font-bold text-white">เริ่มลองชุด</Text>
      </Pressable>
    </View>
  );
}