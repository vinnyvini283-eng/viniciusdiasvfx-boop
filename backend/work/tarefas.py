"""CRUD tarefas — Fase 2."""
from db.supabase_client import get_client


def listar_pendentes(cliente_nome: str = None) -> list[dict]:
    db = get_client()
    query = db.table("tarefas").select("*, clientes(nome)").eq("feito", False)
    result = query.order("data_limite").execute()
    if cliente_nome:
        return [t for t in result.data
                if (t.get("clientes") or {}).get("nome") == cliente_nome]
    return result.data


def criar(nome: str, cliente_id: str = None, data_limite: str = None, observacao: str = None) -> dict:
    db = get_client()
    payload = {"nome": nome}
    if cliente_id:
        payload["cliente_id"] = cliente_id
    if data_limite:
        payload["data_limite"] = data_limite
    if observacao:
        payload["observacao"] = observacao
    return db.table("tarefas").insert(payload).execute().data[0]


def concluir(tarefa_id: str) -> dict:
    from datetime import datetime, timezone
    db = get_client()
    return (db.table("tarefas")
              .update({"feito": True, "status": "Concluído",
                       "concluido_em": datetime.now(timezone.utc).isoformat()})
              .eq("id", tarefa_id)
              .execute().data[0])


def deletar(tarefa_id: str) -> dict | None:
    db = get_client()
    result = db.table("tarefas").delete().eq("id", tarefa_id).execute()
    return result.data[0] if result.data else None
