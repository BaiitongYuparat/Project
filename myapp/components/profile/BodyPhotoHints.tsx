import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

// สรุปจากเงื่อนไขตรวจรูปใน backend/src/services/bodyImageValidationService.ts (เหมือนฝั่งเว็บ)
const RULES: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: "person-outline", text: "ถ่ายรูปตัวคุณเพียงคนเดียว ไม่ใช้ตุ๊กตา รูปวาด หรือรูปคนอื่น" },
  { icon: "accessibility-outline", text: "ยืนตัวตรงตามธรรมชาติ ไม่นั่ง ย่อตัว เอนตัว หรือกระโดด" },
  { icon: "hand-left-outline", text: "แขนแนบลำตัวพักลงตามธรรมชาติ ไม่จับเอว ไม่ชูต้อน ไม่โพสท่า" },
  {
    icon: "sunny-outline",
    text: "ถ่ายในที่แสงสว่างพอ ภาพไม่มืด ไม่สั่นหรือเบลอ รายละเอียดตัวคุณเห็นชัดแยกจากพื้นหลังได้",
  },
  { icon: "expand-outline", text: "เห็นทั้งตัวตั้งแต่ศีรษะถึงเท้าครบ ไม่โดนขอบภาพตัด" },
];

export default function BodyPhotoHints() {
  return (
    <View className="rounded-xl border border-[#DCC3B3] bg-white p-4">
      <View className="mb-3 flex-row items-center gap-2">
        <Ionicons name="camera-outline" size={20} color="#3B2F2A" />
        <Text className="font-semibold text-[#3B2F2A]">วิธีถ่ายรูปให้ผ่านการตรวจสอบ</Text>
      </View>
      <View className="gap-2">
        {RULES.map((rule) => (
          <View key={rule.text} className="flex-row items-start gap-2">
            <Ionicons name={rule.icon} size={16} color="#7B675A" style={{ marginTop: 2 }} />
            <Text className="flex-1 text-sm leading-5 text-[#7B675A]">{rule.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
