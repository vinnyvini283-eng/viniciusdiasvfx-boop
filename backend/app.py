# VinBot v1.2
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

    # Áudio / Voz → transcrever e processar como texto
    voice = message.get("voice") or message.get("audio")
    if voice and not text:
        from config import is_authorized
        if not is_authorized(int(user_id)):
            return jsonify({"ok": True})
        from bot.telegram_api import download_file, transcrever_audio
        file_id = voice.get("file_id")
        try:
            audio_bytes = download_file(file_id)
            if not audio_bytes:
                send_message(int(chat_id), "Nao consegui baixar o audio. Tente novamente.")
                return jsonify({"ok": True})
            texto_transcrito = transcrever_audio(audio_bytes)
            if not texto_transcrito:
                send_message(int(chat_id), "Nao entendi o audio. Pode repetir ou digitar?")
                return jsonify({"ok": True})
            logger.info(f"Audio transcrito user={user_id}: {texto_transcrito!r}")
            send_message(int(chat_id), f"_Entendi: \"{texto_transcrito}\"_")
            resposta = handle_message(int(user_id), texto_transcrito)
            if resposta:
                send_message(int(chat_id), resposta)
        except Exception as e:
            logger.error(f"Voice error: {e}", exc_info=True)
            send_message(int(chat_id), "Erro ao processar o audio. Tente digitar.")
        return jsonify({"ok": True})

    # PDF → importar extrato
    document = message.get("document")
    if document and not text:
        from config import is_authorized
        if not is_authorized(int(user_id)):
            return jsonify({"ok": True})
        mime = document.get("mime_type", "")
        if mime == "application/pdf":
            from bot.handlers import handle_pdf_extrato
            try:
                resposta = handle_pdf_extrato(int(user_id), document["file_id"])
                if resposta:
                    send_message(int(chat_id), resposta)
            except Exception as e:
                logger.error(f"PDF extrato error: {e}", exc_info=True)
                send_message(int(chat_id), "Erro ao processar o PDF. Tente novamente.")
        else:
            send_message(int(chat_id), "Por enquanto so processo extratos em PDF.")
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
        import os
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
