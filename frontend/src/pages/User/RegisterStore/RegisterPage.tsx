import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerBrand } from "../../../services/brandService";
import Input from "../../../components/Input";
import Button from "../../../components/Button";

const MAX_FILE_SIZE = 5 * 1024 * 1024; //กำหนดขนาดไฟล์สูงสุด 5MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export default function RegisterPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        brand_name: "",
        owner_name: "",
        email: "",
        phone_number: "",
        store_url: "",
        ebiz_reg_no: "",
    });
    const [file, setFile] = useState<File | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        setFieldErrors((prev) => ({ ...prev, ebiz_registration: "" }));

        if (f && !ALLOWED_TYPES.includes(f.type)) {
            setFile(null);
            setFieldErrors((prev) => ({ ...prev, ebiz_registration: "รองรับเฉพาะ PDF, JPG, PNG" }));
            return;
        }
        if (f && f.size > MAX_FILE_SIZE) {
            setFile(null);
            setFieldErrors((prev) => ({ ...prev, ebiz_registration: "ไฟล์ต้องไม่เกิน 5MB" }));
            return;
        }
        setFile(f);
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setFieldErrors({});

        if (!file) {
            setFieldErrors({ ebiz_registration: "กรุณาแนบไฟล์ทะเบียนพาณิชย์อิเล็กทรอนิกส์" });
            return;
        }

        setLoading(true);
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => fd.append(k, v));
            fd.append("ebiz_registration", file);
            await registerBrand(fd);
            navigate("/brand/register/success");
        } catch (err: any) {
            if (err.status === 409) {
                const errs: Record<string, string> = {};
                (err.fields ?? []).forEach((f: string) => {
                    errs[f] = "ข้อมูลนี้ถูกใช้สมัครแล้ว";
                });
                setFieldErrors(errs);
            } else {
                setError(err.error ?? err.message ?? "สมัครไม่สำเร็จ ลองใหม่อีกครั้ง");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto my-10 max-w-md p-4">
            <h1 className="mb-6 text-2xl font-bold">ร่วมเป็นส่วนหนึ่งของ LongDress</h1>

            <form onSubmit={onSubmit} className="grid gap-4">
                <Input
                    label="ชื่อแบรนด์ / ร้านค้า *"
                    name="brand_name"
                    value={form.brand_name}
                    onChange={onChange}
                    error={fieldErrors.brand_name}
                    required
                />
                <Input
                    label="ชื่อ-นามสกุลเจ้าของ *"
                    name="owner_name"
                    value={form.owner_name}
                    onChange={onChange}
                    error={fieldErrors.owner_name}
                    required
                />
                <Input
                    label="อีเมล *"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={onChange}
                    error={fieldErrors.email}
                    required
                />
                <Input
                    label="เบอร์โทรศัพท์"
                    name="phone_number"
                    type="tel"
                    value={form.phone_number}
                    onChange={onChange}
                    error={fieldErrors.phone_number}
                />
                <Input
                    label="ลิงก์หน้าร้านออนไลน์ *"
                    name="store_url"
                    type="url"
                    placeholder="https://..."
                    value={form.store_url}
                    onChange={onChange}
                    error={fieldErrors.store_url}
                    required
                />
                <Input
                    label="เลขทะเบียนพาณิชย์อิเล็กทรอนิกส์"
                    name="ebiz_reg_no"
                    value={form.ebiz_reg_no}
                    onChange={onChange}
                    error={fieldErrors.ebiz_reg_no}
                />
                <Input
                    label="ไฟล์ทะเบียนพาณิชย์อิเล็กทรอนิกส์ *"
                    hint="PDF, JPG, PNG ไม่เกิน 5MB"
                    name="ebiz_registration"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    onChange={onFileChange}
                    error={fieldErrors.ebiz_registration}
                    required
                />
                

                {error && <p className="text-sm text-red-600">{error}</p>}

                <Button
                    type="submit"
                    variant="secondary"
                    size="lg"
                    disabled={loading}
                    className="w-full">
                    {loading ? "กำลังส่ง..." : "สมัคร"}
                </Button>
            </form>
        </div>
    );
}