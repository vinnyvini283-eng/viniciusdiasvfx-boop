"""
Importação de extrato bancário PDF (Nubank).
Usa pdfplumber para extrair texto + Groq LLM para categorizar.
"""
import json
import logging
import os
import tempfile

logger = logging.getLogger(__name__)

# Aliases de clientes conhecidos para cruzamento com entradas
CLIENTES_ALIASES = {
    "cidacar": "CIDACAR",
    "cida car": "CIDACAR",
    "cida": "CIDACAR",
    "gspneus": "GSPNEUS",
    "gs pneus": "GSPNEUS",
    "aceleração vfx": "ACELERAÇÃO VFX",
    "aceleracao vfx": "ACELERAÇÃO VFX",
    "aceleração": "ACELERAÇÃO VFX",
    "vfx": "ACELERAÇÃO VFX",
    "alpha centro": "ALPHA CENTRO",
    "alpha": "ALPHA CENTRO",
    "phs": "PHS I NEGOCIOS",  # exemplo do extrato real
}


def _detectar_cliente(descricao: str) -> str | None:
    """Verifica se a descrição da entrada bate com algum cliente conhecido."""
    d = descricao.lower()
    for alias, nome in sorted(CLIENTES_ALIASES.items(), key=lambda x: -len(x[0])):
        if alias in d:
            return nome
    return None


def parse_pdf_nubank(filepath: str) -> dict:
    """
    Lê PDF do Nubank e retorna:
    {
      'lancamentos': [...],
      'entradas': [...],
      'pagamentos_clientes': [{'data', 'descricao', 'valor', 'cliente_nome'}]
    }
    Usa LLM para extração + categorização. Entradas de clientes conhecidos
    vão para pagamentos_clientes em vez de entradas.
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
    {{"data": "YYYY-MM-DD", "descricao": "Nome limpo", "valor": 0.00, "categoria": "Alimentação|Transporte|Lazer|Vestuário|Saúde|Educação|Outros"}}
  ],
  "entradas": [
    {{"data": "YYYY-MM-DD", "descricao": "Nome limpo do remetente", "valor": 0.00}}
  ]
}}

Regras:
- lancamentos = saídas: compras no débito, transferências enviadas, pagamentos
- entradas = transferências recebidas pelo Pix (qualquer valor recebido)
- Ignorar: linhas "Total de entradas/saídas", "Saldo", "Rendimento", dados de banco/agência/conta, rodapé
- Converter datas: "01 ABR 2026" → "2026-04-01"
- Converter valores: "1.442,20" → 1442.20 (sempre positivo)
- Limpar descrições: remover CPF/CNPJ, dados bancários, manter só nome da pessoa/empresa
- Categorias: Uber/99/taxi → Transporte; mercado/supermercado/ifood/restaurante/hirota → Alimentação; farmácia/drogaria → Saúde; netflix/spotify/amazon → Lazer; academia → Saúde; transferências enviadas para pessoas físicas → Outros
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
    result.setdefault("lancamentos", [])
    result.setdefault("entradas", [])

    # Separar entradas de clientes conhecidos
    entradas_normais = []
    pagamentos_clientes = []

    for e in result["entradas"]:
        cliente = _detectar_cliente(e["descricao"])
        if cliente:
            pagamentos_clientes.append({
                "data": e["data"],
                "descricao": e["descricao"],
                "valor": e["valor"],
                "cliente_nome": cliente,
            })
        else:
            entradas_normais.append(e)

    result["entradas"] = entradas_normais
    result["pagamentos_clientes"] = pagamentos_clientes

    logger.info(
        f"parse_pdf_nubank: {len(result['lancamentos'])} lançamentos, "
        f"{len(result['entradas'])} entradas, "
        f"{len(result['pagamentos_clientes'])} pagamentos de clientes"
    )
    return result


def save_temp_pdf(file_bytes: bytes) -> str:
    """Salva bytes em arquivo temporário e retorna o path."""
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    tmp.write(file_bytes)
    tmp.close()
    return tmp.name
