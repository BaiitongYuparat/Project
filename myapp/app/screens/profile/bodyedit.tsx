import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import BodyFormFields, { type BodyFormValues } from "../../../components/common/BodyFormFields";
import { getBodyData, createBodyData, updateBodyData } from "../../../service/bodrservice";
import { setBody } from "../../../store/bodySlice";
import { useAuth } from "../../../components/auth/AuthProvider";


export default function BodyEdit() {
    const router = useRouter();
    const dispatch = useDispatch();

    const [initialData, setInitialData] = useState<any>(null); // ใช้ type BodyData ถ้า export ไว้
    const [bodyId, setBodyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const { isLoggedIn, authChecked, requireAuth } = useAuth(); //ดึงสถานะล็อกอิน
    //ถ้าเช็กเสร็จแล้วยังไม่ล็อกอิน ให้ออกจากหน้านี้แล้วเปิด popup เข้าสู่ระบบ
    useEffect(() => {
        if (authChecked && !isLoggedIn) {
            if (router.canGoBack()) router.back();
            else router.replace("/");
            // ล็อกอินสำเร็จแล้วให้กลับมาหน้ากรอกฟอร์ม
            requireAuth(() =>
                router.push({ pathname: "/screens/profile/bodyedit", params: { mode: "edit" } })
            );
        }
    }, [authChecked, isLoggedIn]);

    useEffect(() => {
        if (!authChecked || !isLoggedIn) return
        getBodyData()
            .then((list) => {
                if (!list.length) return;
                const latest = [...list].sort(
                    (a, b) =>
                        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
                )[0];
                setBodyId(latest.id);
                setInitialData(latest);
            })
            .catch((e) => {
                if (e?.response?.status !== 404) console.log("load body error", e);
            })
            .finally(() => setLoading(false));
    }, [authChecked, isLoggedIn]);

    const handleSubmit = async (data: BodyFormValues) => {
        try {
            setSaving(true);
            const payload = {
                weight: Number(data.weight),
                height: Number(data.height),
                chest: Number(data.chest),
                waist: Number(data.waist),
                hips: Number(data.hips),
            };

            const saved = bodyId
                ? await updateBodyData(payload)
                : await createBodyData(payload);

            dispatch(setBody(saved));
            router.back();
        } catch (e) {
            console.log("Error save body", e);
            Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้");
        } finally {
            setSaving(false);
        }
    };

    if (!authChecked || !isLoggedIn || loading) {
        return (
            <View className="flex-1 items-center justify-center bg-[#FFFCFA]">
                <ActivityIndicator />
            </View>
        );
    }
    return (
        <>
            <Stack.Screen options={{ headerShown: true, title: "ข้อมูลร่างกาย" }} />
            <BodyFormFields
                initialData={initialData}
                submitLabel="บันทึก"
                isLoading={saving}
                onSubmit={handleSubmit}
            />
        </>
    );
}