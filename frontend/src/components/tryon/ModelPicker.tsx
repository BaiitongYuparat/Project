import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { getModels, type TryOnModel } from "../../services/modelService";
import { getBody, getBodyImages } from "../../services/bodyService";
import { getBodyType } from "../../services/bodyTypeService";
import type { RootState } from "../../store/store";
import { ANGLES, type Angle, type AngleImages, type TryOnSubject } from "./types";

/** โหมดของพื้นที่ลองใส่ — null = ยังไม่ได้เลือก (แสดงหน้าเลือกเริ่มต้น) */
export type SubjectMode = "model" | "me" | null;

type Gender = "FEMALE" | "MALE";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "MALE", label: "ชาย" },
  { value: "FEMALE", label: "หญิง" },
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
  mode: Exclude<SubjectMode, null>;
  onModeChange: (mode: Exclude<SubjectMode, null>) => void;
  subject: TryOnSubject | null;
  angle: Angle;
  onSubjectChange: (subject: TryOnSubject | null) => void;
  onAngleChange: (angle: Angle) => void;
  /** ล็อกการเลือกระหว่าง AI กำลังสร้างภาพ */
  disabled?: boolean;
}

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const PersonIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
  </svg>
);

const UsersIcon = () => (
  <svg {...iconProps}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M17 14c2.2 0 4 1.8 4 4" />
  </svg>
);

const MODES = [
  { value: "model", title: "เลือกโมเดล", desc: "ลองบนโมเดลของระบบ", Icon: UsersIcon },
  { value: "me", title: "รูปของฉัน", desc: "ลองบนรูปร่างจริงของคุณ", Icon: PersonIcon },
] as const;

