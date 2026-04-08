"""
Importação de extrato bancário PDF (Nubank).
Usa pdfplumber para extrair texto + Groq LLM para categorizar.
"""
import json
import logging
import os
import tempfile
from datetime import date

logger = logging.getLogger(__name__)


def parse_pdf_nubank(filepath: str) -> dict:
    """
    Lê PDF do Nubank e retorna {'lancamentos': [...], 'entradas': [...]}.
    Usa LLM para extração + categorização automática.
    """
    import pdfplumber
    from groq import Groq

    with pdfplumber.open(filepath) as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)

    if not text.strip():
        raise ValueError("Não foi possível extrair texto do PDF.")

    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    prompt = f"""Analise este extrato bancário do Nubank e retorne APENAS um JSON válido, sem markdown.

Extrato:
{text}

Schema de retorno:
{{
  "lancamentos": [
    {{"data": "YYYY-MM-DD", "descricao": "Nome limpo do estabelecimento", "valor": 0.00, "categoria": "Alimentação|Transporte|Lazer|Vestuário|Saúde|Educação|Outros"}}
  ],
  "entradas": [
    {{"data": "YYYY-MM-DD", "descricao": "Descrição da entrada", "valor": 0.00}}
  ]
}}

Regras:
- lancamentos = saídas: compras no débito, transferências enviadas, pagamentos
- entradas = transferências recebidas pelo Pix
- Ignorar: linhas "Total de entradas/saídas", "Saldo", "Rendimento", dados de banco/agência/conta, linhas de rodapé
- Converter datas: "01 ABR 2026" → "2026-04-01"
- Converter valores: "1.442,20" → 1442.20
- Limpar descrições: "HIROTA EM CASA" → "Hirota em Casa", remover CPF/CNPJ, dados bancários
- Categorias automáticas: Uber/99/taxi → Transporte; mercado/supermercado/ifood/restaurante/comida/hirota → Alimentação; farmácia/drogaria → Saúde; netflix/spotify/amazon/jogo → Lazer; academia/smart fit → Saúde
- Transferências enviadas para pessoas físicas = lancamento categoria Outros (pode ser aluguel, empréstimo etc)
"""

    resp = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=3000,
    )

    content = resp.choices[0].message.content.strip()
    if content.startswith("```"):
        lines = [l for l in content.split("\n") if not l.startswith("```")]
        content = "\n".join(lines).strip()

    result = json.loads(content)

    # Garantir estrutura mínima
    result.setdefault("lancamentos", [])
    result.setdefault("entradas", [])

    logger.info(f"parse_pdf_nubank: {len(result['lancamentos'])} lançamentos, {len(result['entradas'])} entradas")
    return result


def save_temp_pdf(file_bytes: bytes) -> str:
    """Salva bytes em arquivo temporário e retorna o path."""
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    tmp.write(file_bytes)
    tmp.close()
    return tmp.name
