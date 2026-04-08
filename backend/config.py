import os

CATEGORIAS_VARIAVEIS = [
    "Alimentação", "Transporte", "Lazer",
    "Vestuário", "Saúde", "Educação", "Outros"
]

DESPESAS_FIXAS_MAP = {
    "plano de saúde": "plano_saude",
    "plano saude": "plano_saude",
    "internet_telefone": "internet_telefone",
    "condomínio": "condominio",
    "condominio": "condominio",
    "mensalidade": "mensalidade",
    "assinatura": "mensalidade",
    "aluguel": "aluguel",
    "moradia": "aluguel",
    "energia": "energia",
    "luz": "energia",
    "água": "agua",
    "agua": "agua",
    "internet": "internet_telefone",
    "telefone": "internet_telefone",
    "seguro": "seguro",
}

ALIASES_CLIENTES = {
    "cida car": "CIDACAR",
    "cidacar": "CIDACAR",
    "cida": "CIDACAR",
    "gs pneus": "GSPNEUS",
    "gspneus": "GSPNEUS",
    "gs": "GSPNEUS",
    "aceleração vfx": "ACELERAÇÃO VFX",
    "aceleração": "ACELERAÇÃO VFX",
    "aceleracao": "ACELERAÇÃO VFX",
    "vfx": "ACELERAÇÃO VFX",
    "alpha centro": "ALPHA CENTRO",
    "alpha": "ALPHA CENTRO",
}

def is_authorized(user_id: int) -> bool:
    allowed = [u.strip() for u in os.getenv("ALLOWED_USER_IDS", "").split(",") if u.strip()]
    return str(user_id) in allowed


def get_supabase_user_uuid() -> str | None:
    """UUID do usuário no Supabase Auth — necessário para inserções com RLS."""
    return os.getenv("SUPABASE_USER_UUID")


def resolver_cliente(texto: str) -> str | None:
    t = texto.lower().strip()
    for alias in sorted(ALIASES_CLIENTES, key=len, reverse=True):
        if alias in t:
            return ALIASES_CLIENTES[alias]
    return None
