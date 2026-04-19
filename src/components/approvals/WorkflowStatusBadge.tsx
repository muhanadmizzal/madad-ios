import { Badge } from "@/components/ui/badge";
import { workflowStatusLabels, workflowStatusColors } from "@/hooks/useApprovalWorkflow";

interface Props {
  status: string;
  className?: string;
}

export function WorkflowStatusBadge({ status, className }: Props) {
  return (
    <Badge
      variant="outline"
      className={`${workflowStatusColors[status] || ""} ${className || ""}`}
    >
      {workflowStatusLabels[status] || status}
    </Badge>
  );
}
