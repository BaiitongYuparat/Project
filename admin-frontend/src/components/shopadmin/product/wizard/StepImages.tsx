import ProductColorsEditor from "../ProductColorsEditor";

import type { ProductFormController } from "../../../../pages/AdminStore/useProductForm";

interface StepImagesProps {
  ctl: ProductFormController;
}

export default function StepImages({ ctl }: StepImagesProps) {
  return (
    <div className="space-y-4">
      <ProductColorsEditor
        colors={ctl.form.colors}
        onAddColor={ctl.handleAddColor}
        onUpdateColor={ctl.handleUpdateColor}
        onRemoveColor={ctl.handleRemoveColor}
        onImageChange={ctl.handleColorImageChange}
        onRemoveExistingImage={ctl.handleRemoveExistingImage}
        onRemoveNewImage={ctl.handleRemoveNewImage}
      />

      <p className="text-xs text-[#A39988]">
        รูปจะถูกตรวจคุณภาพอัตโนมัติหลังบันทึก — รูปที่ไม่ผ่านจะมีเหตุผลแสดงในหน้ารายการสินค้า
      </p>
    </div>
  );
}
