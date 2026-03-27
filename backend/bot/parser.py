import json
import os
import logging
from datetime import date
from groq import Groq

logger = logging.getLogger(__name__)
_groq: Groq | None = None

MODEL = "llama-4-scout-17b-16e-instruct"

SYSTEM_PROMPT = """Você é o assistente pessoal de Vinicius, profissional de marketing digital e vídeo no Brasil.
Analise a mensagem e retorne APENAS um JSON válido, sem markdown, sem explicações.

Schema:
{
  "intencao": string,
  "valor": float | null,
  "descricao": string,
  "categoria": string | null,
  "cliente": string | null,
  "data": "DD/MM/YYYY",
  "data_limite": "DD/MM/YYYY" | null,
  "tarefa_nome": string | null,
  "observacao": string,
  "periodo": "hoje" | "semana" | "mes" | "ano" | null,
  "confianca": "alta" | "media" | "baixa",
  "confirmacao_necessaria": boolean
}

Mapeamento de clientes:
- "Cida Car", "cida" → "CIDACAR"
- "Aceleração", "VFX" → "ACELERAÇÃO VFX"
- "Alpha" → "ALPHA CENTRO"
- "GS", "pneus" → "GSPNEUS"

Intenções disponíveis:
- inserir_lancamento: gasto variável (mercado, restaurante, farmácia, gasolina, etc.)
- inserir_entrada: freela, pagamento recebido, receita extra
- inserir_investimento: investimento (tesouro, ações, poupança, fundo, etc.)
- atualizar_fixa: despesa fixa (aluguel, energia, água, internet, condomínio, seguro, mensalidade)
- atualizar_salario: atualizar salário fixo mensal
- consulta_hoje: quanto gastei hoje
- consulta_semana: quanto gastei essa semana
- consulta_mes: quanto gastei esse mês
- consulta_resumo: saldo, resumo do mês, situação financeira
- consulta_categoria: gastos por categoria específica
- consulta_maior_gasto: maior gasto do mês
- consulta_investimentos_ano: total investido no ano
- editar_ultimo_lancamento: corrigir/alterar último lançamento
- deletar_lancamento: apagar/remover lançamento (confirmacao_necessaria=true)
- deletar_entrada: apagar entrada/freela (confirmacao_necessaria=true)

Regras:
- "quanto gastei hoje" → intencao "consulta_hoje"
- "quanto gastei essa semana" → intencao "consulta_semana"
- "qual meu saldo" ou "resumo do mês" → intencao "consulta_resumo"
- "quanto gastei em X" onde X é categoria → intencao "consulta_categoria", categoria=X
- "apaga/remove/cancela/deleta" → intencao começa com "deletar_", confirmacao_necessaria=true
- confirmacao_necessaria=true se valor > 500 OU intencao começa com "deletar_"
- Data padrão: hoje ({today})
- Categorias válidas: Alimentação, Transporte, Lazer, Vestuário, Saúde, Educação, Outros
"""


def _get_groq() -> Groq:
    global _groq
    if _groq is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is required")
        _groq = Groq(api_key=api_key)
    return _groq


def parse_mensagem(texto: str) -> dict:
    today = date.today().strftime("%d/%m/%Y")
    prompt = SYSTEM_PROMPT.replace("{today}", today)

    response = _get_groq().chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": texto},
        ],
        temperature=0.1,
        max_tokens=512,
    )

    content = response.choices[0].message.content.strip()
    # Strip markdown fences if present
    if content.startswith("```"):
        lines = [l for l in content.split("\n") if not l.startswith("```")]
        content = "\n".join(lines).strip()

    parsed = json.loads(content)
    logger.debug(f"parse_mensagem input={texto!r} output={parsed}")
    return parsed
