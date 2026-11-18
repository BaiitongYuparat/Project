import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Image } from "expo-image";
import type * as ImagePickerTypes from "expo-image-picker";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../../components/auth/AuthProvider";
import BodyPhotoHints from "../../../components/profile/BodyPhotoHints";
import { getBodyDataById } from "../../../service/bodrservice";
import {
    getBodyImages,
    saveBodyImages,
    verifyBodyImage,
    type PickedImage,
} from "../../../service/bodyImageService";
import { setBody } from "../../../store/bodySlice";
import type { RootState } from "../../../store/store";

const ANGLES = [
    { key: "front", label: "หน้า" },
    { key: "back", label: "หลัง" },
    { key: "left", label: "ซ้าย" },
    { key: "right", label: "ขวา" },
] as const;

type AngleKey = (typeof ANGLES)[number]["key"];
type VerifyStatus = "idle" | "verifying" | "passed" | "failed";
type FileMap = Partial<Record<AngleKey, PickedImage>>;
type StatusMap = Partial<Record<AngleKey, VerifyStatus>>;
type TempKeyMap = Partial<Record<AngleKey, string>>;
type ErrorMap = Partial<Record<AngleKey, string>>;

const BORDER: Record<VerifyStatus | "error", string> = {
    idle: "border-[#DCC3B3]",
    verifying: "border-yellow-400",
    passed: "border-green-400",
    failed: "border-red-400",
    error: "border-red-400",
};

