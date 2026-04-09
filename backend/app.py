# VinBot v2.0 — Multi-tenant
import dns_fix  # must be first — patches socket DNS to use 8.8.8.8
import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS

from bot.handlers import handle_message
from bot.telegram_api import send_message, set_webhook
from bot.scheduler import start_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["https://vinbot-dashboard.vercel.app", "http://localhost:5173"])

start_scheduler()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_jwt() -> str | None:
    auth = request.headers.get("Authorization", "")
    return auth.removeprefix("Bearer ").strip() or None


def _process_telegram_update(data: dict, user_id_override: int | None = None,
                              supabase_uid: str | None = None,
                              bot_token: str | None = None) -> None:
    """
    Processa um update do Telegram.
    - user_id_override: Telegram user_id (para multi-tenant; None = usa o do payload)
    - supabase_uid: UUID do usuário no Supabase (define user_context)
    - bot_token: token do bot (para capturar telegram_user_id no /start)
    """
    from db.user_context import set_user_id, clear

    message = data.get("message") or data.get("edited_message")
    if not message:
        return

    tg_user_id = message.get("from", {}).get("id")
    chat_id = message.get("chat", {}).get("id")
    text = (message.get("text") or "").strip()
    photos = message.get("photo")

    if not tg_user_id or not chat_id:
        return

    # Define contexto de usuário para todos os DB calls neste request
    if supabase_uid:
        set_user_id(supabase_uid)

    try:
        authorized = supabase_uid is not None  # multi-tenant: já autenticado via bot_token

        # /start — captura telegram_user_id e vincula à conta
        if text == "/start" and bot_token and supabase_uid:
            from bot.bot_manager import capturar_telegram_user_id
            capturar_telegram_user_id(bot_token, int(tg_user_id))
            send_message(int(chat_id),
                "👋 *Olá! Seu assistente pessoal está ativo.*\n\n"
                "Você já pode usar todos os comandos. Experimente:\n"
                "• \"gastei 50 no mercado\"\n"
                "• \"qual meu saldo?\"\n"
                "• \"nova tarefa: relatório até sexta\"")
            return

        # Áudio / Voz
        voice = message.get("voice") or message.get("audio")
        if voice and not text:
            from bot.telegram_api import download_file, transcrever_audio
            if not authorized and not _is_auth(int(tg_user_id)):
                return
            file_id = voice.get("file_id")
            try:
                audio_bytes = download_file(file_id)
                if not audio_bytes:
                    send_message(int(chat_id), "Nao consegui baixar o audio. Tente novamente.")
                    return
                texto_transcrito = transcrever_audio(audio_bytes)
                if not texto_transcrito:
                    send_message(int(chat_id), "Nao entendi o audio. Pode repetir ou digitar?")
                    return
                logger.info(f"Audio transcrito user={tg_user_id}: {texto_transcrito!r}")
                send_message(int(chat_id), f"_Entendi: \"{texto_transcrito}\"_")
                resposta = handle_message(int(tg_user_id), texto_transcrito, authorized=authorized)
                if resposta:
                    send_message(int(chat_id), resposta)
            except Exception as e:
                logger.error(f"Voice error: {e}", exc_info=True)
                send_message(int(chat_id), "Erro ao processar o audio. Tente digitar.")
            return

        # PDF → importar extrato
        document = message.get("document")
        if document and not text:
            if not authorized and not _is_auth(int(tg_user_id)):
                return
            mime = document.get("mime_type", "")
            if mime == "application/pdf":
                from bot.handlers import handle_pdf_extrato
                try:
                    resposta = handle_pdf_extrato(int(tg_user_id), document["file_id"])
                    if resposta:
                        send_message(int(chat_id), resposta)
                except Exception as e:
                    logger.error(f"PDF extrato error: {e}", exc_info=True)
                    send_message(int(chat_id), "Erro ao processar o PDF. Tente novamente.")
            else:
                send_message(int(chat_id), "Por enquanto so processo extratos em PDF.")
            return

        # Foto → OCR
        if photos and not text:
            if not authorized and not _is_auth(int(tg_user_id)):
                return
            from bot.ocr import processar_foto
            file_id = photos[-1]["file_id"]
            try:
                ocr = processar_foto(file_id)
                resposta = handle_message(int(tg_user_id), "__ocr__",
                                          ocr_data=ocr, authorized=authorized)
                if resposta:
                    send_message(int(chat_id), resposta)
            except Exception as e:
                logger.error(f"OCR error: {e}", exc_info=True)
                send_message(int(chat_id), "Nao consegui ler o comprovante. Qual o valor e onde foi?")
            return

        if not text:
            return

        try:
            resposta = handle_message(int(tg_user_id), text, authorized=authorized)
            if resposta:
                send_message(int(chat_id), resposta)
        except Exception as e:
            logger.error(f"handle_message error: {e}", exc_info=True)
            try:
                send_message(int(chat_id), "Serviço temporariamente indisponível. Tente em instantes.")
            except Exception:
                pass
    finally:
        if supabase_uid:
            clear()


