import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ghHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github.v3+json",
});

async function ghFetch(url: string, token: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...ghHeaders(token), ...(options.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function getDefaultBranch(repo: string, token: string): Promise<string> {
  const data = await ghFetch(`https://api.github.com/repos/${repo}`, token);
  return data.default_branch;
}

async function getTree(repo: string, branch: string, token: string): Promise<any[]> {
  const data = await ghFetch(
    `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`,
    token
  );
  return data.tree.filter((item: any) => item.type === "blob");
}

async function getRef(repo: string, branch: string, token: string): Promise<string> {
  const data = await ghFetch(
    `https://api.github.com/repos/${repo}/git/refs/heads/${branch}`,
    token
  );
  return data.object.sha;
}

async function getBlob(repo: string, sha: string, token: string): Promise<string> {
  const data = await ghFetch(
    `https://api.github.com/repos/${repo}/git/blobs/${sha}`,
    token
  );
  return data.content;
}

async function createBlob(repo: string, content: string, token: string): Promise<string> {
  const data = await ghFetch(`https://api.github.com/repos/${repo}/git/blobs`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, encoding: "base64" }),
  });
  return data.sha;
}

async function createTree(repo: string, items: any[], token: string): Promise<string> {
  // NOT using base_tree — this creates a completely new tree (deletes old files)
  const data = await ghFetch(`https://api.github.com/repos/${repo}/git/trees`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tree: items }),
  });
  return data.sha;
}

async function createCommit(
  repo: string, message: string, tree: string, parents: string[], token: string
): Promise<string> {
  const data = await ghFetch(`https://api.github.com/repos/${repo}/git/commits`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, tree, parents }),
  });
  return data.sha;
}

async function updateRef(repo: string, branch: string, sha: string, token: string) {
  await ghFetch(`https://api.github.com/repos/${repo}/git/refs/heads/${branch}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sha, force: true }),
  });
}

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

    const { sourceRepo, targetRepo, sourceToken, targetToken } = await req.json();
    if (!sourceRepo || !targetRepo || !sourceToken || !targetToken) {
      throw new Error("Campos obrigatórios não preenchidos");
    }

    // Check rate limit: max 3 remixes per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentRemixes, error: rateError } = await supabase
      .from("remix_history")
      .select("id, created_at")
      .eq("user_id", user!.id)
      .gte("created_at", oneHourAgo)
      .in("status", ["processing", "completed"]);

    if (!rateError && recentRemixes && recentRemixes.length >= 3) {
      // Find oldest remix to calculate wait time
      const oldest = recentRemixes.sort((a: any, b: any) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )[0];
      const unlockTime = new Date(new Date(oldest.created_at).getTime() + 60 * 60 * 1000);
      const minutesLeft = Math.ceil((unlockTime.getTime() - Date.now()) / 60000);
      throw new Error(`Limite de 3 remixes por hora atingido. Tente novamente em ${minutesLeft} minuto${minutesLeft > 1 ? "s" : ""}.`);
    }

    // Check credits
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits")
      .eq("user_id", user!.id)
      .single();

    if (profileError || !profile) throw new Error("Perfil não encontrado");
    if (profile.credits < 1) throw new Error("Créditos insuficientes. Recarregue na loja.");

    // Stream logs back to client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const allLogs: string[] = [];
        const log = (msg: string) => {
          allLogs.push(msg);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ log: msg })}\n\n`));
        };

        const saveLogs = async (id: string) => {
          await supabase
            .from("remix_history")
            .update({ logs: allLogs })
            .eq("id", id);
        };

        let historyId: string | null = null;

        try {
          log("📝 Criando registro no histórico...");
          const { data: historyRecord, error: insertError } = await supabase
            .from("remix_history")
            .insert({
              user_id: user!.id,
              source_repo: sourceRepo,
              target_repo: targetRepo,
              status: "processing",
            })
            .select()
            .single();

          if (insertError) throw new Error(`Erro ao salvar histórico: ${insertError.message}`);
          historyId = historyRecord.id;

          log(`🔍 Obtendo branch padrão de ${sourceRepo}...`);
          const sourceBranch = await getDefaultBranch(sourceRepo, sourceToken);
          log(`   ↳ Branch: ${sourceBranch}`);

          log(`🌳 Lendo árvore de arquivos do repositório mãe...`);
          const sourceTree = await getTree(sourceRepo, sourceBranch, sourceToken);
          log(`   ↳ ${sourceTree.length} arquivos encontrados`);

          log(`🔍 Obtendo branch padrão de ${targetRepo}...`);
          const targetBranch = await getDefaultBranch(targetRepo, targetToken);
          log(`   ↳ Branch: ${targetBranch}`);

          log(`📌 Obtendo referência HEAD do destino...`);
          const targetHeadSha = await getRef(targetRepo, targetBranch, targetToken);
          log(`   ↳ SHA: ${targetHeadSha.substring(0, 7)}`);

          log(`🚀 Copiando arquivos para o repositório destino...`);
          log(`   ⚠️  Todo conteúdo anterior do destino será substituído.`);

          const BATCH_SIZE = 10;
          const treeItems: any[] = [];

          for (let i = 0; i < sourceTree.length; i += BATCH_SIZE) {
            const batch = sourceTree.slice(i, i + BATCH_SIZE);
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(sourceTree.length / BATCH_SIZE);
            log(`   📦 Lote ${batchNum}/${totalBatches} (${batch.length} arquivos)...`);

            const results = await Promise.all(
              batch.map(async (file: any) => {
                const content = await getBlob(sourceRepo, file.sha, sourceToken);
                const blobSha = await createBlob(targetRepo, content, targetToken);
                return {
                  path: file.path,
                  mode: file.mode,
                  type: "blob",
                  sha: blobSha,
                };
              })
            );
            treeItems.push(...results);
          }

          log(`🌲 Criando nova árvore (sem base_tree = apaga tudo antigo)...`);
          const newTreeSha = await createTree(targetRepo, treeItems, targetToken);
          log(`   ↳ Tree SHA: ${newTreeSha.substring(0, 7)}`);

          log(`💾 Criando commit...`);
          const commitSha = await createCommit(
            targetRepo,
            `Remix from ${sourceRepo} via RemixHub`,
            newTreeSha,
            [targetHeadSha],
            targetToken
          );
          log(`   ↳ Commit SHA: ${commitSha.substring(0, 7)}`);

          log(`🔄 Atualizando referência da branch ${targetBranch}...`);
          await updateRef(targetRepo, targetBranch, commitSha, targetToken);

          await supabase
            .from("remix_history")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", historyId);

          // Deduct 1 credit
          log(`💰 Descontando 1 crédito...`);
          const { data: currentProfile } = await supabase
            .from("profiles")
            .select("credits")
            .eq("user_id", user!.id)
            .single();
          
          await supabase
            .from("profiles")
            .update({ credits: Math.max(0, (currentProfile?.credits || 1) - 1) })
            .eq("user_id", user!.id);

          log(`✅ Remix concluído com sucesso!`);
          await saveLogs(historyId!);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        } catch (err: any) {
          log(`❌ Erro: ${err.message}`);
          if (historyId) {
            await saveLogs(historyId);
            await supabase
              .from("remix_history")
              .update({ status: "error", error_message: err.message })
              .eq("id", historyId);
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
