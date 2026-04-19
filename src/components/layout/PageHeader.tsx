import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}

/**
 * Branded page header with Islamic-inspired geometric background pattern
 * and curved bottom separator.
 */
export function PageHeader({ title, description, icon, actions }: PageHeaderProps) {
  return (
    <div className="page-header-brand rounded-xl px-4 md:px-6 pt-3 md:pt-5 pb-3 md:pb-4 mb-4 md:mb-6 relative overflow-hidden">
      {/* Gold corner flourish */}
      <div className="absolute top-0 left-0 w-24 h-24 opacity-20 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 0% 0%, hsl(var(--gold) / 0.4) 0%, transparent 70%)",
        }}
      />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 relative z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          {icon && (
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary ring-1 ring-[hsl(var(--gold)/0.2)] shrink-0">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg sm:text-heading-section font-heading text-foreground truncate">{title}</h1>
            {description && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">{actions}</div>}
      </div>
      {/* Gold line at bottom */}
      <div className="gold-line mt-3 md:mt-4" />
    </div>
  );
}
