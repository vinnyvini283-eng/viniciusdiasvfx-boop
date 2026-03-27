"""CRUD documentos — Fase 2."""
from db.supabase_client import get_client


def listar(arquivado: bool = False) -> list[dict]:
    db = get_client()
    return (db.table("documentos")
              .select("*")
              .eq("arquivado", arquivado)
              .execute().data)


def arquivar(doc_id: str) -> dict:
    db = get_client()
    return (db.table("documentos")
              .update({"arquivado": True})
              .eq("id", doc_id)
              .execute().data[0])
