import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Globe, Mail, Shield, Database, Bell, Palette, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logBusinessAction } from "@/hooks/useBusinessAudit";
import { BPPageHeader, BPPageSkeleton, BPErrorState } from "@/components/business-portal/BPDesignSystem";

const categoryConfig: Record<string, { title: string; subtitle: string; icon: any }> = {
  identity: { title: "Platform Identity", subtitle: "Branding and display settings", icon: Palette },
  branding: { title: "Module Branding", subtitle: "Customize module names and logos", icon: Palette },
  email: { title: "Email & Notifications", subtitle: "SMTP and delivery configuration", icon: Mail },
  security: { title: "Security", subtitle: "Authentication and access policies", icon: Shield },
  storage: { title: "Storage Policy", subtitle: "File storage and limits", icon: Database },
  notifications: { title: "Notifications", subtitle: "Alert preferences", icon: Bell },
};

interface Setting {
  id: string; setting_key: string; setting_value: string | null;
  setting_type: string; category: string; label: string; label_ar: string | null;
}

export default function BPSettings() {
  const queryClient = useQueryClient();
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  const { data: settings = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_settings").select("id, setting_key, setting_value, setting_type, category, label, label_ar").order("category");
      if (error) throw error;
      return (data || []) as Setting[];
    },
  });

  useEffect(() => {
    if (settings.length > 0 && Object.keys(localValues).length === 0) {
      const vals: Record<string, string> = {};
      settings.forEach((s) => { vals[s.setting_key] = s.setting_value || ""; });
      setLocalValues(vals);
    }
  }, [settings]);

  const hasChanges = settings.some((s) => localValues[s.setting_key] !== (s.setting_value || ""));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = settings
        .filter((s) => localValues[s.setting_key] !== (s.setting_value || ""))
        .map((s) => ({ key: s.setting_key, before: s.setting_value, after: localValues[s.setting_key] }));
      if (updates.length === 0) return;
      for (const u of updates) {
        await supabase.from("platform_settings").update({ setting_value: u.after } as any).eq("setting_key", u.key);
      }
      await logBusinessAction("update_platform_settings", "platform_settings", undefined, undefined,
        Object.fromEntries(updates.map((u) => [u.key, u.before])),
        Object.fromEntries(updates.map((u) => [u.key, u.after]))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      toast({ title: "Settings Saved", description: "Platform settings updated successfully." });
    },
    onError: () => toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" }),
  });

  const grouped = settings.reduce<Record<string, Setting[]>>((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  if (isLoading) return <BPPageSkeleton cards={4} table={false} />;
  if (isError) return <BPErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <BPPageHeader title="Platform Settings" subtitle="إعدادات المنصة العامة" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Object.entries(grouped).map(([category, items]) => {
          const cfg = categoryConfig[category] || { title: category, subtitle: "", icon: Globe };
          const Icon = cfg.icon;
          const textItems = items.filter((s) => s.setting_type === "text" || s.setting_type === "number" || s.setting_type === "email");
          const boolItems = items.filter((s) => s.setting_type === "boolean");
          return (
            <Card key={category}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">{cfg.title}</CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{cfg.subtitle}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {textItems.map((s) => (
                  <div key={s.setting_key} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{s.label}</Label>
                    <Input type={s.setting_type === "number" ? "number" : "text"} value={localValues[s.setting_key] ?? ""} onChange={(e) => setLocalValues((prev) => ({ ...prev, [s.setting_key]: e.target.value }))} className="h-9 text-sm" />
                  </div>
                ))}
                {boolItems.map((s) => (
                  <div key={s.setting_key} className="flex items-center justify-between py-2">
                    <span className="text-sm text-foreground">{s.label}</span>
                    <Switch checked={localValues[s.setting_key] === "true"} onCheckedChange={(v) => setLocalValues((prev) => ({ ...prev, [s.setting_key]: v ? "true" : "false" }))} />
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !hasChanges} className="px-8">
          {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
