import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";

function hexToHSL(hex: string): string | null {
  try {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  } catch {
    return null;
  }
}

/** Darken an HSL string by reducing lightness */
function darkenHSL(hsl: string, amount: number): string {
  const parts = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!parts) return hsl;
  const l = Math.max(0, parseInt(parts[3]) - amount);
  return `${parts[1]} ${parts[2]}% ${l}%`;
}

/** Lighten an HSL string by increasing lightness */
function lightenHSL(hsl: string, amount: number): string {
  const parts = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!parts) return hsl;
  const l = Math.min(100, parseInt(parts[3]) + amount);
  return `${parts[1]} ${parts[2]}% ${l}%`;
}

/**
 * Applies tenant-specific branding colors as CSS custom properties.
 * Falls back to platform defaults when no tenant colors are set.
 */
export function useTenantTheme() {
  const { companyId } = useCompany();

  const { data: company } = useQuery({
    queryKey: ["tenant-theme", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("companies")
        .select("name, logo_url, primary_color, accent_color, sidebar_color")
        .eq("id", companyId!)
        .single();
      return data;
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const root = document.documentElement;
    if (company?.primary_color) {
      const hsl = hexToHSL(company.primary_color);
      if (hsl) {
        root.style.setProperty('--primary', hsl);
        root.style.setProperty('--ring', hsl);
      }
    }
    if (company?.accent_color) {
      const hsl = hexToHSL(company.accent_color);
      if (hsl) {
        root.style.setProperty('--accent', hsl);
        root.style.setProperty('--gold', hsl);
      }
    }
    // Sidebar color customization
    const sidebarColor = (company as any)?.sidebar_color;
    if (sidebarColor) {
      const hsl = hexToHSL(sidebarColor);
      if (hsl) {
        root.style.setProperty('--sidebar-background', hsl);
        root.style.setProperty('--sidebar-border', darkenHSL(hsl, 5));
        root.style.setProperty('--sidebar-accent', lightenHSL(hsl, 8));
        root.style.setProperty('--sidebar-foreground', lightenHSL(hsl, 65));
      }
    }
    return () => {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--gold');
      root.style.removeProperty('--sidebar-background');
      root.style.removeProperty('--sidebar-border');
      root.style.removeProperty('--sidebar-accent');
      root.style.removeProperty('--sidebar-foreground');
    };
  }, [company]);

  return { company };
}
