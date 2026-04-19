import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  GraduationCap, Wrench, Laptop, Car, BadgeCheck,
  Plus, X, BookOpen, Monitor, Briefcase,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  positionId: string;
  companyId: string;
}

interface TalentRequirements {
  required_skills: string[];
  required_qualifications: string[];
  mandatory_training: string[];
  standard_equipment: string[];
}

const EQUIPMENT_PRESETS = [
  { key: "laptop", nameAr: "جهاز لابتوب", icon: Laptop },
  { key: "desktop", nameAr: "جهاز مكتبي", icon: Monitor },
  { key: "phone", nameAr: "هاتف عمل", icon: Briefcase },
  { key: "car", nameAr: "سيارة خدمة", icon: Car },
];

const DEFAULT: TalentRequirements = {
  required_skills: [],
  required_qualifications: [],
  mandatory_training: [],
  standard_equipment: [],
};

export default function PositionTalentTab({ positionId, companyId }: Props) {
  const queryClient = useQueryClient();

  const { data: requirements } = useQuery({
    queryKey: ["position-talent", positionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("positions")
        .select("talent_requirements")
        .eq("id", positionId)
        .single();
      if (error) throw error;
      return (data?.talent_requirements as unknown as TalentRequirements) || DEFAULT;
    },
    enabled: !!positionId,
  });

  const reqs = requirements || DEFAULT;
  const [newSkill, setNewSkill] = useState("");
  const [newQual, setNewQual] = useState("");
  const [newTraining, setNewTraining] = useState("");

  const saveMutation = useMutation({
    mutationFn: async (newReqs: TalentRequirements) => {
      const { error } = await supabase
        .from("positions")
        .update({ talent_requirements: newReqs } as any)
        .eq("id", positionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["position-talent", positionId] });
      queryClient.invalidateQueries({ queryKey: ["org-positions"] });
      toast({ title: "تم حفظ المتطلبات" });
    },
    onError: () => toast({ title: "خطأ", description: "فشل في الحفظ", variant: "destructive" }),
  });

  const addItem = useCallback((field: keyof TalentRequirements, value: string) => {
    if (!value.trim()) return;
    const updated = { ...reqs, [field]: [...(reqs[field] || []), value.trim()] };
    saveMutation.mutate(updated);
  }, [reqs, saveMutation]);

  const removeItem = useCallback((field: keyof TalentRequirements, index: number) => {
    const updated = { ...reqs, [field]: reqs[field].filter((_, i) => i !== index) };
    saveMutation.mutate(updated);
  }, [reqs, saveMutation]);

  const toggleEquipment = useCallback((key: string) => {
    const current = reqs.standard_equipment || [];
    const updated = current.includes(key)
      ? current.filter(k => k !== key)
      : [...current, key];
    saveMutation.mutate({ ...reqs, standard_equipment: updated });
  }, [reqs, saveMutation]);

  const totalCount = (reqs.required_skills?.length || 0) + (reqs.required_qualifications?.length || 0) +
    (reqs.mandatory_training?.length || 0) + (reqs.standard_equipment?.length || 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          حدد المهارات والمؤهلات والتدريب المطلوب لهذا المنصب. تُستخدم في التوظيف وتقييم الأداء.
        </p>
        <Badge variant="outline" className="text-[10px] shrink-0">{totalCount} متطلب</Badge>
      </div>

      {/* Required Skills */}
      <Section
        icon={Wrench}
        title="المهارات المطلوبة"
        items={reqs.required_skills || []}
        onRemove={(i) => removeItem("required_skills", i)}
        color="primary"
      >
        <div className="flex gap-2">
          <Input
            placeholder="أضف مهارة..."
            className="h-8 text-xs flex-1"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { addItem("required_skills", newSkill); setNewSkill(""); } }}
            dir="rtl"
          />
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { addItem("required_skills", newSkill); setNewSkill(""); }}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </Section>

      <Separator />

      {/* Required Qualifications */}
      <Section
        icon={GraduationCap}
        title="المؤهلات المطلوبة"
        items={reqs.required_qualifications || []}
        onRemove={(i) => removeItem("required_qualifications", i)}
        color="accent"
      >
        <div className="flex gap-2">
          <Input
            placeholder="أضف مؤهل..."
            className="h-8 text-xs flex-1"
            value={newQual}
            onChange={(e) => setNewQual(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { addItem("required_qualifications", newQual); setNewQual(""); } }}
            dir="rtl"
          />
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { addItem("required_qualifications", newQual); setNewQual(""); }}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </Section>

      <Separator />

      {/* Mandatory Training */}
      <Section
        icon={BookOpen}
        title="الدورات التدريبية الإلزامية"
        items={reqs.mandatory_training || []}
        onRemove={(i) => removeItem("mandatory_training", i)}
        color="secondary"
      >
        <div className="flex gap-2">
          <Input
            placeholder="أضف دورة تدريبية..."
            className="h-8 text-xs flex-1"
            value={newTraining}
            onChange={(e) => setNewTraining(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { addItem("mandatory_training", newTraining); setNewTraining(""); } }}
            dir="rtl"
          />
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { addItem("mandatory_training", newTraining); setNewTraining(""); }}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </Section>

      <Separator />

      {/* Standard Equipment */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Laptop className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">المعدات القياسية</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {EQUIPMENT_PRESETS.map((eq) => {
            const selected = reqs.standard_equipment?.includes(eq.key);
            const Icon = eq.icon;
            return (
              <button
                key={eq.key}
                onClick={() => toggleEquipment(eq.key)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                  selected
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/30"
                }`}
              >
                <Icon className="h-4 w-4" />
                {eq.nameAr}
                {selected && <BadgeCheck className="h-3.5 w-3.5 mr-auto" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, items, onRemove, color, children }: {
  icon: typeof Wrench;
  title: string;
  items: string[];
  onRemove: (i: number) => void;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">{title}</span>
        {items.length > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{items.length}</Badge>}
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {items.map((item, i) => (
            <Badge key={i} variant="outline" className="text-[11px] gap-1 pr-1">
              {item}
              <button onClick={() => onRemove(i)} className="hover:text-destructive transition-colors">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}
