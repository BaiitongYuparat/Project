import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { closeSuspended, setSuspendedAppeal } from "../../store/uiSlice";
import { getMyAppeals, submitAppeal, toAppealSummary } from "../../service/appealService";
import type { RootState } from "../../store/store";

// popup บัญชีถูกระงับ (เหมือน SuspendedAppealModal / SuspendedModal ฝั่งเว็บ)
// - โดนระงับตอน login (มี appealToken) → แจ้งเตือน + ยื่นคำร้องขอปลดระงับได้
// - โดนระงับระหว่างใช้งาน (ไม่มี appealToken) → แจ้งเตือน + ให้เข้าสู่ระบบใหม่เพื่อยื่นคำร้อง
type Props = {
    onLoginAgain: () => void;
};

type Step = "notice" | "form" | "success";

const STATUS_LABEL: Record<string, string> = {
    PENDING: "รอผู้ดูแลพิจารณา",
    APPROVED: "อนุมัติแล้ว",
    REJECTED: "ถูกปฏิเสธ",
};

const STATUS_PILL: Record<string, { bg: string; text: string }> = {
    PENDING: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
    REJECTED: { bg: "bg-red-50 border-red-200", text: "text-red-700" },
    APPROVED: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
};

const formatDateTime = (iso?: string | null) =>
    iso
        ? new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })
        : "-";

