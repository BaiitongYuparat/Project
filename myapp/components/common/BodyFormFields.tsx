import { useEffect } from "react";
import { Text, ScrollView, TouchableOpacity } from "react-native";
import { Controller, useForm } from "react-hook-form";
import CustomInput from "../common/Input";
import type { BodyData } from "../../service/bodrservice";
import { CustomButton as Button } from "../common/Button";


//
export type BodyFormValues = {
    height: number;
    weight: number;
    chest: number
    waist: number
    hips: number
}

//
type FormState = {
    height: string;
    weight: string;
    chest: string
    waist: string
    hips: string
}

// props ที่หน้า BodySetup , BodyEdit ส่งเข้ามา
type Pops = {
    initialData?: BodyData | null;
    description?: string;
    submitLabel: string; // ข้อความบนปุ่ม
    isLoading?: boolean;
    onSubmit: (data: BodyFormValues) => void | Promise<void>; // เรียกเมื่อกรอกถูกต้องครบ
}

const str = (v?: number | null) => (v == null ? "" : String(v));
const num = (v: string) => Number(v.replace(",", "."));

const toForm = (d?: BodyData | null): FormState => ({
    height: str(d?.height),
    weight: str(d?.weight),
    chest: str(d?.chest),
    waist: str(d?.waist),
    hips: str(d?.hips),
});

// ช่องกรอก 1 ช่อง
function Field({ control, name, label, placeholder, disabled, rules }: any) {
    return (
        <Controller
            control={control}
            name={name}
            rules={rules}
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                <CustomInput
                    label={label}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    editable={!disabled}
                    keyboardType="decimal-pad"
                    error={error?.message}
                    touched
                />
            )}
        />
    );
}

// ต้องกรอกและเป็นตัวเลข 1 ถึง max
const range = (label: string, max: number) => ({
    required: `กรุณากรอก${label}`,
    validate: (v: string) => {
        const n = num(v);
        return (Number.isFinite(n) && n >= 1 && n <= max) || `${label}ไม่ถูกต้อง`;
    },
});


export default function BodyFormFields({
    initialData,
    description,
    submitLabel,
    isLoading = false,
    onSubmit
}: Pops) {
    const { control, handleSubmit, reset } = useForm<FormState>({
        defaultValues: toForm(initialData),
    })
    useEffect(() => {
        reset(toForm(initialData));
    }, [initialData, reset]);


    const submit = (d: FormState) =>
        onSubmit({
            height: num(d.height),
            weight: num(d.weight),
            chest: num(d.chest),
            waist: num(d.waist),
            hips: num(d.hips),
        });
    return (
        <ScrollView
            className="flex-1 bg-[#FFFCFA]"
            contentContainerStyle={{ padding: 16 }}
            keyboardShouldPersistTaps="handled"
        >
            {description && (
                <Text className="mb-5 text-base text-[#8A7968]">{description}</Text>
            )}

            <Field control={control}
                name="height"
                label="ส่วนสูง (ซม.)"
                placeholder="เช่น 165"
                disabled={isLoading}
                rules={range("ส่วนสูง", 300)} />
            <Field
                control={control}
                name="weight"
                label="น้ำหนัก (กก.)"
                placeholder="เช่น 55"
                disabled={isLoading}
                rules={range("น้ำหนัก", 150)} />
            <Field control={control}
                name="chest"
                label="รอบอก (นิ้ว.)"
                placeholder="เช่น 85"
                disabled={isLoading}
                rules={range("รอบอก", 300)} />
            <Field control={control}
                name="waist"
                label="รอบเอว (นิ้ว.)"
                placeholder="เช่น 68"
                disabled={isLoading}
                rules={range("รอบเอว", 300)} />
            <Field control={control}
                name="hips"
                label="รอบสะโพก (นิ้ว.)"
                placeholder="เช่น 92"
                disabled={isLoading}
                rules={range("รอบสะโพก", 300)} />

            <Button
                title={isLoading ? "กำลังบันทึก" : submitLabel}
                onPress={handleSubmit(submit)}
                disabled={isLoading}
                variant="secondary"
            />
        </ScrollView>
    )
}


