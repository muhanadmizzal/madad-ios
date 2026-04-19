/**
 * Salary Band Validator — shows salary range for a position and validates proposed salary.
 */
import { DollarSign, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Props {
  minSalary?: number | null;
  maxSalary?: number | null;
  gradeLevel?: number | null;
  currentSalary?: number | null;
  proposedSalary?: number | null;
  currency?: string;
  compact?: boolean;
  onValidationChange?: (valid: boolean, warning: string | null) => void;
}

export function SalaryBandValidator({
  minSalary,
  maxSalary,
  gradeLevel,
  currentSalary,
  proposedSalary,
  currency = "IQD",
  compact,
  onValidationChange,
}: Props) {
  const salary = proposedSalary ?? currentSalary;
  const hasRange = minSalary != null && maxSalary != null && maxSalary > 0;

  let status: "in_range" | "below" | "above" | "no_range" = "no_range";
  let percentage = 50;
  let warning: string | null = null;

  if (hasRange && salary != null) {
    const range = maxSalary! - minSalary!;
    if (range > 0) {
      percentage = Math.max(0, Math.min(100, ((salary - minSalary!) / range) * 100));
    }
    if (salary < minSalary!) {
      status = "below";
      warning = `الراتب أقل من الحد الأدنى للدرجة (${minSalary!.toLocaleString()} ${currency})`;
    } else if (salary > maxSalary!) {
      status = "above";
      warning = `الراتب أعلى من الحد الأقصى للدرجة (${maxSalary!.toLocaleString()} ${currency})`;
    } else {
      status = "in_range";
    }
  }

  // Notify parent of validation
  if (onValidationChange) {
    onValidationChange(status !== "above", warning);
  }

  if (!hasRange && !salary) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <DollarSign className="h-3 w-3 text-muted-foreground" />
        {hasRange && (
          <span className="text-muted-foreground">
            {minSalary!.toLocaleString()} – {maxSalary!.toLocaleString()} {currency}
          </span>
        )}
        {salary != null && status !== "no_range" && (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              status === "in_range" && "bg-primary/10 text-primary border-primary/20",
              status === "below" && "bg-accent/10 text-accent-foreground border-accent/20",
              status === "above" && "bg-destructive/10 text-destructive border-destructive/20",
            )}
          >
            {status === "in_range" && "ضمن النطاق"}
            {status === "below" && "أقل من النطاق"}
            {status === "above" && "أعلى من النطاق"}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-heading font-semibold text-muted-foreground">
          <DollarSign className="h-3.5 w-3.5" />
          نطاق الراتب
          {gradeLevel != null && (
            <Badge variant="outline" className="text-[10px] mr-1">درجة {gradeLevel}</Badge>
          )}
        </div>
        {status !== "no_range" && (
          <div className="flex items-center gap-1">
            {status === "in_range" && <CheckCircle className="h-3 w-3 text-primary" />}
            {status === "below" && <AlertTriangle className="h-3 w-3 text-accent-foreground" />}
            {status === "above" && <AlertTriangle className="h-3 w-3 text-destructive" />}
          </div>
        )}
      </div>

      {hasRange && (
        <>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{minSalary!.toLocaleString()} {currency}</span>
            <span>{maxSalary!.toLocaleString()} {currency}</span>
          </div>
          <Progress value={percentage} className="h-1.5" />
        </>
      )}

      {salary != null && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {proposedSalary != null ? "الراتب المقترح:" : "الراتب الحالي:"}
          </span>
          <span className={cn(
            "font-heading font-bold",
            status === "in_range" && "text-primary",
            status === "below" && "text-accent-foreground",
            status === "above" && "text-destructive",
            status === "no_range" && "text-foreground",
          )}>
            {salary.toLocaleString()} {currency}
          </span>
        </div>
      )}

      {warning && (
        <div className={cn(
          "flex items-start gap-1.5 text-[10px] p-1.5 rounded",
          status === "above" ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent-foreground",
        )}>
          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{warning}</span>
        </div>
      )}

      {!hasRange && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Info className="h-3 w-3" />
          <span>لم يتم تحديد نطاق راتب لهذا المنصب</span>
        </div>
      )}
    </div>
  );
}
