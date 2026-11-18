import type { ReactNode } from "react";

interface SectionTitleProps {
  children: ReactNode;
  subtitle?: string;
}

// หัวข้อของแต่ละ section ในหน้า ProductDetail — แถบสีด้านซ้าย + คำอธิบายเสริมได้
export default function SectionTitle({ children, subtitle }: SectionTitleProps) {
  return (
    <div className="mb-4">
      <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#3E2C25]">
        <span className="h-5 w-1.5 rounded-full bg-[#3E2C25]" aria-hidden="true" />
        {children}
      </h2>
      {subtitle && (
        <p className="mt-1 pl-4 text-xs text-[#947D6D]">{subtitle}</p>
      )}
    </div>
  );
}
