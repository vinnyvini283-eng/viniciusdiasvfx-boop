import json
import os
import logging
from collections import deque
from datetime import date
from groq import Groq

logger = logging.getLogger(__name__)
_groq: Groq | None = None

MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
_MAX_HISTORY = 20  # pares de mensagens persistidas por usuário
_CACHE_LOADED: set[int] = set()  # user_ids já carregados do banco nessa sessão

# user_id → deque de {"role": str, "content": str} (cache em memória)
_history: dict[int, deque] = {}


def _load_history_db(user_id: int) -> None:
    """Carrega histórico do Supabase para a memória (uma vez por sessão)."""
    if user_id in _CACHE_LOADED:
        return
    try:
        from db.supabase_client import get_client
        db = get_client()
        result = (
            db.table("bot_historico")
            .select("role,content")
            .eq("telegram_user_id", user_id)
            .order("criado_em", desc=False)
            .limit(_MAX_HISTORY * 2)
            .execute()
        )
        msgs = result.data or []
        if msgs:
            _history[user_id] = deque(msgs, maxlen=_MAX_HISTORY * 2)
        _CACHE_LOADED.add(user_id)
    except Exception as e:
        logger.warning(f"[parser] falha ao carregar histórico do banco user={user_id}: {e}")
        _CACHE_LOADED.add(user_id)  # não tentar de novo nessa sessão


def _save_history_db(user_id: int, user_msg: str, assistant_msg: str) -> None:
    """Persiste o par de mensagens no Supabase (fire and forget)."""
    try:
        from db.supabase_client import get_client
        db = get_client()
        db.table("bot_historico").insert([
            {"telegram_user_id": user_id, "role": "user", "content": user_msg},
            {"telegram_user_id": user_id, "role": "assistant", "content": assistant_msg},
        ]).execute()
    except Exception as e:
        logger.warning(f"[parser] falha ao salvar histórico user={user_id}: {e}")

SYSTEM_PROMPT = """Você é o assistente pessoal de Vinicius, profissional de marketing digital e vídeo no Brasil.
Analise a mensagem e retorne APENAS um JSON válido, sem markdown, sem explicações.

Schema:
{
  "intencao": string,
  "valor": float | null,
  "descricao": string,
  "categoria": string | null,
  "cliente": string | null,
  "tipo_entrada": "salario" | "freela" | "divida" | "outros" | null,
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
- adicionar_fixa: criar nova conta fixa (ex: "adicionar fixa Academia 150", "nova fixa Netflix 55")
- atualizar_fixa: atualizar valor de conta fixa existente (ex: "aluguel agora é 1500", "energia virou 280")
- deletar_fixa: excluir conta fixa (ex: "remove a fixa Netflix", "deleta seguro") confirmacao_necessaria=true
- consulta_fixas: listar contas fixas ativas (ex: "minhas fixas", "quais são minhas contas fixas")
- atualizar_salario: atualizar salário fixo mensal
- consulta_hoje: quanto gastei hoje
- consulta_semana: quanto gastei essa semana
- consulta_mes: quanto gastei esse mês
- consulta_resumo: saldo, resumo do mês, situação financeira
- consulta_categoria: gastos por categoria específica
- consulta_maior_gasto: maior gasto do mês
- consulta_investimentos_ano: total investido no ano
- editar_ultimo_lancamento: corrigir/alterar último lançamento
- deletar_lancamento: apagar o ÚLTIMO lançamento (confirmacao_necessaria=true)
- deletar_entrada: apagar a ÚLTIMA entrada/freela (confirmacao_necessaria=true)
- deletar_todos_lancamentos: apagar TODOS os lançamentos ("apaga tudo", "excluir todos os lançamentos", "limpar todos os gastos") — confirmacao_necessaria=true
- deletar_todos_entradas: apagar TODAS as entradas ("apaga todas as entradas", "limpar todas as freelas") — confirmacao_necessaria=true
- deletar_lancamentos_mes: apagar todos os lançamentos do mês atual ou mencionado ("apaga os gastos de março", "limpar lançamentos do mês") — confirmacao_necessaria=true

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
- "adicionar/nova fixa [nome] [valor]" → adicionar_fixa, descricao=nome, valor=valor
- "aluguel agora é X" / "[nome da fixa] virou X" → atualizar_fixa, descricao=nome, valor=X
- "minhas fixas" / "contas fixas" → consulta_fixas
- "apaga/remove/cancela/deleta" → intencao começa com "deletar_", confirmacao_necessaria=true
- confirmacao_necessaria=true se valor > 500 OU intencao começa com "deletar_"
- tipo_entrada (só preencher quando intencao=inserir_entrada):
  * "salario" → menciona "salário", "salario", ou remetente é GS Pneus/JRL/PHS
  * "divida" → menciona "dívida", "devolvendo", "me pagou de volta", "empréstimo"
  * "freela" → pagamento de projeto/serviço, cliente pagou
  * "outros" → qualquer outro recebimento
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

    # Garante que o histórico persistido foi carregado uma vez nessa sessão
    if user_id is not None:
        _load_history_db(user_id)

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

    # Salva no cache em memória
    if user_id is not None:
        if user_id not in _history:
            _history[user_id] = deque(maxlen=_MAX_HISTORY * 2)
        _history[user_id].append({"role": "user", "content": texto})
        _history[user_id].append({"role": "assistant", "content": content})
        # Persiste no banco para sobreviver a reinícios
        _save_history_db(user_id, texto, content)

    return parsed


def clear_history(user_id: int) -> None:
    """Limpa o histórico de conversa de um usuário (memória + banco)."""
    _history.pop(user_id, None)
    _CACHE_LOADED.discard(user_id)
    try:
        from db.supabase_client import get_client
        get_client().table("bot_historico").delete().eq("telegram_user_id", user_id).execute()
    except Exception as e:
        logger.warning(f"[parser] falha ao limpar histórico DB user={user_id}: {e}")
