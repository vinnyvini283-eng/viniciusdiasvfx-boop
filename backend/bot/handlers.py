import logging
import time
from datetime import date

from bot.formatter import (
    fmt_moeda, msg_inserido, msg_resumo, msg_gastos_periodo,
    msg_confirmacao_delete, msg_confirmacao_registro, fmt_lancamento,
)
from bot.parser import parse_mensagem
from config import DESPESAS_FIXAS_MAP, is_authorized
from financeiro import lancamentos, entradas, investimentos
from financeiro.fixas import atualizar_campo as fixas_atualizar
from financeiro.investimentos import get_total_ano
from financeiro.queries import (
    get_resumo_mes, get_gastos_hoje, get_gastos_semana,
    get_gastos_mes, get_maior_gasto, update_salario,
)

logger = logging.getLogger(__name__)

# user_id → {"action": callable, "ts": float}
_pending: dict[int, dict] = {}
_PENDING_TTL = 300  # 5 minutos


def _parse_date(s: str) -> date:
    if not s:
        return date.today()
    try:
        d, m, y = s.split("/")
        return date(int(y), int(m), int(d))
    except Exception:
        return date.today()


def _queue(user_id: int, action, preview: str) -> str:
    _pending[user_id] = {"action": action, "ts": time.time()}
    return preview


def _resolve(user_id: int, texto: str) -> str:
    pending = _pending.pop(user_id)
    if time.time() - pending.get("ts", 0) > _PENDING_TTL:
        return "⏱️ Confirmação expirada. Repita o comando."
    if texto.lower().strip() in ("sim", "s", "yes", "ok", "confirmar", "1"):
        try:
            return pending["action"]()
        except Exception as e:
            logger.error(f"Pending action error: {e}")
            return "❌ Erro ao executar. Tente novamente."
    return "❌ Operação cancelada."


def handle_message(user_id: int, texto: str) -> str:
    if not is_authorized(user_id):
        return ""

    texto = texto.strip()
    if not texto:
        return ""

    if user_id in _pending:
        return _resolve(user_id, texto)

    try:
        parsed = parse_mensagem(texto)
    except Exception as e:
        logger.error(f"Parser error user={user_id}: {e}")
        return "❌ Não entendi. Pode reformular?"

    intencao = parsed.get("intencao", "")
    logger.info(f"user={user_id} intencao={intencao}")
    return _route(user_id, parsed, intencao)


