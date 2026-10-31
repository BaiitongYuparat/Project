import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import GoogleLogo from "../common/GoogleLogo";
import { login, logout as logoutAction, setAuthChecked } from "../../store/userSlice";
import type { RootState } from "../../store/store";
import { useDispatch, useSelector } from "react-redux";
import { getMe } from "../../service/userservice"


type AuthContextType = {
  isLoggedIn: boolean;
  authChecked: boolean
  //ถ้าlogin แล้วรัน action ทันที ถ้ายังไม่login ให้เด้งหน้าlogin
  requireAuth: (action?: () => void) => boolean;
  logout: () => Promise<void>
}

//ที่เก็บกลางใช้เก็บข้อมูลที่หลายหน้าต้องใช้ร่วมกัน
const AuthContext = createContext<AuthContextType>(null as any)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [visible, setVisible] = useState(false); //popupเปิดอยู่ไหม
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  const dispatch = useDispatch();

  // อ่านสถานะจาก Redux
  const user = useSelector((state: RootState) => state.user.user)
  const authChecked = useSelector((state: RootState) => state.user.authChecked)

  const isLoggedIn = !!user;


  useEffect(() => {
    GoogleSignin.configure({
      webClientId: "478226735639-r7igr0pgvektnlfm74akc4erjnlbg3ur.apps.googleusercontent.com", // Web client ID ตัวเดียวกับ GOOGLE_CLIENT_ID ใน backend/.env
    });

    // เช็ก token ที่เก็บไว้ แล้วดึงข้อมูล user เข้า Redux
    const chackAuth = async () => {
      try {
        const token = await AsyncStorage.getItem("token")
        if (token) {
          const user = await getMe()
          dispatch(login(user))
        }
      } catch (error) {
        await AsyncStorage.removeItem("token")
        dispatch(logoutAction())
      } finally {
        dispatch(setAuthChecked())
      }
    }
    chackAuth()
  }, []);

  // เช็ก token ที่เก็บไว้ แล้วดึงข้อมูล user เข้า Redux

  const requireAuth = (action?: () => void) => {
    if (isLoggedIn) {
      action?.() // ล็อกอินแล้ว ทำเลย
      return true
    }
    setPendingAction(() => action ?? null) // จำไว้ว่าอยากทำอะไร
    setVisible(true) // เปิด popup
    return false
  }

  const logout = async () => {
    await AsyncStorage.removeItem("token")
    dispatch(logoutAction())
  }

  const onGooglePress = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      try {
        await GoogleSignin.signOut();
      } catch { }
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        return;
      }

      const idToken = response.data.idToken;
      if (!idToken) throw new Error("No idToken");

      const result = await loginWithGoogle(idToken);
      await AsyncStorage.setItem("token", result.token);
      dispatch(login(result.user));
      setVisible(false)

      if (result.isNewUser) {
        router.replace("/screens/profile/bodysetup")
      } else {
        pendingAction?.() //ทำงานต่อจากที่ผู้ใช้ ใช้ค้างไว้
      }
      setPendingAction(null)
    } catch (error) {
      console.error("LOGIN ERROR:", error);
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถเข้าสู่ระบบได้");
    } finally {
      setLoading(false);
    }
  };



  return (
    <AuthContext.Provider value={{ isLoggedIn, requireAuth, authChecked, logout }}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 px-6"
          onPress={() => !loading && setVisible(false)}
        >
          <Pressable onPress={() => { }} className="w-full rounded-3xl bg-[#FFFDFB] px-6 py-8">
            <Text className="mb-3 text-center text-2xl font-bold text-[#3B2F2A]">
              Welcome to LongDress
            </Text>
            <Text className="mb-8 text-center text-base leading-6 text-[#8A7B72]">
              ใช้บัญชี Google เพื่อเข้าสู่ระบบหรือสร้างบัญชีในขั้นตอนเดียว
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
          </Pressable>

        </Pressable>

      </Modal>
    </AuthContext.Provider>
  );
};
