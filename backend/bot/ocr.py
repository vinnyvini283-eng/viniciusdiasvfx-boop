"""OCR de comprovantes via Groq Vision."""
import os
import json
import base64
import logging
import requests

logger = logging.getLogger(__name__)


def _get_file_bytes(file_id: str) -> bytes | None:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        return None
    try:
        r = requests.get(
            f"https://api.telegram.org/bot{token}/getFile",
            params={"file_id": file_id}, timeout=10,
        )
        path = r.json()["result"]["file_path"]
        r2 = requests.get(
            f"https://api.telegram.org/file/bot{token}/{path}", timeout=15,
        )
        return r2.content
    except Exception as e:
        logger.error(f"download file error: {e}")
        return None


def processar_foto(file_id: str) -> dict:
    """Faz OCR via Groq Vision. Retorna: {valor, descricao, categoria, confianca}."""
    from groq import Groq

    img_bytes = _get_file_bytes(file_id)
    if not img_bytes:
        return {"valor": None, "descricao": "Comprovante", "categoria": "Outros", "confianca": "baixa"}

    b64 = base64.b64encode(img_bytes).decode()
    groq = Groq(api_key=os.getenv("GROQ_API_KEY"))

    try:
        resp = groq.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{"role": "user", "content": [
                {"type": "text", "text": (
                    "Analise este comprovante e retorne APENAS JSON valido sem markdown: "
                    '{"valor": float_ou_null, "descricao": "estabelecimento", '
                    '"categoria": "Alimentacao|Transporte|Lazer|Vestuario|Saude|Educacao|Outros", '
                    '"confianca": "alta|media|baixa"}'
                )},
                {"type": "image_url",
                 "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
            ]}],
            max_tokens=150,
        )
        raw = resp.choices[0].message.content.strip().replace("```json","").replace("```","").strip()
        return json.loads(raw)
    except Exception as e:
        logger.error(f"OCR error: {e}")
        return {"valor": None, "descricao": "Comprovante", "categoria": "Outros", "confianca": "baixa"}
