import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { IonIcon } from "@ionic/react";
import { arrowForward, chevronBack, chevronForward } from "ionicons/icons";

type Align = "left" | "center" | "right";

type Banner = {
  badge: string;
  titleLine1: string;
  titleHighlight: string;
  description: string;
  ctaLabel: string;
  ctaLink: string;

  /** ตำแหน่งข้อความ: ชิดซ้าย / กลาง / ชิดขวา */
  align: Align;


  /** พื้นหลังของแบนเนอร์นี้ (Tailwind gradient) */
  bgClass: string;
  /** ลวดลายตกแต่งเฉพาะแบนเนอร์นี้ */
  decor: ReactNode;

  badgeClass: string;
  titleClass: string;
  accentClass: string;
  descClass: string;
  ctaClass: string;


};

// แก้ไข / เพิ่ม / ลบ 
const banners: Banner[] = [
  // ชิดซ้าย
  {
    badge: "Become Our Partner",
    titleLine1: "เติบโตไปพร้อมกับ",
    titleHighlight: "LongDress",
    description:
      "ให้ร้านค้าของคุณเป็นที่รู้จักมากขึ้น เปิดโอกาสให้ลูกค้าได้ค้นพบสินค้า และทดลองสวมใส่เสื้อผ้าด้วยเทคโนโลยี AI ก่อนตัดสินใจซื้อ",
    ctaLabel: "สมัครเป็นร้านค้าเลย",
    ctaLink: "/brand/register",
    align: "left",
    bgClass: "bg-gradient-to-br from-[#806B5E] via-[#634B3F] to-[#3E2C25]",
    decor: (
      <>
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-[#E8CDBD]/25 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 h-64 w-64 rounded-full bg-[#A77D65]/40 blur-2xl" />
        <div className="pointer-events-none absolute right-12 top-1/2 hidden h-72 w-72 -translate-y-1/2 rounded-full border border-white/20 md:block" />
        <div className="pointer-events-none absolute right-24 top-1/2 hidden h-48 w-48 -translate-y-1/2 rounded-full border border-white/15 bg-white/5 md:block" />
      </>
    ),
    badgeClass: "border-white/40 bg-white/15 text-white",
    titleClass: "text-white",
    accentClass: "text-[#F0D2BF]",
    descClass: "text-white/90",
    ctaClass: "bg-white text-[#49352D] hover:bg-[#F6E9E0]",

  },

  // กึ่งกลาง
  {
    badge: "AI Virtual Try-On",
    titleLine1: "ลองใส่ก่อนซื้อ",
    titleHighlight: "ด้วยเทคโนโลยี AI",
    description:
      "เลือกชิ้นที่ถูกใจแล้วลองสวมใส่ได้ทันที ช่วยให้มั่นใจก่อนตัดสินใจซื้อ ลดปัญหาสั่งแล้วไม่ใช่",
    ctaLabel: "เริ่มลองเลย",
    ctaLink: "/tryon",
    align: "center",
    bgClass: "bg-gradient-to-b from-[#FFF3EC] via-[#FBDDD0] to-[#F2C3B3]",
    decor: (
      <>
        <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-[#F4B9A6]/50" />
        <div className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-[#E9A38F]/40" />
        <div className="pointer-events-none absolute left-[12%] bottom-10 hidden h-20 w-20 rounded-full border-2 border-dashed border-[#C98F86]/60 md:block" />
        <div className="pointer-events-none absolute right-[14%] top-10 hidden h-3 w-3 rounded-full bg-[#C98F86] md:block" />
        <div className="pointer-events-none absolute right-[22%] top-20 hidden h-2 w-2 rounded-full bg-[#C98F86]/70 md:block" />
        <div className="pointer-events-none absolute left-[20%] top-12 hidden h-2 w-2 rounded-full bg-[#C98F86]/70 md:block" />
      </>
    ),
    badgeClass: "border-[#C98F86]/50 bg-white/60 text-[#8A4F52]",
    titleClass: "text-[#5A3A3D]",
    accentClass: "text-[#C0675F]",
    descClass: "text-[#7A5557]",
    ctaClass: "bg-[#5A3A3D] text-white hover:bg-[#432A2D]",
    
  },

];

const alignStyles: Record<
  Align,
  { wrap: string; inner: string; desc: string; overlay: string }
> = {
  left: {
    wrap: "justify-start text-left",
    inner: "items-start",
    desc: "mr-auto",
    overlay: "bg-gradient-to-r from-black/70 via-black/35 to-transparent",
  },
  center: {
    wrap: "justify-center text-center",
    inner: "items-center",
    desc: "mx-auto",
    overlay: "bg-black/45",
  },
  right: {
    wrap: "justify-end text-right",
    inner: "items-end",
    desc: "ml-auto",
    overlay: "bg-gradient-to-l from-black/70 via-black/35 to-transparent",
  },
};

const AUTO_PLAY_MS = 3000;

export default function HeroBannerCarousel() {
  const navigate = useNavigate();
  // position: 0..total — ตำแหน่ง total คือ "สำเนา" ของสไลด์แรกที่ต่อท้ายไว้
  // ใช้ให้เลื่อนไปข้างหน้าต่อเนื่อง แล้วค่อยสลับกลับ 0 แบบไม่มีแอนิเมชัน
  const [position, setPosition] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);

  const total = banners.length;
  const current = position % total; // สไลด์จริงที่กำลังแสดง
  const slides = [...banners, banners[0]];

  const next = useCallback(() => {
    setAnimate(true);
    setPosition((prev) => (prev >= total ? prev : prev + 1));
  }, [total]);

  const goTo = useCallback((index: number) => {
    setAnimate(true);
    setPosition(index);
  }, []);

  // ถึงสำเนาสไลด์แรกแล้ว → สลับกลับไปสไลด์จริงตำแหน่ง 0 โดยไม่มีแอนิเมชัน
  useEffect(() => {
    if (position !== total) return;

    const id = setTimeout(() => {
      setAnimate(false);
      setPosition(0);
    }, 520); // นานกว่า duration-500 เล็กน้อย

    return () => clearTimeout(id);
  }, [position, total]);

  // เปิดแอนิเมชันคืนหลังสลับกลับ
  useEffect(() => {
    if (animate) return;

    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimate(true));
    });

    return () => cancelAnimationFrame(id);
  }, [animate]);

  // เลื่อนอัตโนมัติไปข้างหน้าอย่างเดียว 
  useEffect(() => {
    if (paused || total <= 1) return;

    const timer = setInterval(next, AUTO_PLAY_MS);

    return () => clearInterval(timer);
  }, [paused, total, position, next]);

  // สีปุ่มลูกศร 
  const isLightTone = banners[current]
  const arrowClass = isLightTone
    ? "bg-[#5A3A3D]/80 text-white hover:bg-[#5A3A3D]"
    : "bg-white/80 text-[#49352D] hover:bg-white";
  const dotActive = isLightTone ? "bg-[#5A3A3D]" : "bg-white";
  const dotIdle = isLightTone
    ? "bg-[#5A3A3D]/30 hover:bg-[#5A3A3D]/60"
    : "bg-white/50 hover:bg-white/80";

  return (
    <section
      className="relative mb-8 overflow-hidden rounded-2xl border border-[#DCC3B3]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides Track */}
      <div
        className={`flex ${animate ? "transition-transform duration-500 ease-out" : ""}`}
        style={{ transform: `translateX(-${position * 100}%)` }}
      >
        {slides.map((banner, index) => {
          const a = alignStyles[banner.align];

          return (
            <div
              key={index}
              className={`relative flex min-h-[340px] w-full shrink-0 items-center overflow-hidden md:min-h-[400px] ${banner.bgClass}`}
              aria-hidden={index !== position}
            >

              {/* Text Content */}
              <div
                className={`relative z-10 flex w-full px-12 py-12 pb-14 md:px-20 ${a.wrap}`}
              >
                <div className={`flex max-w-xl flex-col ${a.inner}`}>
                  <div
                    className={`mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 backdrop-blur-sm ${banner.badgeClass}`}
                  >
                    <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                    <span className="text-xs font-semibold tracking-widest">
                      {banner.badge}
                    </span>
                  </div>

                  <h1
                    className={`text-3xl font-bold leading-tight md:text-5xl ${banner.titleClass}`}
                  >
                    {banner.titleLine1}
                    <br />
                    <span className={banner.accentClass}>
                      {banner.titleHighlight}
                    </span>
                  </h1>

                  <p
                    className={`mt-5 max-w-lg text-sm leading-7 md:text-base ${a.desc} ${banner.descClass}`}
                  >
                    {banner.description}
                  </p>

                  <div className="mt-7">
                    <button
                      type="button"
                      className={`inline-flex items-center justify-center rounded-full px-8 py-3 text-sm font-semibold shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl md:text-base ${banner.ctaClass}`}
                      onClick={() => navigate(banner.ctaLink)}
                    >
                      {banner.ctaLabel}
                      <IonIcon icon={arrowForward} className="ml-2" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {total > 1 && (
        <>
          {/* Prev / Next */}
          <button
            type="button"
            aria-label="แบนเนอร์ถัดไป"
            onClick={next}
            className={`absolute right-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full shadow transition md:right-3 md:h-10 md:w-10 ${arrowClass}`}
          >
            <IonIcon icon={chevronForward} />
          </button>

          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {banners.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`ไปยังแบนเนอร์ที่ ${index + 1}`}
                onClick={() => goTo(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === current ? `w-6 ${dotActive}` : `w-2 ${dotIdle}`
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}