import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ConsentType } from "../../service/userconsentservice";

export type ConsentState = Record<ConsentType, boolean>;

const ITEMS: { type: ConsentType; title: string; desc: string }[] = [
  {
    type: "photo_analysis",
    title: "ใช้รูปภาพเพื่อสวมใส่เสมือนจริง (Virtual Try-On)",
    desc: "ยินยอมให้นำรูปถ่ายของฉันไปให้ AI ประมวลผลเพื่อสร้างภาพสวมใส่เท่านั้น",
  },
  {
    type: "body_data",
    title: "ใช้ข้อมูลสรีระเพื่อวิเคราะห์รูปร่างด้วย AI",
    desc: "ยินยอมให้ใช้ส่วนสูง น้ำหนัก และรอบตัว ให้ AI คำนวณทรงร่างกายและแนะนำชุดที่เหมาะ",
  },
];

type Props = {
  value: ConsentState;
  onChange: (next: ConsentState) => void;
};

export default function ConsentSection({ value, onChange }: Props) {
  const allChecked = ITEMS.every((i) => value[i.type]); //เช็คว่าทุกข้อถูกติ๊กหรือยัง every จะได้ true เมื่อทุกตัวเป็น true

  const toggle = (type: ConsentType) =>
    onChange({ ...value, [type]: !value[type] });

  const toggleAll = () =>
    onChange({ body_data: !allChecked, photo_analysis: !allChecked });

  return (
    <View className="mx-4 mt-4 rounded-2xl bg-[#F3E4D9] p-5">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-xl font-bold text-[#3B2A22]">ความยินยอมการใช้ข้อมูล</Text>
        <Pressable onPress={toggleAll} className="rounded-full bg-white px-4 py-2">
          <Text className="font-semibold text-[#3B2A22]">
            {allChecked ? "ยกเลิกทั้งหมด" : "ยินยอมทั้งหมด"}
          </Text>
        </Pressable>
      </View>

      {ITEMS.map((item) => {
        const checked = value[item.type];
        return (
          <Pressable
            key={item.type}
            onPress={() => toggle(item.type)}
            className="mb-4 flex-row items-start"
          >
            <View
              className={`mr-3 mt-1 h-6 w-6 items-center justify-center rounded-md border-2 ${
                checked ? "border-[#8B5E3C] bg-[#8B5E3C]" : "border-[#8A7F78] bg-white"
              }`}
            >
              {checked && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-[#3B2A22]">{item.title}</Text>
              <Text className="mt-1 text-base text-[#8A7F78]">{item.desc}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}