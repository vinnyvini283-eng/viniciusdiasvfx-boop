from datetime import date as date_type
from db.supabase_client import get_client


def inserir(descricao: str, categoria: str, valor: float,
            data: date_type = None, observacao: str = None) -> dict:
    db = get_client()
    payload = {
        "descricao": descricao,
        "categoria": categoria,
        "valor": round(float(valor), 2),
        "data": str(data or date_type.today()),
    }
    if observacao:
        payload["observacao"] = observacao
    result = db.table("lancamentos").insert(payload).execute()
    return result.data[0]


def get_ultimo() -> dict | None:
    db = get_client()
    result = (db.table("lancamentos")
                .select("*")
                .order("criado_em", desc=True)
                .limit(1)
                .execute())
    return result.data[0] if result.data else None


def atualizar_ultimo(valor: float) -> dict | None:
    ultimo = get_ultimo()
    if not ultimo:
        return None
    db = get_client()
    result = (db.table("lancamentos")
                .update({"valor": round(float(valor), 2)})
                .eq("id", ultimo["id"])
                .execute())
    return result.data[0] if result.data else None


def deletar_por_id(id: str) -> dict | None:
    db = get_client()
    result = db.table("lancamentos").delete().eq("id", id).execute()
    return result.data[0] if result.data else None
