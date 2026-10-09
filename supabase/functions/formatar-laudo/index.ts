// Edge Function: formatar-laudo
// Recebe as anotações livres do técnico + os itens/valores da OS e devolve o
// laudo formatado em HTML (Diagnóstico ✅/❌, Serviços orçados, Total,
// Garantia, Prazo, Privacidade).
//
// Regras de segurança:
// - Só usuários logados podem chamar (a chave do Gemini é gasta por chamada).
// - A IA só redige texto. Os valores das peças vêm da OS, e o total é sempre
//   calculado aqui, nunca pela IA. Se as linhas da IA não somarem o total da
//   OS, a resposta volta com um aviso.
// - Nenhum dado pessoal do cliente é enviado à IA, só anotações e itens.
// - Todo texto da IA é escapado antes de virar HTML.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Item = {
  nome: string;
  quantidade: number;
  valor_unitario: number;
  tipo?: "peca" | "servico";
};

type Entrada = {
  notas: string;
  itens: Item[];
  mao_de_obra: number;
  desconto?: number;
  equipamento?: string;
};

type SaidaIA = {
  diagnostico: { status: "ok" | "defeito"; texto: string }[];
  servicos: { descricao: string; valor: number }[];
  garantia: string;
  prazo: string;
  privacidade: string;
};

const GARANTIA_PADRAO =
  "90 dias sobre todos os serviços realizados. Não cobre novo impacto, queda, líquidos ou mau uso.";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function esc(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .format(v)
    .replace(/ /g, " ");
}

const centavos = (v: number) => Math.round((Number(v) || 0) * 100);

function htmlParaTexto(html: string) {
  return String(html ?? "")
    .replace(/<\/(p|li|div|h\d)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const SCHEMA = {
  type: "OBJECT",
  properties: {
    diagnostico: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          status: { type: "STRING", enum: ["ok", "defeito"] },
          texto: { type: "STRING" },
        },
        required: ["status", "texto"],
      },
    },
    servicos: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          descricao: { type: "STRING" },
          valor: { type: "NUMBER" },
        },
        required: ["descricao", "valor"],
      },
    },
    garantia: { type: "STRING" },
    prazo: { type: "STRING" },
    privacidade: { type: "STRING" },
  },
  required: ["diagnostico", "servicos", "garantia", "prazo", "privacidade"],
};

function montarPrompt(e: Entrada, notas: string) {
  const itens = (e.itens ?? [])
    .map(
      (i) =>
        `- ${i.nome} | quantidade ${i.quantidade} | valor total da linha ${
          (Number(i.quantidade) * Number(i.valor_unitario)).toFixed(2)
        }`,
    )
    .join("\n") || "(nenhum item cadastrado)";

  return `Você redige o laudo técnico de uma assistência técnica de informática (Trust Care), em português do Brasil, com tom profissional e claro para um cliente leigo.

EQUIPAMENTO: ${e.equipamento || "(não informado)"}

ANOTAÇÕES DO TÉCNICO (texto livre, pode estar abreviado):
"""
${notas}
"""

ITENS DA ORDEM DE SERVIÇO (peças e serviços com valor; use exatamente estes valores):
${itens}

MÃO DE OBRA TOTAL DA OS: ${Number(e.mao_de_obra || 0).toFixed(2)}

Monte o JSON seguindo estas regras:

1. "diagnostico": um item por constatação das anotações. status "ok" para o que foi testado e está funcionando, "defeito" para problemas encontrados. Reescreva de forma técnica e clara, sem inventar nada que não esteja nas anotações. Mantenha medições e números que o técnico anotou.

2. "servicos": uma linha por item da OS, com descrição clara do que será feito (pode enriquecer com o que as anotações dizem sobre aquele item, como "peça nova, sob encomenda") e "valor" EXATAMENTE igual ao valor total da linha informado acima.
   - A mão de obra também deve virar linhas. Se as anotações dividirem a mão de obra em serviços com valores (ex.: "reparo dobradiça 200, instalação 120") e a soma bater com a MÃO DE OBRA TOTAL, use essa divisão. Caso contrário, use UMA linha "Mão de obra" com o valor total da mão de obra. Se a mão de obra total for 0, não crie linha de mão de obra.
   - Nunca crie linhas ou valores que não estejam nos itens ou nas anotações.

3. "garantia": se as anotações falarem de garantia, use o que está lá. Senão: "${GARANTIA_PADRAO}" adaptando para citar os serviços orçados entre parênteses. Se houver peça nova comprada de fornecedor, acrescente que ela também tem garantia do fornecedor.

4. "prazo": só se as anotações falarem de prazo, encomenda de peça ou tempo de cura. Senão, string vazia.

5. "privacidade": se as anotações falarem de acesso ao sistema ou arquivos do cliente, redija a partir disso. Senão: "O acesso ao sistema se limita aos testes de funcionamento do hardware. Nenhum arquivo pessoal do cliente será aberto ou copiado."

Não use travessões (—). Não inclua o total; ele é calculado pelo sistema.`;
}

