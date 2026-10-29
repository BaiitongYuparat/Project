import { useEffect, useState } from "react";
import { View, Text, ScrollView,TextInput,ActivityIndicator, TouchableOpacity, Alert, StyleSheet, } from "react-native";
import { Stack ,useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomInput from "../../../component/Input"
import { getBodyData, createBodyData, updateBodyData } from "../../../service/bodrservice";


export default function BodyForm() {
  const router = useRouter();

  const [height, setHeight] = useState("") //ส่วนสูง
  const [weight, setWeight] = useState("") //น้ำหนัก
  const [chest, setChest] = useState("") //อก
  const [waist, setWaist] = useState("") //เอว
  const [hips, setHips] = useState("") //สะโพก

  const [bodyId, setBodyId] = useState<string | null>(null) //เก็บ id ถ้ามีข้อมูลเดิมอยู่แล้ว ต้องแก้ไม่ใช่สร้างใหม่
  const { mode } = useLocalSearchParams<{ mode?: string }>();  // อ่านค่าที่หน้าก่อนหน้าส่งมาทาง URL
  const isEdit = mode === "edit"; // true = โหมดแก้ไข, false = user ใหม่
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)


  useEffect(() => {
    if (!isEdit) return // user ใหม่ ไม่มีข้อมูลเดิมให้โหลด
    getBodyData()
      .then((list) => {
        if (!list.length) return // ยังไม่เคยบันทึก ปล่อยฟอร์มว่าง
        const latest = [...list].sort( // เลือกแถวที่ recorded_at ใหม่สุด
          (a, b) =>
            new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
        )[0]
        setBodyId(latest.id); // จำ id ไว้ใช้ตอนกดบันทึก
        setHeight(String(latest.height));
        setWeight(String(latest.weight));
        setChest(String(latest.chest));
        setWaist(String(latest.waist));
        setHips(String(latest.hips));
      })
      .catch((e) => console.log("load body error", e))
      .finally(() => setLoading(false))
  }, [isEdit])

  const handleSubmit = async () => {
    console.log("press handlesubmit");
    if (!height || !weight || !chest || !waist || !hips) {
      Alert.alert("กรอกไม่ครบ", "กรุณากรอกข้อมูลให้ครบทุกช่อง");
      console.log("alert");
      return;
    }
    const data = {
      height: Number(height),
      weight: Number(weight),
      chest: Number(chest),
      waist: Number(waist),
      hips: Number(hips),
    }
    if(Object.values(data).some((n) => isNaN(n) || n <= 0)) {
      Alert.alert("ข้อมูลไม่ถูกต้อง", "กรุณากรอกเป็นตัวเลขที่มากกว่า 0");
      return;
    }
    try { setSaving(true);
      if (bodyId) {
        await updateBodyData(bodyId, data);
      } else {
        await createBodyData(data);
      }
      if (isEdit) router.back();
      else router.replace("/");
    } catch (e) {
      console.log("Error save body", e);
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้");
    } finally {
      setSaving(false);
    }
  }

   if (loading) return <ActivityIndicator className="mt-10" />;

  return (
    <>
      <Stack.Screen
        options={{ title: isEdit ? "ข้อมูลร่างกาย" : "กรอกข้อมูลร่างกาย" }}
      />
      <ScrollView
        className="flex-1 bg-[#FFFCFA]"
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {!isEdit && (
          <Text className="text-base text-[#8A7968] mb-5">
            ใช้เพื่อสร้างภาพสวมใส่และแนะนำชุดที่เหมาะ
          </Text>
        )}

        <CustomInput
          label="ส่วนสูง (ซม.)"
          value={height}
          onChangeText={setHeight}
          keyboardType="numeric"
        />
        <CustomInput
          label="น้ำหนัก (กก.)"
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
        />
        <CustomInput
          label="รอบอก (ซม.)"
          value={chest}
          onChangeText={setChest}
          keyboardType="numeric"
        />
        <CustomInput
          label="รอบเอว (ซม.)"
          value={waist}
          onChangeText={setWaist}
          keyboardType="numeric"
        />
        <CustomInput
          label="รอบสะโพก (ซม.)"
          value={hips}
          onChangeText={setHips}
          keyboardType="numeric"
        />

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={saving}
          className={`mt-6 rounded-full bg-[#3B2F2A] py-4 ${saving ? "opacity-60" : ""}`}
        >
          <Text className="text-center text-lg font-bold text-white">
            {saving ? "กำลังบันทึก..." : isEdit ? "บันทึก" : "ถัดไป"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  )
}