from datetime import date as date_type
from db.supabase_client import get_client


def inserir(descricao: str, valor: float, data: date_type = None) -> dict:
    db = get_client()
    payload = {
        "descricao": descricao,
        "valor": round(float(valor), 2),
        "data": str(data or date_type.today()),
    }
    result = db.table("investimentos").insert(payload).execute()
    return result.data[0]


def get_total_mes(mes: int, ano: int) -> float:
    db = get_client()
    result = (db.table("investimentos")
                .select("valor")
                .eq("mes", mes)
                .eq("ano", ano)
                .execute())
    return sum(float(r["valor"]) for r in result.data)


def get_total_ano(ano: int) -> float:
    db = get_client()
    result = (db.table("investimentos")
                .select("valor")
                .eq("ano", ano)
                .execute())
    return sum(float(r["valor"]) for r in result.data)
