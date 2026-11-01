import type { RootState } from "@/store/store";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/components/auth/AuthProvider";

export default function UserHeader() {
  const router = useRouter();
  const { requireAuth, logout } = useAuth();
  const user = useSelector((state: RootState) => state.user.user);

  // ตัวอักษรแรกของชื่อ/อีเมล ใช้เป็นรูปโปรไฟล์ชั่วคราว
  const initial = (user?.name ?? user?.email ?? "?").charAt(0).toUpperCase();

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  return (
    <Pressable
      onPress={() => requireAuth()}
      disabled={!!user} // ล็อกอินแล้วตัวการ์ดกดไม่ได้ แค่โชว์ชื่อ
      className="mb-4 flex-row items-center rounded-3xl bg-[#F0E4D8] p-4 active:opacity-80"
    >
      <View className="h-16 w-16 items-center justify-center rounded-full bg-[#7B675A]">
        {user ? (
          <Text className="text-2xl font-bold text-[#FFFDFB]">{initial}</Text>
        ) : (
          <Ionicons name="person" size={28} color="#FFFDFB" />
        )}
      </View>

      <View className="ml-4 flex-1">
        <Text className="text-xl font-bold text-[#3B2F2A]" numberOfLines={1}>
          {user ? user.name ?? "ผู้ใช้" : "ยังไม่ได้เข้าสู่ระบบ"}
        </Text>
        {user && (
          <Text className="mt-1 text-sm text-[#8A7B72]" numberOfLines={1}>
            {user.email}
          </Text>
        )}
      </View>

      {user ? (
        <Pressable
          onPress={handleLogout}
          hitSlop={8}
          className="flex-row items-center rounded-full border border-[#7B675A] px-3 py-2 active:bg-[#E8DDD5]"
        >
          <Text className="ml-1 text-sm font-semibold text-[#7B675A]">ออกจากระบบ</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => requireAuth()}
          hitSlop={8}
          className="flex-row items-center rounded-full bg-[#7B675A] px-3 py-2 active:opacity-80"
        >
          <Text className="text-sm font-semibold text-[#FFFDFB]">เข้าสู่ระบบ</Text>
        </Pressable>
      )}
    </Pressable>
  );
}