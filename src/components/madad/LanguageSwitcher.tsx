import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageSwitcher({ variant = "ghost" }: { variant?: "ghost" | "outline" }) {
  const { lang, setLang } = useLanguage();

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      className="gap-1.5 text-sm font-medium"
    >
      <Globe className="h-4 w-4" />
      {lang === "ar" ? "EN" : "عربي"}
    </Button>
  );
}
