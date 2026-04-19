import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";
import SignaturePad from "./SignaturePad";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentType: string;
  onSigned?: () => void;
}

export default function ApprovalSignatureDialog({ open, onOpenChange, documentId, documentType, onSigned }: Props) {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleSave = async (signatureData: string, type: "drawn" | "typed") => {
    if (!user || !companyId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("digital_signatures").insert({
        company_id: companyId,
        user_id: user.id,
        document_id: documentId,
        document_type: documentType,
        signature_data: signatureData,
        signature_type: type,
      } as any);
      if (error) throw error;
      toast({ title: "تم حفظ التوقيع بنجاح" });
      onSigned?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">التوقيع الرقمي</DialogTitle>
        </DialogHeader>
        <SignaturePad onSave={handleSave} onCancel={() => onOpenChange(false)} disabled={saving} />
      </DialogContent>
    </Dialog>
  );
}
