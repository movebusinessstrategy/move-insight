import { Anthropic } from '@anthropic-ai/sdk';
import { db } from '../../db/client.js';
import type { ClienteContexto } from './contexto.service.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface SugestaoCriativa {
  id: string;
  cliente_id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  publico_alvo: string;
  formato: string;
  tom: string;
  prompt_usado: string;
  resposta_ia: string;
  created_at: string;
}

/**
 * Generate creative suggestions based on client context
 */
export async function gerarSugestoesCreativas(
  clienteId: string,
  contexto: ClienteContexto,
  tipoSugestao: 'post_instagram' | 'copy_whatsapp' | 'titulo_anuncio' | 'angulo_venda' | 'geral' = 'geral'
): Promise<string> {
  const prompt = montarPromptSugestao(contexto, tipoSugestao);

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const resposta = message.content[0].type === 'text' ? message.content[0].text : '';

  // Salvar sugestão no histórico
  await salvarSugestao(clienteId, tipoSugestao, prompt, resposta);

  return resposta;
}

/**
 * Build prompt based on client context and suggestion type
 */
function montarPromptSugestao(contexto: ClienteContexto, tipo: string): string {
  const baseInfo = `
Empresa: ${contexto.descricao_empresa || 'Não especificado'}
Produtos/Serviços: ${contexto.produtos_servicos || 'Não especificado'}
Localização: ${contexto.localizacao || 'Não especificado'}
Estratégia: ${contexto.estrategia || 'Não especificado'}
Tom de Marca: ${contexto.tom_marca || 'Profissional'}
Público-alvo: ${contexto.publico_alvo || 'Não especificado'}
`;

  const prompts: Record<string, string> = {
    post_instagram: `
Baseado nas informações da empresa abaixo, gere 3 ideias criativas e originais para posts do Instagram que engajem o público-alvo:

${baseInfo}

Para cada ideia, forneça:
1. Tema/Gancho (o que vai atrair clique)
2. Copy sugerida (máx 150 caracteres)
3. Tipo de conteúdo (carousel, video, static, reel)
4. Hashtags relevantes (5-7)

Tenha em mente o tom de marca ao sugerir. As ideias devem ser práticas e implementáveis.
`,

    copy_whatsapp: `
Baseado nas informações da empresa abaixo, gere 3 mensagens WhatsApp persuasivas e profissionais que aumentem conversão:

${baseInfo}

Para cada mensagem, forneça:
1. Copy completa (máx 180 caracteres, conversacional)
2. Objetivo (lead, venda, engajamento)
3. Call-to-action sugerido
4. Timing ideal de envio (qual dia/hora)

As mensagens devem ser diretas, oferecer valor e respeitar o tom de marca.
`,

    titulo_anuncio: `
Baseado nas informações da empresa abaixo, gere 5 títulos persuasivos para anúncios de Meta Ads:

${baseInfo}

Para cada título, forneça:
1. Título (máx 50 caracteres)
2. Psicologia por trás (por que funciona)
3. Público-alvo que mais responde
4. Possível CTR esperado (estimado)

Os títulos devem captar atenção, causar curiosidade e falar ao público-alvo de forma clara.
`,

    angulo_venda: `
Baseado nas informações da empresa abaixo, identifique e desenvolva 4 ângulos de venda únicos:

${baseInfo}

Para cada ângulo, forneça:
1. Nome do ângulo
2. Descrição (qual problema resolve)
3. Mensagem principal (hook)
4. Tipo de conteúdo recomendado
5. Público que mais responde

Os ângulos devem ser criativos, diferenciados e baseados em dores reais do público-alvo.
`,

    geral: `
Você é um especialista em marketing criativo e publicidade digital. Baseado nas informações da empresa abaixo, gere ideias inovadoras para melhorar a presença digital e aumentar conversões:

${baseInfo}

Forneça:
1. 3 ideias de conteúdo viral ou altamente engajador
2. 2 estratégias de posicionamento únicos
3. 1 campanha integrada (Instagram + WhatsApp + Anúncios)

Cada ideia deve ser prática, alinhada com o tom de marca e focada no público-alvo.
`,
  };

  return prompts[tipo] || prompts.geral;
}

/**
 * Save suggestion to history
 */
async function salvarSugestao(
  clienteId: string,
  tipo: string,
  prompt: string,
  resposta: string
): Promise<void> {
  try {
    await db`
      INSERT INTO cliente_sugestoes_criativos (
        id, cliente_id, tipo, titulo, descricao, prompt_usado, resposta_ia, created_at
      )
      VALUES (
        gen_random_uuid(),
        ${clienteId},
        ${tipo},
        ${'Sugestão ' + tipo.replace(/_/g, ' ')},
        ${resposta.substring(0, 200)},
        ${prompt},
        ${resposta},
        CURRENT_TIMESTAMP
      )
    `;
  } catch (error) {
    console.error('Erro ao salvar sugestão:', error);
  }
}

/**
 * Fetch suggestion history
 */
export async function obterHistoricoSugestoes(clienteId: string, limite: number = 10): Promise<SugestaoCriativa[]> {
  const sugestoes = await db<SugestaoCriativa[]>`
    SELECT id, cliente_id, tipo, titulo, descricao, publico_alvo, formato, tom, prompt_usado, resposta_ia, created_at
    FROM cliente_sugestoes_criativos
    WHERE cliente_id = ${clienteId}
    ORDER BY created_at DESC
    LIMIT ${limite}
  `;

  return sugestoes;
}

/**
 * Delete suggestion from history
 */
export async function deletarSugestao(id: string, clienteId: string): Promise<void> {
  await db`
    DELETE FROM cliente_sugestoes_criativos
    WHERE id = ${id} AND cliente_id = ${clienteId}
  `;
}
