import logging
import time
from datetime import date

from bot.formatter import (
    fmt_moeda, msg_inserido, msg_resumo, msg_gastos_periodo,
    msg_confirmacao_delete, msg_confirmacao_registro, fmt_lancamento,
)
from bot.parser import parse_mensagem, clear_history
from config import ALIASES_CLIENTES, is_authorized
from financeiro import lancamentos, entradas, investimentos
from financeiro import fixas as financeiro_fixas
from financeiro.investimentos import get_total_ano
from financeiro.queries import (
    get_resumo_mes, get_gastos_hoje, get_gastos_semana,
    get_gastos_mes, get_maior_gasto, update_salario,
)
from work import tarefas as work_tarefas
from work import clientes as work_clientes

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


def _normalizar(texto: str) -> str:
    """Remove pontuação e normaliza texto para comparação (lida com transcrições de áudio)."""
    import re
    return re.sub(r"[^\w\s]", "", texto.lower()).strip()


def _resolve(user_id: int, texto: str) -> str:
    pending = _pending.pop(user_id)
    if time.time() - pending.get("ts", 0) > _PENDING_TTL:
        return "Confirmacao expirada. Repita o comando."

    norm = _normalizar(texto)

    # Seleção numerada (ex: concluir_tarefa)
    if pending.get("type") == "concluir_tarefa":
        items = pending.get("items", [])
        # Tenta número direto
        try:
            idx = int(norm) - 1
            if 0 <= idx < len(items):
                work_tarefas.concluir(items[idx]["id"])
                return f"Tarefa concluida: *{items[idx]['nome']}*"
        except ValueError:
            pass
        # Tenta match por nome caso usuário tenha dito o nome via áudio
        match = next((t for t in items if norm in t["nome"].lower()), None)
        if match:
            work_tarefas.concluir(match["id"])
            return f"Tarefa concluida: *{match['nome']}*"
        return "Nao entendi qual tarefa. Responda com o numero ou o nome."

    CONFIRMACOES = {"sim", "s", "yes", "ok", "confirmar", "1", "pode", "claro",
                    "isso", "exato", "confirma", "vai", "bora", "manda", "faz"}
    CANCELAMENTOS = {"nao", "n", "no", "cancela", "cancelar", "volta", "para",
                     "nope", "negativo", "esquece"}

    if norm in CONFIRMACOES:
        try:
            return pending["action"]()
        except Exception as e:
            import traceback
            logger.error(f"Pending action error: {e}\n{traceback.format_exc()}")
            return f"Erro ao executar: {e}"
    if norm in CANCELAMENTOS:
        return "Operacao cancelada."

    # Texto não reconhecido → recolocar na fila e avisar
    _pending[user_id] = pending
    return "Nao entendi. Responda *sim* para confirmar ou *nao* para cancelar."


