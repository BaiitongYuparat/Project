import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import BodyFormFields, { type BodyFormValues } from "../../../components/common/BodyFormFields";
import { getBodyData, createBodyData, updateBodyData } from "../../../service/bodrservice";
import { setBody } from "../../../store/bodySlice";

export default function BodyEdit() {
  const router = useRouter();
  const dispatch = useDispatch();

  const [initialData, setInitialData] = useState<any>(null); // ใช้ type BodyData ถ้า export ไว้
  const [bodyId, setBodyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
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
      .catch((e) => console.log("load body error", e))
      .finally(() => setLoading(false));
  }, []);

const handleSubmit = async (data: BodyFormValues) => {
  try {
    setSaving(true);
    const saved = bodyId
      ? await updateBodyData(bodyId, data)
      : await createBodyData(data);

    dispatch(setBody(saved));
    router.back();
  } catch (e) {
    console.log("Error save body", e);
    Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้");
  } finally {
    setSaving(false);
  }
};

  if (loading) {
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