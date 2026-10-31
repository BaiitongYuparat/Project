import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Button,
    Pressable,
    Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import ProfileMenuButton from "@/components/profile/ProfileMenuButton";
import UserHeader from "@/components/profile/UserHeader";



export default function ProfileScreen() {
    const router = useRouter();


    return (
        <ScrollView
            className="flex-1 bg-[#FFFDFB]"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        >
            <Text className="text-3xl font-bold text-[#3B2F2A] mb-5">โปรไฟล์</Text>

            <UserHeader />
            <Text className="mt-4 mb-3 text-xl font-semibold text-[#8A7B72]">เมนู</Text>

            <View className="gap-1">
                <ProfileMenuButton
                    title="ข้อมูลร่างกาย"
                    icon={<Ionicons name="body" size={20} color="#7B675A" />}
                    onPress={() => router.push({ pathname: "/screens/profile/bodyedit", params: { mode: "edit" } })}
                />
                <ProfileMenuButton
                    title="รูปร่างกาย4ด้าน"
                    icon={<Ionicons name="images" size={20} color="#7B675A" />}
                    onPress={() => router.push('/screens/profile/imge')}
                />
                <ProfileMenuButton
                    title="ตั้งค่า & ช่วยเหลือ"
                    icon={<Ionicons name="settings" size={20} color="#7B675A" />}
                    onPress={() => router.push('/screens/profile/setting')}
                />

            </View>
        </ScrollView>
    );

}