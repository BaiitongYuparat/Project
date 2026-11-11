import { useEffect } from "react";
import Button from "./Button";

type Props = {
    brandName?: string;
    title?: string;
    onClose: () => void;
};

export default function SuspendedModal({ brandName, title, onClose }: Props) {
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    return (
        <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="suspended-title"
            onClick={onClose}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl"
            >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-xl font-bold text-red-600">
                    !
                </div>
                <h2 id="suspended-title" className="text-lg font-semibold text-stone-900">
                    {title ?? (brandName ? "บัญชีร้านค้าถูกระงับ" : "บัญชีของคุณถูกระงับ")}
                </h2>
                <p className="mt-2 text-sm text-stone-600">
                    {brandName ? `ร้าน ${brandName} ` : "บัญชีของคุณ"}
                    ถูกระงับการใช้งาน
                    <br />
                    กรุณาติดต่อแอดมิน
                </p>
                <div className="mt-5">
                    <Button
                        variant="secondary"
                        className="w-full"
                        onClick={onClose}>
                        รับทราบ
                    </Button>
                </div>
            </div>
        </div>
    );
}

