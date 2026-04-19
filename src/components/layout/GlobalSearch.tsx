import { useState, useEffect, useRef } from "react";
import { Search, User, FileText, Briefcase, Building2, GitBranch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useNavigate } from "react-router-dom";

interface SearchResult {
  id: string;
  type: "employee" | "document" | "position" | "department" | "request";
  title: string;
  subtitle?: string;
  icon: any;
  route: string;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const { companyId } = useCompany();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 2 || !companyId) { setResults([]); return; }

    const timer = setTimeout(async () => {
      const all: SearchResult[] = [];

      // Search employees
      const { data: emps } = await supabase
        .from("employees")
        .select("id, name_ar, name_en, employee_code, position")
        .eq("company_id", companyId)
        .or(`name_ar.ilike.%${query}%,name_en.ilike.%${query}%,employee_code.ilike.%${query}%`)
        .limit(5);
      (emps || []).forEach((e: any) => all.push({
        id: e.id, type: "employee", title: e.name_ar,
        subtitle: `${e.employee_code || ""} • ${e.position || ""}`,
        icon: User, route: `/madad/tamkeen/employees?id=${e.id}`,
      }));

      // Search positions
      const { data: poss } = await supabase
        .from("positions")
        .select("id, title_ar, title, position_code")
        .eq("company_id", companyId)
        .or(`title_ar.ilike.%${query}%,title.ilike.%${query}%,position_code.ilike.%${query}%`)
        .limit(5);
      (poss || []).forEach((p: any) => all.push({
        id: p.id, type: "position", title: p.title_ar || p.title,
        subtitle: p.position_code || "", icon: Briefcase, route: "/madad/tamkeen/org-chart",
      }));

      // Search departments
      const { data: depts } = await supabase
        .from("departments")
        .select("id, name")
        .eq("company_id", companyId)
        .ilike("name", `%${query}%`)
        .limit(5);
      (depts || []).forEach((d: any) => all.push({
        id: d.id, type: "department", title: d.name,
        icon: Building2, route: "/madad/tamkeen/departments",
      }));

      // Search generated documents
      const { data: docs } = await supabase
        .from("generated_documents")
        .select("id, document_type, reference_number, employees(name_ar)")
        .eq("company_id", companyId)
        .or(`reference_number.ilike.%${query}%,document_type.ilike.%${query}%`)
        .limit(5);
      (docs || []).forEach((d: any) => all.push({
        id: d.id, type: "document", title: d.document_type,
        subtitle: `${d.reference_number || ""} • ${d.employees?.name_ar || ""}`,
        icon: FileText, route: "/madad/tamkeen/documents",
      }));

      setResults(all);
      setOpen(all.length > 0);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, companyId]);

  const typeLabels: Record<string, string> = {
    employee: "موظف", document: "مستند", position: "منصب", department: "قسم", request: "طلب",
  };
  const typeColors: Record<string, string> = {
    employee: "bg-primary/10 text-primary", document: "bg-accent/10 text-accent-foreground",
    position: "bg-secondary text-secondary-foreground", department: "bg-muted text-muted-foreground",
    request: "bg-primary/10 text-primary",
  };

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث عام... (موظف، مستند، منصب، قسم)"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="pr-10 w-full sm:w-80"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full sm:w-96 bg-card border rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
          {results.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-right"
              onClick={() => { navigate(r.route); setOpen(false); setQuery(""); }}
            >
              <r.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.title}</p>
                {r.subtitle && <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>}
              </div>
              <Badge variant="outline" className={`text-[10px] shrink-0 ${typeColors[r.type]}`}>{typeLabels[r.type]}</Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
