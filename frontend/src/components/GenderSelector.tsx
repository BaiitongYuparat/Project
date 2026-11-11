import type { Gender } from "../types/user"

const OPTIONS: { label: string; value: Gender }[] = [
  { label: "ผู้หญิง", value: "FEMALE" },
  { label: "ผู้ชาย", value: "MALE" },
]

type Props = {
  value: Gender | ""
  onChange: (value: Gender) => void
}

export default function GenderSelector({ value, onChange }: Props) {
  return (
    <div>
      <p className="mb-2 text-base text-[#3E322D]">เพศ</p>
      <div className="flex gap-3">
        {OPTIONS.map((opt) => {
          const selected = value === opt.value
          return (
            <label
              key={opt.value}
              className={`flex h-14 flex-1 cursor-pointer items-center justify-center rounded-full border-2 text-base transition ${
                selected
                  ? "border-[#3E322D] bg-[#3E322D] font-bold text-white"
                  : "border-[#E8DDD5] bg-[#FFFDFB] text-[#3E322D] hover:bg-[#F3EBE4]"
              }`}
            >
              <input
                type="radio"
                name="gender"
                value={opt.value}
                checked={selected}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          )
        })}
      </div>
    </div>
  )
}