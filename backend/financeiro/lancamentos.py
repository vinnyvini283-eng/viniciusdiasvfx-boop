from datetime import date as date_type
from db.supabase_client import get_client
from db.user_context import get_user_id


def inserir(descricao: str, categoria: str, valor: float,
            data: date_type = None, observacao: str = None) -> dict:
    db = get_client()
    uid = get_user_id()
    payload = {
        "descricao": descricao,
        "categoria": categoria,
        "valor": round(float(valor), 2),
        "data": str(data or date_type.today()),
    }
    if uid:
        payload["user_id"] = uid
    if observacao:
        payload["observacao"] = observacao
    result = db.table("lancamentos").insert(payload).execute()
    return result.data[0]


def get_ultimo() -> dict | None:
    db = get_client()
    uid = get_user_id()
    q = db.table("lancamentos").select("*").order("criado_em", desc=True).limit(1)
    if uid:
        q = q.eq("user_id", uid)
    result = q.execute()
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


def deletar_todos() -> int:
    db = get_client()
    uid = get_user_id()
    q = db.table("lancamentos").delete()
    if uid:
        q = q.eq("user_id", uid)
    else:
        q = q.neq("id", "00000000-0000-0000-0000-000000000000")
    result = q.execute()
    return len(result.data)


def deletar_mes(mes: int, ano: int) -> int:
    db = get_client()
    uid = get_user_id()
    inicio = f"{ano}-{mes:02d}-01"
    fim = f"{ano}-{mes:02d}-31"
    q = db.table("lancamentos").delete().gte("data", inicio).lte("data", fim)
    if uid:
        q = q.eq("user_id", uid)
    result = q.execute()
    return len(result.data)
