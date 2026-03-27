MESES = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
         "Jul", "Ago", "Set", "Out", "Nov", "Dez"]


def fmt_moeda(valor: float) -> str:
    return f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def fmt_lancamento(l: dict) -> str:
    return f"• {l['descricao']} — {fmt_moeda(float(l['valor']))} ({l['data']})"


def msg_inserido(tipo: str, descricao: str, valor: float) -> str:
    return f"✅ {tipo} registrado: *{descricao}* — {fmt_moeda(valor)}"


def msg_resumo(r: dict, mes: int, ano: int) -> str:
    nome_mes = MESES[mes]
    saldo = r["saldo"]
    emoji = "📈" if saldo >= 0 else "📉"
    pct = min(int(r["pct_meta"] / 10), 10)
    barra = "🟩" * pct + "⬜" * (10 - pct)
    return (
        f"📊 *Resumo {nome_mes}/{ano}*\n\n"
        f"💰 Entradas: {fmt_moeda(r['total_entradas'])}\n"
        f"  • Salário: {fmt_moeda(r['salario'])}\n"
        f"  • Freela: {fmt_moeda(r['freela'])}\n\n"
        f"🏠 Fixas: {fmt_moeda(r['total_fixas'])}\n"
        f"🛒 Variáveis: {fmt_moeda(r['total_variaveis'])}\n"
        f"📈 Investido: {fmt_moeda(r['total_investido'])} ({r['pct_meta']:.0f}% da meta)\n"
        f"{barra}\n\n"
        f"{emoji} *Saldo: {fmt_moeda(saldo)}*"
    )


def msg_gastos_periodo(resultado: dict, label: str) -> str:
    if resultado["count"] == 0:
        return f"Nenhum gasto registrado {label} ainda 😊"
    linhas = [f"💸 *Gastos {label}:* {fmt_moeda(resultado['total'])}\n"]
    for l in resultado["lancamentos"][:10]:
        linhas.append(fmt_lancamento(l))
    if resultado["count"] > 10:
        linhas.append(f"\n_...e mais {resultado['count'] - 10} lançamentos_")
    return "\n".join(linhas)


def msg_confirmacao_delete(item: dict, tipo: str = "lancamento") -> str:
    preview = fmt_lancamento(item) if tipo == "lancamento" else \
        f"• {item.get('descricao','?')} — {fmt_moeda(float(item.get('valor', 0)))}"
    return (
        f"⚠️ *Confirmar exclusão?*\n\n{preview}\n\n"
        f"Responda *sim* para confirmar ou *não* para cancelar."
    )


def msg_confirmacao_registro(descricao: str, valor: float, categoria: str = None) -> str:
    cat = f" ({categoria})" if categoria else ""
    return (
        f"⚠️ *Confirmar registro?*\n\n"
        f"*{descricao}*{cat} — {fmt_moeda(valor)}\n\n"
        f"Responda *sim* para confirmar ou *não* para cancelar."
    )