async function chamarGemini(prompt: string): Promise<SaidaIA> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY não configurada no Supabase.");
  // O Google aposenta modelos com frequência. Tenta em ordem e pula os que
  // voltarem 404 (modelo indisponível). GEMINI_MODEL no Supabase força um.
  const modelos = [
    Deno.env.get("GEMINI_MODEL"),
    "gemini-3.8-flash",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
  ].filter((m, i, arr): m is string => !!m && arr.indexOf(m) === i);

  let resp: Response | null = null;
  let ultimoErro = "";
  for (const model of modelos) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: SCHEMA,
          },
        }),
      },
    );
    if (r.ok) {
      resp = r;
      break;
    }
    const txt = await r.text();
    if (r.status === 404) {
      ultimoErro = `${model}: ${txt.slice(0, 200)}`;
      continue;
    }
    if (r.status === 429) {
      throw new Error("Limite gratuito do Gemini atingido. Tente de novo em alguns minutos.");
    }
    throw new Error(`Gemini (${model}) respondeu ${r.status}: ${txt.slice(0, 300)}`);
  }
  if (!resp) throw new Error(`Nenhum modelo do Gemini disponível. Último erro: ${ultimoErro}`);

  const data = await resp.json();
  const texto = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  if (!texto) throw new Error("O Gemini não retornou conteúdo.");
  return JSON.parse(texto) as SaidaIA;
}

function montarHtml(s: SaidaIA, desconto: number) {
  const partes: string[] = [];

  if (s.diagnostico?.length) {
    partes.push("<p><strong>Diagnóstico</strong></p><ul>");
    for (const d of s.diagnostico) {
      const icone = d.status === "ok" ? "✅" : "❌";
      partes.push(`<li>${icone} ${esc(d.texto)}</li>`);
    }
    partes.push("</ul>");
  }

  let soma = 0;
  if (s.servicos?.length) {
    partes.push("<p><strong>Serviços orçados</strong></p><ul>");
    for (const sv of s.servicos) {
      soma += centavos(sv.valor);
      partes.push(`<li>${esc(sv.descricao)}: ${brl(Number(sv.valor) || 0)}</li>`);
    }
    partes.push("</ul>");
  }

  const desc = centavos(desconto);
  if (desc > 0) partes.push(`<p>Desconto: -${brl(desc / 100)}</p>`);
  partes.push(`<p><strong>Total: ${brl(Math.max(0, soma - desc) / 100)}</strong></p>`);

  if (s.garantia?.trim()) partes.push(`<p><strong>Garantia:</strong> ${esc(s.garantia.trim())}</p>`);
  if (s.prazo?.trim()) partes.push(`<p><strong>Prazo:</strong> ${esc(s.prazo.trim())}</p>`);
  if (s.privacidade?.trim()) partes.push(`<p><strong>Privacidade:</strong> ${esc(s.privacidade.trim())}</p>`);

  return { html: partes.join(""), somaCentavos: soma };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  // Só usuário logado no sistema.
  const auth = req.headers.get("Authorization") ?? "";
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "Faça login para usar esta função." }, 401);

  let e: Entrada;
  try {
    e = await req.json();
  } catch {
    return json({ error: "Corpo da requisição inválido." }, 400);
  }

  const notas = htmlParaTexto(e.notas).slice(0, 6000);
  if (notas.length < 5) {
    return json({ error: "Escreva suas anotações no laudo antes de formatar." }, 400);
  }

  try {
    const saida = await chamarGemini(montarPrompt(e, notas));
    const desconto = Number(e.desconto || 0);
    const { html, somaCentavos } = montarHtml(saida, desconto);

    const esperado =
      centavos(e.mao_de_obra) +
      (e.itens ?? []).reduce(
        (acc, i) => acc + centavos(Number(i.quantidade) * Number(i.valor_unitario)),
        0,
      );

    const aviso = somaCentavos !== esperado
      ? `Atenção: as linhas do laudo somam ${brl(somaCentavos / 100)}, mas a OS soma ${brl(esperado / 100)} (antes do desconto). Confira os valores antes de salvar.`
      : null;

    return json({ html, aviso });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Erro ao formatar o laudo." }, 502);
  }
});
