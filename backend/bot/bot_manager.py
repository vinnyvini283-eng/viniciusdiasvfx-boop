"""
Gerenciamento de bots por usuário — Fase 4 Multi-tenant.

Responsabilidades:
- Validar token do Telegram (getMe)
- Registrar webhook: /webhook/<bot_token>
- CRUD na tabela user_bots
- Capturar telegram_user_id no /start
- Verificar JWT do frontend para autenticar chamadas à API
"""
import logging
import os
import requests

from db.supabase_client import get_client

logger = logging.getLogger(__name__)

BACKEND_URL = os.getenv("TELEGRAM_WEBHOOK_URL", "").replace("/webhook", "")


# ── Autenticação JWT ──────────────────────────────────────────────────────────

def verify_jwt(token: str) -> str | None:
    """
    Verifica o JWT do Supabase e retorna o user_id (sub) se válido.
    Usa o cliente service key para validar.
    """
    try:
        db = get_client()
        response = db.auth.get_user(token)
        return response.user.id if response.user else None
    except Exception as e:
        logger.warning(f"verify_jwt failed: {e}")
        return None


# ── Telegram ──────────────────────────────────────────────────────────────────

def validar_token(bot_token: str) -> dict | None:
    """
    Chama getMe para validar o token e retornar info do bot.
    Retorna {id, username, first_name} ou None se inválido.
    """
    try:
        resp = requests.get(
            f"https://api.telegram.org/bot{bot_token}/getMe",
            timeout=10
        )
        data = resp.json()
        if data.get("ok"):
            return data["result"]
        return None
    except Exception as e:
        logger.error(f"validar_token error: {e}")
        return None


def registrar_webhook(bot_token: str) -> bool:
    """Registra o webhook multi-tenant para o bot_token."""
    webhook_url = f"{BACKEND_URL}/webhook/{bot_token}"
    if not BACKEND_URL or BACKEND_URL == "/webhook".replace("/webhook", ""):
        # Fallback: construir URL base a partir da variável padrão
        base = os.getenv("TELEGRAM_WEBHOOK_URL", "").rsplit("/", 1)[0]
        webhook_url = f"{base}/webhook/{bot_token}"
    try:
        resp = requests.post(
            f"https://api.telegram.org/bot{bot_token}/setWebhook",
            json={"url": webhook_url, "allowed_updates": ["message", "edited_message"]},
            timeout=10
        )
        ok = resp.json().get("ok", False)
        logger.info(f"registrar_webhook {bot_token[:10]}... → {webhook_url}: ok={ok}")
        return ok
    except Exception as e:
        logger.error(f"registrar_webhook error: {e}")
        return False


# ── CRUD user_bots ────────────────────────────────────────────────────────────

def get_bot_config(user_id: str) -> dict | None:
    """Retorna a configuração do bot para o user_id."""
    try:
        db = get_client()
        result = (db.table("user_bots")
                    .select("*")
                    .eq("user_id", user_id)
                    .limit(1)
                    .execute())
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"get_bot_config error: {e}")
        return None


def get_user_by_token(bot_token: str) -> dict | None:
    """Busca user_id e telegram_user_id pelo bot_token."""
    try:
        db = get_client()
        result = (db.table("user_bots")
                    .select("user_id, telegram_user_id")
                    .eq("bot_token", bot_token)
                    .limit(1)
                    .execute())
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"get_user_by_token error: {e}")
        return None


def setup_bot(user_id: str, bot_token: str) -> dict:
    """
    Valida o token, registra o webhook e salva em user_bots.
    Retorna {"ok": bool, "error": str | None, "bot_username": str | None}
    """
    # 1. Validar token
    bot_info = validar_token(bot_token)
    if not bot_info:
        return {"ok": False, "error": "Token inválido. Verifique e tente novamente."}

    # 2. Registrar webhook
    webhook_ok = registrar_webhook(bot_token)
    if not webhook_ok:
        return {"ok": False, "error": "Não foi possível registrar o webhook. Tente novamente."}

    # 3. Salvar / atualizar user_bots
    try:
        db = get_client()
        payload = {
            "user_id": user_id,
            "bot_token": bot_token,
            "bot_username": bot_info.get("username"),
            "webhook_ativo": True,
        }
        existing = get_bot_config(user_id)
        if existing:
            db.table("user_bots").update(payload).eq("user_id", user_id).execute()
        else:
            db.table("user_bots").insert(payload).execute()
        return {"ok": True, "bot_username": bot_info.get("username")}
    except Exception as e:
        logger.error(f"setup_bot save error: {e}")
        return {"ok": False, "error": "Erro ao salvar configuração."}


def desconectar_bot(user_id: str) -> bool:
    """Remove a configuração do bot para o user_id."""
    try:
        db = get_client()
        config = get_bot_config(user_id)
        if not config:
            return True
        # Remover webhook do Telegram
        try:
            requests.post(
                f"https://api.telegram.org/bot{config['bot_token']}/deleteWebhook",
                timeout=5
            )
        except Exception:
            pass
        db.table("user_bots").delete().eq("user_id", user_id).execute()
        return True
    except Exception as e:
        logger.error(f"desconectar_bot error: {e}")
        return False


def capturar_telegram_user_id(bot_token: str, telegram_user_id: int) -> bool:
    """
    Salva o telegram_user_id em user_bots quando usuário manda /start.
    Chamado na primeira interação após ativação.
    """
    try:
        db = get_client()
        result = (db.table("user_bots")
                    .update({"telegram_user_id": telegram_user_id})
                    .eq("bot_token", bot_token)
                    .is_("telegram_user_id", "null")
                    .execute())
        return bool(result.data)
    except Exception as e:
        logger.error(f"capturar_telegram_user_id error: {e}")
        return False


def testar_conexao(user_id: str) -> dict:
    """Testa a conexão com o Telegram para o bot do usuário."""
    config = get_bot_config(user_id)
    if not config:
        return {"ok": False, "ativo": False, "error": "Bot não configurado."}
    bot_info = validar_token(config["bot_token"])
    if not bot_info:
        return {"ok": False, "ativo": False, "error": "Token inválido ou bot deletado."}
    return {
        "ok": True,
        "ativo": config.get("webhook_ativo", False),
        "bot_username": bot_info.get("username"),
        "telegram_user_id": config.get("telegram_user_id"),
    }