def _is_auth(tg_user_id: int) -> bool:
    from config import is_authorized
    return is_authorized(tg_user_id)


# ── Rotas ─────────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "vinbot", "version": "2.0"})


@app.route("/webhook", methods=["POST"])
def webhook_legacy():
    """Webhook legado — compatibilidade com setup single-user (Vinicius)."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"ok": True})
    from config import is_authorized
    message = data.get("message") or data.get("edited_message")
    if not message:
        return jsonify({"ok": True})
    user_id = message.get("from", {}).get("id")
    if user_id and not is_authorized(int(user_id)):
        return jsonify({"ok": True})
    _process_telegram_update(data)
    return jsonify({"ok": True})


@app.route("/webhook/<bot_token>", methods=["POST"])
def webhook_multitenant(bot_token: str):
    """Webhook multi-tenant — cada usuário tem sua própria URL com seu bot_token."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"ok": True})

    from bot.bot_manager import get_user_by_token
    user_info = get_user_by_token(bot_token)
    if not user_info:
        logger.warning(f"webhook_multitenant: token não encontrado {bot_token[:10]}...")
        return jsonify({"ok": True}), 404

    supabase_uid = user_info["user_id"]
    registered_tg_id = user_info.get("telegram_user_id")

    # Segurança: só aceita mensagens do telegram_user_id registrado
    # (exceto se ainda não foi registrado — /start)
    message = data.get("message") or data.get("edited_message")
    if message and registered_tg_id:
        tg_user_id = message.get("from", {}).get("id")
        text = (message.get("text") or "").strip()
        if tg_user_id and int(tg_user_id) != int(registered_tg_id) and text != "/start":
            logger.warning(f"webhook_multitenant: telegram_user_id mismatch")
            return jsonify({"ok": True}), 403

    _process_telegram_update(data, supabase_uid=supabase_uid, bot_token=bot_token)
    return jsonify({"ok": True})


# ── API — Bot Setup ───────────────────────────────────────────────────────────

@app.route("/api/bot/setup", methods=["POST", "OPTIONS"])
def api_bot_setup():
    if request.method == "OPTIONS":
        return jsonify({"ok": True})
    jwt = _get_jwt()
    if not jwt:
        return jsonify({"error": "Não autenticado."}), 401

    from bot.bot_manager import verify_jwt, setup_bot
    user_id = verify_jwt(jwt)
    if not user_id:
        return jsonify({"error": "Token inválido."}), 401

    body = request.get_json(silent=True) or {}
    bot_token = (body.get("bot_token") or "").strip()
    if not bot_token:
        return jsonify({"error": "bot_token é obrigatório."}), 400

    result = setup_bot(user_id, bot_token)
    if result["ok"]:
        return jsonify(result)
    return jsonify(result), 400


@app.route("/api/bot/status", methods=["GET"])
def api_bot_status():
    jwt = _get_jwt()
    if not jwt:
        return jsonify({"error": "Não autenticado."}), 401

    from bot.bot_manager import verify_jwt, testar_conexao
    user_id = verify_jwt(jwt)
    if not user_id:
        return jsonify({"error": "Token inválido."}), 401

    return jsonify(testar_conexao(user_id))


@app.route("/api/bot/disconnect", methods=["DELETE", "OPTIONS"])
def api_bot_disconnect():
    if request.method == "OPTIONS":
        return jsonify({"ok": True})
    jwt = _get_jwt()
    if not jwt:
        return jsonify({"error": "Não autenticado."}), 401

    from bot.bot_manager import verify_jwt, desconectar_bot
    user_id = verify_jwt(jwt)
    if not user_id:
        return jsonify({"error": "Token inválido."}), 401

    ok = desconectar_bot(user_id)
    return jsonify({"ok": ok})


# ── API — Extrato ─────────────────────────────────────────────────────────────

@app.route("/importar-extrato", methods=["POST", "OPTIONS"])
def importar_extrato():
    if request.method == "OPTIONS":
        return jsonify({"ok": True})
    if "file" not in request.files:
        return jsonify({"error": "Envie o PDF no campo 'file'"}), 400
    f = request.files["file"]
    if not f.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Apenas arquivos PDF são suportados"}), 400
    try:
        from financeiro.importar import parse_pdf_nubank, save_temp_pdf
        tmp = save_temp_pdf(f.read())
        result = parse_pdf_nubank(tmp)
        os.unlink(tmp)
        return jsonify(result)
    except Exception as e:
        logger.error(f"importar_extrato error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/set-webhook", methods=["POST"])
def register_webhook():
    url = os.getenv("TELEGRAM_WEBHOOK_URL")
    if not url:
        return jsonify({"error": "TELEGRAM_WEBHOOK_URL not set"}), 400
    ok = set_webhook(url)
    return jsonify({"ok": ok, "url": url})


if __name__ == "__main__":
    webhook_url = os.getenv("TELEGRAM_WEBHOOK_URL")
    if webhook_url:
        set_webhook(webhook_url)
    port = int(os.getenv("PORT", 7860))
    app.run(host="0.0.0.0", port=port, debug=False)
