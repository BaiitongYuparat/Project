import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

import { useAuth } from "../../components/auth/AuthProvider";
import { CustomButton } from "../../components/common/Button";
import StateView from "../../components/common/StateView";
import { getBodyDataById } from "../../service/bodrservice";
import { analyzeBodyType, analyzeErrorOf, getBodyType } from "../../service/bodyTypeService";
import { clearBody, setBody } from "../../store/bodySlice";
import { setBodyType } from "../../store/bodyTypeSlice";
import type { RootState } from "../../store/store";

const BODY_TYPE_LABELS: Record<string, string> = {
  hourglass: "หุ่นนาฬิกาทราย · Hourglass",
  pear: "ทรงลูกแพร · Pear",
  apple: "ทรงแอปเปิ้ล · Apple",
  rectangle: "ทรงสี่เหลี่ยม · Rectangle",
  inverted_triangle: "ทรงสามเหลี่ยมกลับหัว · Inverted Triangle",
  oval: "ทรงวงรี · Oval",
  trapezoid: "ทรงคางหมู · Trapezoid",
};

const OCCASIONS = ["ทำงาน", "เดท", "งานแต่ง", "เที่ยว"];

const labelOf = (bodyType: string) => BODY_TYPE_LABELS[bodyType] ?? bodyType;

