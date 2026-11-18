import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import type { RootState } from "../../store/store";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { listTryOns, type TryOnJob } from "../../services/tryonService";
import { ANGLES } from "../tryon/types";
import ResultActions from "../tryon/ResultActions";

const angleLabel = (view: TryOnJob["view"]) => ANGLES.find((a) => a.key === view)?.label ?? "-";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });

export default function TryOnHistory() {
  const user = useSelector((state: RootState) => state.user.user);
  const requireAuth = useRequireAuth();

  const [jobs, setJobs] = useState<TryOnJob[] | null>(null);
  const [error, setError] = useState(false);
  const [active, setActive] = useState<TryOnJob | null>(null);

  useEffect(() => {
    if (user === null) return;
    let cancelled = false;
    listTryOns()
      .then((data) => !cancelled && setJobs(data.filter((j) => j.image_url)))
      .catch((err) => {
        console.error("Load try-on history failed:", err);
        if (!cancelled) {
          setError(true);
          setJobs([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // ปิด lightbox ด้วย Esc
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  if (user === null) {
    return (
      <div className="py-20 text-center text-secondary/60">
        <p>เข้าสู่ระบบเพื่อดูประวัติการลอง</p>
        <button
          type="button"
          onClick={() => requireAuth()}
          className="mt-4 rounded-full bg-secondary px-6 py-2.5 text-sm font-semibold text-white"
        >
          เข้าสู่ระบบ
        </button>
      </div>
    );
  }

  if (jobs === null) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-[20px] bg-secondary/10" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="py-20 text-center text-secondary/60">
        {error ? "โหลดประวัติไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" : "ยังไม่มีประวัติการลอง"}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {jobs.map((job) => (
          <button key={job.id} type="button" onClick={() => setActive(job)} className="group text-left">
            <div className="aspect-[3/4] overflow-hidden rounded-[20px] bg-secondary/5 transition group-hover:shadow-lg">
              <img
                src={job.image_url!}
                alt={`ภาพลอง ${formatDate(job.created_at)}`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <p className="mt-2 text-sm font-medium text-secondary">มุม{angleLabel(job.view)}</p>
            <p className="text-xs text-secondary/60">{formatDate(job.created_at)}</p>
          </button>
        ))}
      </div>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ภาพที่เคยลอง"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setActive(null)}
        >
          <div
            className="max-h-full w-full max-w-md overflow-y-auto rounded-[28px] bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={active.image_url!}
              alt="ภาพที่เคยลอง"
              className="max-h-[65vh] w-full rounded-[20px] object-contain"
            />
            <p className="mt-3 text-center text-sm text-secondary/70">
              มุม{angleLabel(active.view)} · {formatDate(active.created_at)}
            </p>
            <ResultActions jobId={active.id} url={active.image_url!} label={`history-${angleLabel(active.view)}`} />
            <button
              type="button"
              onClick={() => setActive(null)}
              className="mt-3 w-full rounded-full py-2 text-sm text-secondary/70 hover:text-secondary"
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </>
  );
}
