from datetime import date as date_type
from db.supabase_client import get_client


def inserir(descricao: str, valor: float, tipo: str = "freela",
            data: date_type = None, observacao: str = None) -> dict:
    db = get_client()
    payload = {
        "descricao": descricao,
        "valor": round(float(valor), 2),
        "tipo": tipo,
        "data": str(data or date_type.today()),
    }
    if observacao:
        payload["observacao"] = observacao
    result = db.table("entradas").insert(payload).execute()
    return result.data[0]


def get_ultimo() -> dict | None:
    db = get_client()
    result = (db.table("entradas")
                .select("*")
                .order("criado_em", desc=True)
                .limit(1)
                .execute())
    return result.data[0] if result.data else None


def deletar_por_id(id: str) -> dict | None:
    db = get_client()
    result = db.table("entradas").delete().eq("id", id).execute()
    return result.data[0] if result.data else None


def get_total_mes(mes: int, ano: int) -> float:
    db = get_client()
    result = (db.table("entradas")
                .select("valor")
                .eq("mes", mes)
                .eq("ano", ano)
                .execute())
    return sum(float(r["valor"]) for r in result.data)
