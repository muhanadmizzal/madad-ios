import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Star, Gift, Trophy, Megaphone, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function TathbeetLoyalty() {
  const { t, lang } = useLanguage();
  const { companyId } = useCompany();
  const qc = useQueryClient();

  // ===== TIERS =====
  const { data: tiers = [] } = useQuery({
    queryKey: ["tathbeet-loyalty-tiers", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("tathbeet_loyalty_tiers").select("*").eq("company_id", companyId!).order("sort_order");
      return data || [];
    },
    enabled: !!companyId,
  });

  const [tierOpen, setTierOpen] = useState(false);
  const [tierForm, setTierForm] = useState({ name: "", name_en: "", min_points: "0", discount_percent: "0" });

  const addTier = useMutation({
    mutationFn: async () => {
      await supabase.from("tathbeet_loyalty_tiers").insert({
        company_id: companyId!, name: tierForm.name, name_en: tierForm.name_en || null,
        min_points: parseInt(tierForm.min_points), discount_percent: parseFloat(tierForm.discount_percent),
        sort_order: tiers.length,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tathbeet-loyalty-tiers"] }); setTierOpen(false); setTierForm({ name: "", name_en: "", min_points: "0", discount_percent: "0" }); toast.success(t("تمت الإضافة", "Added")); },
  });

  // ===== RULES =====
  const { data: rules = [] } = useQuery({
    queryKey: ["tathbeet-loyalty-rules", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("tathbeet_loyalty_rules").select("*").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const [ruleOpen, setRuleOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState({ rule_type: "booking_completion", points_amount: "10", description_ar: "", description_en: "" });

  const addRule = useMutation({
    mutationFn: async () => {
      await supabase.from("tathbeet_loyalty_rules").insert({
        company_id: companyId!, rule_type: ruleForm.rule_type,
        points_amount: parseInt(ruleForm.points_amount),
        description_ar: ruleForm.description_ar || null, description_en: ruleForm.description_en || null,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tathbeet-loyalty-rules"] }); setRuleOpen(false); toast.success(t("تمت الإضافة", "Added")); },
  });

  // ===== REWARDS =====
  const { data: rewards = [] } = useQuery({
    queryKey: ["tathbeet-loyalty-rewards", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("tathbeet_loyalty_rewards").select("*").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const [rewardOpen, setRewardOpen] = useState(false);
  const [rewardForm, setRewardForm] = useState({ name: "", name_en: "", points_cost: "100", reward_type: "discount", discount_value: "0" });

  const addReward = useMutation({
    mutationFn: async () => {
      await supabase.from("tathbeet_loyalty_rewards").insert({
        company_id: companyId!, name: rewardForm.name, name_en: rewardForm.name_en || null,
        points_cost: parseInt(rewardForm.points_cost), reward_type: rewardForm.reward_type,
        discount_value: parseFloat(rewardForm.discount_value),
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tathbeet-loyalty-rewards"] }); setRewardOpen(false); toast.success(t("تمت الإضافة", "Added")); },
  });

  // ===== CAMPAIGNS =====
  const { data: campaigns = [] } = useQuery({
    queryKey: ["tathbeet-loyalty-campaigns", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("tathbeet_loyalty_campaigns").select("*").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-heading font-extrabold text-2xl">{t("برنامج الولاء", "Loyalty Program")}</h1>

      <Tabs defaultValue="tiers">
        <TabsList>
          <TabsTrigger value="tiers" className="gap-1"><Trophy className="h-3.5 w-3.5" />{t("المستويات", "Tiers")}</TabsTrigger>
          <TabsTrigger value="rules" className="gap-1"><Star className="h-3.5 w-3.5" />{t("القواعد", "Rules")}</TabsTrigger>
          <TabsTrigger value="rewards" className="gap-1"><Gift className="h-3.5 w-3.5" />{t("المكافآت", "Rewards")}</TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1"><Megaphone className="h-3.5 w-3.5" />{t("الحملات", "Campaigns")}</TabsTrigger>
        </TabsList>

        {/* TIERS */}
        <TabsContent value="tiers" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={tierOpen} onOpenChange={setTierOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 me-1" />{t("مستوى جديد", "New Tier")}</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>{t("إضافة مستوى", "Add Tier")}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>{t("الاسم (عربي)", "Name (AR)")}</Label><Input value={tierForm.name} onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })} /></div>
                  <div><Label>{t("الاسم (إنجليزي)", "Name (EN)")}</Label><Input value={tierForm.name_en} onChange={(e) => setTierForm({ ...tierForm, name_en: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>{t("الحد الأدنى من النقاط", "Min Points")}</Label><Input type="number" value={tierForm.min_points} onChange={(e) => setTierForm({ ...tierForm, min_points: e.target.value })} /></div>
                    <div><Label>{t("نسبة الخصم %", "Discount %")}</Label><Input type="number" value={tierForm.discount_percent} onChange={(e) => setTierForm({ ...tierForm, discount_percent: e.target.value })} /></div>
                  </div>
                  <Button onClick={() => addTier.mutate()} disabled={!tierForm.name}>{t("حفظ", "Save")}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {tiers.length === 0 ? (
            <Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground"><Trophy className="h-10 w-10 mx-auto mb-2 opacity-30" /><p>{t("لا توجد مستويات", "No tiers yet")}</p></CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {tiers.map((tier: any) => (
                <Card key={tier.id} className="border-border/50">
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-heading font-bold">{lang === "ar" ? tier.name : (tier.name_en || tier.name)}</h3>
                    <p className="text-xs text-muted-foreground">{tier.min_points} {t("نقطة كحد أدنى", "points minimum")}</p>
                    <Badge variant="outline">{tier.discount_percent}% {t("خصم", "discount")}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* RULES */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={ruleOpen} onOpenChange={setRuleOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 me-1" />{t("قاعدة جديدة", "New Rule")}</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>{t("إضافة قاعدة", "Add Rule")}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>{t("نوع القاعدة", "Rule Type")}</Label><Input value={ruleForm.rule_type} onChange={(e) => setRuleForm({ ...ruleForm, rule_type: e.target.value })} /></div>
                  <div><Label>{t("النقاط", "Points")}</Label><Input type="number" value={ruleForm.points_amount} onChange={(e) => setRuleForm({ ...ruleForm, points_amount: e.target.value })} /></div>
                  <div><Label>{t("الوصف (عربي)", "Description (AR)")}</Label><Input value={ruleForm.description_ar} onChange={(e) => setRuleForm({ ...ruleForm, description_ar: e.target.value })} /></div>
                  <Button onClick={() => addRule.mutate()} disabled={!ruleForm.rule_type}>{t("حفظ", "Save")}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {rules.length === 0 ? (
            <Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground"><Star className="h-10 w-10 mx-auto mb-2 opacity-30" /><p>{t("لا توجد قواعد", "No rules yet")}</p></CardContent></Card>
          ) : (
            <div className="space-y-2">
              {rules.map((r: any) => (
                <Card key={r.id} className="border-border/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{r.rule_type}</p>
                      <p className="text-xs text-muted-foreground">{r.description_ar || r.description_en || "—"}</p>
                    </div>
                    <Badge>{r.points_amount} {t("نقطة", "pts")}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* REWARDS */}
        <TabsContent value="rewards" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={rewardOpen} onOpenChange={setRewardOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 me-1" />{t("مكافأة جديدة", "New Reward")}</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>{t("إضافة مكافأة", "Add Reward")}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>{t("الاسم (عربي)", "Name (AR)")}</Label><Input value={rewardForm.name} onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })} /></div>
                  <div><Label>{t("الاسم (إنجليزي)", "Name (EN)")}</Label><Input value={rewardForm.name_en} onChange={(e) => setRewardForm({ ...rewardForm, name_en: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>{t("تكلفة النقاط", "Points Cost")}</Label><Input type="number" value={rewardForm.points_cost} onChange={(e) => setRewardForm({ ...rewardForm, points_cost: e.target.value })} /></div>
                    <div><Label>{t("قيمة الخصم", "Discount Value")}</Label><Input type="number" value={rewardForm.discount_value} onChange={(e) => setRewardForm({ ...rewardForm, discount_value: e.target.value })} /></div>
                  </div>
                  <Button onClick={() => addReward.mutate()} disabled={!rewardForm.name}>{t("حفظ", "Save")}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {rewards.length === 0 ? (
            <Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground"><Gift className="h-10 w-10 mx-auto mb-2 opacity-30" /><p>{t("لا توجد مكافآت", "No rewards yet")}</p></CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.map((r: any) => (
                <Card key={r.id} className="border-border/50">
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-heading font-bold text-sm">{lang === "ar" ? r.name : (r.name_en || r.name)}</h3>
                    <div className="flex gap-2">
                      <Badge variant="outline">{r.points_cost} {t("نقطة", "pts")}</Badge>
                      <Badge variant="secondary">{r.reward_type}</Badge>
                    </div>
                    {r.discount_value > 0 && <p className="text-xs text-muted-foreground">{t("خصم:", "Discount:")} {r.discount_value}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* CAMPAIGNS */}
        <TabsContent value="campaigns" className="space-y-4">
          {campaigns.length === 0 ? (
            <Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground"><Megaphone className="h-10 w-10 mx-auto mb-2 opacity-30" /><p>{t("لا توجد حملات", "No campaigns yet")}</p></CardContent></Card>
          ) : (
            <div className="space-y-2">
              {campaigns.map((c: any) => (
                <Card key={c.id} className="border-border/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{lang === "ar" ? c.name : (c.name_en || c.name)}</p>
                      <p className="text-xs text-muted-foreground">{c.campaign_type} — {c.multiplier}x</p>
                    </div>
                    <Badge className={c.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>{c.is_active ? t("فعّال", "Active") : t("معطّل", "Inactive")}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
