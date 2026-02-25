import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autenticado");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Usuário não autenticado");

    // Check if caller is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) throw new Error("Acesso negado");

    const { targetUserId } = await req.json();
    if (!targetUserId) throw new Error("ID do usuário não informado");
    if (targetUserId === user.id) throw new Error("Não é possível excluir a si mesmo");

    // Delete profile (cascade will handle related data)
    await supabase.from("profiles").delete().eq("user_id", targetUserId);
    await supabase.from("user_roles").delete().eq("user_id", targetUserId);
    await supabase.from("remix_history").delete().eq("user_id", targetUserId);
    await supabase.from("payments").delete().eq("user_id", targetUserId);

    // Delete from auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(targetUserId);
    if (deleteError) throw new Error(`Erro ao excluir: ${deleteError.message}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
