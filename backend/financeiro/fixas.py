from db.supabase_client import get_client
from db.user_context import get_user_id


def listar(user_id: str = None) -> list:
    db = get_client()
    uid = user_id or get_user_id()
    q = db.table("contas_fixas").select("*").eq("ativo", True).order("criado_em")
    if uid:
        q = q.eq("user_id", uid)
    return q.execute().data or []


def adicionar(nome: str, valor: float, user_id: str = None) -> dict:
    db = get_client()
    uid = user_id or get_user_id()
    result = db.table("contas_fixas").insert({
        "user_id": uid,
        "nome": nome,
        "valor": round(float(valor), 2),
        "ativo": True,
    }).execute()
    return result.data[0]


def atualizar_por_nome(nome_busca: str, valor: float, user_id: str = None) -> dict | None:
    uid = user_id or get_user_id()
    contas = listar(uid)
    match = next(
        (c for c in contas if nome_busca.lower() in c["nome"].lower()),
        None
    )
    if not match:
        return None
    db = get_client()
    result = db.table("contas_fixas").update({
        "valor": round(float(valor), 2)
    }).eq("id", match["id"]).execute()
    return result.data[0]


def deletar_por_nome(nome_busca: str, user_id: str = None) -> dict | None:
    uid = user_id or get_user_id()
    contas = listar(uid)
    match = next(
        (c for c in contas if nome_busca.lower() in c["nome"].lower()),
        None
    )
    if not match:
        return None
    get_client().table("contas_fixas").delete().eq("id", match["id"]).execute()
    return match


def get_total(user_id: str = None) -> float:
    """Soma todas as contas fixas ativas do usuário."""
    uid = user_id or get_user_id()
    return sum(float(c["valor"] or 0) for c in listar(uid))
