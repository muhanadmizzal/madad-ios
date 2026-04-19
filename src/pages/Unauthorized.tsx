import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export default function Unauthorized() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="max-w-md w-full">
        <CardContent className="py-16 text-center">
          <ShieldAlert className="h-16 w-16 mx-auto mb-4 text-destructive/30" />
          <h1 className="font-heading font-bold text-xl mb-2">غير مصرح بالوصول</h1>
          <p className="text-muted-foreground text-sm mb-6">
            حسابك لا يملك صلاحيات كافية للوصول إلى أي بوابة. تواصل مع المسؤول.
          </p>
          <Button variant="outline" onClick={() => signOut()} className="font-heading">
            تسجيل الخروج
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
