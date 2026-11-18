import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { getModels, type TryOnModel } from "../../services/modelService";
import { getBody, getBodyImages } from "../../services/bodyService";
import { getBodyType } from "../../services/bodyTypeService";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import type { RootState } from "../../store/store";
import { ANGLES, type Angle, type AngleImages, type TryOnSubject } from "./types";

type Tab = "FEMALE" | "MALE" | "me";

const TABS: { value: Tab; label: string }[] = [
  { value: "FEMALE", label: "ผู้หญิง" },
  { value: "MALE", label: "ผู้ชาย" },
  { value: "me", label: "รูปของฉัน" },
];

const EMPTY_IMAGES: AngleImages = { front: null, left: null, right: null, back: null };

const joinInfo = (parts: (string | null | undefined | false)[]) =>
  parts.filter(Boolean).join(" · ");

const modelToSubject = (model: TryOnModel): TryOnSubject => ({
  key: `model:${model.id}`,
  name: model.name,
  images: {
    front: model.image_front,
    left: model.image_left,
    right: model.image_right,
    back: model.image_back,
  },
  info: joinInfo([
    model.name,
    model.height != null && `${model.height} ซม.`,
    model.bust != null && `อก ${model.bust}`,
    model.waist != null && `เอว ${model.waist}`,
    model.hips != null && `สะโพก ${model.hips}`,
  ]),
});

interface Props {
  subject: TryOnSubject | null;
  angle: Angle;
  onSubjectChange: (subject: TryOnSubject | null) => void;
  onAngleChange: (angle: Angle) => void;
}

