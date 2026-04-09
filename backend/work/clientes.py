"""CRUD clientes + pagamentos — multi-tenant."""
from db.supabase_client import get_client
from db.user_context import get_user_id


def get_by_nome(nome: str) -> dict | None:
    db = get_client()
    uid = get_user_id()
    q = db.table("clientes").select("*").eq("nome", nome)
    if uid:
        q = q.eq("user_id", uid)
    result = q.execute()
    return result.data[0] if result.data else None


def listar() -> list[dict]:
    db = get_client()
    uid = get_user_id()
    q = db.table("clientes").select("*").order("nome")
    if uid:
        q = q.eq("user_id", uid)
    return q.execute().data or []


def registrar_pagamento(cliente_nome: str, valor: float, descricao: str = None,
                        entrada_id: str = None) -> dict:
    from datetime import date
    db = get_client()
    uid = get_user_id()
    cliente = get_by_nome(cliente_nome)
    if not cliente:
        raise ValueError(f"Cliente não encontrado: {cliente_nome}")
    payload = {
        "cliente_id": cliente["id"],
        "valor": round(float(valor), 2),
        "data": str(date.today()),
    }
    if uid:
        payload["user_id"] = uid
    if descricao:
        payload["descricao"] = descricao
    if entrada_id:
        payload["entrada_id"] = entrada_id
    return db.table("pagamentos_clientes").insert(payload).execute().data[0]


def total_recebido(cliente_nome: str, mes: int = None, ano: int = None) -> float:
    db = get_client()
    cliente = get_by_nome(cliente_nome)
    if not cliente:
        return 0.0
    uid = get_user_id()
    q = db.table("pagamentos_clientes").select("valor").eq("cliente_id", cliente["id"])
    if uid:
        q = q.eq("user_id", uid)
    result = q.execute()
    return sum(float(r["valor"]) for r in result.data)
