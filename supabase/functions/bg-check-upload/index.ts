import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    if (req.method === "GET") {
      // Validate token and return check info
      const url = new URL(req.url);
      const token = url.searchParams.get("token");
      if (!token) {
        return new Response(JSON.stringify({ error: "Missing token" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: check, error } = await supabase
        .from("background_checks")
        .select("id, check_type, candidate_id, company_id, status, upload_token, upload_token_expires_at")
        .eq("upload_token", token)
        .single();

      if (error || !check) {
        return new Response(JSON.stringify({ error: "Invalid or expired link" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (check.upload_token_expires_at && new Date(check.upload_token_expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Link expired" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get candidate name
      const { data: candidate } = await supabase
        .from("candidates")
        .select("name")
        .eq("id", check.candidate_id)
        .single();

      return new Response(JSON.stringify({
        check_id: check.id,
        check_type: check.check_type,
        candidate_name: candidate?.name || "",
        status: check.status,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      // Handle file upload
      const formData = await req.formData();
      const token = formData.get("token") as string;
      const file = formData.get("file") as File;

      if (!token || !file) {
        return new Response(JSON.stringify({ error: "Missing token or file" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: check } = await supabase
        .from("background_checks")
        .select("id, candidate_id, company_id, check_type, upload_token_expires_at")
        .eq("upload_token", token)
        .single();

      if (!check) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (check.upload_token_expires_at && new Date(check.upload_token_expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Link expired" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upload file to storage
      const ext = file.name.split(".").pop() || "pdf";
      const filePath = `${check.company_id}/${check.candidate_id}/bg-check-${check.check_type}-${Date.now()}.${ext}`;

      const arrayBuf = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, arrayBuf, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return new Response(JSON.stringify({ error: "Upload failed: " + uploadError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update background check with document path
      await supabase
        .from("background_checks")
        .update({
          document_path: filePath,
          status: "in_progress",
          notes: `تم رفع المستند بواسطة المرشح في ${new Date().toISOString()}`,
        })
        .eq("id", check.id);

      // Notify HR
      const { data: hrUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "hr_manager", "hr_officer"])
        .eq("tenant_id", check.company_id)
        .limit(5);

      const { data: candidate } = await supabase
        .from("candidates")
        .select("name")
        .eq("id", check.candidate_id)
        .single();

      for (const hr of hrUsers || []) {
        await supabase.from("notifications").insert({
          company_id: check.company_id,
          user_id: hr.user_id,
          title: "📄 تم رفع مستند تحقق",
          message: `قام المرشح "${candidate?.name || ""}" برفع مستند "${check.check_type}" للتحقق من الخلفية.`,
          type: "info",
          link: "/recruitment",
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (err: unknown) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
