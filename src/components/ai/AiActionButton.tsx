import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2, Copy, Check, AlertTriangle } from "lucide-react";
import { useAiAction } from "@/hooks/useAiAction";
import { toast } from "@/hooks/use-toast";

interface AiActionButtonProps {
  action: string;
  context: string;
  label: string;
  icon?: React.ReactNode;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "icon" | "lg";
  dialogTitle?: string;
  className?: string;
  onResult?: (result: string) => void;
}

export function AiActionButton({
  action,
  context,
  label,
  icon,
  variant = "outline",
  size = "sm",
  dialogTitle,
  className = "",
  onResult,
}: AiActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { execute, result, isLoading, reset } = useAiAction();

  const handleClick = async () => {
    setError(null);
    setOpen(true);
    try {
      const res = await execute(action, context);
      if (res && onResult) onResult(res);
    } catch (e: any) {
      setError(e.message || "حدث خطأ غير متوقع");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "تم النسخ" });
  };

  const handleClose = () => {
    setOpen(false);
    setError(null);
    reset();
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={`gap-1.5 ${className}`}
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          icon || <Sparkles className="h-3.5 w-3.5" />
        )}
        {label}
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-heading flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {dialogTitle || label || action}
              </DialogTitle>
              {result && (
                <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "تم" : "نسخ"}
                </Button>
              )}
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {error ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">خطأ في خدمة الذكاء الاصطناعي</p>
                  <p className="text-xs mt-1">{error}</p>
                  <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={handleClick}>
                    <Sparkles className="h-3 w-3" />إعادة المحاولة
                  </Button>
                </div>
              </div>
            ) : isLoading && !result ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">جاري التحليل بالذكاء الاصطناعي...</p>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 overflow-hidden break-words [&_table]:block [&_table]:overflow-x-auto [&_table]:w-full [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-all" dir="rtl">
                <ReactMarkdown>{result}</ReactMarkdown>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin inline-block mr-1" />}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