export default function BodyImages() {
    const router = useRouter();
    const dispatch = useDispatch();
    const body = useSelector((state: RootState) => state.body.body);

    const [files, setFiles] = useState<FileMap>({});
    const [status, setStatus] = useState<StatusMap>({});
    const [tempKeys, setTempKeys] = useState<TempKeyMap>({});
    const [angleErrors, setAngleErrors] = useState<ErrorMap>({});
    const [savedImages, setSavedImages] = useState<Record<string, string>>({});
    const [bodyChecked, setBodyChecked] = useState(false);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    const { isLoggedIn, authChecked, requireAuth } = useAuth(); //ดึงสถานะล็อกอิน
    //ถ้าเช็กเสร็จแล้วยังไม่ล็อกอิน ให้ออกจากหน้านี้แล้วเปิด popup เข้าสู่ระบบ
    useEffect(() => {
        if (authChecked && !isLoggedIn) {
            if (router.canGoBack()) router.back();
            else router.replace("/");
            // ล็อกอินสำเร็จแล้วให้กลับมาหน้านี้
            requireAuth(() => router.push("/screens/profile/imge"));
        }
    }, [authChecked, isLoggedIn]);

    // ถ้า store ยังไม่มีข้อมูลร่างกาย ให้โหลดล่าสุดจาก backend
    useEffect(() => {
        if (!authChecked || !isLoggedIn) return;
        if (body?.id) return;
        getBodyDataById()
            .then((latest) => { if (latest?.id) dispatch(setBody(latest)); })
            .catch((e) => {
                if (e?.response?.status !== 404) console.log("load body error", e);
            })
            .finally(() => setBodyChecked(true));
    }, [authChecked, isLoggedIn, body?.id, dispatch]);

    // โหลดรูปที่เคยบันทึกไว้
    useEffect(() => {
        if (!body?.id) return;
        getBodyImages(body.id)
            .then((images) => {
                const map: Record<string, string> = {};
                images.forEach((img) => { map[img.angle] = img.s3; });
                setSavedImages(map);
            })
            .catch((e) => console.log("load body images error", e));
    }, [body?.id]);

    const verify = async (angle: AngleKey, image: PickedImage) => {
        setFiles((prev) => ({ ...prev, [angle]: image }));
        setStatus((prev) => ({ ...prev, [angle]: "verifying" }));
        setTempKeys((prev) => {
            const next = { ...prev };
            delete next[angle];
            return next;
        });
        setSuccess(false);
        // ล้างเฉพาะ error ของมุมนี้ ไม่แตะมุมอื่น
        setAngleErrors((prev) => {
            const next = { ...prev };
            delete next[angle];
            return next;
        });

        try {
            const tempKey = await verifyBodyImage(angle, image);
            setTempKeys((prev) => ({ ...prev, [angle]: tempKey }));
            setStatus((prev) => ({ ...prev, [angle]: "passed" }));
        } catch (err: any) {
            setStatus((prev) => ({ ...prev, [angle]: "failed" }));
            const reason = err?.response?.data?.reason ?? "รูปไม่ผ่านการตรวจสอบ";
            setAngleErrors((prev) => ({ ...prev, [angle]: reason }));
        }
    };

    const launch = async (angle: AngleKey, source: "camera" | "library") => {
        // โหลดตอนใช้งาน: ถ้า dev build ยังไม่มี native module หน้าจะไม่ crash ทั้งหน้า
        let ImagePicker: typeof ImagePickerTypes;
        try {
            ImagePicker = await import("expo-image-picker");
        } catch (e) {
            console.log("expo-image-picker not available", e);
            Alert.alert("ยังใช้งานไม่ได้", "แอปเวอร์ชันนี้ยังไม่รองรับการเลือกรูป กรุณาอัปเดตแอปเป็นเวอร์ชันล่าสุด");
            return;
        }
        const options: ImagePickerTypes.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.8 };
        let result: ImagePickerTypes.ImagePickerResult;

        if (source === "camera") {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) {
                Alert.alert("ไม่ได้รับอนุญาต", "กรุณาอนุญาตให้แอปใช้กล้องในการตั้งค่า");
                return;
            }
            result = await ImagePicker.launchCameraAsync(options);
        } else {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
                Alert.alert("ไม่ได้รับอนุญาต", "กรุณาอนุญาตให้แอปเข้าถึงคลังรูปภาพในการตั้งค่า");
                return;
            }
            result = await ImagePicker.launchImageLibraryAsync(options);
        }

        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        verify(angle, { uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName });
    };

    const pickImage = (angle: AngleKey, label: string) => {
        requireAuth(() =>
            Alert.alert(`รูปด้าน${label}`, "เลือกวิธีเพิ่มรูป", [
                { text: "ถ่ายรูป", onPress: () => launch(angle, "camera") },
                { text: "เลือกจากคลังรูป", onPress: () => launch(angle, "library") },
                { text: "ยกเลิก", style: "cancel" },
            ]),
        );
    };

    const allNewFilesVerified = ANGLES.every((a) => !files[a.key] || status[a.key] === "passed");
    const allAnglesHaveImage = ANGLES.every((a) => files[a.key] || savedImages[a.key]);
    const hasNewImages = Object.keys(tempKeys).length > 0;

    const handleSubmit = async () => {
        if (!body?.id) {
            setAngleErrors({ front: "ไม่พบข้อมูลร่างกาย กรุณากรอกข้อมูลสัดส่วนก่อน" });
            return;
        }
        if (!allAnglesHaveImage) {
            const missing: ErrorMap = {};
            ANGLES.filter((a) => !files[a.key] && !savedImages[a.key])
                .forEach((a) => { missing[a.key] = "กรุณาอัพโหลดรูปมุมนี้"; });
            setAngleErrors(missing);
            return;
        }
        if (!allNewFilesVerified) {
            setAngleErrors((prev) => {
                const next = { ...prev };
                ANGLES.forEach((a) => {
                    if (status[a.key] === "verifying") next[a.key] = "กรุณารอการตรวจสอบให้เสร็จสิ้น";
                });
                return next;
            });
            return;
        }
        if (!hasNewImages) {
            setAngleErrors({ front: "กรุณาเลือกรูปอย่างน้อยหนึ่งมุม" });
            return;
        }

        setSaving(true);
        setAngleErrors({});
        try {
            await saveBodyImages(body.id, tempKeys);
            const refreshed = await getBodyImages(body.id);
            const map: Record<string, string> = {};
            refreshed.forEach((img) => { map[img.angle] = img.s3; });
            setSavedImages(map);
            setFiles({});
            setTempKeys({});
            setStatus({});
            setSuccess(true);
        } catch (err: any) {
            setAngleErrors({ front: err?.response?.data?.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่" });
        } finally {
            setSaving(false);
        }
    };

    if (!authChecked || !isLoggedIn || (!body?.id && !bodyChecked)) {
        return (
            <View className="flex-1 items-center justify-center bg-[#FFFCFA]">
                <ActivityIndicator />
            </View>
        );
    }

    // มุมที่มี error
    const failedAngles = ANGLES.filter((a) => angleErrors[a.key]);
    const submitDisabled = saving || !hasNewImages || !allNewFilesVerified;

    return (
        <>
            <Stack.Screen options={{ headerShown: true, title: "รูปภาพร่างกาย" }} />
            <ScrollView
                className="flex-1 bg-[#FFFCFA]"
                contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 20 }}
            >
                <View>
                    <Text className="text-xl font-bold text-[#3B2F2A]">รูปภาพของฉัน</Text>
                    <Text className="mt-1 text-sm text-[#8A7B72]">
                        อัพโหลดรูปร่างกาย 4 มุม เพื่อให้ AI ลองเสื้อผ้าได้แม่นยำขึ้น
                    </Text>
                </View>

                {!body?.id && (
                    <Pressable
                        onPress={() => router.push({ pathname: "/screens/profile/bodyedit", params: { mode: "edit" } })}
                        className="rounded-xl border border-yellow-300 bg-yellow-50 p-3"
                    >
                        <Text className="text-sm text-yellow-800">
                            ยังไม่มีข้อมูลสัดส่วนร่างกาย กรุณากรอกข้อมูลก่อนบันทึกรูป (แตะเพื่อไปกรอก)
                        </Text>
                    </Pressable>
                )}

                <BodyPhotoHints />

                <View className="flex-row flex-wrap justify-between" style={{ rowGap: 16 }}>
                    {ANGLES.map((angle) => {
                        const file = files[angle.key];
                        const angleStatus = status[angle.key] ?? "idle";
                        const hasError = !!angleErrors[angle.key];
                        const uri = file?.uri ?? savedImages[angle.key];
                        const border = hasError && angleStatus === "idle" ? BORDER.error : BORDER[angleStatus];

                        return (
                            <View
                                key={angle.key}
                                className={`gap-2 rounded-xl border-2 bg-white p-3 ${border}`}
                                style={{ width: "48%" }}
                            >
                                <Pressable
                                    onPress={() => pickImage(angle.key, angle.label)}
                                    disabled={angleStatus === "verifying"}
                                    className="h-48 items-center justify-center overflow-hidden rounded-lg bg-[#F0E4D8]"
                                >
                                    {uri ? (
                                        <Image
                                            source={{ uri }}
                                            style={{ width: "100%", height: "100%" }}
                                            contentFit="contain"
                                        />
                                    ) : (
                                        <Text className="text-sm text-[#8A7B72]">+ เพิ่มรูป</Text>
                                    )}
                                    {angleStatus === "verifying" && (
                                        <View className="absolute inset-0 items-center justify-center bg-black/50">
                                            <ActivityIndicator color="#fff" />
                                            <Text className="mt-1 text-xs text-white">กำลังตรวจสอบ...</Text>
                                        </View>
                                    )}
                                </Pressable>

                                <View className="flex-row items-center justify-between">
                                    <Text className="font-medium text-[#3B2F2A]">{angle.label}</Text>
                                    {angleStatus === "verifying" && <Text className="text-xs text-yellow-600">กำลังตรวจ...</Text>}
                                    {angleStatus === "passed" && <Text className="text-xs text-green-600">✓ ผ่าน</Text>}
                                    {angleStatus === "failed" && <Text className="text-xs text-red-500">✗ ไม่ผ่าน</Text>}
                                </View>

                                <Pressable
                                    onPress={() => pickImage(angle.key, angle.label)}
                                    disabled={angleStatus === "verifying"}
                                    className={`items-center rounded-lg border border-[#DCC3B3] py-1.5 ${angleStatus === "verifying" ? "opacity-50" : ""}`}
                                >
                                    <Text className="text-sm text-[#3B2F2A]">{uri ? "เปลี่ยนรูป" : "อัพโหลดรูป"}</Text>
                                </Pressable>
                            </View>
                        );
                    })}
                </View>

                {/* แสดง error ทุกมุมที่ fail พร้อมเหตุผล ไม่หายเมื่อแก้มุมอื่น */}
                {failedAngles.length > 0 && (
                    <View className="rounded-lg border border-red-200 bg-red-50 p-4">
                        <Text className="mb-2 text-sm font-semibold text-red-700">
                            รูปที่ไม่ผ่านการตรวจสอบ ({failedAngles.length} มุม)
                        </Text>
                        <View className="gap-1">
                            {failedAngles.map((a) => (
                                <View key={a.key} className="flex-row gap-2">
                                    <Text className="text-sm font-medium text-red-600">✗ {a.label}:</Text>
                                    <Text className="flex-1 text-sm text-red-600">{angleErrors[a.key]}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {success && (
                    <View className="rounded-lg bg-green-50 p-3">
                        <Text className="text-sm text-green-600">อัพโหลดรูปสำเร็จแล้ว ✓</Text>
                    </View>
                )}

                <Pressable
                    onPress={handleSubmit}
                    disabled={submitDisabled}
                    className={`items-center rounded-xl bg-[#3B2F2A] py-3.5 ${submitDisabled ? "opacity-50" : ""}`}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text className="font-bold text-white">บันทึกรูปภาพ</Text>
                    )}
                </Pressable>
            </ScrollView>
        </>
    );
}
