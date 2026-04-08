import os
import logging
import requests

logger = logging.getLogger(__name__)


def send_message(chat_id: int, text: str, parse_mode: str = "Markdown") -> bool:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        logger.warning("TELEGRAM_BOT_TOKEN not set — skipping send")
        return False
    try:
        resp = requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": text, "parse_mode": parse_mode},
            timeout=10,
        )
        resp.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"send_message error: {e}")
        return False


def download_file(file_id: str) -> bytes | None:
    """Baixa arquivo do Telegram e retorna os bytes."""
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        return None
    try:
        # Pegar o file_path
        r = requests.get(f"https://api.telegram.org/bot{token}/getFile", params={"file_id": file_id}, timeout=10)
        r.raise_for_status()
        file_path = r.json()["result"]["file_path"]
        # Baixar o arquivo
        r2 = requests.get(f"https://api.telegram.org/file/bot{token}/{file_path}", timeout=30)
        r2.raise_for_status()
        return r2.content
    except Exception as e:
        logger.error(f"download_file error: {e}")
        return None


def transcrever_audio(audio_bytes: bytes, filename: str = "audio.ogg") -> str | None:
    """Transcreve áudio usando Groq Whisper. Retorna o texto ou None em caso de erro."""
    import os
    import io
    from groq import Groq

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.warning("GROQ_API_KEY not set — skipping transcription")
        return None
    try:
        client = Groq(api_key=api_key)
        transcription = client.audio.transcriptions.create(
            model="whisper-large-v3",
            file=(filename, io.BytesIO(audio_bytes)),
            language="pt",
        )
        return transcription.text.strip() or None
    except Exception as e:
        logger.error(f"transcrever_audio error: {e}")
        return None


def set_webhook(webhook_url: str) -> bool:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        return False
    try:
        resp = requests.post(
            f"https://api.telegram.org/bot{token}/setWebhook",
            json={"url": webhook_url},
            timeout=10,
        )
        result = resp.json()
        logger.info(f"setWebhook: {result}")
        return result.get("ok", False)
    except Exception as e:
        logger.error(f"set_webhook error: {e}")
        return False
