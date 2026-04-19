import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShoppingCart } from "lucide-react";
import { useBasketBill, useFeatureCatalog, useTenantFeatures, useToggleFeature } from "@/hooks/useFeatureCatalog";

interface Props {
  featureKey: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: () => void;
}

export default function FeatureCostConfirmDialog({ featureKey, open, onOpenChange, onConfirm }: Props) {
  const { data: catalog = [] } = useFeatureCatalog();
  const { data: bill } = useBasketBill();
  const { data: tenantFeatures = [] } = useTenantFeatures();
  const { requestFeature } = useToggleFeature();

  if (!featureKey) return null;

  const feature = catalog.find(f => f.key === featureKey);
  const alreadyActive = tenantFeatures.some(tf => tf.feature_key === featureKey && tf.status === "active");

  if (!feature) return null;

  const currentTotal = bill?.total || 0;
  const additionalCost = feature.pricing_type === "per_user"
    ? feature.per_user_price * (bill?.employee_count || 1)
    : feature.monthly_price;
  const newTotal = currentTotal + additionalCost;

  const handleConfirm = async () => {
    await requestFeature.mutateAsync({
      featureKey,
      action: "activate",
      estimatedImpact: additionalCost,
      moduleKey: (feature as any)?.module_key || undefined,
    });
    onConfirm?.();
    onOpenChange(false);
  };

  if (alreadyActive) {
    onConfirm?.();
    onOpenChange(false);
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            طلب إضافة ميزة
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-4 rounded-lg bg-primary/5 border border-border">
            <p className="font-semibold text-foreground">{feature.name_ar}</p>
            <p className="text-xs text-muted-foreground mt-1">{feature.description || ""}</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">الفاتورة الحالية</span>
              <span className="font-medium">${currentTotal.toLocaleString()}/شهر</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">التكلفة المتوقعة</span>
              <div className="text-left">
                <span className="font-medium text-primary">+${additionalCost.toLocaleString()}/شهر</span>
                {feature.pricing_type === "per_user" && (
                  <p className="text-[10px] text-muted-foreground">${feature.per_user_price} × {bill?.employee_count || 1} موظف</p>
                )}
              </div>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-border font-bold">
              <span>الإجمالي المتوقع</span>
              <span className="text-primary">${newTotal.toLocaleString()}/شهر</span>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 text-xs text-muted-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
            <span>سيتم إرسال طلبك لمراجعة إدارة المنصة. بعد الموافقة سيتم تحديث فاتورتك الشهرية.</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleConfirm} disabled={requestFeature.isPending}>
            {requestFeature.isPending ? "جاري الإرسال..." : "إرسال الطلب"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
