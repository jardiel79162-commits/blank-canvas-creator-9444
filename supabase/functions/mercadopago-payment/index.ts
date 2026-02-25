import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  // Webhook from Mercado Pago
  if (path === "webhook" || url.searchParams.get("action") === "webhook") {
    try {
      const body = await req.json();
      
      if (body.type === "payment" && body.data?.id) {
        const paymentId = body.data.id;
        
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${mpToken}` },
        });
        const payment = await mpRes.json();

        if (payment.status === "approved") {
          const externalRef = payment.external_reference;
          const [userId, creditsStr] = externalRef.split(":");
          const credits = parseInt(creditsStr, 10);

          await supabase
            .from("payments")
            .update({ status: "approved", mp_payment_id: String(paymentId) })
            .eq("id", externalRef.split(":")[2] || "")
            .or(`mp_payment_id.eq.${paymentId}`);

          // Try to find payment by external ref pattern
          const { data: pendingPayments } = await supabase
            .from("payments")
            .select("id")
            .eq("user_id", userId)
            .eq("credits_purchased", credits)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(1);

          if (pendingPayments && pendingPayments.length > 0) {
            await supabase
              .from("payments")
              .update({ status: "approved", mp_payment_id: String(paymentId) })
              .eq("id", pendingPayments[0].id);
          }

          const { data: profile } = await supabase
            .from("profiles")
            .select("credits")
            .eq("user_id", userId)
            .single();

          await supabase
            .from("profiles")
            .update({ credits: (profile?.credits || 0) + credits })
            .eq("user_id", userId);
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Recover pending payment QR code
  if (url.searchParams.get("action") === "recover-payment") {
    try {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Não autenticado");

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) throw new Error("Usuário não autenticado");

      const paymentId = url.searchParams.get("payment_id");
      if (!paymentId) throw new Error("ID do pagamento não informado");

      const { data: payment } = await supabase
        .from("payments")
        .select("*")
        .eq("id", paymentId)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .single();

      if (!payment) throw new Error("Pagamento não encontrado ou já processado");

      // Check if expired (>1h)
      const createdAt = new Date(payment.created_at).getTime();
      if (Date.now() - createdAt > 60 * 60 * 1000) {
        await supabase.from("payments").update({ status: "expired" }).eq("id", paymentId);
        throw new Error("Pagamento expirado");
      }

      if (!payment.mp_payment_id) throw new Error("Pagamento sem ID do Mercado Pago");

      // Fetch QR code from MP
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment.mp_payment_id}`, {
        headers: { Authorization: `Bearer ${mpToken}` },
      });
      const mpData = await mpRes.json();

      if (mpData.status === "approved") {
        await supabase.from("payments").update({ status: "approved" }).eq("id", paymentId);
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("credits")
          .eq("user_id", user.id)
          .single();

        await supabase
          .from("profiles")
          .update({ credits: (profile?.credits || 0) + payment.credits_purchased })
          .eq("user_id", user.id);

        return new Response(JSON.stringify({ status: "approved" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const pixData = mpData.point_of_interaction?.transaction_data;

      return new Response(JSON.stringify({
        payment_id: payment.id,
        mp_payment_id: payment.mp_payment_id,
        qr_code: pixData?.qr_code || "",
        qr_code_base64: pixData?.qr_code_base64 || "",
        credits_purchased: payment.credits_purchased,
        amount_cents: payment.amount_cents,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Check payment status
  if (url.searchParams.get("action") === "check-status") {
    try {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Não autenticado");

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) throw new Error("Usuário não autenticado");

      const paymentId = url.searchParams.get("payment_id");
      if (!paymentId) throw new Error("ID do pagamento não informado");

      const { data: payment } = await supabase
        .from("payments")
        .select("status, mp_payment_id")
        .eq("id", paymentId)
        .eq("user_id", user.id)
        .single();

      if (!payment) throw new Error("Pagamento não encontrado");

      // If still pending, check with MP
      if (payment.status === "pending" && payment.mp_payment_id) {
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment.mp_payment_id}`, {
          headers: { Authorization: `Bearer ${mpToken}` },
        });
        const mpPayment = await mpRes.json();

        if (mpPayment.status === "approved") {
          // Update payment and credits
          await supabase
            .from("payments")
            .update({ status: "approved" })
            .eq("id", paymentId);

          const { data: profile } = await supabase
            .from("profiles")
            .select("credits")
            .eq("user_id", user.id)
            .single();

          const creditsToAdd = (await supabase
            .from("payments")
            .select("credits_purchased")
            .eq("id", paymentId)
            .single()).data?.credits_purchased || 0;

          await supabase
            .from("profiles")
            .update({ credits: (profile?.credits || 0) + creditsToAdd })
            .eq("user_id", user.id);

          return new Response(JSON.stringify({ status: "approved" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ status: payment.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Create PIX payment
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autenticado");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Usuário não autenticado");

    const { credits, cpf, save_cpf } = await req.json();
    const creditCount = parseInt(credits, 10);
    if (!creditCount || creditCount < 1 || creditCount > 10000) {
      throw new Error("Quantidade de créditos inválida (1-10000)");
    }

    if (!cpf || cpf.length < 11) {
      throw new Error("CPF inválido");
    }

    // Clean CPF
    const cleanCpf = cpf.replace(/\D/g, "");

    // Save CPF if requested
    if (save_cpf) {
      await supabase
        .from("profiles")
        .update({ cpf: cleanCpf })
        .eq("user_id", user.id);
    }

    const unitPriceBRL = 0.50;
    const totalAmount = creditCount * unitPriceBRL;

    // Create payment record
    const { data: paymentRecord, error: paymentErr } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        amount_cents: Math.round(totalAmount * 100),
        credits_purchased: creditCount,
        status: "pending",
      })
      .select()
      .single();

    if (paymentErr) throw new Error(`Erro ao criar registro: ${paymentErr.message}`);

    // Create PIX payment via Mercado Pago
    const paymentBody = {
      transaction_amount: totalAmount,
      description: `${creditCount} crédito${creditCount > 1 ? "s" : ""} RemixHub`,
      payment_method_id: "pix",
      payer: {
        email: user.email,
        first_name: user.user_metadata?.display_name || "User",
        identification: {
          type: "CPF",
          number: cleanCpf,
        },
      },
      external_reference: `${user.id}:${creditCount}:${paymentRecord.id}`,
    };

    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": paymentRecord.id,
      },
      body: JSON.stringify(paymentBody),
    });

    if (!mpRes.ok) {
      const errText = await mpRes.text();
      throw new Error(`Mercado Pago error: ${errText}`);
    }

    const mpData = await mpRes.json();

    // Save MP payment ID
    await supabase
      .from("payments")
      .update({ mp_payment_id: String(mpData.id) })
      .eq("id", paymentRecord.id);

    const pixData = mpData.point_of_interaction?.transaction_data;

    return new Response(
      JSON.stringify({
        payment_id: paymentRecord.id,
        mp_payment_id: mpData.id,
        qr_code: pixData?.qr_code || "",
        qr_code_base64: pixData?.qr_code_base64 || "",
        ticket_url: pixData?.ticket_url || "",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
