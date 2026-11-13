// คำแปลไทยสำหรับตัวเลือก ฤดู/โอกาส ที่เก็บใน DB (product_options)
// แสดงผลเป็นภาษาไทยเท่านั้น — ค่าที่บันทึกยังใช้ label ดิบจาก DB เหมือนเดิม
// ค่าที่ไม่มีใน map (เช่น "ชุดนอน" หรือ option ที่ super admin เพิ่มเอง) จะโชว์ตามเดิม
export const OPTION_LABEL_TH: Record<string, string> = {
  "All season": "ทุกฤดู",
  Casual: "ลำลอง",
  Work: "ทำงาน",
  Formal: "ทางการ",
  Party: "ปาร์ตี้",
  Travel: "ท่องเที่ยว",
  Sport: "กีฬา",
};

export const optionLabelTh = (value: string) => OPTION_LABEL_TH[value] ?? value;
