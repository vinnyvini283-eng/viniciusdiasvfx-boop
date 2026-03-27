"""
Tester — 11 testes cobrindo todas as intenções financeiras da Fase 1.
Sem Supabase nem Groq reais.
"""
import sys, os, pytest
from contextlib import ExitStack
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

# ─────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────
LANC = {"id": "l1", "descricao": "iFood", "categoria": "Alimentação",
        "valor": 55.0, "data": "2026-03-27", "mes": 3, "ano": 2026}
ENT  = {"id": "e1", "descricao": "Freela Cida Car", "valor": 800.0,
        "tipo": "freela", "data": "2026-03-27"}
CFG  = {"id": "cfg1", "salario_fixo": 3500.0, "meta_investimento_pct": 0.20}
RESUMO = {
    "salario": 3500.0, "freela": 800.0, "total_entradas": 4300.0,
    "total_fixas": 1800.0, "total_variaveis": 420.0, "total_investido": 700.0,
    "saldo": 1380.0, "meta_investimento": 700.0, "pct_meta": 100.0,
}


def _make_db():
    db = MagicMock()
    db.table.return_value.insert.return_value.execute.return_value.data = [LANC]
    db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = [CFG]
    db.table.return_value.select.return_value.order.return_value.limit.return_value.execute.return_value.data = [LANC]
    db.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
    db.table.return_value.select.return_value.gte.return_value.lte.return_value.order.return_value.execute.return_value.data = []
    db.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [LANC]
    db.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = [LANC]
    return db


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setenv("ALLOWED_USER_IDS", "123456")


@pytest.fixture(autouse=True)
def clear_pending():
    import bot.handlers as h
    h._pending.clear()
    yield
    h._pending.clear()


# ─────────────────────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────────────────────
def run(parsed: dict, texto: str = "teste", extra: dict | None = None) -> str:
    """
    Executa handle_message com mocks.
    Chaves em `extra` substituem os patches padrão.
    """
    db = _make_db()
    base = {
        # patch onde é usado (regra do mock Python)
        "bot.handlers.parse_mensagem": MagicMock(return_value=parsed),
        "financeiro.lancamentos.get_client": MagicMock(return_value=db),
        "financeiro.entradas.get_client": MagicMock(return_value=db),
        "financeiro.investimentos.get_client": MagicMock(return_value=db),
        "financeiro.fixas.get_client": MagicMock(return_value=db),
        "financeiro.queries.get_client": MagicMock(return_value=db),
    }
    if extra:
        base.update(extra)

    with ExitStack() as stack:
        for target, mock_obj in base.items():
            stack.enter_context(patch(target, mock_obj))
        from bot.handlers import handle_message
        return handle_message(123456, texto)


# ─────────────────────────────────────────────────────────────
# Testes
# ─────────────────────────────────────────────────────────────

def test_01_inserir_lancamento_simples():
    """gastei 50 no mercado → ✅ lançamento registrado"""
    r = run({"intencao": "inserir_lancamento", "valor": 50.0,
             "descricao": "Mercado", "categoria": "Alimentação",
             "data": "27/03/2026", "confianca": "alta", "confirmacao_necessaria": False})
    assert "✅" in r
    assert "Mercado" in r
    assert "50" in r


def test_02_lancamento_alto_valor_pede_confirmacao():
    """valor > 500 → ⚠️ aguarda 'sim'; sim → ✅"""
    r = run({"intencao": "inserir_lancamento", "valor": 600.0,
             "descricao": "Notebook", "categoria": "Outros",
             "data": "27/03/2026", "confianca": "alta", "confirmacao_necessaria": True})
    assert "⚠️" in r
    assert "sim" in r.lower()

    db = _make_db()
    with patch("financeiro.lancamentos.get_client", return_value=db):
        from bot.handlers import handle_message
        r2 = handle_message(123456, "sim")
    assert "✅" in r2


def test_03_inserir_entrada_freela():
    """recebi 800 de freela → ✅ entrada"""
    r = run({"intencao": "inserir_entrada", "valor": 800.0,
             "descricao": "Freela Cida Car", "categoria": None,
             "data": "27/03/2026", "confianca": "alta", "confirmacao_necessaria": False})
    assert "✅" in r
    assert "800" in r


def test_04_inserir_investimento_meta_superada():
    """investi 500 → ✅ + mensagem de meta"""
    r = run(
        {"intencao": "inserir_investimento", "valor": 500.0,
         "descricao": "Tesouro Direto", "data": "27/03/2026",
         "confianca": "alta", "confirmacao_necessaria": False},
        extra={"bot.handlers.get_resumo_mes": MagicMock(return_value=RESUMO)},
    )
    assert "✅" in r
    assert "500" in r
    assert "Meta" in r or "meta" in r  # pct_meta=100 → "Meta de 20% já superada!"


