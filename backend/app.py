# VinBot v1.2
import dns_fix  # must be first — patches socket DNS to use 8.8.8.8
import os
import logging
from flask import Flask, request, jsonify

from bot.handlers import handle_message
from bot.telegram_api import send_message, set_webhook
from bot.scheduler import start_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Scheduler deve iniciar quando Gunicorn importa o módulo (não só em __main__)
start_scheduler()


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "vinbot"})




@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"ok": True})

    message = data.get("message") or data.get("edited_message")
    if not message:
        return jsonify({"ok": True})

    user_id = message.get("from", {}).get("id")
    chat_id = message.get("chat", {}).get("id")
    text = (message.get("text") or "").strip()
    photos = message.get("photo")

    if not user_id or not chat_id:
        return jsonify({"ok": True})

    # Foto → OCR
    if photos and not text:
        from bot.ocr import processar_foto
        from config import is_authorized
        if not is_authorized(int(user_id)):
            return jsonify({"ok": True})
        file_id = photos[-1]["file_id"]  # maior resolução
        try:
            ocr = processar_foto(file_id)
            resposta = handle_message(int(user_id), "__ocr__", ocr_data=ocr)
            if resposta:
                send_message(int(chat_id), resposta)
        except Exception as e:
            logger.error(f"OCR error: {e}", exc_info=True)
            send_message(int(chat_id), "Nao consegui ler o comprovante. Qual o valor e onde foi?")
        return jsonify({"ok": True})

    if not text:
        return jsonify({"ok": True})

    try:
        resposta = handle_message(int(user_id), text)
        if resposta:
            send_message(int(chat_id), resposta)
    except Exception as e:
        logger.error(f"Webhook error: {e}", exc_info=True)
        try:
            send_message(int(chat_id), "Serviço temporariamente indisponível. Tente em instantes.")
        except Exception:
            pass

    return jsonify({"ok": True})


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
