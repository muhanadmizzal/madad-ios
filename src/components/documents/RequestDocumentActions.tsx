import { Eye, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { RequestOfficialRecord, printRequestDocument } from "./RequestOfficialRecord";
import { requestTypeLabels } from "@/hooks/useApprovalWorkflow";

interface Props {
  doc: any;
  compact?: boolean;
}

export function RequestDocumentActions({ doc, compact = false }: Props) {
  const [preview, setPreview] = useState(false);

  const handlePrint = () => printRequestDocument(doc);

  const handleDownload = () => {
    // Open print dialog which allows saving as PDF
    printRequestDocument(doc);
  };

  if (compact) {
    return (
      <>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPreview(true)} title="عرض">
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handlePrint} title="طباعة">
            <Printer className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleDownload} title="تحميل PDF">
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Dialog open={preview} onOpenChange={setPreview}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
            <DialogHeader className="p-4 pb-0">
              <DialogTitle className="font-heading">
                {requestTypeLabels[doc.request_type] || doc.request_type} — {doc.reference_number}
              </DialogTitle>
            </DialogHeader>
            <div className="border-t">
              <RequestOfficialRecord doc={doc} />
            </div>
            <div className="p-4 pt-0 flex gap-2">
              <Button className="flex-1 gap-2 font-heading" onClick={handlePrint}>
                <Printer className="h-4 w-4" />طباعة
              </Button>
              <Button variant="outline" className="flex-1 gap-2 font-heading" onClick={handleDownload}>
                <Download className="h-4 w-4" />تحميل PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" className="gap-1.5 font-heading" onClick={() => setPreview(true)}>
          <Eye className="h-4 w-4" />عرض السجل الرسمي
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 font-heading" onClick={handlePrint}>
          <Printer className="h-4 w-4" />طباعة
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 font-heading" onClick={handleDownload}>
          <Download className="h-4 w-4" />تحميل PDF
        </Button>
      </div>
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="font-heading">
              {requestTypeLabels[doc.request_type] || doc.request_type} — {doc.reference_number}
            </DialogTitle>
          </DialogHeader>
          <div className="border-t">
            <RequestOfficialRecord doc={doc} />
          </div>
          <div className="p-4 pt-0 flex gap-2">
            <Button className="flex-1 gap-2 font-heading" onClick={handlePrint}>
              <Printer className="h-4 w-4" />طباعة
            </Button>
            <Button variant="outline" className="flex-1 gap-2 font-heading" onClick={handleDownload}>
              <Download className="h-4 w-4" />تحميل PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
