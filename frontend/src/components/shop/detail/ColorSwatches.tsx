import type { ProductDetailColor } from "../../../services/productService";

interface ColorSwatchesProps {
  colors: ProductDetailColor[];
  selectedColorId: string | null;
  onSelect: (colorId: string | null) => void;
}

export default function ColorSwatches({
  colors,
  selectedColorId,
  onSelect,
}: ColorSwatchesProps) {
  if (colors.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-[#947D6D]">สีสินค้า</span>
        <span className="font-medium text-[#3E2C25]">
          {colors.find((color) => color.id === selectedColorId)?.name ??
            "แสดงทุกสี"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* ปุ่ม "ทั้งหมด" */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-label="ดูสินค้าทุกสี"
          className={`flex h-9 min-w-[2.25rem] px-3 items-center justify-center rounded-full border text-xs font-medium transition-all duration-200 hover:scale-105 ${
            selectedColorId === null
              ? "border-[#3E2C25] bg-[#3E2C25] text-white shadow-sm"
              : "border-[#DCC3B3] bg-white text-[#49352D] hover:border-[#3E2C25]/40 hover:bg-[#FAF5EF]"
          }`}
        >
          ทั้งหมด
        </button>

        {colors.map((color) => {
          const isSelected = selectedColorId === color.id;
          return (
            <button
              key={color.id}
              type="button"
              onClick={() => onSelect(color.id)}
              title={color.name}
              aria-label={`เลือกสี${color.name}`}
              className={`relative h-9 w-9 overflow-hidden rounded-full border transition-all duration-200 hover:scale-110 ${
                isSelected
                  ? "border-[#3E2C25] ring-2 ring-[#3E2C25]/30 scale-105"
                  : "border-[#DCC3B3] hover:scale-105 hover:border-[#3E2C25]/40"
              }`}
              style={{
                backgroundColor: color.hex ?? "#EFE3D6",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}