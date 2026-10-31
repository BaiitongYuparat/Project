import { useEffect, useState } from "react";
import { Alert, BackHandler } from "react-native";
import { Stack, useRouter } from "expo-router";
import BodyFormFields, { type BodyFormValues } from "../../../components/common/BodyFormFields";
import { createBodyData } from "../../../service/bodrservice";
import { setBody } from "../../../store/bodySlice";
import { useDispatch } from "react-redux";

export default function BodySetup() {
    const router = useRouter();
    const dispatch = useDispatch();
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
        return () => sub.remove();
    }, []);

    const handleSubmit = async (data: BodyFormValues) => {
        try {
            setSaving(true);
            const saved = await createBodyData(data);
            dispatch(setBody(saved ?? data)); // ใช้ type BodyData ถ้า export ไว้
            router.replace("/");
        } catch (e) {
            console.log("Error save body", e);
            Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้");
        } finally {
            setSaving(false);
        }
    };
    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: "กรอกข้อมูลร่างกาย",
                    headerBackVisible: false,
                    gestureEnabled: false,
                }}
            />
            <BodyFormFields
                description="ใช้เพื่อสร้างภาพสวมใส่และแนะนำชุดที่เหมาะ"
                submitLabel="ถัดไป"
                isLoading={saving}
                onSubmit={handleSubmit}
            />
        </>
    );
}