def test_05_consulta_hoje_sem_gastos():
    """quanto gastei hoje? sem lançamentos → mensagem amigável"""
    r = run(
        {"intencao": "consulta_hoje", "valor": None, "descricao": "",
         "confianca": "alta", "confirmacao_necessaria": False},
        extra={"bot.handlers.get_gastos_hoje": MagicMock(return_value={"total": 0, "lancamentos": [], "count": 0})},
    )
    assert "Nenhum" in r
    assert "😊" in r


def test_06_consulta_semana_com_gastos():
    """quanto gastei essa semana? → lista com total"""
    gastos = {
        "total": 420.0, "count": 3,
        "lancamentos": [
            {"descricao": "Mercado", "valor": 200.0, "data": "2026-03-25", "categoria": "Alimentação"},
            {"descricao": "Gasolina", "valor": 120.0, "data": "2026-03-26", "categoria": "Transporte"},
            {"descricao": "Farmácia", "valor": 100.0, "data": "2026-03-27", "categoria": "Saúde"},
        ],
    }
    r = run(
        {"intencao": "consulta_semana", "valor": None, "descricao": "",
         "confianca": "alta", "confirmacao_necessaria": False},
        extra={"bot.handlers.get_gastos_semana": MagicMock(return_value=gastos)},
    )
    assert "420" in r
    assert "semana" in r.lower()
    assert "Mercado" in r


def test_07_consulta_saldo_resumo():
    """qual meu saldo? → resumo mensal completo"""
    r = run(
        {"intencao": "consulta_resumo", "valor": None, "descricao": "",
         "confianca": "alta", "confirmacao_necessaria": False},
        extra={"bot.handlers.get_resumo_mes": MagicMock(return_value=RESUMO)},
    )
    assert "Resumo" in r
    assert "1.380" in r or "1380" in r
    assert "Saldo" in r


def test_08_consulta_categoria():
    """quanto gastei em alimentação? → filtro por categoria no banco"""
    items = [
        {"descricao": "Mercado", "valor": 200.0, "data": "2026-03-25", "categoria": "Alimentação"},
        {"descricao": "iFood", "valor": 55.0, "data": "2026-03-26", "categoria": "Alimentação"},
    ]
    # Agora usa get_gastos_periodo com categoria (importado dentro do handler)
    r = run(
        {"intencao": "consulta_categoria", "categoria": "Alimentação",
         "valor": None, "descricao": "", "confianca": "alta", "confirmacao_necessaria": False},
        extra={"financeiro.queries.get_gastos_periodo": MagicMock(
            return_value={"total": 255.0, "lancamentos": items, "count": 2})},
    )
    assert "Alimentação" in r
    assert "255" in r
    assert "Mercado" in r


def test_09_deletar_lancamento_confirmacao_e_cancel():
    """DELETE → ⚠️ preview; 'não' → cancela"""
    r = run(
        {"intencao": "deletar_lancamento", "valor": None, "descricao": "",
         "confianca": "alta", "confirmacao_necessaria": True},
        extra={"financeiro.lancamentos.get_ultimo": MagicMock(return_value=LANC)},
    )
    assert "⚠️" in r
    assert "iFood" in r
    assert "sim" in r.lower()

    from bot.handlers import handle_message
    r2 = handle_message(123456, "não")
    assert "cancelad" in r2.lower()


def test_10_atualizar_despesa_fixa():
    """muda o aluguel pra 1900 → ✅ atualizado"""
    db = _make_db()
    db.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [{
        "id": "f1", "mes": 3, "ano": 2026, "aluguel": 1800.0,
        "condominio": 0, "energia": 0, "agua": 0,
        "internet_telefone": 0, "plano_saude": 0, "seguro": 0, "mensalidade": 0,
    }]
    r = run(
        {"intencao": "atualizar_fixa", "valor": 1900.0,
         "descricao": "aluguel", "confianca": "alta", "confirmacao_necessaria": False},
        extra={
            "financeiro.fixas.get_client": MagicMock(return_value=db),
            "financeiro.lancamentos.get_client": MagicMock(return_value=db),
        },
    )
    assert "✅" in r
    assert "1.900" in r or "1900" in r


def test_11_usuario_nao_autorizado():
    """user_id não autorizado → retorna '' sem chamar parser"""
    with patch("bot.handlers.parse_mensagem") as mock_p:
        from bot.handlers import handle_message
        r = handle_message(999999, "gastei 50")
    assert r == ""
    mock_p.assert_not_called()
