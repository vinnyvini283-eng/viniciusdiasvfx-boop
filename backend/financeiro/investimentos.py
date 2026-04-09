from datetime import date as date_type
from db.supabase_client import get_client
from db.user_context import get_user_id


def inserir(descricao: str, valor: float, data: date_type = None,
            tipo: str = None, indice: str = None, rentabilidade_pct: float = None) -> dict:
    db = get_client()
    uid = get_user_id()
    payload = {
        "descricao": descricao,
        "valor": round(float(valor), 2),
        "data": str(data or date_type.today()),
    }
    if uid:
        payload["user_id"] = uid
    if tipo:
        payload["tipo"] = tipo
    if indice:
        payload["indice"] = indice
    if rentabilidade_pct is not None:
        payload["rentabilidade_pct"] = rentabilidade_pct
    result = db.table("investimentos").insert(payload).execute()
    return result.data[0]


def get_total_mes(mes: int, ano: int) -> float:
    db = get_client()
    uid = get_user_id()
    q = db.table("investimentos").select("valor").eq("mes", mes).eq("ano", ano)
    if uid:
        q = q.eq("user_id", uid)
    result = q.execute()
    return sum(float(r["valor"]) for r in result.data)


def get_total_ano(ano: int) -> float:
    db = get_client()
    uid = get_user_id()
    q = db.table("investimentos").select("valor").eq("ano", ano)
    if uid:
        q = q.eq("user_id", uid)
    result = q.execute()
    return sum(float(r["valor"]) for r in result.data)