/** แถบเลือกผู้ลอง (โมเดล / รูปของฉัน) + มุมมอง — แสดงบนพื้นที่ลองใส่ */
export default function ModelPicker({
  mode,
  onModeChange,
  subject,
  angle,
  onSubjectChange,
  onAngleChange,
  disabled = false,
}: Props) {
  const user = useSelector((state: RootState) => state.user.user);

  const [chosenGender, setGender] = useState<Gender | null>(null);
  const gender: Gender = chosenGender ?? (user?.gender === "MALE" ? "MALE" : "FEMALE");
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

  // โหลดรูป 4 มุม + ข้อมูลรูปร่างของผู้ใช้ เมื่อเข้าโหมด "รูปของฉัน"
  useEffect(() => {
    if (mode !== "me" || !user || myPhotos !== undefined) return;

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
  }, [mode, user, myPhotos]);

  const genderModels = useMemo(
    () => (models ?? []).filter((m) => m.gender === gender),
    [models, gender],
  );

  // เลือกตัวแรกให้อัตโนมัติ ถ้าตัวที่เลือกอยู่ไม่ตรงโหมด/เพศปัจจุบัน
  useEffect(() => {
    // ระหว่างสร้างภาพ ห้ามเปลี่ยนโมเดลเอง — รอ gen เสร็จแล้วค่อย sync
    if (disabled) return;
    if (mode === "me") {
      onSubjectChange(myPhotos ?? null);
      return;
    }
    if (models === null) return;
    const stillHere = genderModels.some((m) => `model:${m.id}` === subject?.key);
    if (!stillHere) onSubjectChange(genderModels[0] ? modelToSubject(genderModels[0]) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, genderModels, myPhotos, models, disabled]);

  const handleGender = (value: Gender) => {
    setGender(value);
    onAngleChange("front");
  };

  const loadingMe = mode === "me" && !!user && myPhotos === undefined;

  return (
    <fieldset disabled={disabled} className={`min-w-0 ${disabled ? "opacity-60" : ""}`}>
      {/* แถบหลัก: เลือกโมเดล | รูปของฉัน */}
      <div role="tablist" aria-label="ผู้ลองใส่" className="grid grid-cols-2 gap-3">
        {MODES.map(({ value, title, desc, Icon }) => {
          const active = mode === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onModeChange(value)}
              className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all duration-200 ${
                active
                  ? "border-[#3B2C25] bg-[#3B2C25] text-white shadow-[0_6px_16px_rgba(59,44,37,0.25)]"
                  : "border-white/80 bg-white/70 text-[#332F29] hover:-translate-y-0.5 hover:border-[#3B2C25]/40 hover:bg-white"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  active ? "bg-white/15" : "bg-[#F0E9DD]"
                }`}
              >
                <Icon />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{title}</span>
                <span className={`block truncate text-xs ${active ? "text-white/70" : "text-[#8A7F72]"}`}>
                  {desc}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* เลือกโมเดล → ชาย | หญิง */}
      {mode === "model" && (
        <div role="tablist" aria-label="เพศของโมเดล" className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-white/70 p-1">
          {GENDERS.map((g) => {
            const active = gender === g.value;
            return (
              <button
                key={g.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleGender(g.value)}
                className={`rounded-full py-2 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "bg-white text-[#332F29] shadow-[0_2px_8px_rgba(59,44,37,0.18)]"
                    : "text-[#8A7F72] hover:text-[#332F29]"
                }`}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      )}

      {mode === "me" && (
        <Link
          to="/pages/profile/UploadBodyImg"
          className="mt-3 inline-block rounded-full border border-[#D9CFC2] bg-white px-4 py-1.5 text-sm font-medium text-[#332F29] transition hover:bg-[#F0E9DD]"
        >
          อัปโหลดรูปใหม่
        </Link>
      )}

      {/* รายชื่อโมเดล (ซ่อนถ้ามีตัวเดียว) */}
      {mode === "model" && genderModels.length > 1 && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {genderModels.map((m) => {
            const active = subject?.key === `model:${m.id}`;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  onSubjectChange(modelToSubject(m));
                  onAngleChange("front");
                }}
                className="group w-16 shrink-0 text-center"
              >
                <span
                  className={`block aspect-[3/4] overflow-hidden rounded-xl border-2 bg-white transition-all ${
                    active
                      ? "border-[#3B2C25] shadow-[0_4px_10px_rgba(59,44,37,0.25)]"
                      : "border-white/80 opacity-80 group-hover:opacity-100"
                  }`}
                >
                  <img src={m.image_front} alt={m.name} className="h-full w-full object-cover" />
                </span>
                <span
                  className={`mt-1 block truncate text-[11px] ${
                    active ? "font-semibold text-[#332F29]" : "text-[#8A7F72]"
                  }`}
                >
                  {m.name}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* มุมมอง */}
      {subject && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {ANGLES.map((a) => {
            const src = subject.images[a.key];
            const active = angle === a.key;
            return (
              <button
                key={a.key}
                type="button"
                disabled={!src}
                onClick={() => onAngleChange(a.key)}
                aria-pressed={active}
                className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  active
                    ? "border-[#3B2C25] bg-white text-[#332F29]"
                    : "border-transparent bg-white/60 text-[#8A7F72] hover:border-[#3B2C25]"
                }`}
              >
                {src ? (
                  <img src={src} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="h-8 w-8 rounded-full bg-[#E7DCCD]" />
                )}
                {a.label}
              </button>
            );
          })}
          <span className="ml-1 text-xs text-[#8A7F72]">{subject.info}</span>
        </div>
      )}

      {/* สถานะโหลด / ไม่มีข้อมูล */}
      {(models === null && mode === "model") || loadingMe ? (
        <p className="mt-3 text-sm text-[#8A7F72]">กำลังโหลด...</p>
      ) : !subject ? (
        <p className="mt-3 text-sm text-[#8A7F72]">
          {mode === "me"
            ? user
              ? "ยังไม่มีรูปของคุณ อัปโหลดรูป 4 มุมเพื่อลองใส่บนตัวเอง"
              : "เข้าสู่ระบบเพื่อใช้รูปของคุณ"
            : modelsError || "ยังไม่มีโมเดลในหมวดนี้"}
        </p>
      ) : null}
    </fieldset>
  );
}
