import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eraser, Check, PenTool, Type } from "lucide-react";

interface Props {
  onSave: (signatureData: string, type: "drawn" | "typed") => void;
  onCancel?: () => void;
  disabled?: boolean;
}

export default function SignaturePad({ onSave, onCancel, disabled }: Props) {
  const sigRef = useRef<SignatureCanvas>(null);
  const [typedName, setTypedName] = useState("");
  const [mode, setMode] = useState<"draw" | "type">("draw");

  const handleSaveDrawn = () => {
    if (!sigRef.current || sigRef.current.isEmpty()) return;
    const data = sigRef.current.toDataURL("image/png");
    onSave(data, "drawn");
  };

  const handleSaveTyped = () => {
    if (!typedName.trim()) return;
    // Create canvas with typed signature
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 120;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 400, 120);
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "italic 36px 'Noto Naskh Arabic', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName, 200, 60);
    onSave(canvas.toDataURL("image/png"), "typed");
  };

  return (
    <div className="space-y-3">
      <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
        <TabsList className="w-full">
          <TabsTrigger value="draw" className="flex-1 gap-1.5 font-heading">
            <PenTool className="h-3.5 w-3.5" />رسم التوقيع
          </TabsTrigger>
          <TabsTrigger value="type" className="flex-1 gap-1.5 font-heading">
            <Type className="h-3.5 w-3.5" />كتابة الاسم
          </TabsTrigger>
        </TabsList>

        <TabsContent value="draw" className="mt-3">
          <div className="border-2 border-dashed rounded-lg overflow-hidden bg-card">
            <SignatureCanvas
              ref={sigRef}
              penColor="#1a1a1a"
              canvasProps={{ width: 400, height: 150, className: "w-full" }}
            />
          </div>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" size="sm" className="gap-1.5 font-heading" onClick={() => sigRef.current?.clear()}>
              <Eraser className="h-3.5 w-3.5" />مسح
            </Button>
            <Button size="sm" className="gap-1.5 font-heading flex-1" onClick={handleSaveDrawn} disabled={disabled}>
              <Check className="h-3.5 w-3.5" />تأكيد التوقيع
            </Button>
            {onCancel && <Button variant="ghost" size="sm" className="font-heading" onClick={onCancel}>إلغاء</Button>}
          </div>
        </TabsContent>

        <TabsContent value="type" className="mt-3 space-y-3">
          <Input
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="اكتب اسمك الكامل..."
            className="text-center text-lg"
          />
          {typedName && (
            <div className="border rounded-lg p-4 text-center bg-card">
              <p className="text-2xl italic font-serif text-foreground">{typedName}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" className="gap-1.5 font-heading flex-1" onClick={handleSaveTyped} disabled={disabled || !typedName.trim()}>
              <Check className="h-3.5 w-3.5" />تأكيد التوقيع
            </Button>
            {onCancel && <Button variant="ghost" size="sm" className="font-heading" onClick={onCancel}>إلغاء</Button>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
