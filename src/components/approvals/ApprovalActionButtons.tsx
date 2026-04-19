import { useState } from "react";
import { CheckCircle, XCircle, RotateCcw, ArrowUpCircle, Lock, PenTool, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useProcessApproval, type ApprovalAction } from "@/hooks/useApprovalWorkflow";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/contexts/AuthContext";
import SignaturePad from "@/components/signatures/SignaturePad";

interface Props {
  instanceId: string;
  status: string;
  isRequester?: boolean;
}

export function ApprovalActionButtons({ instanceId, status, isRequester }: Props) {
  const processApproval = useProcessApproval();
  const { isAdmin, isHrManager, roles } = useRole();
  const isManager = roles.includes("manager");
  const [dialog, setDialog] = useState(false);
  const [actionType, setActionType] = useState<ApprovalAction>("approve");
  const [comments, setComments] = useState("");
  const [showSignature, setShowSignature] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const openAction = (action: ApprovalAction) => {
    setActionType(action);
    setComments("");
    setSignatureData(null);
    setShowSignature(false);
    setDialog(true);
  };

  const handleSubmit = () => {
    processApproval.mutate({
      instanceId,
      action: actionType,
      comments: comments || undefined,
      signatureData: signatureData || undefined,
    }, {
      onSuccess: () => {
        setDialog(false);
      },
    });
  };

  const canApprove = ["submitted", "pending_approval"].includes(status);
  const canReturn = ["submitted", "pending_approval"].includes(status);
  const canLock = status === "approved";

  // Requester can only resubmit if returned
  if (isRequester && status === "returned") {
    return (
      <Button size="sm" variant="outline" className="gap-1.5 font-heading" onClick={() => openAction("submit")}>
        إعادة التقديم
      </Button>
    );
  }

  // Self-approval prevention: requester cannot approve/reject/escalate/lock their own request
  if (isRequester) return null;

  // Admin/HR/Manager/Finance can act; also anyone who is the current_approver (server enforces)
  const isFinance = roles.includes("finance_manager");
  const canAct = isAdmin || isHrManager || isManager || isFinance;
  if (!canAct && !canApprove) return null;

  return (
    <>
      <div className="flex gap-1.5 flex-wrap">
        {canApprove && (
          <Button size="sm" variant="ghost" className="text-primary h-7 px-2 gap-1" onClick={() => openAction("approve")}>
            <CheckCircle className="h-4 w-4" /> موافقة
          </Button>
        )}
        {canApprove && (
          <Button size="sm" variant="ghost" className="text-destructive h-7 px-2 gap-1" onClick={() => openAction("reject")}>
            <XCircle className="h-4 w-4" /> رفض
          </Button>
        )}
        {canReturn && (
          <Button size="sm" variant="ghost" className="text-warning h-7 px-2 gap-1" onClick={() => openAction("return")}>
            <RotateCcw className="h-4 w-4" /> إرجاع
          </Button>
        )}
        {canApprove && (
          <Button size="sm" variant="ghost" className="text-accent-foreground h-7 px-2 gap-1" onClick={() => openAction("escalate")}>
            <ArrowUpCircle className="h-4 w-4" /> تصعيد
          </Button>
        )}
        {canLock && (
          <Button size="sm" variant="ghost" className="text-muted-foreground h-7 px-2 gap-1" onClick={() => openAction("lock")}>
            <Lock className="h-4 w-4" /> قفل
          </Button>
        )}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {actionType === "approve" ? "تأكيد الموافقة" :
               actionType === "reject" ? "تأكيد الرفض" :
               actionType === "return" ? "إرجاع للتعديل" :
               actionType === "escalate" ? "تصعيد الطلب" :
               actionType === "lock" ? "قفل النتيجة" :
               "تأكيد الإجراء"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ملاحظات {(actionType === "reject" || actionType === "return") && <span className="text-destructive">*</span>}</Label>
              <Textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="أضف ملاحظات..." rows={3} />
            </div>

            {actionType === "approve" && (
              <div className="space-y-2">
                {!showSignature && !signatureData && (
                  <Button variant="outline" className="w-full gap-2 font-heading" onClick={() => setShowSignature(true)}>
                    <PenTool className="h-4 w-4" /> إضافة توقيع رقمي (اختياري)
                  </Button>
                )}
                {showSignature && !signatureData && (
                  <div className="border rounded-lg p-3">
                    <Label className="text-sm font-heading mb-2 block">التوقيع الرقمي</Label>
                    <SignaturePad
                      onSave={(data) => { setSignatureData(data); setShowSignature(false); }}
                      onCancel={() => setShowSignature(false)}
                    />
                  </div>
                )}
                {signatureData && (
                  <div className="border rounded-lg p-3 text-center">
                    <img src={signatureData} alt="التوقيع" className="h-16 mx-auto mb-2" />
                    <div className="flex gap-2 justify-center">
                      <Badge variant="outline" className="bg-primary/10 text-primary gap-1">
                        <FileSignature className="h-3 w-3" />تم التوقيع
                      </Badge>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setSignatureData(null); setShowSignature(true); }}>
                        إعادة التوقيع
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                className={`flex-1 font-heading ${actionType === "reject" ? "bg-destructive hover:bg-destructive/90" : ""}`}
                onClick={handleSubmit}
                disabled={processApproval.isPending || ((actionType === "reject" || actionType === "return") && !comments.trim())}
              >
                {processApproval.isPending ? "جاري المعالجة..." : "تأكيد"}
              </Button>
              <Button variant="outline" className="font-heading" onClick={() => setDialog(false)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
