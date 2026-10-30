import { useEffect } from "react";
import { useForm } from "react-hook-form";

import Input from "./Input";
import type { BodyData } from "../services/bodyService";
import Button from "./Button";

export type BodyFormValues = {
  height: number;
  weight: number;
  chest: number | null;
  waist: number | null;
  hips: number | null;
};

type BodyFormProps = {
  initialData?: BodyData | null;
  onSubmit: (data: BodyFormValues) => void | Promise<void>;
  isLoading?: boolean;
};

export default function BodyForm({
  initialData,
  onSubmit,
  isLoading = false,
}: BodyFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BodyFormValues>({
    defaultValues: {
      height: initialData?.height ?? undefined,
      weight: initialData?.weight ?? undefined,
      chest: initialData?.chest ?? null,
      waist: initialData?.waist ?? null,
      hips: initialData?.hips ?? null,
    },
  });

  useEffect(() => {
    reset({
      height: initialData?.height ?? undefined,
      weight: initialData?.weight ?? undefined,
      chest: initialData?.chest ?? null,
      waist: initialData?.waist ?? null,
      hips: initialData?.hips ?? null,
    });
  }, [initialData, reset]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
    >
      <Input
        label="ส่วนสูง"
        type="number"
        placeholder="เช่น 165"
        suffix="ซม."
        disabled={isLoading}
        {...register("height", {
          valueAsNumber: true,
          required: "กรุณากรอกส่วนสูง",
          min: { value: 1, message: "ส่วนสูงต้องมากกว่า 0" },
          max: { value: 300, message: "ส่วนสูงไม่ถูกต้อง" },
          validate: (value) =>
            Number.isFinite(value) || "กรุณากรอกส่วนสูงให้ถูกต้อง",
        })}
        error={errors.height?.message}
      />

      <Input
        label="น้ำหนัก"
        type="number"
        step="0.1"
        placeholder="เช่น 55"
        suffix="กก."
        disabled={isLoading}
        {...register("weight", {
          valueAsNumber: true,
          required: "กรุณากรอกน้ำหนัก",
          min: { value: 1, message: "น้ำหนักต้องมากกว่า 0" },
          max: { value: 150, message: "น้ำหนักไม่ถูกต้อง" },
          validate: {
            isNumber: (value) =>
                Number.isFinite(value) || "กรุณากรอกน้ำหนักให้ถูกต้อง",
            oneDecimal: (value) =>
                Number.isFinite(value) &&
                Math.abs(value * 10 - Math.round(value * 10)) < 1e-9 ||
                "กรุณากรอกทศนิยมไม่เกิน 1 ตำแหน่ง",
            },
        })}
        error={errors.weight?.message}
      />

      <Input
        label="รอบอก"
        type="number"
        placeholder="ไม่บังคับ"
        suffix="ซม."
        disabled={isLoading}
        {...register("chest", {
          setValueAs: (value) =>
            value === "" ? null : Number(value),
          validate: (value) =>
            value === null ||
            (Number.isFinite(value) && value >= 1 && value <= 300) ||
            "รอบอกต้องอยู่ระหว่าง 1–300 ซม.",
        })}
        error={errors.chest?.message}
      />

      <Input
        label="รอบเอว"
        type="number"
        placeholder="ไม่บังคับ"
        suffix="ซม."
        disabled={isLoading}
        {...register("waist", {
          setValueAs: (value) =>
            value === "" ? null : Number(value),
          validate: (value) =>
            value === null ||
            (Number.isFinite(value) && value >= 1 && value <= 300) ||
            "รอบเอวต้องอยู่ระหว่าง 1–300 ซม.",
        })}
        error={errors.waist?.message}
      />

      <Input
        label="รอบสะโพก"
        type="number"
        placeholder="ไม่บังคับ"
        suffix="ซม."
        disabled={isLoading}
        {...register("hips", {
          setValueAs: (value) =>
            value === "" ? null : Number(value),
          validate: (value) =>
            value === null ||
            (Number.isFinite(value) && value >= 1 && value <= 300) ||
            "รอบสะโพกต้องอยู่ระหว่าง 1–300 ซม.",
        })}
        error={errors.hips?.message}
      />
      <Button type="submit" disabled={isLoading} variant="secondary">{isLoading ? "กำลังบันทึก" : "บันทึกข้อมูล"}</Button>
    </form>
  );
}