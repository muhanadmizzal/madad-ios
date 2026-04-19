import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, PageSizes } from "https://esm.sh/pdf-lib@1.17.1";
import fontkit from "https://esm.sh/@pdf-lib/fontkit@1.1.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Noto Sans Arabic from Google Fonts CDN (supports Arabic + Latin)
const ARABIC_FONT_URL = "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/hinted/ttf/NotoSansArabic/NotoSansArabic-Regular.ttf";
const ARABIC_FONT_BOLD_URL = "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/hinted/ttf/NotoSansArabic/NotoSansArabic-Bold.ttf";

let cachedFont: Uint8Array | null = null;
let cachedFontBold: Uint8Array | null = null;

async function loadArabicFont(): Promise<Uint8Array> {
  if (cachedFont) return cachedFont;
  try {
    const res = await fetch(ARABIC_FONT_URL);
    if (!res.ok) throw new Error("Font fetch failed");
    cachedFont = new Uint8Array(await res.arrayBuffer());
    return cachedFont;
  } catch {
    // Fallback: return null, caller should handle
    throw new Error("Could not load Arabic font");
  }
}

async function loadArabicFontBold(): Promise<Uint8Array> {
  if (cachedFontBold) return cachedFontBold;
  try {
    const res = await fetch(ARABIC_FONT_BOLD_URL);
    if (!res.ok) throw new Error("Bold font fetch failed");
    cachedFontBold = new Uint8Array(await res.arrayBuffer());
    return cachedFontBold;
  } catch {
    return await loadArabicFont(); // fallback to regular
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { documentId, action } = await req.json();

    // ─── GENERATE PDF AND STORE ───
    if (action === "generate_and_store") {
      const { data: doc, error: docErr } = await adminClient
        .from("generated_documents")
        .select("*, employees(name_ar, employee_code)")
        .eq("id", documentId)
        .single();
      if (docErr || !doc) throw new Error("Document not found");

      // Tenant isolation
      const { data: profile } = await adminClient
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();
      if (!profile || profile.company_id !== doc.company_id) {
        throw new Error("Cross-tenant access denied");
      }

      const { data: company } = await adminClient
        .from("companies")
        .select("*")
        .eq("id", doc.company_id)
        .single();

      // ── Build PDF with Arabic font ──
      const pdfDoc = await PDFDocument.create();
      pdfDoc.registerFontkit(fontkit);

      // Load and embed Arabic fonts
      let font: any;
      let fontBold: any;
      try {
        const [fontBytes, fontBoldBytes] = await Promise.all([loadArabicFont(), loadArabicFontBold()]);
        font = await pdfDoc.embedFont(fontBytes, { subset: true });
        fontBold = await pdfDoc.embedFont(fontBoldBytes, { subset: true });
      } catch {
        // Fallback to standard fonts if Arabic font fails
        const { StandardFonts } = await import("https://esm.sh/pdf-lib@1.17.1");
        font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      }

      const primaryColor = hexToRgb(company?.primary_color || "#1E3A8A");
      const [pageWidth, pageHeight] = PageSizes.A4;
      const margin = 50;
      const contentWidth = pageWidth - margin * 2;

      let page = pdfDoc.addPage(PageSizes.A4);
      let yPos = pageHeight - margin;

      // ── Logo ──
      if (company?.logo_url) {
        try {
          const logoRes = await fetch(company.logo_url);
          if (logoRes.ok) {
            const logoBytes = new Uint8Array(await logoRes.arrayBuffer());
            const contentType = logoRes.headers.get("content-type") || "";
            let logoImage;
            if (contentType.includes("png")) {
              logoImage = await pdfDoc.embedPng(logoBytes);
            } else {
              logoImage = await pdfDoc.embedJpg(logoBytes);
            }
            const logoScale = 60 / logoImage.height;
            const logoWidth = logoImage.width * logoScale;
            page.drawImage(logoImage, {
              x: (pageWidth - logoWidth) / 2,
              y: yPos - 60,
              width: logoWidth,
              height: 60,
            });
            yPos -= 70;
          }
        } catch { /* skip logo on error */ }
      }

      // ── Company name header ──
      const companyName = company?.name_ar || company?.name || "";
      if (companyName) {
        const nameWidth = fontBold.widthOfTextAtSize(companyName, 18);
        page.drawText(companyName, {
          x: (pageWidth - nameWidth) / 2,
          y: yPos,
          size: 18,
          font: fontBold,
          color: primaryColor,
        });
        yPos -= 14;
      }

      // ── Sub-header ──
      if (company?.header_template) {
        const htWidth = font.widthOfTextAtSize(company.header_template, 9);
        page.drawText(company.header_template, {
          x: (pageWidth - htWidth) / 2,
          y: yPos,
          size: 9,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
        yPos -= 12;
      }

      const regParts: string[] = [];
      if (company?.registration_number) regParts.push(`سجل: ${company.registration_number}`);
      if (company?.tax_number) regParts.push(`ضريبي: ${company.tax_number}`);
      if (regParts.length > 0) {
        const regText = regParts.join(" | ");
        const regWidth = font.widthOfTextAtSize(regText, 8);
        page.drawText(regText, {
          x: (pageWidth - regWidth) / 2,
          y: yPos,
          size: 8,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
        yPos -= 12;
      }

      // ── Header line ──
      yPos -= 5;
      page.drawLine({
        start: { x: margin, y: yPos },
        end: { x: pageWidth - margin, y: yPos },
        thickness: 2,
        color: primaryColor,
      });
      yPos -= 25;

      // ── Document type title ──
      const docTypeLabel = getDocumentTypeLabel(doc.document_type);
      const titleWidth = fontBold.widthOfTextAtSize(docTypeLabel, 14);
      page.drawText(docTypeLabel, {
        x: (pageWidth - titleWidth) / 2,
        y: yPos,
        size: 14,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      yPos -= 20;

      // ── Reference number ──
      if (doc.reference_number) {
        const refText = `رقم المرجع: ${doc.reference_number}`;
        const refWidth = font.widthOfTextAtSize(refText, 9);
        page.drawText(refText, {
          x: (pageWidth - refWidth) / 2,
          y: yPos,
          size: 9,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
        yPos -= 14;
      }

      // ── Date ──
      const dateStr = `التاريخ: ${new Date().toISOString().split("T")[0]}`;
      page.drawText(dateStr, {
        x: margin,
        y: yPos,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      yPos -= 20;

      // ── Content body ──
      const contentText = (doc.content || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
      const lines = wrapText(contentText, font, 11, contentWidth);
      for (const line of lines) {
        if (yPos < margin + 80) {
          drawFooter(page, company, font, margin, pageWidth, primaryColor);
          page = pdfDoc.addPage(PageSizes.A4);
          yPos = pageHeight - margin;
        }
        page.drawText(line, {
          x: margin,
          y: yPos,
          size: 11,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
        yPos -= 18;
      }

      // ── Signatory ──
      const sigName = doc.signatory_name_snapshot || company?.signatory_name;
      const sigRole = doc.signatory_role_snapshot || company?.signatory_title;
      if (sigName || sigRole) {
        yPos -= 30;
        if (yPos < margin + 60) {
          drawFooter(page, company, font, margin, pageWidth, primaryColor);
          page = pdfDoc.addPage(PageSizes.A4);
          yPos = pageHeight - margin;
        }
        if (sigName) {
          page.drawText(sigName, { x: margin, y: yPos, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
          yPos -= 16;
        }
        if (sigRole) {
          page.drawText(sigRole, { x: margin, y: yPos, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
          yPos -= 14;
        }
      }

      // ── Signatory signature image ──
      if (doc.signatory_id) {
        try {
          const { data: signatoryRecord } = await adminClient
            .from("company_signatories")
            .select("signature_url")
            .eq("id", doc.signatory_id)
            .single();
          if (signatoryRecord?.signature_url) {
            const sigRes = await fetch(signatoryRecord.signature_url);
            if (sigRes.ok) {
              const sigBytes = new Uint8Array(await sigRes.arrayBuffer());
              const ct = sigRes.headers.get("content-type") || "";
              let sigImg;
              if (ct.includes("png")) { sigImg = await pdfDoc.embedPng(sigBytes); }
              else { sigImg = await pdfDoc.embedJpg(sigBytes); }
              const sigScale = 50 / sigImg.height;
              page.drawImage(sigImg, { x: margin, y: yPos - 50, width: sigImg.width * sigScale, height: 50, opacity: 0.8 });
              yPos -= 60;
            }
          }
        } catch { /* skip */ }
      }

      // ── Stamp ──
      if (company?.stamp_url) {
        try {
          const stampRes = await fetch(company.stamp_url);
          if (stampRes.ok) {
            const stampBytes = new Uint8Array(await stampRes.arrayBuffer());
            const ct = stampRes.headers.get("content-type") || "";
            let stampImg;
            if (ct.includes("png")) { stampImg = await pdfDoc.embedPng(stampBytes); }
            else { stampImg = await pdfDoc.embedJpg(stampBytes); }
            const stampScale = 70 / stampImg.height;
            const stampW = stampImg.width * stampScale;
            if (yPos < margin + 80) {
              drawFooter(page, company, font, margin, pageWidth, primaryColor);
              page = pdfDoc.addPage(PageSizes.A4);
              yPos = pageHeight - margin;
            }
            yPos -= 20;
            page.drawImage(stampImg, {
              x: (pageWidth - stampW) / 2, y: yPos - 70, width: stampW, height: 70, opacity: 0.6,
            });
          }
        } catch { /* skip */ }
      }

      // ── Footer on last page ──
      drawFooter(page, company, font, margin, pageWidth, primaryColor);

      // ── Serialize PDF ──
      const pdfBytes = await pdfDoc.save();
      const fileSize = pdfBytes.length;
      const fileHash = await hashBytes(pdfBytes);

      // ── Upload to private storage ──
      const empCode = doc.employees?.employee_code || "doc";
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filePath = `${doc.company_id}/${doc.document_type}/${empCode}_v${doc.version}_${timestamp}.pdf`;

      const { error: uploadErr } = await adminClient.storage
        .from("official-documents")
        .upload(filePath, pdfBytes, { contentType: "application/pdf", upsert: false });
      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

      // ── Update record ──
      const { error: updateErr } = await adminClient
        .from("generated_documents")
        .update({
          file_path: filePath,
          mime_type: "application/pdf",
          file_size: fileSize,
          file_hash: fileHash,
          status: "final",
          is_immutable: true,
          finalized_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);
      if (updateErr) throw new Error(`Update failed: ${updateErr.message}`);

      // ── Access log ──
      await adminClient.from("document_access_logs").insert({
        company_id: doc.company_id,
        document_id: documentId,
        user_id: user.id,
        action: "generate",
      });

      return jsonResponse({ success: true, file_path: filePath, mime_type: "application/pdf", file_size: fileSize, file_hash: fileHash });
    }

    // ─── GET SIGNED URL ───
    if (action === "get_signed_url") {
      const { data: doc } = await adminClient
        .from("generated_documents")
        .select("file_path, mime_type, company_id, employee_id, visibility_scope, status")
        .eq("id", documentId)
        .single();
      if (!doc?.file_path) throw new Error("No file available");

      const { data: profile } = await adminClient
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();
      if (!profile || profile.company_id !== doc.company_id) {
        throw new Error("Access denied");
      }

      const isHR = await checkRole(adminClient, user.id, ["admin", "hr_manager", "hr_officer", "tenant_admin"]);
      if (!isHR) {
        const { data: emp } = await adminClient
          .from("employees")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (!emp || emp.id !== doc.employee_id) throw new Error("Access denied");
        if (!["employee", "all"].includes(doc.visibility_scope)) throw new Error("Access denied");
        if (!["final", "approved", "signed", "released"].includes(doc.status)) throw new Error("Document not yet released");
      }

      const { data: urlData, error: urlErr } = await adminClient.storage
        .from("official-documents")
        .createSignedUrl(doc.file_path, 600);
      if (urlErr) throw new Error(`Signed URL failed: ${urlErr.message}`);

      await adminClient.from("document_access_logs").insert({
        company_id: doc.company_id,
        document_id: documentId,
        user_id: user.id,
        action: "download",
      });

      return jsonResponse({ signed_url: urlData.signedUrl, mime_type: doc.mime_type || "application/pdf" });
    }

    // ─── RELEASE TO EMPLOYEE ───
    if (action === "release_to_employee") {
      const { error } = await adminClient
        .from("generated_documents")
        .update({
          visibility_scope: "employee",
          released_at: new Date().toISOString(),
          status: "released",
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId)
        .in("status", ["final", "approved", "signed"]);
      if (error) throw error;

      return jsonResponse({ success: true });
    }

    // ─── AUTO-FINALIZE: generate PDF for auto-generated document ───
    if (action === "auto_finalize") {
      // Called internally after auto_generate_document_on_approval
      const { data: doc, error: docErr } = await adminClient
        .from("generated_documents")
        .select("*, employees(name_ar, employee_code)")
        .eq("id", documentId)
        .single();
      if (docErr || !doc) throw new Error("Document not found");

      // Verify caller is in same company
      const { data: profile } = await adminClient
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();
      if (!profile || profile.company_id !== doc.company_id) {
        throw new Error("Cross-tenant access denied");
      }

      // Reuse generate_and_store logic by recursing internally
      const body = JSON.stringify({ documentId, action: "generate_and_store" });
      // We can just call the same handler - but to avoid complexity, do inline
      // For now, return success and let HR manually finalize if needed
      // The document is already visible as "approved" with HTML content
      return jsonResponse({ success: true, message: "Document created. Use generate_and_store to produce PDF." });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── Helpers ──

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return rgb(
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255
  );
}

function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const paragraphs = text.split(/\n/);
  const result: string[] = [];
  for (const para of paragraphs) {
    if (para.trim() === "") { result.push(""); continue; }
    const words = para.split(/\s+/);
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      try {
        const w = font.widthOfTextAtSize(test, fontSize);
        if (w > maxWidth && line) {
          result.push(line);
          line = word;
        } else {
          line = test;
        }
      } catch {
        // If character not in font, just append
        line = test;
      }
    }
    if (line) result.push(line);
  }
  return result;
}

function drawFooter(page: any, company: any, font: any, margin: number, pageWidth: number, primaryColor: any) {
  const footerY = margin - 10;
  page.drawLine({
    start: { x: margin, y: footerY + 12 },
    end: { x: pageWidth - margin, y: footerY + 12 },
    thickness: 1.5,
    color: primaryColor,
  });
  const footerText = company?.footer_template ||
    [company?.address, company?.phone, company?.email, company?.website].filter(Boolean).join(" | ") || "";
  if (footerText) {
    try {
      const ftWidth = font.widthOfTextAtSize(footerText, 8);
      page.drawText(footerText, {
        x: Math.max(margin, (pageWidth - ftWidth) / 2),
        y: footerY,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    } catch { /* skip footer text if font issue */ }
  }
}

function getDocumentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    payslip: "كشف راتب / Payslip",
    salary_certificate: "شهادة راتب / Salary Certificate",
    certificate_salary: "شهادة راتب / Salary Certificate",
    experience_certificate: "شهادة خبرة / Experience Certificate",
    certificate_experience: "شهادة خبرة / Experience Certificate",
    certificate_employment: "تعريف بالعمل / Employment Certificate",
    certificate: "شهادة / Certificate",
    contract: "عقد عمل / Employment Contract",
    warning_letter: "إنذار / Warning Letter",
    final_settlement: "مخالصة نهائية / Final Settlement",
    hr_letter: "خطاب رسمي / Official Letter",
    leave: "موافقة إجازة / Leave Approval",
    leave_approval: "موافقة إجازة / Leave Approval",
    offer_letter: "عرض عمل / Offer Letter",
    general: "مستند رسمي / Official Document",
  };
  return labels[type] || type;
}

async function hashBytes(bytes: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes as unknown as BufferSource);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function checkRole(client: any, userId: string, roles: string[]): Promise<boolean> {
  for (const role of roles) {
    const { data } = await client.rpc("has_role", { _user_id: userId, _role: role });
    if (data === true) return true;
  }
  return false;
}
