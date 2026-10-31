import { View, Text } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useAuth } from "../../../components/auth/AuthProvider";
export default function Setting() {
    const router = useRouter();

    const { isLoggedIn, authChecked, requireAuth } = useAuth(); //ดึงสถานะล็อกอิน
    //ถ้าเช็กเสร็จแล้วยังไม่ล็อกอิน ให้ออกจากหน้านี้แล้วเปิด popup เข้าสู่ระบบ
    useEffect(() => {
        if (authChecked && !isLoggedIn) {
            if (router.canGoBack()) router.back();
            else router.replace("/");
            // ล็อกอินสำเร็จแล้วให้กลับมาหน้ากรอกฟอร์ม
            requireAuth(() =>
                router.push({ pathname: "/screens/profile/imge", params: { mode: "edit" } })
            );
        }
    }, [authChecked, isLoggedIn]);

    useEffect(() => {
        if (!authChecked || !isLoggedIn) return
    
    },[authChecked, isLoggedIn]);

    return (
        <>
            <Stack.Screen options={{ headerShown: true, title: "รูปภาพร่างกาย" }} />
        </>
    );
}