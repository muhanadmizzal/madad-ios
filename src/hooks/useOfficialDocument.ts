import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";
import { useAuth } from "@/contexts/AuthContext";

export function useCompanyBranding() {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ["company-branding", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId!)
        .single();
      return data;
    },
    enabled: !!companyId,
  });
}

export function useGeneratedDocuments(employeeId?: string) {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ["generated-documents", companyId, employeeId],
    queryFn: async () => {
      let q = supabase
        .from("generated_documents")
        .select("*, employees(name_ar, employee_code)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data } = await q;
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });
}

export function useSaveGeneratedDocument() {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      employeeId: string;
      documentType: string;
      templateId?: string;
      content: string;
      status?: string;
      visibilityScope?: string;
      metadata?: any;
    }) => {
      if (!params.employeeId || !companyId) throw new Error("بيانات الموظف أو الشركة غير متوفرة");
      const { data: existing } = await supabase
        .from("generated_documents")
        .select("version")
        .eq("company_id", companyId!)
        .eq("employee_id", params.employeeId)
        .eq("document_type", params.documentType)
        .order("version", { ascending: false })
        .limit(1);
      const nextVersion = ((existing?.[0] as any)?.version || 0) + 1;

      const { data, error } = await supabase
        .from("generated_documents")
        .insert({
          company_id: companyId!,
          employee_id: params.employeeId,
          document_type: params.documentType,
          template_id: params.templateId || null,
          content: params.content,
          status: params.status || "draft",
          generated_by: user!.id,
          visibility_scope: params.visibilityScope || "hr",
          metadata: params.metadata || {},
          version: nextVersion,
          mime_type: "text/html",
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["generated-documents"] });
    },
  });
}

export function useFinalizeDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase.functions.invoke("generate-document", {
        body: { documentId, action: "generate_and_store" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { success: boolean; file_path: string; mime_type: string; file_size: number; file_hash: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["generated-documents"] });
    },
  });
}

export function useGetDocumentSignedUrl() {
  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase.functions.invoke("generate-document", {
        body: { documentId, action: "get_signed_url" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { url: data.signed_url as string, mimeType: (data.mime_type || "application/pdf") as string };
    },
  });
}

export function useReleaseDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase.functions.invoke("generate-document", {
        body: { documentId, action: "release_to_employee" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["generated-documents"] });
    },
  });
}

export function useLogDocumentAccess() {
  const { companyId } = useCompany();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: { documentId: string; action: "view" | "download" | "print" }) => {
      await supabase.from("document_access_logs").insert({
        company_id: companyId!,
        document_id: params.documentId,
        user_id: user!.id,
        action: params.action,
      } as any);
    },
  });
}

// Build official HTML for preview only (not final artifact)
export function buildOfficialDocumentHtml(company: any, content: string, options?: { showStamp?: boolean; showSignatory?: boolean }) {
  const showStamp = options?.showStamp !== false;
  const showSignatory = options?.showSignatory !== false;
  const primaryColor = company?.primary_color || "#1E3A8A";

  return `
    <html dir="rtl">
    <head>
      <meta charset="utf-8" />
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', 'Tahoma', sans-serif; padding: 40px; line-height: 2; font-size: 14px; color: #1a1a1a; }
        .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid ${primaryColor}; }
        .header img.logo { max-height: 80px; margin-bottom: 8px; }
        .header h1 { font-size: 20px; color: ${primaryColor}; margin: 4px 0; }
        .header .subtitle { font-size: 11px; color: #666; }
        .content { min-height: 400px; padding: 20px 0; white-space: pre-line; }
        .signatory { margin-top: 40px; text-align: left; }
        .signatory .name { font-weight: bold; font-size: 14px; }
        .signatory .title { font-size: 12px; color: #666; }
        .stamp { text-align: center; margin-top: 20px; }
        .stamp img { max-height: 80px; opacity: 0.6; }
        .footer { margin-top: 30px; padding-top: 10px; border-top: 2px solid ${primaryColor}; text-align: center; font-size: 10px; color: #888; }
        .preview-badge { position: fixed; top: 10px; right: 10px; background: #ef4444; color: #fff; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; }
        @media print { .preview-badge { display: none; } @page { margin: 2cm; } body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="preview-badge">PREVIEW / معاينة</div>
      <div class="header">
        ${company?.logo_url ? `<img class="logo" src="${company.logo_url}" />` : ""}
        <h1>${company?.name_ar || company?.name || ""}</h1>
        ${company?.header_template ? `<div class="subtitle">${company.header_template}</div>` : ""}
        ${company?.registration_number || company?.tax_number ? `<div class="subtitle">${company?.registration_number ? "سجل: " + company.registration_number : ""}${company?.registration_number && company?.tax_number ? " | " : ""}${company?.tax_number ? "ضريبي: " + company.tax_number : ""}</div>` : ""}
      </div>
      <div class="content">${content.replace(/\n/g, "<br/>")}</div>
      ${showSignatory && (company?.signatory_name || company?.signatory_title) ? `
        <div class="signatory">
          ${company.signatory_name ? `<div class="name">${company.signatory_name}</div>` : ""}
          ${company.signatory_title ? `<div class="title">${company.signatory_title}</div>` : ""}
        </div>
      ` : ""}
      ${showStamp && company?.stamp_url ? `<div class="stamp"><img src="${company.stamp_url}" /></div>` : ""}
      ${company?.footer_template ? `<div class="footer">${company.footer_template}</div>` : `
        <div class="footer">
          ${[company?.address, company?.phone, company?.email, company?.website].filter(Boolean).join(" | ")}
        </div>
      `}
    </body>
    </html>
  `;
}
