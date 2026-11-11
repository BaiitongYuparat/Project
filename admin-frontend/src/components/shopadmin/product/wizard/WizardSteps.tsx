import type { ProductFormController } from "../../../../pages/AdminStore/useProductForm";
import { WIZARD_STEPS } from "../../../../pages/AdminStore/useProductForm";

interface WizardStepsProps {
  ctl: ProductFormController;
}

export default function WizardSteps({ ctl }: WizardStepsProps) {
  return (
    <aside className="rounded-2xl border border-[#E9DFC9] bg-white p-4 lg:sticky lg:top-6">
      <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-widest text-[#A39988]">
        ขั้นตอน
      </p>

      <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
        {WIZARD_STEPS.map((step, index) => {
          const isCurrent = ctl.step === index;
          const isPast = index < ctl.step;
          const isReachable = index <= ctl.furthestStep;

          return (
            <li key={step.title} className="shrink-0 lg:w-full">
              <button
                type="button"
                disabled={!isReachable}
                onClick={() => ctl.goToStep(index)}
                aria-current={isCurrent ? "step" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  isCurrent
                    ? "bg-[#87947A] font-medium text-white"
                    : isReachable
                      ? "text-[#332F29] hover:bg-[#F8F4EA]"
                      : "cursor-not-allowed text-[#C9BFAE]"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                    isCurrent
                      ? "border-white/60 bg-white/20 text-white"
                      : isPast
                        ? "border-[#87947A] bg-[#87947A]/10 text-[#6B7A5E]"
                        : "border-[#E9DFC9] text-[#A39988]"
                  }`}
                >
                  {isPast ? "✓" : index + 1}
                </span>

                <span className="min-w-0">
                  <span className="block whitespace-nowrap lg:whitespace-normal">
                    {step.title}
                  </span>

                  <span
                    className={`mt-0.5 hidden text-xs lg:block ${
                      isCurrent ? "text-white/80" : "text-[#A39988]"
                    }`}
                  >
                    {step.description}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
