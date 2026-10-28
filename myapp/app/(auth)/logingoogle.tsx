import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import { loginWithGoogle } from "../../service/authservice";
import GoogleLogo from "../../component/GoogleLogo";

const LoginScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: "478226735639-r7igr0pgvektnlfm74akc4erjnlbg3ur.apps.googleusercontent.com", // Web client ID ตัวเดียวกับ GOOGLE_CLIENT_ID ใน backend/.env
    });
  }, []);

  const onGooglePress = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) return;
      const idToken = response.data.idToken;
      if (!idToken) throw new Error("No idToken");


      const result = await loginWithGoogle(idToken);
      await AsyncStorage.setItem("token", result.token);

      router.replace(result.isNewUser ? "/(auth)/body" : "/(tabs)/home")

    } catch (error) {
      console.error("LOGIN ERROR:", error);
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถเข้าสู่ระบบได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#FFFDFB]"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-1 items-center justify-center px-6">
        <Text className="mb-3 text-center text-3xl font-bold text-[#3B2F2A]">
          ยินดีต้อนรับสู่ LongDress
        </Text>
        <Text className="mb-10 text-center text-base leading-6 text-[#8A7B72]">
          เข้าสู่ระบบหรือสร้างบัญชีใหม่ด้วย Google{"\n"}ในขั้นตอนเดียว
        </Text>

        <Pressable
          onPress={onGooglePress}
          disabled={loading}
          className={`w-full flex-row items-center justify-center gap-[14px] rounded-full border-2 border-[#3B2F2A] bg-[#FFFDFB] py-[18px] active:bg-[#F5EEE9] ${loading ? "opacity-60" : ""
            }`}
        >
          <GoogleLogo size={24} />
          <Text className="text-lg font-bold text-[#3B2F2A]">
            {loading ? "กำลังดำเนินการ..." : "ดำเนินการต่อด้วย Google"}
          </Text>
        </Pressable>

        <Text className="mt-7 text-center text-sm leading-[22px] text-[#8A7B72]">
          การดำเนินการต่อถือว่าคุณยอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัว
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;