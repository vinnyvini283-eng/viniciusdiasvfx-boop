from datetime import datetime, timezone
from db.supabase_client import get_client

CAMPOS = [
    "aluguel", "condominio", "energia", "agua",
    "internet_telefone", "plano_saude", "seguro", "mensalidade"
]


def get_ou_criar(mes: int, ano: int) -> dict:
    db = get_client()
    result = (db.table("despesas_fixas")
                .select("*")
                .eq("mes", mes)
                .eq("ano", ano)
                .execute())
    if result.data:
        return result.data[0]
    novo = db.table("despesas_fixas").insert({"mes": mes, "ano": ano}).execute()
    return novo.data[0]


def atualizar_campo(mes: int, ano: int, campo: str, valor: float) -> dict:
    if campo not in CAMPOS:
        raise ValueError(f"Campo inválido: {campo}. Válidos: {CAMPOS}")
    db = get_client()
    agora = datetime.now(timezone.utc).isoformat()
    # UPSERT atômico — evita race condition entre SELECT+INSERT e UPDATE
    result = (db.table("despesas_fixas")
                .upsert({
                    "mes": mes,
                    "ano": ano,
                    campo: round(float(valor), 2),
                    "atualizado_em": agora,
                }, on_conflict="mes,ano")
                .execute())
    return result.data[0]


def get_total(mes: int, ano: int) -> float:
    fixas = get_ou_criar(mes, ano)
    return sum(float(fixas.get(c) or 0) for c in CAMPOS)
