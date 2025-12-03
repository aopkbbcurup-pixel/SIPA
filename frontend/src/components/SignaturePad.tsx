import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Eraser, Save } from "lucide-react";

interface SignaturePadProps {
    onSave: (dataUrl: string) => void;
    onClear?: () => void;
}

export function SignaturePad({ onSave, onClear }: SignaturePadProps) {
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [isEmpty, setIsEmpty] = useState(true);

    const clear = () => {
        sigCanvas.current?.clear();
        setIsEmpty(true);
        if (onClear) onClear();
    };

    const save = () => {
        if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
            const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL("image/png");
            onSave(dataUrl);
        }
    };

    const handleEnd = () => {
        if (sigCanvas.current) {
            setIsEmpty(sigCanvas.current.isEmpty());
        }
    };

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 text-sm font-medium text-slate-500">Area Tanda Tangan</div>
                <div className="overflow-hidden rounded-md border border-slate-300 bg-slate-50">
                    <SignatureCanvas
                        ref={sigCanvas}
                        penColor="black"
                        backgroundColor="rgba(255, 255, 255, 0)"
                        canvasProps={{
                            className: "w-full h-48 cursor-crosshair touch-none",
                        }}
                        onEnd={handleEnd}
                    />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    <button
                        onClick={clear}
                        className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        <Eraser className="h-4 w-4" />
                        Hapus
                    </button>
                    <button
                        onClick={save}
                        disabled={isEmpty}
                        className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        Simpan Tanda Tangan
                    </button>
                </div>
            </div>
        </div>
    );
}
