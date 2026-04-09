"""
Contexto de usuário por request (thread-local).
Permite que os módulos DB saibam qual user_id usar
sem precisar receber o parâmetro em cada chamada.

Uso:
    # No início do request (webhook handler):
    from db.user_context import set_user_id
    set_user_id("uuid-do-usuario")

    # Nos módulos DB:
    from db.user_context import get_user_id
    uid = get_user_id()  # retorna o UUID ou fallback do env var
"""
import os
import threading

_local = threading.local()


def set_user_id(uid: str | None) -> None:
    """Define o user_id para o request atual."""
    _local.user_id = uid


def get_user_id() -> str | None:
    """
    Retorna o user_id do contexto atual.
    Fallback: env var SUPABASE_USER_UUID (compatibilidade com sistema single-user).
    """
    return getattr(_local, "user_id", None) or os.getenv("SUPABASE_USER_UUID")


def clear() -> None:
    """Limpa o contexto (usado no teardown do request)."""
    _local.user_id = None
