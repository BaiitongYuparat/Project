import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IonIcon } from "@ionic/react";
import { arrowBackOutline, arrowForwardOutline } from "ionicons/icons";

import WizardSteps from "../../components/shopadmin/product/wizard/WizardSteps";
import StepDetails from "../../components/shopadmin/product/wizard/StepDetails";
import StepSizeChart from "../../components/shopadmin/product/wizard/StepSizeChart";
import StepImages from "../../components/shopadmin/product/wizard/StepImages";
import StepReview from "../../components/shopadmin/product/wizard/StepReview";
import Button from "../../components/Button";
import { WIZARD_STEPS, useProductForm } from "./useProductForm";

type Toast = { type: "success" | "error"; message: string };

export default function ProductWizard() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();

  const productId = id ?? null;
  const ctl = useProductForm(slug, productId);

  const [toast, setToast] = useState<Toast | null>(null);
  const [toastTimer, setToastTimer] = useState<number | undefined>(undefined);

  const showToast = (next: Toast) => {
    setToast(next);

    window.clearTimeout(toastTimer);
    setToastTimer(
      window.setTimeout(() => setToast(null), 4000),
    );
  };

  useEffect(() => {
    return () => window.clearTimeout(toastTimer);
  }, [toastTimer]);

  const handleSave = async () => {
    const ok = await ctl.submitProduct();

    if (ok) {
      showToast({
        type: "success",
        message: productId
          ? "บันทึกการแก้ไขสินค้าเรียบร้อยแล้ว"
          : "เพิ่มสินค้าเรียบร้อยแล้ว",
      });

      navigate(`/shopadmin/${slug}/products`);
    }
  };

  // step component ปัจจุบัน
  const stepContent = [
    <StepDetails key="details" ctl={ctl} />,
    <StepSizeChart key="size" ctl={ctl} />,
    <StepImages key="images" ctl={ctl} />,
    <StepReview key="review" ctl={ctl} />,
  ][ctl.step];

  if (ctl.loading) {
    return (
      <div>
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-[#E9DFC9] bg-white text-sm text-[#8B806E]">
          กำลังโหลด...
        </div>
      </div>
    );
  }

  const isReview = ctl.step === WIZARD_STEPS.length - 1;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#332F29] sm:text-3xl">
          {productId ? "แก้ไขสินค้า" : "เพิ่มสินค้า"}
        </h1>

        <p className="mt-2 text-base text-[#8B806E]">
          กรอกข้อมูลทีละขั้นตอน — ข้อมูลที่กรอกถูกเก็บไว้อัตโนมัติ ปิดหน้าแล้วกลับมาแก้ต่อได้
        </p>
      </div>

      {/* Error banner — ย้ายไปโชว์ใน footer เหนือปุ่มถัดไป */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Step sidebar */}
        <div className="lg:w-72 lg:shrink-0">
          <WizardSteps ctl={ctl} />
        </div>

        {/* Step content */}
        <div className="min-w-0 flex-1 space-y-6">
          {stepContent}

          {/* Footer nav */}
          <div className="rounded-2xl border border-[#E9DFC9] bg-white p-4">
            {ctl.error && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                {ctl.error}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={ctl.cancelWizard}
              className="rounded-lg px-4 py-2 text-sm text-[#8B806E] hover:bg-[#F8F4EA]"
            >
              ยกเลิก
            </button>

            <div className="flex items-center gap-3">
              {ctl.step > 0 && (
                <button
                  type="button"
                  onClick={ctl.goBack}
                  className="flex items-center gap-2 rounded-lg border border-[#E9DFC9] px-4 py-2 text-sm text-[#332F29] hover:bg-[#F8F4EA]"
                >
                  <IonIcon icon={arrowBackOutline} />
                  ย้อนกลับ
                </button>
              )}

              {isReview ? (
                <Button
                  variant="secondary"
                  onClick={handleSave}
                  disabled={ctl.saving}
                  className="px-5 py-2 text-sm"
                >
                  {ctl.saving ? "กำลังบันทึก..." : "บันทึกสินค้า"}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={ctl.goNext}
                  className="flex items-center gap-2 px-5 py-2 text-sm"
                >
                  ถัดไป
                  <IonIcon icon={arrowForwardOutline} />
                </Button>
              )}
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-6 right-6 z-50 max-w-sm rounded-xl px-4 py-3 shadow-lg text-sm ${
            toast.type === "success"
              ? "bg-green-700 text-white"
              : "bg-red-700 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
