import { forwardRef } from "react";
import { requestTypeLabels, workflowStatusLabels } from "@/hooks/useApprovalWorkflow";

interface Props {
  doc: any;
  showPreviewBadge?: boolean;
}

const actionLabelsAr: Record<string, string> = {
  submit: "تقديم",
  approve: "موافقة",
  reject: "رفض",
  return: "إرجاع",
  escalate: "تصعيد",
  lock: "قفل",
  archive: "أرشفة",
};

const roleLabelsAr: Record<string, string> = {
  admin: "مدير",
  hr_manager: "مدير HR",
  hr_officer: "مسؤول HR",
  manager: "مدير قسم",
  tenant_admin: "مدير المنشأة",
  employee: "موظف",
};

const statusLabelAr: Record<string, string> = {
  submitted: "مقدم",
  pending: "معلق",
  pending_approval: "بانتظار الموافقة",
  approved: "موافق عليه",
  rejected: "مرفوض",
  returned: "مرجع للتعديل",
  locked: "مقفل",
  draft: "مسودة",
};

export const RequestOfficialRecord = forwardRef<HTMLDivElement, Props>(({ doc, showPreviewBadge = false }, ref) => {
  const company = doc.company_snapshot || {};
  const employee = doc.employee_snapshot || {};
  const data = doc.request_data || {};
  const history: any[] = doc.approval_history || [];
  const primaryColor = company.primary_color || "#1E3A8A";

  const formatDate = (d: string) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("ar-IQ", { year: "numeric", month: "long", day: "numeric" }); }
    catch { return d; }
  };

  const formatDateTime = (d: string) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleString("ar-IQ", { dateStyle: "medium", timeStyle: "short" }); }
    catch { return d; }
  };

  return (
    <div ref={ref} dir="rtl" style={{ fontFamily: "'Arial', 'Tahoma', sans-serif", padding: "40px", lineHeight: "2", fontSize: "14px", color: "#1a1a1a", maxWidth: "800px", margin: "0 auto", background: "#fff" }}>
      {showPreviewBadge && (
        <div style={{ position: "absolute", top: 10, left: 10, background: "#3b82f6", color: "#fff", padding: "4px 12px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}>
          معاينة
        </div>
      )}

      {/* Company Header */}
      <div style={{ textAlign: "center", marginBottom: "20px", paddingBottom: "15px", borderBottom: `3px solid ${primaryColor}` }}>
        {company.logo_url && <img src={company.logo_url} style={{ maxHeight: "80px", marginBottom: "8px" }} alt="logo" />}
        <h1 style={{ fontSize: "20px", color: primaryColor, margin: "4px 0" }}>
          {company.name_ar || company.name || ""}
        </h1>
        {company.header_template && <div style={{ fontSize: "11px", color: "#666" }}>{company.header_template}</div>}
        {(company.registration_number || company.tax_number) && (
          <div style={{ fontSize: "11px", color: "#666" }}>
            {company.registration_number && `سجل: ${company.registration_number}`}
            {company.registration_number && company.tax_number && " | "}
            {company.tax_number && `ضريبي: ${company.tax_number}`}
          </div>
        )}
      </div>

      {/* Document Title */}
      <div style={{ textAlign: "center", margin: "20px 0", padding: "12px", background: `${primaryColor}10`, borderRadius: "8px" }}>
        <h2 style={{ fontSize: "18px", color: primaryColor, margin: 0 }}>
          {requestTypeLabels[doc.request_type] || doc.request_type}
        </h2>
        <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
          رقم المرجع: <strong>{doc.reference_number}</strong>
        </div>
        <div style={{ fontSize: "12px", marginTop: "4px" }}>
          <span style={{
            padding: "2px 12px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold",
            background: doc.status === "approved" ? "#dcfce7" : doc.status === "rejected" ? "#fce7e7" : "#fef3c7",
            color: doc.status === "approved" ? "#166534" : doc.status === "rejected" ? "#991b1b" : "#92400e"
          }}>
            {statusLabelAr[doc.status] || doc.status}
          </span>
        </div>
      </div>

      {/* Employee Info */}
      <table style={{ width: "100%", borderCollapse: "collapse", margin: "16px 0", fontSize: "13px" }}>
        <tbody>
          <tr>
            <td style={{ padding: "6px 12px", background: "#f9fafb", fontWeight: "bold", width: "30%", border: "1px solid #e5e7eb" }}>اسم الموظف</td>
            <td style={{ padding: "6px 12px", border: "1px solid #e5e7eb" }}>{employee.name_ar || "—"}</td>
            <td style={{ padding: "6px 12px", background: "#f9fafb", fontWeight: "bold", width: "20%", border: "1px solid #e5e7eb" }}>الرقم الوظيفي</td>
            <td style={{ padding: "6px 12px", border: "1px solid #e5e7eb" }}>{employee.employee_code || "—"}</td>
          </tr>
          <tr>
            <td style={{ padding: "6px 12px", background: "#f9fafb", fontWeight: "bold", border: "1px solid #e5e7eb" }}>القسم</td>
            <td style={{ padding: "6px 12px", border: "1px solid #e5e7eb" }}>{employee.department || "—"}</td>
            <td style={{ padding: "6px 12px", background: "#f9fafb", fontWeight: "bold", border: "1px solid #e5e7eb" }}>المسمى الوظيفي</td>
            <td style={{ padding: "6px 12px", border: "1px solid #e5e7eb" }}>{employee.position || "—"}</td>
          </tr>
          <tr>
            <td style={{ padding: "6px 12px", background: "#f9fafb", fontWeight: "bold", border: "1px solid #e5e7eb" }}>تاريخ التقديم</td>
            <td colSpan={3} style={{ padding: "6px 12px", border: "1px solid #e5e7eb" }}>{formatDate(doc.created_at)}</td>
          </tr>
        </tbody>
      </table>

      {/* Request Details */}
      <h3 style={{ fontSize: "15px", color: primaryColor, marginTop: "24px", marginBottom: "8px", borderBottom: `1px solid ${primaryColor}30`, paddingBottom: "4px" }}>
        تفاصيل الطلب
      </h3>
      
      {doc.request_type === "leave" && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <tbody>
            <tr>
              <td style={{ padding: "6px 12px", background: "#f9fafb", fontWeight: "bold", width: "30%", border: "1px solid #e5e7eb" }}>نوع الإجازة</td>
              <td style={{ padding: "6px 12px", border: "1px solid #e5e7eb" }}>{data.leave_type || "—"}</td>
            </tr>
            <tr>
              <td style={{ padding: "6px 12px", background: "#f9fafb", fontWeight: "bold", border: "1px solid #e5e7eb" }}>من تاريخ</td>
              <td style={{ padding: "6px 12px", border: "1px solid #e5e7eb" }}>{formatDate(data.start_date)}</td>
            </tr>
            <tr>
              <td style={{ padding: "6px 12px", background: "#f9fafb", fontWeight: "bold", border: "1px solid #e5e7eb" }}>إلى تاريخ</td>
              <td style={{ padding: "6px 12px", border: "1px solid #e5e7eb" }}>{formatDate(data.end_date)}</td>
            </tr>
            <tr>
              <td style={{ padding: "6px 12px", background: "#f9fafb", fontWeight: "bold", border: "1px solid #e5e7eb" }}>عدد الأيام</td>
              <td style={{ padding: "6px 12px", border: "1px solid #e5e7eb" }}>{data.days || "—"}</td>
            </tr>
            {data.reason && (
              <tr>
                <td style={{ padding: "6px 12px", background: "#f9fafb", fontWeight: "bold", border: "1px solid #e5e7eb" }}>السبب</td>
                <td style={{ padding: "6px 12px", border: "1px solid #e5e7eb" }}>{data.reason}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {doc.request_type === "attendance_correction" && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <tbody>
            <tr>
              <td style={{ padding: "6px 12px", background: "#f9fafb", fontWeight: "bold", width: "30%", border: "1px solid #e5e7eb" }}>التاريخ</td>
              <td style={{ padding: "6px 12px", border: "1px solid #e5e7eb" }}>{formatDate(data.date)}</td>
            </tr>
            {data.requested_check_in && (
              <tr>
                <td style={{ padding: "6px 12px", background: "#f9fafb", fontWeight: "bold", border: "1px solid #e5e7eb" }}>وقت الدخول المطلوب</td>
                <td style={{ padding: "6px 12px", border: "1px solid #e5e7eb" }}>{data.requested_check_in}</td>
              </tr>
            )}
            {data.requested_check_out && (
              <tr>
                <td style={{ padding: "6px 12px", background: "#f9fafb", fontWeight: "bold", border: "1px solid #e5e7eb" }}>وقت الخروج المطلوب</td>
                <td style={{ padding: "6px 12px", border: "1px solid #e5e7eb" }}>{data.requested_check_out}</td>
              </tr>
            )}
            {data.reason && (
              <tr>
                <td style={{ padding: "6px 12px", background: "#f9fafb", fontWeight: "bold", border: "1px solid #e5e7eb" }}>السبب</td>
                <td style={{ padding: "6px 12px", border: "1px solid #e5e7eb" }}>{data.reason}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {(doc.request_type?.startsWith("certificate") || !["leave", "attendance_correction"].includes(doc.request_type)) && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <tbody>
            {data.request_type && (
              <tr>
                <td style={{ padding: "6px 12px", background: "#f9fafb", fontWeight: "bold", width: "30%", border: "1px solid #e5e7eb" }}>نوع الطلب</td>
                <td style={{ padding: "6px 12px", border: "1px solid #e5e7eb" }}>{requestTypeLabels[data.request_type] || data.request_type || "—"}</td>
              </tr>
            )}
            {data.comments && (
              <tr>
                <td style={{ padding: "6px 12px", background: "#f9fafb", fontWeight: "bold", border: "1px solid #e5e7eb" }}>ملاحظات</td>
                <td style={{ padding: "6px 12px", border: "1px solid #e5e7eb" }}>{data.comments}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* Approval History */}
      {history.length > 0 && (
        <>
          <h3 style={{ fontSize: "15px", color: primaryColor, marginTop: "24px", marginBottom: "8px", borderBottom: `1px solid ${primaryColor}30`, paddingBottom: "4px" }}>
            سجل الموافقات
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ padding: "6px 8px", border: "1px solid #e5e7eb", textAlign: "right" }}>الإجراء</th>
                <th style={{ padding: "6px 8px", border: "1px solid #e5e7eb", textAlign: "right" }}>بواسطة</th>
                <th style={{ padding: "6px 8px", border: "1px solid #e5e7eb", textAlign: "right" }}>الصفة</th>
                <th style={{ padding: "6px 8px", border: "1px solid #e5e7eb", textAlign: "right" }}>التاريخ</th>
                <th style={{ padding: "6px 8px", border: "1px solid #e5e7eb", textAlign: "right" }}>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h: any, i: number) => (
                <tr key={i} style={{ background: h.action === "reject" ? "#fef2f2" : h.action === "approve" ? "#f0fdf4" : "transparent" }}>
                  <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb", fontWeight: "bold" }}>
                    {actionLabelsAr[h.action] || h.action}
                  </td>
                  <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb" }}>{h.actor_name || "—"}</td>
                  <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb" }}>{roleLabelsAr[h.actor_role] || h.actor_role || "—"}</td>
                  <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb" }} dir="ltr">{formatDateTime(h.created_at)}</td>
                  <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb" }}>
                    {h.comments || "—"}
                    {h.has_signature && " ✍️"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Signatory */}
      {(company.signatory_name || company.signatory_title) && (
        <div style={{ marginTop: "40px", textAlign: "left" }}>
          <div style={{ fontWeight: "bold", fontSize: "14px" }}>{company.signatory_name}</div>
          {company.signatory_title && <div style={{ fontSize: "12px", color: "#666" }}>{company.signatory_title}</div>}
          <div style={{ marginTop: "20px", borderBottom: "1px dashed #999", width: "200px" }} />
          <div style={{ fontSize: "10px", color: "#999", marginTop: "4px" }}>التوقيع</div>
        </div>
      )}

      {/* Stamp */}
      {company.stamp_url && (
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <img src={company.stamp_url} style={{ maxHeight: "80px", opacity: 0.6 }} alt="stamp" />
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: "30px", paddingTop: "10px", borderTop: `2px solid ${primaryColor}`, textAlign: "center", fontSize: "10px", color: "#888" }}>
        {company.footer_template || [company.address, company.phone, company.email, company.website].filter(Boolean).join(" | ")}
        <div style={{ marginTop: "4px" }}>
          تم إنشاء هذا المستند إلكترونياً بواسطة نظام تمكين HR — {formatDate(doc.created_at)}
        </div>
      </div>
    </div>
  );
});

RequestOfficialRecord.displayName = "RequestOfficialRecord";

// Utility: Open print window with the official record HTML
export function printRequestDocument(doc: any) {
  const company = doc.company_snapshot || {};
  const employee = doc.employee_snapshot || {};
  const data = doc.request_data || {};
  const history: any[] = doc.approval_history || [];
  const primaryColor = company.primary_color || "#1E3A8A";

  const formatDate = (d: string) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("ar-IQ", { year: "numeric", month: "long", day: "numeric" }); }
    catch { return d; }
  };
  const formatDateTime = (d: string) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleString("ar-IQ", { dateStyle: "medium", timeStyle: "short" }); }
    catch { return d; }
  };

  const statusLabel: Record<string, string> = {
    submitted: "مقدم", pending: "معلق", pending_approval: "بانتظار الموافقة",
    approved: "موافق عليه", rejected: "مرفوض", returned: "مرجع للتعديل", locked: "مقفل", draft: "مسودة",
  };
  const actionLabel: Record<string, string> = {
    submit: "تقديم", approve: "موافقة", reject: "رفض", return: "إرجاع", escalate: "تصعيد", lock: "قفل",
  };
  const roleLabel: Record<string, string> = {
    admin: "مدير", hr_manager: "مدير HR", hr_officer: "مسؤول HR", manager: "مدير قسم", tenant_admin: "مدير المنشأة", employee: "موظف",
  };

  let detailRows = "";
  if (doc.request_type === "leave") {
    detailRows = `
      <tr><td class="lbl">نوع الإجازة</td><td>${data.leave_type || "—"}</td></tr>
      <tr><td class="lbl">من تاريخ</td><td>${formatDate(data.start_date)}</td></tr>
      <tr><td class="lbl">إلى تاريخ</td><td>${formatDate(data.end_date)}</td></tr>
      <tr><td class="lbl">عدد الأيام</td><td>${data.days || "—"}</td></tr>
      ${data.reason ? `<tr><td class="lbl">السبب</td><td>${data.reason}</td></tr>` : ""}
    `;
  } else if (doc.request_type === "attendance_correction") {
    detailRows = `
      <tr><td class="lbl">التاريخ</td><td>${formatDate(data.date)}</td></tr>
      ${data.requested_check_in ? `<tr><td class="lbl">وقت الدخول</td><td>${data.requested_check_in}</td></tr>` : ""}
      ${data.requested_check_out ? `<tr><td class="lbl">وقت الخروج</td><td>${data.requested_check_out}</td></tr>` : ""}
      ${data.reason ? `<tr><td class="lbl">السبب</td><td>${data.reason}</td></tr>` : ""}
    `;
  } else {
    detailRows = `
      ${data.request_type ? `<tr><td class="lbl">نوع الطلب</td><td>${requestTypeLabels[data.request_type] || data.request_type}</td></tr>` : ""}
      ${data.comments ? `<tr><td class="lbl">ملاحظات</td><td>${data.comments}</td></tr>` : ""}
    `;
  }

  const historyHtml = history.length > 0 ? `
    <h3 style="color:${primaryColor};border-bottom:1px solid ${primaryColor}30;padding-bottom:4px;margin-top:24px">سجل الموافقات</h3>
    <table><thead><tr style="background:#f9fafb"><th>الإجراء</th><th>بواسطة</th><th>الصفة</th><th>التاريخ</th><th>ملاحظات</th></tr></thead><tbody>
    ${history.map((h: any) => `<tr style="background:${h.action === "reject" ? "#fef2f2" : h.action === "approve" ? "#f0fdf4" : "transparent"}">
      <td style="font-weight:bold">${actionLabel[h.action] || h.action}</td>
      <td>${h.actor_name || "—"}</td>
      <td>${roleLabel[h.actor_role] || h.actor_role || "—"}</td>
      <td dir="ltr">${formatDateTime(h.created_at)}</td>
      <td>${h.comments || "—"}${h.has_signature ? " ✍️" : ""}</td>
    </tr>`).join("")}
    </tbody></table>
  ` : "";

  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${requestTypeLabels[doc.request_type] || doc.request_type} - ${doc.reference_number}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Arial','Tahoma',sans-serif;padding:40px;line-height:2;font-size:14px;color:#1a1a1a}
.header{text-align:center;margin-bottom:20px;padding-bottom:15px;border-bottom:3px solid ${primaryColor}}
.header img{max-height:80px;margin-bottom:8px}
.header h1{font-size:20px;color:${primaryColor};margin:4px 0}
.header .sub{font-size:11px;color:#666}
.title-box{text-align:center;margin:20px 0;padding:12px;background:${primaryColor}10;border-radius:8px}
.title-box h2{font-size:18px;color:${primaryColor};margin:0}
.status{padding:2px 12px;border-radius:12px;font-size:11px;font-weight:bold;display:inline-block;margin-top:4px}
table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}
td,th{padding:6px 8px;border:1px solid #e5e7eb;text-align:right}
.lbl{background:#f9fafb;font-weight:bold;width:30%}
h3{font-size:15px;margin-top:24px;margin-bottom:8px}
.signatory{margin-top:40px;text-align:left}
.signatory .name{font-weight:bold;font-size:14px}
.signatory .stitle{font-size:12px;color:#666}
.stamp{text-align:center;margin-top:20px}
.stamp img{max-height:80px;opacity:0.6}
.footer{margin-top:30px;padding-top:10px;border-top:2px solid ${primaryColor};text-align:center;font-size:10px;color:#888}
@media print{body{padding:20px}@page{margin:2cm}}
</style></head><body>
<div class="header">
  ${company.logo_url ? `<img src="${company.logo_url}" />` : ""}
  <h1>${company.name_ar || company.name || ""}</h1>
  ${company.header_template ? `<div class="sub">${company.header_template}</div>` : ""}
  ${company.registration_number || company.tax_number ? `<div class="sub">${company.registration_number ? "سجل: " + company.registration_number : ""}${company.registration_number && company.tax_number ? " | " : ""}${company.tax_number ? "ضريبي: " + company.tax_number : ""}</div>` : ""}
</div>
<div class="title-box">
  <h2>${requestTypeLabels[doc.request_type] || doc.request_type}</h2>
  <div style="font-size:12px;color:#666;margin-top:4px">رقم المرجع: <strong>${doc.reference_number}</strong></div>
  <div class="status" style="background:${doc.status === "approved" ? "#dcfce7;color:#166534" : doc.status === "rejected" ? "#fce7e7;color:#991b1b" : "#fef3c7;color:#92400e"}">${statusLabel[doc.status] || doc.status}</div>
</div>
<table><tbody>
  <tr><td class="lbl">اسم الموظف</td><td>${employee.name_ar || "—"}</td><td class="lbl" style="width:20%">الرقم الوظيفي</td><td>${employee.employee_code || "—"}</td></tr>
  <tr><td class="lbl">القسم</td><td>${employee.department || "—"}</td><td class="lbl">المسمى الوظيفي</td><td>${employee.position || "—"}</td></tr>
  <tr><td class="lbl">تاريخ التقديم</td><td colspan="3">${formatDate(doc.created_at)}</td></tr>
</tbody></table>
<h3 style="color:${primaryColor};border-bottom:1px solid ${primaryColor}30;padding-bottom:4px">تفاصيل الطلب</h3>
<table><tbody>${detailRows}</tbody></table>
${historyHtml}
${company.signatory_name || company.signatory_title ? `<div class="signatory"><div class="name">${company.signatory_name || ""}</div>${company.signatory_title ? `<div class="stitle">${company.signatory_title}</div>` : ""}<div style="margin-top:20px;border-bottom:1px dashed #999;width:200px"></div><div style="font-size:10px;color:#999;margin-top:4px">التوقيع</div></div>` : ""}
${company.stamp_url ? `<div class="stamp"><img src="${company.stamp_url}" /></div>` : ""}
<div class="footer">
  ${company.footer_template || [company.address, company.phone, company.email, company.website].filter(Boolean).join(" | ")}
  <div style="margin-top:4px">تم إنشاء هذا المستند إلكترونياً بواسطة نظام تمكين HR — ${formatDate(doc.created_at)}</div>
</div>
</body></html>`;

  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500); }
}
