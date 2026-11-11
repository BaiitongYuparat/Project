import { IonIcon } from "@ionic/react";
import {
  cameraOutline,
  personOutline,
  accessibilityOutline,
  handLeftOutline,
  sunnyOutline,
  expandOutline,
} from "ionicons/icons";

// สรุปจากเงื่อนไขตรวจรูปใน backend/src/services/bodyImageValidationService.ts
const RULES = [
  {
    icon: personOutline,
    text: "ถ่ายรูปตัวคุณเพียงคนเดียว ไม่ใช้ตุ๊กตา รูปวาด หรือรูปคนอื่น",
  },
  {
    icon: accessibilityOutline,
    text: "ยืนตัวตรงตามธรรมชาติ ไม่นั่ง ย่อตัว เอนตัว หรือกระโดด",
  },
  {
    icon: handLeftOutline,
    text: "แขนแนบลำตัวพักลงตามธรรมชาติ ไม่จับเอว ไม่ชูต้อน ไม่โพสท่า",
  },
  {
    icon: sunnyOutline,
    text: "ถ่ายในที่แสงสว่างพอ ภาพไม่มืด ไม่สั่นหรือเบลอ รายละเอียดตัวคุณเห็นชัดแยกจากพื้นหลังได้",
  },
  {
    icon: expandOutline,
    text: "เห็นทั้งตัวตั้งแต่ศีรษะถึงเท้าครบ ไม่โดนขอบภาพตัด",
  },
] as const;

export default function BodyPhotoHints() {
  return (
    <div className="rounded-xl border border-orange-800/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <IonIcon icon={cameraOutline} className="text-lg text-secondary" />
        <h3 className="font-semibold">วิธีถ่ายรูปให้ผ่านการตรวจสอบ</h3>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {RULES.map((rule) => (
          <li key={rule.text} className="flex items-start gap-2">
            <IonIcon
              icon={rule.icon}
              className="mt-0.5 shrink-0 text-base text-secondary/80"
            />
            <span className="text-sm text-secondary/80">{rule.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