def handle_pdf_extrato(user_id: int, file_id: str) -> str:
    """Processa PDF de extrato bancário enviado via Telegram."""
    from bot.telegram_api import download_file
    from financeiro.importar import parse_pdf_nubank, save_temp_pdf
    from config import get_supabase_user_uuid
    from db.supabase_client import get_client
    import os

    pdf_bytes = download_file(file_id)
    if not pdf_bytes:
        return "Nao consegui baixar o arquivo. Tente novamente."

    try:
        tmp = save_temp_pdf(pdf_bytes)
        result = parse_pdf_nubank(tmp)
        os.unlink(tmp)
    except Exception as e:
        logger.error(f"handle_pdf_extrato parse error: {e}")
        return "Nao consegui ler o PDF. Verifique se e um extrato do Nubank."

    lans = result.get("lancamentos", [])
    ents = result.get("entradas", [])
    pags = result.get("pagamentos_clientes", [])

    if not lans and not ents and not pags:
        return "Nao encontrei movimentacoes no extrato."

    from db.user_context import get_user_id
    uid = get_user_id() or get_supabase_user_uuid()

    def inserir_tudo():
        import datetime
        db = get_client()
        inseridos = 0

        for r in lans:
            db.table("lancamentos").insert({
                "user_id": uid,
                "descricao": r["descricao"],
                "valor": r["valor"],
                "categoria": r.get("categoria", "Outros"),
                "data": r["data"],
            }).execute()
            inseridos += 1

        for r in ents:
            db.table("entradas").insert({
                "user_id": uid,
                "descricao": r["descricao"],
                "valor": r["valor"],
                "tipo": "freela",
                "data": r["data"],
            }).execute()
            inseridos += 1

        for r in pags:
            # Buscar cliente_id pelo nome canônico
            clientes_res = db.table("clientes").select("id, nome").eq("user_id", uid).execute()
            cliente_id = None
            for c in (clientes_res.data or []):
                if r["cliente_nome"].lower() in c["nome"].lower() or c["nome"].lower() in r["cliente_nome"].lower():
                    cliente_id = c["id"]
                    break
            db.table("pagamentos_clientes").insert({
                "user_id": uid,
                "cliente_id": cliente_id,
                "valor": r["valor"],
                "descricao": r["descricao"],
                "data": r["data"],
            }).execute()
            inseridos += 1

        return f"Importados {inseridos} registros com sucesso!"

    # Preview
    total_itens = len(lans) + len(ents) + len(pags)
    linhas = [f"📄 *Extrato — {total_itens} movimentacoes identificadas*\n"]

    if lans:
        total_s = sum(r["valor"] for r in lans)
        linhas.append(f"💸 *Gastos ({len(lans)}):* {fmt_moeda(total_s)}")
        for r in lans[:8]:
            linhas.append(f"  • {r['data'][8:]}/{r['data'][5:7]} {r['descricao']} — {fmt_moeda(r['valor'])}")
        if len(lans) > 8:
            linhas.append(f"  _... e mais {len(lans)-8} gastos_")

    if pags:
        total_p = sum(r["valor"] for r in pags)
        linhas.append(f"\n🤝 *Pagamentos de clientes ({len(pags)}):* {fmt_moeda(total_p)}")
        for r in pags:
            linhas.append(f"  • {r['data'][8:]}/{r['data'][5:7]} {r['cliente_nome']} — {fmt_moeda(r['valor'])}")

    if ents:
        total_e = sum(r["valor"] for r in ents)
        linhas.append(f"\n💰 *Outras entradas ({len(ents)}):* {fmt_moeda(total_e)}")
        for r in ents:
            linhas.append(f"  • {r['data'][8:]}/{r['data'][5:7]} {r['descricao']} — {fmt_moeda(r['valor'])}")

    linhas.append("\nResponda *sim* para importar tudo ou *nao* para cancelar.")
    return _queue(user_id, inserir_tudo, "\n".join(linhas))


