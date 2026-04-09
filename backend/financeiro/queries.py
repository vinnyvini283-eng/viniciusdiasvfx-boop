from datetime import date, timedelta
from db.supabase_client import get_client
from db.user_context import get_user_id
from financeiro.fixas import get_total as get_total_fixas
from financeiro.entradas import get_total_mes as get_total_entradas
from financeiro.investimentos import get_total_mes as get_total_inv


def get_config() -> dict:
    db = get_client()
    uid = get_user_id()
    q = db.table("config_financeiro").select("*")
    if uid:
        q = q.eq("user_id", uid)
    result = q.limit(1).execute()
    if result.data:
        return result.data[0]
    return {"id": None, "salario_fixo": 0.0, "meta_investimento_pct": 0.20, "cdi_atual": 13.75}


def update_salario(valor: float) -> dict:
    db = get_client()
    config = get_config()
    if not config.get("id"):
        return {}
    result = (db.table("config_financeiro")
                .update({"salario_fixo": round(float(valor), 2)})
                .eq("id", config["id"])
                .execute())
    return result.data[0] if result.data else {}


def get_resumo_mes(mes: int, ano: int) -> dict:
    config = get_config()
    salario = float(config.get("salario_fixo") or 0)
    freela = get_total_entradas(mes, ano)
    total_ent = salario + freela
    total_fix = get_total_fixas()  # usa user_context internamente

    db = get_client()
    uid = get_user_id()
    var_q = (db.table("lancamentos")
               .select("valor")
               .eq("mes", mes)
               .eq("ano", ano))
    if uid:
        var_q = var_q.eq("user_id", uid)
    var_result = var_q.execute()
    total_var = sum(float(r["valor"]) for r in var_result.data)
    total_inv = get_total_inv(mes, ano)
    saldo = total_ent - total_fix - total_var - total_inv

    meta_pct = float(config.get("meta_investimento_pct") or 0.20)
    meta_inv = total_ent * meta_pct
    pct_meta = (total_inv / meta_inv * 100) if meta_inv > 0 else 0

    return {
        "salario": salario,
        "freela": freela,
        "total_entradas": total_ent,
        "total_fixas": total_fix,
        "total_variaveis": total_var,
        "total_investido": total_inv,
        "saldo": saldo,
        "meta_investimento": meta_inv,
        "pct_meta": pct_meta,
    }


def get_gastos_periodo(data_inicio: date, data_fim: date, categoria: str = None) -> dict:
    db = get_client()
    uid = get_user_id()
    query = (db.table("lancamentos")
               .select("*")
               .gte("data", str(data_inicio))
               .lte("data", str(data_fim)))
    if uid:
        query = query.eq("user_id", uid)
    if categoria:
        query = query.eq("categoria", categoria)
    result = query.order("data", desc=True).execute()
    items = result.data
    total = sum(float(r["valor"]) for r in items)
    return {"total": total, "lancamentos": items, "count": len(items)}


def get_gastos_hoje() -> dict:
    hoje = date.today()
    return get_gastos_periodo(hoje, hoje)


def get_gastos_semana() -> dict:
    hoje = date.today()
    seg = hoje - timedelta(days=hoje.weekday())
    dom = seg + timedelta(days=6)
    return get_gastos_periodo(seg, dom)


def get_gastos_mes(mes: int = None, ano: int = None) -> dict:
    hoje = date.today()
    mes = mes or hoje.month
    ano = ano or hoje.year
    inicio = date(ano, mes, 1)
    if mes == 12:
        fim = date(ano + 1, 1, 1) - timedelta(days=1)
    else:
        fim = date(ano, mes + 1, 1) - timedelta(days=1)
    return get_gastos_periodo(inicio, fim)


def get_maior_gasto(mes: int, ano: int) -> dict | None:
    db = get_client()
    uid = get_user_id()
    q = (db.table("lancamentos")
           .select("*")
           .eq("mes", mes)
           .eq("ano", ano)
           .order("valor", desc=True)
           .limit(1))
    if uid:
        q = q.eq("user_id", uid)
    result = q.execute()
    return result.data[0] if result.data else None


def get_total_por_categoria(mes: int, ano: int) -> list[dict]:
    db = get_client()
    uid = get_user_id()
    q = (db.table("lancamentos")
           .select("categoria, valor")
           .eq("mes", mes)
           .eq("ano", ano))
    if uid:
        q = q.eq("user_id", uid)
    result = q.execute()
    totals: dict[str, float] = {}
    for r in result.data:
        cat = r["categoria"]
        totals[cat] = totals.get(cat, 0.0) + float(r["valor"])
    return sorted(
        [{"categoria": k, "total": v} for k, v in totals.items()],
        key=lambda x: -x["total"]
    )