export default function ModelPicker({ subject, angle, onSubjectChange, onAngleChange }: Props) {
  const user = useSelector((state: RootState) => state.user.user);
  const requireAuth = useRequireAuth();

  const [tab, setTab] = useState<Tab>(user?.gender === "MALE" ? "MALE" : "FEMALE");
  const [models, setModels] = useState<TryOnModel[] | null>(null);
  const [modelsError, setModelsError] = useState("");
  // undefined = ยังไม่ได้โหลด, null = โหลดแล้วแต่ไม่มีรูป
  // ผูกกับ user id — เปลี่ยนบัญชี/ออกจากระบบแล้วข้อมูลเก่าจะไม่ถูกใช้
  const [myPhotosState, setMyPhotosState] = useState<{ userId: string; subject: TryOnSubject | null }>();
  const myPhotos = user && myPhotosState?.userId === user.id ? myPhotosState.subject : undefined;

  useEffect(() => {
    getModels()
      .then(setModels)
      .catch((err) => {
        console.error("Load models failed:", err);
        setModelsError("โหลดโมเดลไม่สำเร็จ");
        setModels([]);
      });
  }, []);

  // โหลดรูป 4 มุม + ข้อมูลรูปร่างของผู้ใช้ เมื่อเปิดแท็บ "รูปของฉัน"
  useEffect(() => {
    if (tab !== "me" || !user || myPhotos !== undefined) return;

    const load = async () => {
      try {
        const body = await getBody();
        const [images, bodyType] = await Promise.all([
          body.id ? getBodyImages(body.id) : Promise.resolve([]),
          getBodyType().catch(() => null),
        ]);

        const map: AngleImages = { ...EMPTY_IMAGES };
        images.forEach((img) => {
          const key = img.angle.toLowerCase() as Angle;
          if (key in map) map[key] = img.s3;
        });

        if (!map.front && !map.left && !map.right && !map.back) {
          setMyPhotosState({ userId: user.id, subject: null });
          return;
        }

        setMyPhotosState({ userId: user.id, subject: {
          key: "me",
          name: user.name ?? "ฉัน",
          images: map,
          info: joinInfo([
            user.name,
            body.height != null && `${body.height} ซม.`,
            body.weight != null && `${body.weight} กก.`,
            bodyType?.body_type,
          ]),
        } });
      } catch (err) {
        // ยังไม่เคยบันทึกข้อมูลร่างกาย (/body/latest 404) → ถือว่าไม่มีรูป
        console.error("Load my photos failed:", err);
        setMyPhotosState({ userId: user.id, subject: null });
      }
    };

    load();
  }, [tab, user, myPhotos]);

  const tabModels = useMemo(
    () => (models ?? []).filter((m) => tab !== "me" && m.gender === tab),
    [models, tab],
  );

  // เลือกตัวแรกของแท็บให้อัตโนมัติ ถ้าตัวที่เลือกอยู่ไม่อยู่ในแท็บนี้
  useEffect(() => {
    if (tab === "me") {
      onSubjectChange(myPhotos ?? null);
      return;
    }
    if (models === null) return;
    const stillHere = tabModels.some((m) => `model:${m.id}` === subject?.key);
    if (!stillHere) onSubjectChange(tabModels[0] ? modelToSubject(tabModels[0]) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, tabModels, myPhotos, models]);

  const handleTab = (value: Tab) => {
    if (value === "me" && !requireAuth()) return;
    setTab(value);
    onAngleChange("front");
  };

  const loadingMe = tab === "me" && !!user && myPhotos === undefined;

  return (
    <section>
      <h2 className="text-xl font-semibold text-[#332F29]">เลือกโมเดล</h2>

      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => handleTab(t.value)}
            className={`rounded-full border px-5 py-2 text-sm font-medium transition ${
              tab === t.value
                ? "border-[#3B2C25] bg-[#3B2C25] text-white"
                : "border-[#D9CFC2] bg-white text-[#332F29] hover:border-[#3B2C25]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* รายชื่อโมเดลในแท็บ (ซ่อนถ้ามีตัวเดียว) */}
      {tab !== "me" && tabModels.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {tabModels.map((m) => {
            const active = subject?.key === `model:${m.id}`;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onSubjectChange(modelToSubject(m));
                  onAngleChange("front");
                }}
                className={`flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition ${
                  active
                    ? "border-[#3B2C25] bg-[#F0E9DD] text-[#332F29]"
                    : "border-[#E7E0D5] bg-white text-[#8A7F72] hover:border-[#3B2C25]"
                }`}
              >
                <img src={m.image_front} alt={m.name} className="h-8 w-8 rounded-full object-cover" />
                {m.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        {models === null || loadingMe ? (
          <div className="grid grid-cols-2 gap-3">
            {ANGLES.map((a) => (
              <div key={a.key} className="aspect-[3/4] animate-pulse rounded-[20px] bg-[#F0E9DD]" />
            ))}
          </div>
        ) : subject ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              {ANGLES.map((a) => {
                const src = subject.images[a.key];
                const active = angle === a.key;
                return (
                  <button
                    key={a.key}
                    type="button"
                    disabled={!src}
                    onClick={() => onAngleChange(a.key)}
                    className={`relative aspect-[3/4] overflow-hidden rounded-[20px] border-2 bg-[#F0E9DD] transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      active ? "border-[#3B2C25]" : "border-transparent hover:border-[#D9CFC2]"
                    }`}
                  >
                    {src ? (
                      <img src={src} alt={`${subject.name} ${a.label}`} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-xs text-[#8A7F72]">
                        ไม่มีรูป
                      </span>
                    )}
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent pb-2 pt-6 text-center text-sm font-medium text-white">
                      {a.label}
                      {active && " ✓"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-[#8A7F72]">{subject.info}</p>
          </>
        ) : (
          <div className="rounded-[20px] border border-dashed border-[#D9CFC2] bg-[#FDFBF8] px-4 py-10 text-center text-sm text-[#8A7F72]">
            {tab === "me"
              ? "ยังไม่มีรูปของคุณ อัปโหลดรูป 4 มุมเพื่อลองใส่บนตัวเอง"
              : modelsError || "ยังไม่มีโมเดลในหมวดนี้"}
          </div>
        )}
      </div>

      {tab === "me" && (
        <Link
          to="/pages/profile/UploadBodyImg"
          className="mt-4 block rounded-full border border-[#D9CFC2] bg-[#F0E9DD] py-3 text-center text-sm font-semibold text-[#332F29] transition hover:bg-[#E7DCCD]"
        >
          อัปโหลดรูปใหม่
        </Link>
      )}
    </section>
  );
}
