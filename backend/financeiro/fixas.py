from db.supabase_client import get_client
import os


def _user_id():
    return os.getenv("BOT_USER_ID")  # fallback; handlers passam user_id diretamente


def listar(user_id: str = None) -> list:
    db = get_client()
    q = db.table("contas_fixas").select("*").eq("ativo", True).order("criado_em")
    if user_id:
        q = q.eq("user_id", user_id)
    return q.execute().data or []


def adicionar(nome: str, valor: float, user_id: str) -> dict:
    db = get_client()
    result = db.table("contas_fixas").insert({
        "user_id": user_id,
        "nome": nome,
        "valor": round(float(valor), 2),
        "ativo": True,
    }).execute()
    return result.data[0]


def atualizar_por_nome(nome_busca: str, valor: float, user_id: str) -> dict | None:
    """Busca conta pelo nome (case-insensitive parcial) e atualiza o valor."""
    db = get_client()
    contas = listar(user_id)
    match = next(
        (c for c in contas if nome_busca.lower() in c["nome"].lower()),
        None
    )
    if not match:
        return None
    result = db.table("contas_fixas").update({
        "valor": round(float(valor), 2)
    }).eq("id", match["id"]).execute()
    return result.data[0]


def deletar_por_nome(nome_busca: str, user_id: str) -> dict | None:
    db = get_client()
    contas = listar(user_id)
    match = next(
        (c for c in contas if nome_busca.lower() in c["nome"].lower()),
        None
    )
    if not match:
        return None
    db.table("contas_fixas").delete().eq("id", match["id"]).execute()
    return match


def get_total(user_id: str = None) -> float:
    return sum(float(c["valor"] or 0) for c in listar(user_id))
