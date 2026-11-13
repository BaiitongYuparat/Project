// Seed ข้อมูลเริ่มต้นของแพลตฟอร์ม:
// - ตารางไซส์ standard (SizeChartTemplate) แยกตาม gender × category
// - ชุดตัวเลือกฤดู/โอกาส (ProductOption) สำหรับหน้าเพิ่มสินค้า
// Run: npx tsx prisma/seed.ts  (idempotent — รันซ้ำได้)
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ProductGender } from "@prisma/client";

const connectionString = process.env.DATABASE_URL!.replace(/\?.*$/, "");

const adapter = new PrismaPg({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const prisma = new PrismaClient({ adapter });

interface SeedRow {
  size: string;
  chest?: number;
  waist?: number;
  hips?: number;
  length?: number;
}

interface SeedTemplate {
  name: string;
  gender: ProductGender;
  category: "top" | "bottom" | "dress";
  rows: SeedRow[];
}

// หน่วย: ซม. (ตัวเลขอ้างอิงตารางไซส์เสื้อผ้าทั่วไป — ร้านแก้ต่อได้เสมอ)
const standardTemplates: SeedTemplate[] = [
  {
    name: "Standard ชาย — Top",
    gender: "MALE",
    category: "top",
    rows: [
      { size: "XS", chest: 88, waist: 74, length: 66 },
      { size: "S", chest: 92, waist: 78, length: 68 },
      { size: "M", chest: 98, waist: 84, length: 70 },
      { size: "L", chest: 104, waist: 90, length: 72 },
      { size: "XL", chest: 110, waist: 96, length: 74 },
      { size: "XXL", chest: 116, waist: 102, length: 76 },
    ],
  },
  {
    name: "Standard ชาย — Bottom",
    gender: "MALE",
    category: "bottom",
    rows: [
      { size: "XS", waist: 72, hips: 90, length: 98 },
      { size: "S", waist: 76, hips: 94, length: 100 },
      { size: "M", waist: 82, hips: 100, length: 102 },
      { size: "L", waist: 88, hips: 106, length: 104 },
      { size: "XL", waist: 94, hips: 112, length: 106 },
      { size: "XXL", waist: 100, hips: 118, length: 108 },
    ],
  },
  {
    name: "Standard หญิง — Top",
    gender: "FEMALE",
    category: "top",
    rows: [
      { size: "XS", chest: 80, waist: 62, length: 58 },
      { size: "S", chest: 84, waist: 66, length: 60 },
      { size: "M", chest: 90, waist: 72, length: 62 },
      { size: "L", chest: 96, waist: 78, length: 64 },
      { size: "XL", chest: 102, waist: 84, length: 66 },
      { size: "XXL", chest: 108, waist: 90, length: 68 },
    ],
  },
  {
    name: "Standard หญิง — Bottom",
    gender: "FEMALE",
    category: "bottom",
    rows: [
      { size: "XS", waist: 62, hips: 86, length: 95 },
      { size: "S", waist: 66, hips: 90, length: 97 },
      { size: "M", waist: 72, hips: 96, length: 99 },
      { size: "L", waist: 78, hips: 102, length: 101 },
      { size: "XL", waist: 84, hips: 108, length: 103 },
      { size: "XXL", waist: 90, hips: 114, length: 105 },
    ],
  },
  {
    name: "Standard หญิง — Dress",
    gender: "FEMALE",
    category: "dress",
    rows: [
      { size: "XS", chest: 80, waist: 62, hips: 86, length: 88 },
      { size: "S", chest: 84, waist: 66, hips: 90, length: 90 },
      { size: "M", chest: 90, waist: 72, hips: 96, length: 92 },
      { size: "L", chest: 96, waist: 78, hips: 102, length: 94 },
      { size: "XL", chest: 102, waist: 84, hips: 108, length: 96 },
      { size: "XXL", chest: 108, waist: 90, hips: 114, length: 98 },
    ],
  },
  {
    name: "Standard Unisex — Top",
    gender: "UNISEX",
    category: "top",
    rows: [
      { size: "XS", chest: 84, waist: 70, length: 65 },
      { size: "S", chest: 90, waist: 76, length: 67 },
      { size: "M", chest: 96, waist: 82, length: 69 },
      { size: "L", chest: 102, waist: 88, length: 71 },
      { size: "XL", chest: 108, waist: 94, length: 73 },
      { size: "XXL", chest: 114, waist: 100, length: 75 },
    ],
  },
  {
    name: "Standard Unisex — Bottom",
    gender: "UNISEX",
    category: "bottom",
    rows: [
      { size: "XS", waist: 70, hips: 92, length: 99 },
      { size: "S", waist: 76, hips: 98, length: 101 },
      { size: "M", waist: 82, hips: 104, length: 103 },
      { size: "L", waist: 88, hips: 110, length: 105 },
      { size: "XL", waist: 94, hips: 116, length: 107 },
      { size: "XXL", waist: 100, hips: 122, length: 109 },
    ],
  },
  // set = สินค้า 1 ชุด → ร้านใช้ template คู่ top + bottom สร้างตารางเดียวรองรับทั้งชุด
  {
    name: "Standard Unisex — Set (Top)",
    gender: "UNISEX",
    category: "top",
    rows: [
      { size: "S", chest: 90, waist: 76, length: 67 },
      { size: "M", chest: 96, waist: 82, length: 69 },
      { size: "L", chest: 102, waist: 88, length: 71 },
      { size: "XL", chest: 108, waist: 94, length: 73 },
    ],
  },
  {
    name: "Standard Unisex — Set (Bottom)",
    gender: "UNISEX",
    category: "bottom",
    rows: [
      { size: "S", waist: 76, hips: 98, length: 99 },
      { size: "M", waist: 82, hips: 104, length: 101 },
      { size: "L", waist: 88, hips: 110, length: 103 },
      { size: "XL", waist: 94, hips: 116, length: 105 },
    ],
  },
];

const seasonOptions = [
  "ฤดูร้อน",
  "ฤดูฝน",
  "ฤดูหนาว",
  "All season",
];

const occasionOptions = [
  "Casual",
  "Work",
  "Formal",
  "Party",
  "Travel",
  "Sport",
  "ชุดนอน",
];

async function seedSizeChartTemplates() {
  for (const template of standardTemplates) {
    const existing = await prisma.sizeChartTemplate.findFirst({
      where: { name: template.name },
      include: { rows: true },
    });

    if (existing) {
      // ถ้ามี template อยู่แล้วแต่ยังไม่มีแถว ให้เติมแถว standard
      if (existing.rows.length === 0) {
        await prisma.sizeChartTemplateRow.createMany({
          data: template.rows.map((row, index) => ({
            template_id: existing.id,
            ...row,
            sort_order: index,
          })),
        });
      }

      continue;
    }

    await prisma.sizeChartTemplate.create({
      data: {
        name: template.name,
        gender: template.gender,
        category: template.category,
        rows: {
          create: template.rows.map((row, index) => ({
            ...row,
            sort_order: index,
          })),
        },
      },
    });
  }
}

async function seedProductOptions(
  type: "SEASON" | "OCCASION",
  labels: string[],
) {
  for (const [index, label] of labels.entries()) {
    await prisma.productOption.upsert({
      where: { type_label: { type, label } },
      update: {},
      create: { type, label, sort_order: index },
    });
  }
}

async function main() {
  await seedSizeChartTemplates();
  await seedProductOptions("SEASON", seasonOptions);
  await seedProductOptions("OCCASION", occasionOptions);
}

main()
  .then(() => {
    console.log("Seed completed ✅");
  })
  .catch((error) => {
    console.error("Seed error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