export default function StylistScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { requireAuth } = useAuth();

  const user = useSelector((state: RootState) => state.user.user);
  const body = useSelector((state: RootState) => state.body.body);
  const bodyType = useSelector((state: RootState) => state.bodyType.bodyType);

  const [occasion, setOccasion] = useState(OCCASIONS[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<ReturnType<typeof analyzeErrorOf> | null>(null);

  // โหลดสัดส่วน + ผลวิเคราะห์ล่าสุดทุกครั้งที่เข้าแท็บ (เผื่อเพิ่งแก้ข้อมูลร่างกายมา)
  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      let cancelled = false;

      const load = async () => {
        try {
          try {
            const data = await getBodyDataById();
            if (!cancelled) dispatch(setBody(data));
          } catch (err: any) {
            // ยังไม่เคยกรอกข้อมูลร่างกาย (404) → ไม่ใช่ error ของหน้า
            if (err?.response?.status !== 404) throw err;
            if (!cancelled) dispatch(clearBody());
          }

          try {
            const result = await getBodyType();
            if (!cancelled) dispatch(setBodyType(result));
          } catch {
            // ยังไม่มีผลวิเคราะห์ — แสดงการ์ดเริ่มต้น
            if (!cancelled) dispatch(setBodyType(null));
          }

          if (!cancelled) setPageError("");
        } catch (err) {
          console.log("Load stylist error:", err);
          if (!cancelled) setPageError("โหลดข้อมูลไม่สำเร็จ");
        } finally {
          if (!cancelled) {
            setIsLoading(false);
            setIsRefreshing(false);
          }
        }
      };

      load();

      return () => {
        cancelled = true;
      };
      // reloadKey ใช้สั่งโหลดใหม่ตอนกด "ลองใหม่" / ดึงเพื่อรีเฟรช
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, dispatch, reloadKey]),
  );

  const reload = (mode: "retry" | "refresh") => {
    if (mode === "retry") {
      setPageError("");
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setReloadKey((key) => key + 1);
  };

  const handleAnalyze = async () => {
    // ยังไม่ login → เด้ง popup login ก่อน
    if (!requireAuth()) return;

    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const result = await analyzeBodyType();
      dispatch(setBodyType(result));
    } catch (err) {
      console.log("Analyze body type error:", err);
      setAnalyzeError(analyzeErrorOf(err));
    } finally {
      setAnalyzing(false);
    }
  };

  const goEditBody = () =>
    router.push({ pathname: "/screens/profile/bodyedit", params: { mode: "edit" } });

  const header = (
    <View className="mb-5">
      <Text className="text-3xl font-bold text-[#3B2F2A]">AI Stylist</Text>
      <Text className="mt-1 text-sm text-[#8A7B72]">
        วิเคราะห์รูปร่าง แล้วแนะนำลุคที่เหมาะกับคุณ
      </Text>
    </View>
  );

  const pill = (text: string) => (
    <View className="flex-row items-center self-start rounded-full border border-[#D9BBA8] bg-white/60 px-4 py-2">
      <View className="mr-2 h-2 w-2 rounded-full bg-[#A77D65]" />
      <Text className="text-xs font-semibold tracking-widest text-[#806B5E]">{text}</Text>
    </View>
  );

  const renderBodyCard = () => {
    if (isLoading) {
      return (
        <View className="min-h-[220px] items-center justify-center rounded-3xl border border-[#DCC3B3] bg-[#F0E4D8] p-6">
          <ActivityIndicator color="#7B675A" />
          <Text className="mt-3 text-sm text-[#8A7B72]">กำลังโหลดข้อมูล...</Text>
        </View>
      );
    }

    if (pageError) {
      return (
        <StateView
          icon="alert-circle-outline"
          title="โหลดข้อมูลไม่สำเร็จ"
          message={`${pageError} กรุณาลองใหม่อีกครั้ง`}
          actionLabel="ลองใหม่"
          onAction={() => reload("retry")}
        />
      );
    }

    return (
      <View className="gap-4 rounded-3xl border border-[#DCC3B3] bg-[#F0E4D8] p-6">
        {bodyType ? (
          <>
            {pill("ผลการวิเคราะห์รูปร่างของคุณ")}
            <Text className="text-3xl font-bold text-[#49352D]">{labelOf(bodyType.body_type)}</Text>

            {body && (
              <View className="gap-1 border-y border-[#DCC3B3]/60 py-3">
                <View className="flex-row items-center">
                  <Ionicons name="person-outline" size={14} color="#685246" />
                  <Text className="ml-1.5 text-sm font-medium text-[#685246]">
                    {user?.name ?? "ผู้ใช้"} · สูง {body.height} ซม. · น้ำหนัก {body.weight} กก.
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="body-outline" size={14} color="#685246" />
                  <Text className="ml-1.5 text-sm font-medium text-[#685246]">
                    อก {body.chest} / เอว {body.waist} / สะโพก {body.hips} นิ้ว
                  </Text>
                </View>
              </View>
            )}

            {!!bodyType.description && (
              <Text className="text-sm leading-6 text-[#49352D]/90">{bodyType.description}</Text>
            )}
          </>
        ) : (
          <>
            {pill("AI Body Analysis")}
            <Text className="text-3xl font-bold text-[#49352D]">
              วิเคราะห์รูปร่าง{"\n"}
              <Text className="text-[#A77D65]">ด้วย AI</Text>
            </Text>
            <Text className="text-sm leading-6 text-[#806B5E]">
              {!user
                ? "เข้าสู่ระบบแล้วให้ AI ช่วยวิเคราะห์ Body Type จากสัดส่วนของคุณ"
                : body
                  ? "พบข้อมูลสัดส่วนแล้ว กดปุ่มด้านล่างเพื่อให้ AI ช่วยประมวลผลรูปร่างของคุณ"
                  : "กรุณากรอกข้อมูลสัดส่วนร่างกายก่อน เพื่อให้ AI วิเคราะห์ Body Type"}
            </Text>
          </>
        )}

        <CustomButton
          title={analyzing ? "กำลังวิเคราะห์..." : bodyType ? "วิเคราะห์ใหม่" : "วิเคราะห์"}
          onPress={handleAnalyze}
          disabled={analyzing}
          variant="secondary"
          size="sm"
          className="self-center px-8"
        />

        {analyzeError && (
          <View className="items-center gap-2">
            <Text className="text-center text-sm font-semibold text-red-600">{analyzeError.message}</Text>
            {analyzeError.kind !== "other" && (
              <Pressable onPress={goEditBody} className="active:opacity-70">
                <Text className="text-sm font-semibold text-[#3B2F2A] underline">กรอกข้อมูลร่างกาย</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  };

  const showLooks = !isLoading && !pageError && !!bodyType;

  return (
    <View className="flex-1 bg-[#FFFDFB]" style={{ paddingTop: insets.top + 12 }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        refreshControl={
          user ? (
            <RefreshControl refreshing={isRefreshing} onRefresh={() => reload("refresh")} tintColor="#7B675A" />
          ) : undefined
        }
      >
        {header}
        {renderBodyCard()}

        {showLooks && (
          <>
            {/* เลือกโอกาส */}
            <View className="mt-6 flex-row flex-wrap gap-2">
              {OCCASIONS.map((item) => {
                const active = occasion === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setOccasion(item)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    className={`rounded-full border px-4 py-2 active:opacity-80 ${
                      active ? "border-[#3E2C25] bg-[#3E2C25]" : "border-[#DCC3B3] bg-white"
                    }`}
                  >
                    <Text className={`text-sm ${active ? "text-white" : "text-[#49352D]"}`}>{item}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* ลุคแนะนำ — ยังไม่มี API (เหมือนฝั่งเว็บ) */}
            <View className="mt-6">
              <Text className="text-xl font-bold text-[#49352D]">3 ลุค{occasion}ที่คัดให้คุณ</Text>
              <Text className="mt-0.5 text-sm text-[#8A7B72]">จากร้านค้า · เน้นช่วงเอวและบาลานซ์สัดส่วน</Text>

              <View className="mt-4 gap-4">
                {[1, 2, 3].map((i) => (
                  <View key={i} className="overflow-hidden rounded-2xl border border-[#DCC3B3] bg-white">
                    <View className="h-56 items-center justify-center bg-[#F0E4D8]">
                      <Text className="text-sm text-[#8A7B72]/60">ภาพชุดแนะนำ</Text>
                    </View>
                    <View className="gap-2 p-4">
                      <Text className="font-semibold text-[#49352D]">ชื่อลุค</Text>
                      <Text className="text-xs text-[#8A7B72]">เหมาะกับ {labelOf(bodyType!.body_type)}</Text>
                      <CustomButton
                        title="ลองใส่ชุดนี้"
                        onPress={() => {}}
                        variant="secondary"
                        size="sm"
                        className="mt-2"
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