export default function SuspendedAppealModal({ onLoginAgain }: Props) {
    const dispatch = useDispatch();
    const visible = useSelector((s: RootState) => s.ui.isSuspendedOpen);
    const appealToken = useSelector((s: RootState) => s.ui.appealToken);
    const appeal = useSelector((s: RootState) => s.ui.latestAppeal);

    const [step, setStep] = useState<Step>("notice");
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ดึงสถานะคำร้องล่าสุดให้สด — ถ้าดึงไม่ได้ใช้ค่าจากตอน login ต่อ
    useEffect(() => {
        if (!visible || !appealToken) return;
        let cancelled = false;
        getMyAppeals(appealToken)
            .then((list) => {
                if (!cancelled && list.length > 0) dispatch(setSuspendedAppeal(toAppealSummary(list[0])));
            })
            .catch(() => { /* token หมดอายุ — เงียบไว้ */ });
        return () => { cancelled = true; };
    }, [visible, appealToken, dispatch]);

    const close = () => {
        if (submitting) return;
        dispatch(closeSuspended());
        setStep("notice");
        setTitle("");
        setMessage("");
        setError(null);
    };

    // คำร้องรอพิจารณาอยู่ → ไม่ให้เข้าฟอร์มซ้ำ
    const activeStep: Step = step === "form" && appeal?.status === "PENDING" ? "notice" : step;

    const canSubmit =
        title.trim().length >= 3 &&
        title.trim().length <= 120 &&
        message.trim().length >= 9 &&
        message.trim().length <= 2000 &&
        !submitting;

    const handleSubmit = async () => {
        if (!appealToken || !canSubmit) return;
        setSubmitting(true);
        setError(null);
        try {
            const created = await submitAppeal(appealToken, {
                title: title.trim(),
                message: message.trim(),
            });
            dispatch(setSuspendedAppeal(toAppealSummary(created)));
            setStep("success");
        } catch (err: any) {
            const status = err?.response?.status;
            const data = err?.response?.data;
            if (status === 409) setError(data?.error ?? "คุณมีคำร้องที่รอพิจารณาอยู่แล้ว");
            else if (status === 401) setError("หมดเวลาการยืนยันตัวตน กรุณาปิดหน้าต่างนี้แล้วเข้าสู่ระบบอีกครั้ง");
            else setError(data?.error ?? data?.message ?? "ส่งคำร้องไม่สำเร็จ กรุณาลองใหม่");
        } finally {
            setSubmitting(false);
        }
    };

    const pill = appeal ? STATUS_PILL[appeal.status] ?? STATUS_PILL.APPROVED : null;

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                className="flex-1"
            >
                <Pressable className="flex-1 items-center justify-center bg-black/40 px-5" onPress={close}>
                    <Pressable onPress={() => { }} className="max-h-[85%] w-full rounded-3xl bg-white">
                        <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
                            {/* หัวเรื่อง */}
                            <View className="items-center">
                                <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-red-100">
                                    <Text className="text-xl font-bold text-red-600">!</Text>
                                </View>
                                <Text className="text-lg font-semibold text-stone-900">บัญชีของคุณถูกระงับ</Text>
                                <Text className="mt-1 text-center text-sm leading-5 text-stone-600">
                                    บัญชีของคุณถูกระงับการใช้งาน
                                    {activeStep === "notice"
                                        ? appealToken
                                            ? " หากเห็นว่าไม่ถูกต้องสามารถยื่นคำร้องเพื่อให้ผู้ดูแลตรวจสอบได้"
                                            : " กรุณาติดต่อแอดมิน หรือเข้าสู่ระบบอีกครั้งเพื่อยื่นคำร้องขอปลดระงับ"
                                        : ""}
                                </Text>
                            </View>

                            {/* ---------- แจ้งสถานะ ---------- */}
                            {activeStep === "notice" && (
                                <View className="mt-5 gap-3">
                                    {appeal && pill && (
                                        <View className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                                            <View className="flex-row items-center justify-between gap-2">
                                                <Text className="text-sm font-medium text-stone-700">คำร้องของคุณ</Text>
                                                <View className={`rounded-full border px-2.5 py-0.5 ${pill.bg}`}>
                                                    <Text className={`text-xs font-medium ${pill.text}`}>
                                                        {STATUS_LABEL[appeal.status] ?? appeal.status}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text className="mt-1.5 text-xs text-stone-500">
                                                ยื่นเมื่อ {formatDateTime(appeal.created_at)}
                                            </Text>

                                            {appeal.status === "PENDING" && (
                                                <Text className="mt-2 text-sm leading-5 text-stone-600">
                                                    คำร้องอยู่ระหว่างการพิจารณา กรุณารอการตรวจสอบจากผู้ดูแล
                                                    (ผลจะแจ้งให้ทราบตอนเข้าสู่ระบบครั้งถัดไป)
                                                </Text>
                                            )}
                                            {appeal.status === "REJECTED" && (
                                                <>
                                                    <Text className="mt-2 text-sm text-stone-600">คำร้องของคุณถูกปฏิเสธ</Text>
                                                    {!!appeal.admin_note && (
                                                        <View className="mt-1 rounded-lg border border-stone-200 bg-white p-2.5">
                                                            <Text className="text-sm text-stone-700">
                                                                <Text className="font-medium">เหตุผลจากผู้ดูแล: </Text>
                                                                {appeal.admin_note}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </>
                                            )}
                                        </View>
                                    )}

                                    {!!error && <Text className="text-sm text-red-600">{error}</Text>}

                                    <View className="gap-2">
                                        {appealToken && appeal?.status !== "PENDING" && (
                                            <ModalButton
                                                variant="primary"
                                                title={appeal?.status === "REJECTED" ? "ยื่นคำร้องอีกครั้ง" : "ยื่นคำร้องขอปลดระงับ"}
                                                onPress={() => { setError(null); setStep("form"); }}
                                            />
                                        )}
                                        {!appealToken && (
                                            <ModalButton
                                                variant="primary"
                                                title="เข้าสู่ระบบเพื่อยื่นคำร้อง"
                                                onPress={() => { close(); onLoginAgain(); }}
                                            />
                                        )}
                                        <ModalButton
                                            variant="secondary"
                                            title={appeal?.status === "PENDING" ? "รับทราบ" : "ปิดหน้าต่าง"}
                                            onPress={close}
                                        />
                                    </View>
                                </View>
                            )}

                            {/* ---------- ฟอร์มยื่นคำร้อง ---------- */}
                            {activeStep === "form" && (
                                <View className="mt-5 gap-3">
                                    <View>
                                        <Text className="mb-1 text-sm font-medium text-stone-700">หัวข้อ</Text>
                                        <TextInput
                                            value={title}
                                            onChangeText={setTitle}
                                            maxLength={120}
                                            placeholder="เช่น ขอปลดระงับบัญชี บัญชีถูกระงับโดยไม่ทราบเหตุผล"
                                            placeholderTextColor="#A8A29E"
                                            className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900"
                                        />
                                    </View>
                                    <View>
                                        <Text className="mb-1 text-sm font-medium text-stone-700">รายละเอียด / เหตุผล</Text>
                                        <TextInput
                                            value={message}
                                            onChangeText={setMessage}
                                            maxLength={2000}
                                            multiline
                                            textAlignVertical="top"
                                            placeholder="อธิบายเหตุผลที่ขอให้ปลดระงับบัญชี เช่น สิ่งที่ทำผิดและวิธีที่จะไม่ทำซ้ำ"
                                            placeholderTextColor="#A8A29E"
                                            className="min-h-[120px] rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900"
                                        />
                                        <Text className="mt-1 text-right text-xs text-stone-400">
                                            {message.trim().length}/2000
                                        </Text>
                                    </View>

                                    {!!error && <Text className="text-sm text-red-600">{error}</Text>}

                                    <View className="flex-row gap-2 pt-1">
                                        <View className="flex-1">
                                            <ModalButton
                                                variant="secondary"
                                                title="ย้อนกลับ"
                                                disabled={submitting}
                                                onPress={() => { setError(null); setStep("notice"); }}
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <ModalButton
                                                variant="primary"
                                                title="ส่งคำร้อง"
                                                loading={submitting}
                                                disabled={!canSubmit}
                                                onPress={handleSubmit}
                                            />
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* ---------- ส่งสำเร็จ ---------- */}
                            {activeStep === "success" && (
                                <View className="mt-5 items-center gap-4">
                                    <View className="h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                                        <Text className="text-lg text-emerald-600">✓</Text>
                                    </View>
                                    <Text className="text-center text-sm leading-5 text-stone-600">
                                        ส่งคำร้องเรียบร้อยแล้ว ผู้ดูแลจะพิจารณาและแจ้งผลให้ทราบ{"\n"}
                                        (เข้าสู่ระบบอีกครั้งเพื่อดูสถานะล่าสุด / ผลจะส่งทางอีเมลเมื่อพิจารณาเสร็จ)
                                    </Text>
                                    <View className="w-full">
                                        <ModalButton variant="secondary" title="ปิดหน้าต่าง" onPress={close} />
                                    </View>
                                </View>
                            )}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </KeyboardAvoidingView>
        </Modal>
    );
}

function ModalButton({
    title,
    onPress,
    variant,
    disabled,
    loading,
}: {
    title: string;
    onPress: () => void;
    variant: "primary" | "secondary";
    disabled?: boolean;
    loading?: boolean;
}) {
    const primary = variant === "primary";
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled || loading}
            className={`items-center justify-center rounded-full border-2 border-[#3E322D] py-3 ${primary ? "bg-[#3E322D] active:bg-[#2B221E]" : "bg-[#FFFDFB] active:bg-[#F3EBE4]"
                } ${disabled || loading ? "opacity-50" : ""}`}
        >
            {loading ? (
                <ActivityIndicator color={primary ? "#fff" : "#3E322D"} />
            ) : (
                <Text className={`font-semibold ${primary ? "text-white" : "text-[#3E322D]"}`}>{title}</Text>
            )}
        </Pressable>
    );
}
