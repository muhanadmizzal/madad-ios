import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search, X, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  name_ar?: string;
  employee_code?: string | null;
}

interface EmployeeSearchProps {
  employees: Employee[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  showAllOption?: boolean;
  allLabel?: string;
  className?: string;
}

export function EmployeeSearch({
  employees,
  value,
  onChange,
  placeholder = "ابحث بالاسم أو الرقم الوظيفي...",
  showAllOption = false,
  allLabel = "جميع الموظفين",
  className,
}: EmployeeSearchProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const selectedEmp = employees.find((e) => e.id === value);

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.name_ar?.toLowerCase().includes(q) ||
        e.employee_code?.toLowerCase().includes(q)
    );
  }, [employees, search]);

  const handleSelect = (id: string) => {
    onChange(id);
    setSearch("");
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={open ? search : selectedEmp ? `${selectedEmp.name_ar || ""}${selectedEmp.employee_code ? ` (${selectedEmp.employee_code})` : ""}` : value === "all" ? allLabel : ""}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pr-9 pl-8"
        />
        {(value || search) && (
          <button
            type="button"
            onClick={() => { onChange(""); setSearch(""); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 top-full mt-1 w-full rounded-lg border border-border bg-popover shadow-lg max-h-60 overflow-y-auto">
            {showAllOption && (
              <button
                type="button"
                onClick={() => handleSelect("all")}
                className={cn(
                  "w-full text-right px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2",
                  value === "all" && "bg-primary/10 text-primary"
                )}
              >
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                {allLabel}
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">لا توجد نتائج</div>
            ) : (
              filtered.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => handleSelect(e.id)}
                  className={cn(
                    "w-full text-right px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center justify-between",
                    value === e.id && "bg-primary/10 text-primary"
                  )}
                >
                  <span className="font-medium">{e.name_ar}</span>
                  {e.employee_code && (
                    <span className="text-xs text-muted-foreground font-mono">{e.employee_code}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
