import json
import os
import logging
from collections import deque
from datetime import date
from groq import Groq

logger = logging.getLogger(__name__)
_groq: Groq | None = None

MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
_MAX_HISTORY = 10  # pares de mensagens (user + assistant) por usuário

# user_id → deque de {"role": str, "content": str}
_history: dict[int, deque] = {}

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

Intenções financeiras:
- inserir_lancamento: gasto variável (mercado, restaurante, farmácia, gasolina, etc.)
- inserir_entrada: freela, pagamento recebido, receita extra (SEM ser de cliente específico)
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

Intenções work:
- nova_tarefa: criar nova tarefa (ex: "nova tarefa GSPNEUS: relatório até sexta")
- consulta_pendentes: listar tarefas pendentes (ex: "pendentes", "tarefas da Cida Car")
- concluir_tarefa: marcar tarefa como concluída
- deletar_tarefa: excluir tarefa (confirmacao_necessaria=true)
- registrar_pagamento_cliente: cliente pagou (ex: "Cida Car pagou 1500") — usa cliente + valor
- consulta_pagamentos_cliente: quanto cliente pagou (ex: "quanto a Cida Car me pagou")

Regras:
- "quanto gastei hoje" → consulta_hoje
- "qual meu saldo" / "resumo" → consulta_resumo
- "quanto gastei em X" onde X é categoria → consulta_categoria, categoria=X
- "[Cliente] pagou [valor]" → registrar_pagamento_cliente com cliente e valor
- "nova tarefa [cliente]: [nome] até [data]" → nova_tarefa com tarefa_nome, cliente e data_limite
- "pendentes" / "tarefas" → consulta_pendentes
- "apaga/remove/cancela/deleta" → intencao começa com "deletar_", confirmacao_necessaria=true
- confirmacao_necessaria=true se valor > 500 OU intencao começa com "deletar_"
- Data padrão: hoje ({today})
- Categorias: Alimentação, Transporte, Lazer, Vestuário, Saúde, Educação, Outros
- Use o histórico para entender "aquele gasto", "o último", "isso"
"""


def _get_groq() -> Groq:
    global _groq
    if _groq is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is required")
        _groq = Groq(api_key=api_key)
    return _groq


def parse_mensagem(texto: str, user_id: int | None = None) -> dict:
    today = date.today().strftime("%d/%m/%Y")
    system = SYSTEM_PROMPT.replace("{today}", today)

    # Monta histórico de contexto
    history = list(_history.get(user_id, [])) if user_id is not None else []
    messages = [{"role": "system", "content": system}] + history + [{"role": "user", "content": texto}]

    response = _get_groq().chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.1,
        max_tokens=512,
    )

    content = response.choices[0].message.content.strip()
    # Strip markdown fences if present
    if content.startswith("```"):
        lines = [l for l in content.split("\n") if not l.startswith("```")]
        content = "\n".join(lines).strip()

    parsed = json.loads(content)
    logger.debug(f"parse_mensagem user={user_id} input={texto!r} output={parsed}")

    # Salva no histórico para contexto futuro
    if user_id is not None:
        if user_id not in _history:
            _history[user_id] = deque(maxlen=_MAX_HISTORY * 2)
        _history[user_id].append({"role": "user", "content": texto})
        _history[user_id].append({"role": "assistant", "content": content})

    return parsed


def clear_history(user_id: int) -> None:
    """Limpa o histórico de conversa de um usuário."""
    _history.pop(user_id, None)