def handle_message(user_id: int, texto: str, ocr_data: dict = None,
                   authorized: bool = False) -> str:
    if not authorized and not is_authorized(user_id):
        return ""

    texto = texto.strip()
    if not texto and not ocr_data:
        return ""

    if user_id in _pending:
        return _resolve(user_id, texto)

    # Foto com OCR — montar parsed diretamente
    if texto == "__ocr__" and ocr_data:
        if not ocr_data.get("valor"):
            return "Nao consegui ler o valor. Quanto foi e onde?"
        parsed = {
            "intencao": "inserir_lancamento",
            "valor": ocr_data.get("valor"),
            "descricao": ocr_data.get("descricao", "Comprovante"),
            "categoria": ocr_data.get("categoria", "Outros"),
            "data": date.today().strftime("%d/%m/%Y"),
            "confianca": ocr_data.get("confianca", "media"),
            "confirmacao_necessaria": ocr_data.get("confianca") != "alta",
        }
        return _route(user_id, parsed, "inserir_lancamento")

    # Comando especial para limpar histórico
    if texto.lower() in ("/reset", "/limpar", "reset", "limpar contexto"):
        clear_history(user_id)
        return "Contexto limpo. Comecando nova conversa!"

    try:
        parsed = parse_mensagem(texto, user_id=user_id)
    except Exception as e:
        logger.error(f"Parser error user={user_id}: {e}")
        return "Nao entendi. Pode reformular?"

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

    elif intencao == "adicionar_fixa":
        nome = parsed.get("descricao") or parsed.get("tarefa_nome")
        valor = parsed.get("valor") or 0
        if not nome:
            return "Qual o nome da conta fixa? Ex: 'adicionar fixa Academia 150'"
        from config import get_supabase_user_uuid
        uid = get_supabase_user_uuid()
        if not uid:
            return "Configure SUPABASE_USER_UUID nas variáveis do HF Space."
        financeiro_fixas.adicionar(nome, valor, uid)
        return f"Conta fixa adicionada: *{nome}* — {fmt_moeda(valor)}"

    elif intencao == "atualizar_fixa":
        nome_busca = (parsed.get("descricao") or "").strip()
        valor = parsed.get("valor")
        if not nome_busca:
            return "Qual conta fixa atualizar? Ex: 'aluguel agora é 1500'"
        if not valor:
            return "Qual o novo valor?"
        from config import get_supabase_user_uuid
        uid = get_supabase_user_uuid()
        if not uid:
            return "Configure SUPABASE_USER_UUID nas variáveis do HF Space."
        result = financeiro_fixas.atualizar_por_nome(nome_busca, valor, uid)
        if not result:
            return f"Conta '*{nome_busca}*' não encontrada. Verifique o nome ou adicione primeiro."
        return f"Conta fixa atualizada: *{result['nome']}* → {fmt_moeda(valor)}"

    elif intencao == "deletar_fixa":
        nome_busca = (parsed.get("descricao") or "").strip()
        if not nome_busca:
            return "Qual conta fixa excluir?"
        from config import get_supabase_user_uuid
        uid = get_supabase_user_uuid()
        if not uid:
            return "Configure SUPABASE_USER_UUID nas variáveis do HF Space."

        def do():
            r = financeiro_fixas.deletar_por_nome(nome_busca, uid)
            if not r:
                return f"Conta '*{nome_busca}*' não encontrada."
            return f"Conta fixa excluída: *{r['nome']}*"

        return _queue(user_id, do, f"Excluir conta fixa '*{nome_busca}*'?\n\nResponda *sim* para confirmar.")

    elif intencao == "consulta_fixas":
        from config import get_supabase_user_uuid
        uid = get_supabase_user_uuid()
        contas = financeiro_fixas.listar(uid)
        if not contas:
            return "Nenhuma conta fixa cadastrada."
        total = sum(float(c["valor"] or 0) for c in contas)
        linhas = ["Contas fixas ativas:\n"]
        for c in contas:
            linhas.append(f"• {c['nome']}: {fmt_moeda(c['valor'])}")
        linhas.append(f"\nTotal: {fmt_moeda(total)}")
        return "\n".join(linhas)

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

    # ── WORK — TAREFAS ────────────────────────────────────────────────────
    elif intencao == "nova_tarefa":
        nome = parsed.get("tarefa_nome") or parsed.get("descricao")
        if not nome:
            return "Qual o nome da tarefa?"
        cliente_nome = parsed.get("cliente")
        data_limite = None
        if parsed.get("data_limite"):
            try:
                d, m, y = parsed["data_limite"].split("/")
                data_limite = f"{y}-{m}-{d}"
            except Exception:
                pass

        cliente_id = None
        if cliente_nome:
            c = work_clientes.get_by_nome(cliente_nome)
            if c:
                cliente_id = c["id"]

        work_tarefas.criar(nome, cliente_id=cliente_id, data_limite=data_limite)
        msg = f"Tarefa criada: *{nome}*"
        if cliente_nome:
            msg += f" — {cliente_nome}"
        if data_limite:
            msg += f"\nPrazo: {parsed['data_limite']}"
        return msg

    elif intencao == "consulta_pendentes":
        cliente_nome = parsed.get("cliente")
        pendentes = work_tarefas.listar_pendentes(cliente_nome)
        if not pendentes:
            filtro = f" de *{cliente_nome}*" if cliente_nome else ""
            return f"Nenhuma tarefa pendente{filtro}."
        linhas = [f"Tarefas pendentes{' — ' + cliente_nome if cliente_nome else ''}:\n"]
        for i, t in enumerate(pendentes[:10], 1):
            cliente = (t.get("clientes") or {}).get("nome", "")
            prazo = f" (ate {t['data_limite']})" if t.get("data_limite") else ""
            linhas.append(f"{i}. {t['nome']}{' — ' + cliente if cliente else ''}{prazo}")
        return "\n".join(linhas)

    elif intencao == "concluir_tarefa":
        nome_busca = parsed.get("tarefa_nome") or parsed.get("descricao") or ""
        pendentes = work_tarefas.listar_pendentes()
        if not pendentes:
            return "Nenhuma tarefa pendente."
        # Tenta match por nome
        match = next((t for t in pendentes if nome_busca.lower() in t["nome"].lower()), None)
        if match:
            work_tarefas.concluir(match["id"])
            return f"Tarefa concluida: *{match['nome']}*"
        # Lista numerada para escolher
        linhas = ["Qual tarefa concluir? Responda com o numero:\n"]
        for i, t in enumerate(pendentes[:8], 1):
            linhas.append(f"{i}. {t['nome']}")
        _pending[user_id] = {
            "action": None,
            "ts": time.time(),
            "type": "concluir_tarefa",
            "items": pendentes[:8],
        }
        return "\n".join(linhas)

    elif intencao == "deletar_tarefa":
        nome_busca = parsed.get("tarefa_nome") or parsed.get("descricao") or ""
        pendentes = work_tarefas.listar_pendentes()
        match = next((t for t in pendentes if nome_busca.lower() in t["nome"].lower()), None)
        if not match:
            return "Tarefa nao encontrada. Verifique os pendentes."

        def do():
            work_tarefas.deletar(match["id"])
            return f"Tarefa excluida: *{match['nome']}*"

        return _queue(user_id, do,
            f"Excluir tarefa?\n*{match['nome']}*\n\nResponda *sim* para confirmar.")

    # ── WORK — PAGAMENTOS ─────────────────────────────────────────────────
    elif intencao == "registrar_pagamento_cliente":
        cliente_nome = parsed.get("cliente")
        valor = parsed.get("valor")
        if not cliente_nome:
            return "Qual cliente pagou?"
        if not valor:
            return f"Qual o valor do pagamento de *{cliente_nome}*?"

        def do():
            descricao = parsed.get("descricao") or f"Pagamento {cliente_nome}"
            # INSERT entrada financeira
            entrada = entradas.inserir(descricao, valor, tipo="freela")
            entrada_id = entrada["id"] if entrada else None
            # INSERT pagamento_cliente linkado
            work_clientes.registrar_pagamento(
                cliente_nome, valor, descricao=descricao, entrada_id=entrada_id
            )
            return (f"Recebido de *{cliente_nome}*: {fmt_moeda(valor)}\n"
                    f"Entrada registrada no financeiro.")

        if parsed.get("confirmacao_necessaria") or valor > 500:
            return _queue(user_id, do,
                msg_confirmacao_registro(f"Receber de {cliente_nome}", valor))
        return do()

    elif intencao == "consulta_pagamentos_cliente":
        cliente_nome = parsed.get("cliente")
        if not cliente_nome:
            return "Qual cliente?"
        total = work_clientes.total_recebido(cliente_nome)
        return f"Total recebido de *{cliente_nome}*: {fmt_moeda(total)}"

    else:
        logger.warning(f"Intencao nao mapeada: {intencao!r}")
        return "Nao entendi bem. Pode reformular?"
