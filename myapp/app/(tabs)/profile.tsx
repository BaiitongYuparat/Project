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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import ProfileMenuButton from "@/components/profile/ProfileMenuButton";
import { CustomButton } from "@/components/common/Button";
import { useAuth } from "../../components/auth/AuthProvider";





export default function ProfileScreen() {
    const router = useRouter();

    const { isLoggedIn, logout, requireAuth } = useAuth();


    const handleLogout = async () => {
        await logout();
        router.replace("/");
    };




    return (
        <ScrollView className="flex-1 bg-[#FFFDFB]" contentContainerStyle={{ padding: 16 }}>
            <Text className="text-3xl font-bold text-[#3B2F2A] mb-4">โปรไฟล์</Text>

            <View className="flex-1 p-4">
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
            {isLoggedIn ? (
                <CustomButton
                    title="ออกจากระบบ"
                    variant="primary"
                    onPress={handleLogout}
                    className="mt-6"
                />
            ) : (
                <CustomButton
                    title="เข้าสู่ระบบ"
                    variant="secondary"
                    onPress={() => requireAuth()}
                    className="mt-6"
                />
            )}


        </ScrollView>
    );

}