def _route(user_id: int, parsed: dict, intencao: str) -> str:
    hoje = date.today()
    mes, ano = hoje.month, hoje.year

    # ── INSERÇÕES ─────────────────────────────────────────────────────────
    if intencao == "inserir_lancamento":
        valor = parsed.get("valor")
        if not valor:
            return "Qual o valor?"
        descricao = parsed.get("descricao") or "Gasto"
        categoria = parsed.get("categoria") or "Outros"
        data = _parse_date(parsed.get("data"))

        def do():
            lancamentos.inserir(descricao, categoria, valor, data)
            return msg_inserido("Lançamento", f"{descricao} ({categoria})", valor)

        if parsed.get("confirmacao_necessaria"):
            return _queue(user_id, do, msg_confirmacao_registro(descricao, valor, categoria))
        return do()

    elif intencao == "inserir_entrada":
        valor = parsed.get("valor")
        if not valor:
            return "Qual o valor da entrada?"
        descricao = parsed.get("descricao") or "Entrada"
        data = _parse_date(parsed.get("data"))

        def do():
            entradas.inserir(descricao, valor, tipo="freela", data=data)
            return msg_inserido("Entrada", descricao, valor)

        if parsed.get("confirmacao_necessaria"):
            return _queue(user_id, do, msg_confirmacao_registro(descricao, valor))
        return do()

    elif intencao == "inserir_investimento":
        valor = parsed.get("valor")
        if not valor:
            return "Qual o valor do investimento?"
        descricao = parsed.get("descricao") or "Investimento"
        data = _parse_date(parsed.get("data"))

        def do():
            investimentos.inserir(descricao, valor, data)
            resumo = get_resumo_mes(data.month, data.year)
            msg = msg_inserido("Investimento", descricao, valor)
            if resumo["pct_meta"] >= 100:
                msg += "\n\n🎯 Meta de 20% já superada! Parabéns!"
            return msg

        if parsed.get("confirmacao_necessaria"):
            return _queue(user_id, do, msg_confirmacao_registro(descricao, valor))
        return do()

    elif intencao == "atualizar_fixa":
        desc_raw = (parsed.get("descricao") or "").lower()
        campo = None
        for alias in sorted(DESPESAS_FIXAS_MAP, key=len, reverse=True):
            if alias in desc_raw:
                campo = DESPESAS_FIXAS_MAP[alias]
                break
        if not campo:
            return "Qual despesa fixa? (aluguel, energia, água, internet, condomínio, seguro, mensalidade)"
        valor = parsed.get("valor")
        if not valor:
            return "Qual o valor?"
        fixas_atualizar(mes, ano, campo, valor)
        return f"✅ {campo.replace('_', ' ').title()} atualizado: {fmt_moeda(valor)}"

    elif intencao == "atualizar_salario":
        valor = parsed.get("valor")
        if not valor:
            return "Qual o valor do salário?"
        update_salario(valor)
        return f"✅ Salário atualizado: {fmt_moeda(valor)}"

    # ── CONSULTAS ─────────────────────────────────────────────────────────
    elif intencao == "consulta_hoje":
        return msg_gastos_periodo(get_gastos_hoje(), "hoje")

    elif intencao == "consulta_semana":
        return msg_gastos_periodo(get_gastos_semana(), "essa semana")

    elif intencao == "consulta_mes":
        return msg_gastos_periodo(get_gastos_mes(mes, ano), "esse mês")

    elif intencao == "consulta_resumo":
        return msg_resumo(get_resumo_mes(mes, ano), mes, ano)

    elif intencao == "consulta_categoria":
        categoria = parsed.get("categoria")
        if not categoria:
            return "Qual categoria? (Alimentação, Transporte, Lazer, Vestuário, Saúde, Educação, Outros)"
        from financeiro.queries import get_gastos_periodo
        from datetime import timedelta
        inicio = date(ano, mes, 1)
        fim = date(ano, mes + 1, 1) - timedelta(days=1) if mes < 12 else date(ano, 12, 31)
        resultado = get_gastos_periodo(inicio, fim, categoria=categoria)
        if resultado["count"] == 0:
            return f"Nenhum gasto em *{categoria}* esse mês 😊"
        linhas = [f"🏷️ *{categoria}* este mês: {fmt_moeda(resultado['total'])}\n"]
        linhas += [fmt_lancamento(l) for l in resultado["lancamentos"][:10]]
        return "\n".join(linhas)

    elif intencao == "consulta_maior_gasto":
        maior = get_maior_gasto(mes, ano)
        if not maior:
            return "Nenhum lançamento registrado este mês ainda."
        return f"💸 Maior gasto do mês:\n{fmt_lancamento(maior)}"

    elif intencao == "consulta_investimentos_ano":
        total = get_total_ano(ano)
        return f"📈 Total investido em {ano}: {fmt_moeda(total)}"

    # ── EDIÇÕES ───────────────────────────────────────────────────────────
    elif intencao == "editar_ultimo_lancamento":
        valor = parsed.get("valor")
        if not valor:
            return "Qual o novo valor?"
        ultimo = lancamentos.get_ultimo()
        if not ultimo:
            return "Nenhum lançamento encontrado para editar."

        def do():
            lancamentos.atualizar_ultimo(valor)
            return (f"✅ Último lançamento corrigido:\n"
                    f"*{ultimo['descricao']}* → {fmt_moeda(valor)}")

        if parsed.get("confirmacao_necessaria"):
            return _queue(user_id, do,
                msg_confirmacao_registro(
                    f"Corrigir '{ultimo['descricao']}' para", valor))
        return do()

    # ── DELETES ───────────────────────────────────────────────────────────
    elif intencao == "deletar_lancamento":
        ultimo = lancamentos.get_ultimo()
        if not ultimo:
            return "Nenhum lançamento encontrado para excluir."

        def do():
            lancamentos.deletar_por_id(ultimo["id"])
            return f"🗑️ Lançamento excluído: *{ultimo['descricao']}* — {fmt_moeda(float(ultimo['valor']))}"

        return _queue(user_id, do, msg_confirmacao_delete(ultimo, "lancamento"))

    elif intencao == "deletar_entrada":
        ultimo = entradas.get_ultimo()
        if not ultimo:
            return "Nenhuma entrada encontrada para excluir."

        def do():
            entradas.deletar_por_id(ultimo["id"])
            return f"🗑️ Entrada excluída: *{ultimo['descricao']}* — {fmt_moeda(float(ultimo['valor']))}"

        return _queue(user_id, do, msg_confirmacao_delete(ultimo, "entrada"))

    else:
        logger.warning(f"Intenção não mapeada: {intencao!r}")
        return "🤔 Não entendi bem. Pode reformular?"
