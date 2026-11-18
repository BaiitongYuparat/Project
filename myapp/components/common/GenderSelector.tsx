import { Pressable, Text, View } from "react-native"
import type { Gender } from "../../service/userservice"

type Props = {
  value: Gender | ""
  onChange: (value: Gender) => void
}

const OPTIONS: { label: string; value: Gender }[] = [
  { label: "ผู้หญิง", value: "FEMALE" },
  { label: "ผู้ชาย", value: "MALE" },
]

export default function GenderSelector({ value, onChange }: Props) {
  return (
    <View className="px-4 pt-4">
      <Text className="mb-2 text-base text-[#3E322D]">เพศ</Text>
      <View className="flex-row gap-3">
        {OPTIONS.map((opt) => {
          const selected = value === opt.value
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              className={`flex-1 items-center justify-center rounded-full border-2 py-4 ${
                selected
                  ? "border-[#3E322D] bg-[#3E322D]"
                  : "border-[#E8DDD5] bg-[#FFFDFB]"
              }`}
            >
              <Text
                className={`text-base ${
                  selected ? "font-bold text-white" : "text-[#3E322D]"
                }`}
              >
                {opt.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}