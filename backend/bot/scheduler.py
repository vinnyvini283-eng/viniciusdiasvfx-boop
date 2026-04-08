import logging
import os
from datetime import date

from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger(__name__)
_scheduler: BackgroundScheduler | None = None


def _chat_id() -> int | None:
    ids = [u.strip() for u in os.getenv("ALLOWED_USER_IDS", "").split(",") if u.strip()]
    return int(ids[0]) if ids else None


def _fmt(v: float) -> str:
    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def lembrete_tarefas_hoje():
    """Disparo diário às 07h: tarefas com data_limite = hoje que não foram concluídas."""
    from bot.telegram_api import send_message
    from db.supabase_client import get_client

    chat_id = _chat_id()
    if not chat_id:
        return
    try:
        db = get_client()
        hoje = date.today()
        result = (db.table("tarefas")
                    .select("nome, data_limite, clientes(nome)")
                    .eq("feito", False)
                    .eq("data_limite", str(hoje))
                    .execute())
        atrasadas = (db.table("tarefas")
                       .select("nome, data_limite, clientes(nome)")
                       .eq("feito", False)
                       .lt("data_limite", str(hoje))
                       .execute())

        if not result.data and not (atrasadas.data or []):
            return

        linhas = [f"🌅 *Bom dia! Agenda de hoje ({hoje.strftime('%d/%m')})*\n"]

        if result.data:
            linhas.append("📌 *Vence hoje:*")
            for t in result.data:
                cliente = (t.get("clientes") or {}).get("nome", "")
                prefix = f"{cliente}: " if cliente else ""
                linhas.append(f"  • {prefix}{t['nome']}")

        if atrasadas.data:
            linhas.append("\n⚠️ *Atrasadas:*")
            for t in atrasadas.data:
                cliente = (t.get("clientes") or {}).get("nome", "")
                prefix = f"{cliente}: " if cliente else ""
                data = t.get("data_limite", "?")
                linhas.append(f"  • {prefix}{t['nome']} (desde {data})")

        send_message(chat_id, "\n".join(linhas))
    except Exception as e:
        logger.error(f"lembrete_tarefas_hoje error: {e}")


def relatorio_semanal():
    from bot.telegram_api import send_message
    from financeiro.queries import get_gastos_semana, get_resumo_mes

    chat_id = _chat_id()
    if not chat_id:
        return
    try:
        hoje = date.today()
        gastos = get_gastos_semana()
        resumo = get_resumo_mes(hoje.month, hoje.year)
        send_message(chat_id, (
            f"📊 *Relatório Semanal*\n\n"
            f"💸 Gastos: {_fmt(gastos['total'])} ({gastos['count']} lançamentos)\n"
            f"💰 Saldo atual: {_fmt(resumo['saldo'])}"
        ))
    except Exception as e:
        logger.error(f"relatorio_semanal error: {e}")


def start_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        return
    _scheduler = BackgroundScheduler(timezone="America/Sao_Paulo")
    _scheduler.add_job(lembrete_tarefas_hoje, "cron", hour=7, minute=0)
    _scheduler.add_job(relatorio_semanal, "cron", day_of_week="mon", hour=8, minute=0)
    _scheduler.start()
    logger.info("APScheduler started")


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown()
