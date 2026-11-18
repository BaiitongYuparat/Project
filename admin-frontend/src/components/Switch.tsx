/** สวิตช์ toggle — เลือกสีได้ตามโทนหน้า (default: น้ำเงิน) */
export default function Switch({
  checked,
  onChange,
  label,
  disabled = false,
  color = "blue",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  /** สีเมื่อเปิด — blue: น้ำเงิน / sage: เขียวมะกอกโทนเว็บ */
  color?: "blue" | "sage";
}) {
  const onColor = color === "sage" ? "peer-checked:bg-[#87947A]" : "peer-checked:bg-blue-600";

  return (
    <label
      className={`inline-flex items-center gap-2.5 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full bg-stone-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform ${onColor} peer-focus-visible:ring-2 peer-focus-visible:ring-stone-300`}
      />
      {label && <span className="text-sm text-stone-700">{label}</span>}
    </label>
  );
}
