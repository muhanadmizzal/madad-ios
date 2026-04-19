import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Search, ZoomIn, ZoomOut, Maximize2, LayoutGrid, List,
  Building2, Users, AlertCircle, Workflow, Shield, Download, Plus,
  Lock, Unlock, RotateCcw, Move, GitBranch, Briefcase, UserPlus, RefreshCw, Wrench,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ViewMode = "full" | "department" | "management" | "vacancy" | "workflow" | "permissions";
export type LayoutMode = "chart" | "list";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  layoutMode: LayoutMode;
  onLayoutModeChange: (v: LayoutMode) => void;
  chartLayoutMode?: "auto" | "free";
  onChartLayoutModeChange?: (v: "auto" | "free") => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  totalNodes: number;
  vacantCount: number;
  onExport?: () => void;
  onAddDepartment?: () => void;
  onAddPosition?: () => void;
  onAssignEmployee?: () => void;
  onSync?: () => void;
  showSync?: boolean;
  autoSync?: boolean;
  onAutoSyncChange?: (v: boolean) => void;
  fixIssueCount?: number;
}

const viewModes: { key: ViewMode; label: string; icon: typeof Building2 }[] = [
  { key: "full", label: "الهيكل الكامل", icon: Building2 },
  { key: "department", label: "حسب القسم", icon: Users },
  { key: "management", label: "سلسلة الإدارة", icon: Users },
  { key: "vacancy", label: "الشواغر", icon: AlertCircle },
  { key: "workflow", label: "سير العمل", icon: Workflow },
  { key: "permissions", label: "الصلاحيات", icon: Shield },
];

export default function OrgChartToolbar({
  search, onSearchChange, viewMode, onViewModeChange,
  layoutMode, onLayoutModeChange,
  chartLayoutMode = "auto", onChartLayoutModeChange,
  onZoomIn, onZoomOut, onFitView,
  totalNodes, vacantCount, onExport,
  onAddDepartment, onAddPosition, onAssignEmployee,
  onSync, showSync, autoSync, onAutoSyncChange,
  fixIssueCount = 0,
}: Props) {
  const activeView = viewModes.find((v) => v.key === viewMode)!;
  const isFree = chartLayoutMode === "free";

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card shadow-sm">
      {/* Left: Search + View Mode */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث في الهيكل..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pr-9 w-48 h-9 text-sm"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <activeView.icon className="h-3.5 w-3.5" />
              <span className="text-xs">{activeView.label}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {viewModes.map((vm) => (
              <DropdownMenuItem
                key={vm.key}
                onClick={() => onViewModeChange(vm.key)}
                className={viewMode === vm.key ? "bg-accent/10 text-accent" : ""}
              >
                <vm.icon className="h-3.5 w-3.5 ml-2" />
                {vm.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Stats badges */}
        <Badge variant="outline" className="text-xs">{totalNodes} منصب</Badge>
        {vacantCount > 0 && (
          <Badge variant="secondary" className="text-xs">{vacantCount} شاغر</Badge>
        )}
      </div>

      {/* Right: Layout toggle + Chart mode + Zoom + Export */}
      <div className="flex items-center gap-1.5">
        {/* Chart / List toggle */}
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => onLayoutModeChange("chart")}
            className={`p-2 transition-colors ${layoutMode === "chart" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onLayoutModeChange("list")}
            className={`p-2 transition-colors ${layoutMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Auto / Free layout toggle (only in chart mode) */}
        {layoutMode === "chart" && onChartLayoutModeChange && (
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => onChartLayoutModeChange("auto")}
              className={`p-2 transition-colors ${!isFree ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              title="تخطيط تلقائي"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onChartLayoutModeChange("free")}
              className={`p-2 transition-colors ${isFree ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              title="تخطيط حر"
            >
              <Move className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Zoom controls */}
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <button onClick={onZoomOut} className="p-2 hover:bg-muted transition-colors">
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button onClick={onFitView} className="p-2 hover:bg-muted transition-colors">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onZoomIn} className="p-2 hover:bg-muted transition-colors">
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>

        <Button variant="outline" size="sm" className="h-9" onClick={onExport}>
          <Download className="h-3.5 w-3.5" />
        </Button>

        {showSync && (
          <div className="flex items-center gap-1.5">
            <Button
              variant={fixIssueCount > 0 ? "destructive" : "default"}
              size="sm"
              className="h-9 gap-1.5"
              onClick={onSync}
            >
              <Wrench className="h-3.5 w-3.5" />
              <span className="text-xs">فحص وإصلاح</span>
              {fixIssueCount > 0 && (
                <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-background/20 text-current">{fixIssueCount}</Badge>
              )}
            </Button>
            {onAutoSyncChange && (
              <div className="flex items-center gap-1 border border-border rounded-lg px-2 py-1.5" title="مزامنة تلقائية">
                <span className="text-[10px] text-muted-foreground hidden sm:inline">تلقائي</span>
                <Switch checked={autoSync} onCheckedChange={onAutoSyncChange} className="scale-75" />
              </div>
            )}
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="h-9 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span className="text-xs hidden sm:inline">إضافة</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            <DropdownMenuItem onClick={onAddDepartment}>
              <Building2 className="h-3.5 w-3.5 ml-2" />
              إضافة تشكيل
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onAddPosition}>
              <Briefcase className="h-3.5 w-3.5 ml-2" />
              إضافة منصب
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onAssignEmployee}>
              <UserPlus className="h-3.5 w-3.5 ml-2" />
              تعيين موظف
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
