import { useEffect, useState } from "react";

const TABS = [
  { key: "saved", label: "ที่บันทึกไว้" },
  { key: "history", label: "ประวัติการลอง" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function MyOutfitPage() {
  const [tab, setTab] = useState<TabKey>("saved");
  const [isLoading, setIsLoading] = useState(true);

  // โหลดข้อมูลใหม่ทุกครั้งที่สลับแท็บ
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    // TODO: เปลี่ยนเป็น fetch จริง เช่น await getOutfits(tab)
    const timer = setTimeout(() => {
      if (!cancelled) setIsLoading(false);
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tab]);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1400px] px-5 py-7 md:px-10 lg:px-14 flex flex-col gap-6">
        {/* Header */}
        <div className="text-left">
          <h1 className="text-3xl md:text-4xl font-bold text-secondary">
            My Outfit
          </h1>
          <p className="text-base text-secondary/60 mt-0.5">
            ลุคที่คุณชอบ และทุกครั้งที่ได้ลองเป็นตัวเอง
          </p>
        </div>

        {/* Tabs */}
        <div role="tablist" className="flex flex-wrap gap-3">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={`rounded-full px-6 py-2.5 text-sm font-semibold transition-colors border ${
                  active
                    ? "bg-secondary text-white border-secondary"
                    : "bg-white text-secondary border-secondary/30 hover:border-secondary"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <section role="tabpanel" aria-busy={isLoading}>
          {isLoading ? (
            <OutfitSkeleton />
          ) : tab === "saved" ? (
            <SavedOutfits />
          ) : (
            <TryOnHistory />
          )}
        </section>
      </div>
    </main>
  );
}

function OutfitSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 animate-pulse">
          <div className="aspect-[3/4] w-full rounded-2xl bg-secondary/10" />
          <div className="h-4 w-3/4 rounded bg-secondary/10" />
          <div className="h-3 w-1/2 rounded bg-secondary/10" />
        </div>
      ))}
    </div>
  );
}

function SavedOutfits() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {/* TODO: map รายการชุดที่บันทึกไว้ */}
      <p className="col-span-full text-secondary/60">ยังไม่มีชุดที่บันทึกไว้</p>
    </div>
  );
}

function TryOnHistory() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {/* TODO: map ประวัติการลอง */}
      <p className="col-span-full text-secondary/60">ยังไม่มีประวัติการลอง</p>
    </div>
  );
}