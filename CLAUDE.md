# CLAUDE.md — VinBot · Assistente Financeiro e Work via Telegram
> Fonte de verdade para Claude Code agir com autonomia total neste projeto.
> Última atualização: Abril 2026 — mobile responsivo, bulk delete bot, histórico persistente.

---

## 🎯 VISÃO GERAL DO SISTEMA

Sistema pessoal com **dois módulos** operados de duas formas complementares:

| Interface | Papel |
|---|---|
| 🤖 **Telegram Bot** | Assistente completo — registra, consulta, edita, exclui, responde em linguagem natural |
| 🌐 **Sistema Web** | Gestão manual completa — filtros, buscas, edição inline, relatórios detalhados |

> O **Telegram é o caminho mais curto**: fala naturalmente, o bot entende e age.
> O **Sistema Web é o controle total**: filtra, ajusta, exporta, gerencia manualmente.
> Os dois leem e escrevem no **mesmo banco Supabase**.

| Módulo | Modelo de negócio (referência de lógica) | Banco real |
|---|---|---|
| 💰 **Financeiro** | `Financeiro_Vinicius.xlsx` | **Supabase** |
| ✅ **Work** | Notion WORK (`27f6a79f...`) | **Supabase** |

> ⚠️ A planilha e o Notion são apenas referência de lógica e campos.
> Nenhuma escrita em Google Sheets. Tudo vai para o Supabase.

---

## ⚙️ TECH STACK — CUSTO ZERO (FREE TIER)

| Camada | Tecnologia | Hosting |
|---|---|---|
| Frontend | React + Vite | **Vercel** (auto-deploy via git push) |
| Backend | Python + Flask | **Hugging Face Spaces** (auto-deploy via GitHub Actions) |
| Banco | PostgreSQL | **Supabase** (500MB free) |
| Storage | Supabase Storage | Supabase (1GB free) |
| LLM / OCR | Groq API `llama-4-scout-17b-16e-instruct` | Groq cloud (grátis) |
| Agendamento | APScheduler | Roda no backend HF Spaces |
| Auth | Supabase Auth | Embutido no Supabase |

### URLs de Produção (preencher após primeiro deploy)
```
Frontend:      https://vinbot.vercel.app
Backend:       https://[user]-vinbot.hf.space
Health check:  https://[user]-vinbot.hf.space/health
```

### Deploy — Backend (Hugging Face Spaces)
```bash
git push origin main
# GitHub Actions detecta mudanças em backend/** e deploya automaticamente (~3 min)
```

### Deploy — Frontend (Vercel)
```bash
# ⚠️ GitHub auto-deploy está QUEBRADO — usar CLI obrigatoriamente:
cd frontend
npx vercel --prod --yes
# Se token expirado: npx vercel login (usar device code flow)
```

---

## 🤖 TELEGRAM — ASSISTENTE COMPLETO

O bot **não é só entrada de dados**. É um assistente que registra, consulta, edita e exclui — tudo via linguagem natural.

### REGISTRA
```
"gastei 50 no mercado"                     → INSERT lancamento Alimentação R$50 hoje
"paguei aluguel 1800"                      → UPSERT despesas_fixas aluguel=1800 mês atual
"investi 500 no tesouro"                   → INSERT investimento R$500 hoje
"recebi 800 de freela"                     → INSERT entrada freela R$800 hoje
"meu salário é 3500"                       → UPDATE config_financeiro salario_fixo=3500
"Cida Car pagou 1500"                      → INSERT entrada freela R$1500 + INSERT pagamento_cliente (linkados)
"nova tarefa GSPNEUS: relatório até sexta" → INSERT tarefa cliente=GSPNEUS data_limite=próxima sexta
[foto de comprovante]                      → OCR → preview → confirma → INSERT lancamento
```

### CONSULTA E RESPONDE
```
"quanto gastei hoje?"            → SUM(lancamentos) WHERE data=hoje → valor + lista
"quanto gastei essa semana?"     → SUM(lancamentos) WHERE data BETWEEN seg-dom atual
"qual meu saldo?"                → get_resumo_mes() → saldo do mês atual
"resumo do mês"                  → entradas, fixas, variáveis, investido, saldo
"quanto gastei em alimentação?"  → SUM(lancamentos) WHERE categoria='Alimentação' mês atual
"qual meu maior gasto do mês?"   → MAX(lancamentos) mês atual → valor + descrição + data
"quanto investi esse ano?"       → SUM(investimentos) WHERE ano=atual
"pendentes da Cida Car"          → SELECT tarefas WHERE cliente='CIDACAR' AND feito=false
"quanto a Cida Car me pagou?"    → SUM(pagamentos_clientes) WHERE cliente='CIDACAR' mês atual
```

### EDITA
```
"muda o aluguel pra 1900"             → UPDATE despesas_fixas aluguel=1900 mês atual
"corrige o último lançamento pra 45"  → UPDATE lancamentos SET valor=45 WHERE id=último
"muda prazo da tarefa X pra segunda"  → UPDATE tarefas SET data_limite=próxima segunda
```

### EXCLUI
```
"apaga o último lançamento"           → preview → confirma → DELETE lancamentos LIMIT 1 DESC
"cancela a tarefa X da Cida Car"      → preview → confirma → DELETE tarefas
"remove o freela de ontem"            → preview → confirma → DELETE entradas WHERE data=ontem
"excluir todos os lançamentos"        → 1 confirmação bulk → DELETE lancamentos WHERE user_id
"apaga todas as entradas"             → 1 confirmação bulk → DELETE entradas WHERE user_id
"limpar os gastos de março"           → 1 confirmação bulk → DELETE lancamentos WHERE mes=3
```

> ⚠️ Bulk deletes fazem UMA ÚNICA confirmação para o lote inteiro — não confirmam item por item.

### REGRA DE CONFIRMAÇÃO
```python
# SEMPRE pedir confirmação (preview + aguardar "sim"/"não"):
CONFIRMAR = (
    intencao começa com "deletar_"   # todo DELETE exige confirmação
    OR valor > 500
    OR confianca == "baixa"
    OR intencao == "tarefa_concluir" # mostrar lista numerada
)

# AGIR DIRETO (sem confirmação):
DIRETO = confianca == "alta" AND valor <= 500 AND não é DELETE
```

---

## 🌐 SISTEMA WEB — GESTÃO COMPLETA

O sistema web **não é um dashboard estático**. É um sistema de gestão completo com filtros, edição inline e relatórios. URL: https://vinbot-dashboard.vercel.app

### Responsividade — obrigatório em todos os breakpoints

| Breakpoint | Comportamento |
|---|---|
| Mobile < 768px | **BottomNav iOS-style** fixo na base (5 abas: Início, Finanças, Relatórios \| Work, Config). Sidebar completamente oculta (`hidden md:flex`). Cards em coluna única. Abas em scroll horizontal. |
| iPad 768–1024px | Sidebar colapsável com só ícones, expande ao hover. BottomNav oculto (`md:hidden`). |
| Desktop > 1024px | Sidebar lateral completa. Conteúdo ocupa 100% da altura disponível. |

**BottomNav — grupos separados por divisor visual:**
- Contábil: Início, Finanças, Relatórios
- `|` divisor vertical 1px `#27272A`
- Trabalho: Work, Config

### Sidebar — padrão em todas as páginas

- Logo VinBot + badge Online no topo
- Navegação: CONTÁBIL (Dashboard, Financeiro, Relatórios) e TRABALHO (Dashboard, Tarefas, Relatórios)
- Ícone de engrenagem → `/configuracoes` (abaixo de Relatórios no bloco CONTÁBIL)
- **Perfil do usuário no rodapé** (OBRIGATÓRIO):
  - Avatar circular laranja com inicial do email
  - Email do usuário logado (truncado se > 20 chars)
  - Botão "Sair" abaixo do email

### Empty States — padrão em todas as páginas sem dados

Quando não há dados, NUNCA deixar tela preta. Sempre mostrar:
- Ícone SVG ilustrativo simples (sem biblioteca externa)
- Título: "Nenhum [lançamento/tarefa/pagamento] ainda"
- Subtítulo: "Registre pelo Telegram ou clique em + Novo"
- Botão de ação quando aplicável (ex: "+ Novo Lançamento")

### Barra de progresso da meta de investimento

Substituir texto `R$ 0,00 / R$ 0,00` por barra visual em todas as ocorrências:
- 0–50%: vermelho
- 50–80%: amarelo
- 80–100%+: verde
- Percentual exibido acima da barra

### `/login` — Autenticação
Login email/senha via Supabase Auth. Tabs "Entrar" e "Criar conta". ProtectedRoute em todas as páginas.

### `/` — Visão Geral
- KPIs do mês: Saldo, Entradas, Fixas, Variáveis, % meta investimento
- Work: % concluídas por cliente (barras de progresso)
- Gráfico evolução mensal do saldo — Recharts LineChart (últimos 6 meses)
- Empty state quando sem dados

### `/financeiro` — Módulo Financeiro Completo
- Seletor mês/ano para navegar entre períodos
- **Filtros**: categoria, período (hoje / semana / mês / personalizado), faixa de valor
- **Tabela de lançamentos**: busca, ordenação, edição inline, exclusão com confirmação
- **Despesas fixas**: editáveis diretamente campo por campo
- **Entradas**: histórico freela/salário com edição e exclusão
- **Investimentos**: histórico + barra de progresso visual vs meta 20%
- **Resumo**: entradas, fixas, variáveis, investido, saldo do mês
- Empty states em todas as abas sem dados

### `/work` — Módulo Work Completo
- **Board Kanban** por cliente: A Fazer / Em Andamento / Concluído
- **Filtros**: por cliente, status, prazo (hoje / semana / atrasado)
- **Criar / editar / excluir tarefas** — clicar na tarefa abre painel lateral com detalhes
- **% de conclusão** por cliente com barra de progresso visual
- **Clientes**: tabela com email e telefone editáveis ao clicar
- **Histórico de pagamentos** por cliente com total acumulado
- **Documentos** de acesso rápido com link e opção de arquivar
- Empty states em todas as abas sem dados

### `/relatorios` — Relatórios
- Comparativo mês a mês (gastos e entradas)
- Gastos por categoria no período selecionado (gráfico pizza + tabela)
- Evolução de investimentos acumulados
- Receita por cliente (Work × Financeiro cruzados)

### `/configuracoes` — Configurações (nova página)
- **Seção Conta**: email do usuário (readonly), botão "Alterar senha" → envia email de reset via Supabase Auth
- **Seção Telegram Bot**: status do bot (ativo ✅ / inativo ❌), campo para colar novo token, botão "Testar conexão" → valida token na API do Telegram
- **Seção Preferências**: meta de investimento (%), salário fixo — campos editáveis que salvam em `config_financeiro`

---

## 📁 ESTRUTURA DE ARQUIVOS

```
vinbot/
├── CLAUDE.md
├── .github/
│   └── workflows/
│       └── deploy.yml                ← GitHub Actions → HF Spaces
├── backend/
│   ├── app.py                        ← Flask webhook + APScheduler
│   ├── bot/
│   │   ├── __init__.py
│   │   ├── handlers.py               ← roteamento por intenção
│   │   ├── parser.py                 ← LLM Groq: texto → JSON
│   │   ├── ocr.py                    ← Groq Vision: foto → JSON
│   │   ├── formatter.py              ← formata respostas Telegram
│   │   └── scheduler.py              ← lembretes + relatório semanal
│   ├── financeiro/
│   │   ├── lancamentos.py            ← CRUD lançamentos variáveis
│   │   ├── fixas.py                  ← CRUD despesas fixas
│   │   ├── entradas.py               ← CRUD entradas
│   │   ├── investimentos.py          ← CRUD investimentos
│   │   └── queries.py                ← resumo, saldo, consultas por período
│   ├── work/
│   │   ├── tarefas.py                ← CRUD tarefas
│   │   ├── clientes.py               ← CRUD clientes + pagamentos
│   │   └── documentos.py             ← CRUD documentos
│   ├── db/
│   │   ├── supabase_client.py        ← conexão SERVICE_KEY
│   │   └── migrations/
│   │       ├── 001_schema.sql        ← schema completo + seeds
│   │       └── 002_bot_historico.sql ← tabela histórico do bot
│   ├── config.py                     ← categorias, aliases, constantes
│   ├── requirements.txt
│   └── README.md
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── vercel.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── lib/
        │   └── supabase.js           ← cliente ANON_KEY
        ├── hooks/
        │   └── useAuth.js            ← hook de autenticação
        ├── pages/
        │   ├── Login.jsx
        │   ├── Visao.jsx
        │   ├── Financeiro.jsx
        │   ├── Work.jsx
        │   ├── Relatorios.jsx
        │   └── Configuracoes.jsx     ← nova: conta + bot + preferências
        └── components/
            ├── layout/
            │   ├── Sidebar.jsx       ← responsiva: drawer mobile, ícones tablet, full desktop
            │   ├── SidebarMobile.jsx ← drawer com hamburger
            │   └── PerfilUsuario.jsx ← avatar + email + sair (rodapé da sidebar)
            ├── shared/
            │   ├── EmptyState.jsx    ← ícone + título + subtítulo + botão ação
            │   ├── BarraProgresso.jsx← vermelho/amarelo/verde com % acima
            │   ├── ProtectedRoute.jsx
            │   └── LoadingSkeleton.jsx
            ├── financeiro/
            │   ├── ResumoMes.jsx
            │   ├── TabelaLancamentos.jsx
            │   ├── DespesasFixas.jsx
            │   ├── Entradas.jsx
            │   └── Investimentos.jsx
            └── work/
                ├── KanbanWork.jsx
                ├── TarefaDetalhe.jsx ← painel lateral ao clicar na tarefa
                ├── TabelaClientes.jsx← clientes com email/telefone editáveis
                ├── Pagamentos.jsx
                └── Documentos.jsx
```

---

## 🗄️ SCHEMA SUPABASE

### `001_schema.sql` — schema principal
### `002_bot_historico.sql` — histórico de conversa do bot (✅ criado)

```sql
-- ============================================
-- MÓDULO FINANCEIRO
-- ============================================

CREATE TABLE config_financeiro (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salario_fixo DECIMAL(10,2) DEFAULT 0,
    meta_investimento_pct DECIMAL(4,2) DEFAULT 0.20,
    taxa_rendimento_anual DECIMAL(4,2) DEFAULT 0.10,
    atualizado_em TIMESTAMPTZ DEFAULT now()
);
INSERT INTO config_financeiro DEFAULT VALUES;

CREATE TABLE despesas_fixas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    ano INTEGER NOT NULL,
    aluguel DECIMAL(10,2) DEFAULT 0,
    condominio DECIMAL(10,2) DEFAULT 0,
    energia DECIMAL(10,2) DEFAULT 0,
    agua DECIMAL(10,2) DEFAULT 0,
    internet_telefone DECIMAL(10,2) DEFAULT 0,
    plano_saude DECIMAL(10,2) DEFAULT 0,
    seguro DECIMAL(10,2) DEFAULT 0,
    mensalidade DECIMAL(10,2) DEFAULT 0,
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    UNIQUE(mes, ano)
);

CREATE TABLE lancamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    descricao TEXT NOT NULL,
    categoria TEXT NOT NULL,
    valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
    mes INTEGER GENERATED ALWAYS AS (EXTRACT(MONTH FROM data)::INTEGER) STORED,
    ano INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM data)::INTEGER) STORED,
    observacao TEXT,
    criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE entradas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    descricao TEXT NOT NULL,
    valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
    tipo TEXT DEFAULT 'freela',
    mes INTEGER GENERATED ALWAYS AS (EXTRACT(MONTH FROM data)::INTEGER) STORED,
    ano INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM data)::INTEGER) STORED,
    observacao TEXT,
    criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE investimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    descricao TEXT NOT NULL,
    valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
    mes INTEGER GENERATED ALWAYS AS (EXTRACT(MONTH FROM data)::INTEGER) STORED,
    ano INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM data)::INTEGER) STORED,
    criado_em TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- MÓDULO WORK
-- ============================================

CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tarefas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    status TEXT DEFAULT 'A Fazer',
    feito BOOLEAN DEFAULT false,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    data_limite DATE,
    observacao TEXT,
    criado_em TIMESTAMPTZ DEFAULT now(),
    concluido_em TIMESTAMPTZ
);

CREATE TABLE pagamentos_clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
    descricao TEXT,
    data DATE DEFAULT CURRENT_DATE,
    entrada_id UUID REFERENCES entradas(id),
    criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    url TEXT,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    arquivado BOOLEAN DEFAULT false,
    criado_em TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- SEEDS
-- ============================================

INSERT INTO clientes (nome) VALUES
  ('GSPNEUS'), ('CIDACAR'), ('ACELERAÇÃO VFX'), ('ALPHA CENTRO');

INSERT INTO documentos (nome, url) VALUES
  ('Plano de Ação', NULL),
  ('Modelo de Contrato', NULL),
  ('Cartão de Visita', 'https://airgo.bio/a785fb40'),
  ('Mídia Kit', NULL);

-- ============================================
-- RLS — backend usa SERVICE_KEY (bypassa)
--       frontend usa ANON_KEY + Auth JWT
-- ============================================

ALTER TABLE config_financeiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesas_fixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE entradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE investimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_only" ON config_financeiro FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_only" ON despesas_fixas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_only" ON lancamentos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_only" ON entradas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_only" ON investimentos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_only" ON clientes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_only" ON tarefas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_only" ON pagamentos_clientes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_only" ON documentos FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- BOT — Histórico de conversa persistente
-- ============================================

CREATE TABLE IF NOT EXISTS bot_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_user_id BIGINT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bot_historico_user_time
    ON bot_historico (telegram_user_id, criado_em DESC);
-- Backend usa SERVICE_KEY → policy permissiva:
ALTER TABLE bot_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_full_access" ON bot_historico FOR ALL USING (true);
```

---

## 💰 LÓGICA DE NEGÓCIO — FINANCEIRO

```python
# config.py
CATEGORIAS_VARIAVEIS = [
    "Alimentação", "Transporte", "Lazer",
    "Vestuário", "Saúde", "Educação", "Outros"
]

DESPESAS_FIXAS_MAP = {
    "aluguel": "aluguel", "moradia": "aluguel",
    "condomínio": "condominio",
    "energia": "energia", "luz": "energia",
    "água": "agua",
    "internet": "internet_telefone", "telefone": "internet_telefone",
    "plano de saúde": "plano_saude",
    "seguro": "seguro",
    "mensalidade": "mensalidade", "assinatura": "mensalidade"
}
```

```python
# queries.py — fórmulas extraídas da planilha original

def get_resumo_mes(mes, ano):
    salario   = config_financeiro.salario_fixo
    freela    = SUM(entradas WHERE mes=mes AND ano=ano)
    total_ent = salario + freela
    fixas     = UPSERT_OR_GET despesas_fixas WHERE mes=mes AND ano=ano
    total_fix = SUM(todos os campos de fixas)
    total_var = SUM(lancamentos.valor WHERE mes=mes AND ano=ano)
    total_inv = SUM(investimentos.valor WHERE mes=mes AND ano=ano)
    saldo     = total_ent - total_fix - total_var - total_inv
    meta_inv  = salario * meta_investimento_pct
    pct_meta  = (total_inv / meta_inv * 100) if meta_inv > 0 else 0
    return { salario, freela, total_ent, total_fix, total_var,
             total_inv, saldo, meta_inv, pct_meta }

def get_gastos_periodo(data_inicio, data_fim, categoria=None):
    """Consultas: hoje, semana, mês, intervalo personalizado, por categoria"""

def get_maior_gasto(mes, ano):
    """Maior lançamento do mês: valor + descrição + data"""

def get_total_por_categoria(mes, ano):
    """Soma por categoria para responder 'quanto gastei em X'"""
```

---

## ✅ LÓGICA DE NEGÓCIO — WORK

```python
# config.py
ALIASES_CLIENTES = {
    "cida car": "CIDACAR", "cidacar": "CIDACAR", "cida": "CIDACAR",
    "gspneus": "GSPNEUS", "gs pneus": "GSPNEUS", "gs": "GSPNEUS",
    "aceleração": "ACELERAÇÃO VFX", "aceleracao": "ACELERAÇÃO VFX",
    "vfx": "ACELERAÇÃO VFX",
    "alpha": "ALPHA CENTRO", "alpha centro": "ALPHA CENTRO",
}

def resolver_cliente(texto):
    t = texto.lower().strip()
    for alias, nome in ALIASES_CLIENTES.items():
        if alias in t:
            return nome
    return None
```

---

## 🤖 PARSER LLM — INTENÇÕES MAPEADAS

Modelo: `meta-llama/llama-4-scout-17b-16e-instruct` via Groq. Histórico: até 20 pares persistidos no Supabase (`bot_historico`). Limpar histórico: `/reset` no chat.

**Intenções financeiras:** `inserir_lancamento`, `inserir_entrada`, `inserir_investimento`, `adicionar_fixa`, `atualizar_fixa`, `deletar_fixa`, `consulta_fixas`, `atualizar_salario`, `consulta_hoje`, `consulta_semana`, `consulta_mes`, `consulta_resumo`, `consulta_categoria`, `consulta_maior_gasto`, `consulta_investimentos_ano`, `editar_ultimo_lancamento`, `deletar_lancamento`, `deletar_entrada`, `deletar_todos_lancamentos`, `deletar_todos_entradas`, `deletar_lancamentos_mes`

**Intenções work:** `nova_tarefa`, `consulta_pendentes`, `concluir_tarefa`, `deletar_tarefa`, `registrar_pagamento_cliente`, `consulta_pagamentos_cliente`

> Prompt completo em `backend/bot/parser.py` → `SYSTEM_PROMPT`

---

## ⏰ AUTOMAÇÕES AGENDADAS

```python
# bot/scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
scheduler = BackgroundScheduler(timezone="America/Sao_Paulo")

@scheduler.scheduled_job('cron', hour=9, minute=0)
def lembrete_tarefas_vencendo():
    # ⚠️ Tarefas vencendo em breve:
    # • CIDACAR: Relatório de tráfego → amanhã (28/03)
    # • GSPNEUS: Revisão boletos → em 2 dias (29/03)

@scheduler.scheduled_job('cron', day_of_week='mon', hour=8, minute=0)
def relatorio_semanal():
    # 📊 Semana 24/03 – 30/03
    # 💸 Gastos: R$ 420,00 (7 lançamentos)
    # ✅ Concluídas: 3 | ⏳ Em aberto: 5
    # 💰 Saldo atual: R$ 1.580,00

scheduler.start()
```

---

## 🔒 SEGURANÇA

```python
ALLOWED_USER_IDS = os.getenv("ALLOWED_USER_IDS", "").split(",")
def is_authorized(user_id): return str(user_id) in ALLOWED_USER_IDS
# IDs não autorizados: ignorar silenciosamente

# Backend → Supabase: SERVICE_KEY (bypassa RLS)
# Frontend → Supabase: ANON_KEY + JWT Auth (respeita RLS)
# NUNCA SERVICE_KEY no frontend | NUNCA ANON_KEY para writes no backend
```

---

## 🔧 VARIÁVEIS DE AMBIENTE

```env
# Backend (HF Spaces)
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_URL=        # https://[user]-vinbot.hf.space/webhook
ALLOWED_USER_IDS=
GROQ_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=        # service_role key — NUNCA no frontend

# Frontend (Vercel) — configurar apenas na Fase 3
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## 📦 REQUIREMENTS

```txt
flask>=3.0.0
gunicorn>=21.0.0
python-telegram-bot>=21.0.0
groq>=0.11.0
supabase>=2.0.0
apscheduler>=3.10.0
python-dateutil>=2.9.0
pillow>=10.0.0
requests>=2.31.0
```

---

## 🐛 EDGE CASES DOCUMENTADOS

| Situação | Comportamento |
|---|---|
| "quanto gastei hoje" sem lançamentos | "Nenhum gasto registrado hoje ainda 😊" |
| Qualquer DELETE | Mostra o item, aguarda confirmação antes de excluir |
| "Cida Car concluída" sem especificar tarefa | Lista pendentes numeradas, aguarda número |
| Valor não mencionado | `incerto` → "Qual o valor?" |
| Foto ilegível (confiança baixa) | "Não consegui ler bem. Valor e onde foi?" |
| "Cida Car pagou" sem valor | "Qual o valor do pagamento?" |
| Mês sem registro de fixas | UPSERT cria registro com zeros automaticamente |
| Investimento acima da meta | Registra + "🎯 Meta de 20% já superada!" |
| Cliente não reconhecido | "Qual cliente? GSPNEUS, CIDACAR, ACELERAÇÃO VFX ou ALPHA CENTRO?" |
| Supabase indisponível | Fila `pending.json` + retry a cada 60s |
| Sessão expirada no dashboard | ProtectedRoute redireciona para /login |

---

## 🗺️ ROADMAP

### Fase 1 — MVP Financeiro ✅ CONCLUÍDO
- [x] Schema SQL + seeds no Supabase
- [x] Webhook Flask no HF Spaces
- [x] Parser Groq: texto → JSON com todas as intenções financeiras
- [x] INSERT: lançamentos, entradas, investimentos
- [x] UPSERT: despesas_fixas
- [x] UPDATE: config_financeiro (salário)
- [x] DELETE com confirmação prévia
- [x] Consultas por período: hoje, semana, mês, categoria, maior gasto
- [x] get_resumo_mes() completo
- [x] Controle de acesso por user_id

### Fase 2 — OCR + Módulo Work ✅ CONCLUÍDO
- [x] OCR comprovantes via Groq Vision
- [x] CRUD tarefas via Telegram
- [x] pagamento_cliente — duplo INSERT linkado
- [x] Lembrete diário + relatório semanal (APScheduler)

### Fase 3 — Sistema Web Completo ✅ CONCLUÍDO
- [x] React + Vite + Vercel — https://vinbot-dashboard.vercel.app
- [x] Login email/senha (Supabase Auth) + ProtectedRoute
- [x] /financeiro: filtros + tabela editável + resumo
- [x] /work: Kanban + histórico pagamentos + documentos
- [x] /relatorios: gráficos Recharts
- [x] / : visão geral KPIs + evolução mensal

### Fase 4 — Multi-tenant + Onboarding + Melhorias Frontend (PRÓXIMA)
> Objetivo: qualquer cliente se registra, configura o bot e usa — sem intervenção manual.

**Multi-tenant:**
- [ ] Adicionar `user_id` em todas as tabelas (migration sem quebrar dados existentes)
- [ ] Criar tabela `user_bots` para guardar token + telegram_user_id por usuário
- [ ] Supabase Auth Hook: ao criar conta, provisionar `config_financeiro` automaticamente
- [ ] Tela de Onboarding pós-registro: passo a passo para criar bot no @BotFather
- [ ] Campo para colar token → backend valida + registra webhook automaticamente
- [ ] Bot responde `/start` → captura telegram_user_id e vincula à conta
- [ ] RLS multi-tenant: cada usuário vê e escreve apenas nos próprios dados
- [ ] Backend multi-tenant: identifica usuário pelo `bot_token` da requisição

**Bot — melhorias:**
- [x] Bulk delete com confirmação única (`deletar_todos_lancamentos`, `deletar_todos_entradas`, `deletar_lancamentos_mes`)
- [x] Histórico de conversa persistente no Supabase (tabela `bot_historico`) — sobrevive a reinícios

**Frontend — melhorias:**
- [x] Responsividade mobile: BottomNav iOS-style (5 abas) + Sidebar oculta no mobile
- [x] BottomNav com divisor visual entre grupos Contábil / Trabalho
- [ ] Perfil do usuário no rodapé da sidebar: avatar + email + sair
- [ ] Empty states em todas as páginas sem dados (ícone + título + call-to-action)
- [ ] Barra de progresso visual na meta de investimento (vermelho/amarelo/verde)
- [ ] Página `/configuracoes`: conta + bot Telegram + preferências
- [ ] Painel lateral de detalhes ao clicar em tarefa
- [ ] Clientes com email/telefone editáveis na tabela
- [ ] Loading skeleton ao trocar de aba ou mês

---

## 🏗️ FASE 4 — ARQUITETURA MULTI-TENANT

### Tabela `user_bots` (nova)

```sql
CREATE TABLE user_bots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    bot_token TEXT NOT NULL,
    bot_username TEXT,
    telegram_user_id BIGINT,        -- preenchido quando cliente manda /start
    webhook_ativo BOOLEAN DEFAULT false,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE user_bots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON user_bots FOR ALL USING (auth.uid() = user_id);
```

### Migration: adicionar `user_id` em todas as tabelas

```sql
-- Rodar para cada tabela existente
ALTER TABLE lancamentos ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE entradas ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE investimentos ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE despesas_fixas ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE config_financeiro ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE tarefas ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE clientes ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE pagamentos_clientes ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE documentos ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Atualizar registros existentes com o user_id do dono atual (Vinicius)
-- UPDATE lancamentos SET user_id = 'UUID_DO_VINICIUS' WHERE user_id IS NULL;
-- (repetir para cada tabela)

-- Depois tornar NOT NULL
ALTER TABLE lancamentos ALTER COLUMN user_id SET NOT NULL;
-- (repetir para cada tabela)

-- Recriar RLS com isolamento por user_id
CREATE POLICY "user_isolation" ON lancamentos FOR ALL USING (auth.uid() = user_id);
-- (repetir para cada tabela)
```

### Supabase Auth Hook — provisioning automático

```sql
-- Function que roda automaticamente ao criar nova conta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Cria config_financeiro zerada para o novo usuário
  INSERT INTO public.config_financeiro (user_id, salario_fixo, meta_investimento_pct)
  VALUES (NEW.id, 0, 0.20);

  -- Cria clientes padrão (pode personalizar no onboarding)
  -- INSERT INTO public.clientes (user_id, nome) VALUES (NEW.id, 'Cliente 1');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Backend multi-tenant — identificação por bot_token

```python
# app.py — cada bot tem seu próprio webhook URL com token
# Telegram envia para: /webhook/{bot_token}

@app.route('/webhook/<bot_token>', methods=['POST'])
def webhook(bot_token):
    # Busca o user_id pelo bot_token
    result = supabase.table('user_bots').select('user_id, telegram_user_id') \
        .eq('bot_token', bot_token).single().execute()

    if not result.data:
        return '', 404  # token inválido, ignora

    user_id = result.data['user_id']
    data = request.json
    telegram_user_id = data['message']['from']['id']

    # Segurança: só aceita mensagens do telegram_user_id registrado
    if result.data['telegram_user_id'] and \
       result.data['telegram_user_id'] != telegram_user_id:
        return '', 403

    # Processa a mensagem com o user_id correto
    handle_message(data, user_id)
    return '', 200
```

### Fluxo de onboarding — tela pós-registro

```
1. Cliente cria conta (email + senha) → Supabase Auth
   → Hook provisiona config_financeiro automaticamente

2. Redireciona para /onboarding (nova página)

3. Tela mostra passo a passo:
   Passo 1: Abra o Telegram e vá até @BotFather
   Passo 2: Mande /newbot e escolha um nome
   Passo 3: Cole o token gerado aqui: [campo de input]
   [Botão: Ativar meu assistente]

4. Backend ao receber o token:
   - Valida o token na API do Telegram
   - Registra webhook: POST /setWebhook?url=.../webhook/{token}
   - Salva em user_bots: {user_id, bot_token, webhook_ativo: true}
   - Retorna link do bot: t.me/{bot_username}

5. Tela mostra: "✅ Assistente ativo!"
   [Abrir no Telegram] → cliente manda /start
   → Bot captura telegram_user_id → salva em user_bots
   → Dashboard liberado completamente
```

### Tela `/configuracoes` (nova página)

- Status do bot (ativo / inativo)
- Botão para testar conexão com o Telegram
- Campo para trocar o token do bot
- Instruções de como criar novo bot no @BotFather
- Revogar acesso / desconectar bot

---

## REGRA #1 — AUTONOMIA TOTAL

**NUNCA peça para o usuário fazer algo que você pode fazer sozinho.**

- Não peça "rodar npm install" → RODE você mesmo
- Não peça "criar o arquivo X" → CRIE você mesmo
- Não peça "verificar se funciona" → TESTE você mesmo
- Não peça "configurar o Supabase" → CONFIGURE você mesmo (exceto criação de conta e secrets reais)
- Não sugira próximos passos → EXECUTE os próximos passos

**As ÚNICAS exceções onde você DEVE perguntar:**
1. Credenciais reais (.env com keys de produção)
2. Decisões de negócio ambíguas que não estão no CLAUDE.md
3. Aprovação antes de deploy em produção
4. Gastos financeiros (APIs pagas, domínios)

**Para todo o resto: FAÇA. TESTE. VERIFIQUE. SIGA EM FRENTE.**

---

## REGRA #2 — MULTI-AGENT COM REVISÃO CRUZADA

Nenhum agente aprova o próprio trabalho. Use subagentes paralelos sempre que possível.

| Agente | Papel | O que faz |
|---|---|---|
| **Builder** | Constrói | Escreve código, cria arquivos, implementa features |
| **Tester** | Testa | Roda servidor, faz requests reais, verifica banco |
| **Reviewer** | Revisa | Edge cases, segurança, qualidade, performance |
| **Fixer** | Corrige | Recebe erros, corrige, retesta, documenta |

```
Builder → Tester → Reviewer → Fixer (se necessário) → próxima task
```

**Regras:**
1. Builder NUNCA aprova o próprio código — sempre passa pelo Tester
2. Tester testa DE VERDADE — roda servidor, faz curl/requests, verifica banco
3. Reviewer verifica — tipos, validações, segurança, edge cases, performance
4. Fixer documenta — toda correção vira nota para não repetir o erro
5. Máximo 3 ciclos de correção por task — se não resolver, PARE e reporte
6. Nunca entregue código sem passar pelos 4 papéis

---

## REGRA #3 — NUNCA QUEBRAR O QUE JÁ FUNCIONA

**Antes de modificar qualquer arquivo existente:**
1. Leia o arquivo completo
2. Entenda o padrão atual
3. Faça a menor mudança possível
4. Teste que o comportamento anterior continua funcionando

**Prefira criar arquivos novos a modificar existentes.**
Só modifique arquivos existentes para: registrar blueprint, adicionar rota,
adicionar item no menu, importar componente.

**Após cada mudança:** testar o que foi alterado + testar o que existia antes.
Deploy apenas após cada grupo de tasks concluído e testado.

---

## 🔗 REFERÊNCIAS

- Planilha (modelo): `Financeiro_Vinicius.xlsx`
- Notion Work (modelo): `notion.so/WORK-27f6a79f4c5780059d8ae6cd71bb263d`
- Telegram Bot API: https://core.telegram.org/bots/api
- Groq API: https://console.groq.com/docs
- Supabase: https://supabase.com/docs
- Supabase Auth: https://supabase.com/docs/guides/auth
- python-telegram-bot: https://python-telegram-bot.org/

---

## Fase 4 — Arquitetura Multi-tenant (IMPLEMENTADO)

### Como funciona

Cada usuário tem seu próprio bot do Telegram. O webhook é por token:

```
POST /webhook/<bot_token>   ← multi-tenant (Fase 4)
POST /webhook               ← legado Vinicius (backward compat)
```

O  na URL identifica o usuário. O backend busca  na tabela  e seta via  (thread-local) antes de processar.

### user_context.py (threading.local)



Todos os módulos DB chamam  para filtrar/inserir pelo usuário correto. Nenhuma assinatura de função foi alterada.

### Rotas /api/bot/*

| Rota | Método | Auth | Função |
|---|---|---|---|
|  | GET | JWT | Retorna status do bot (ativo, bot_username, telegram_user_id) |
|  | POST | JWT | Valida token, registra webhook, salva em user_bots |
|  | DELETE | JWT | Remove bot_token e desregistra webhook |

Autenticação:  → .

### Fluxo de onboarding

1. Usuário cria conta → Auth Hook provisiona  automaticamente
2. Redireciona para  (fora do ProtectedRoute)
3. Wizard 3 passos: abrir @BotFather → /newbot → colar token
4. Backend valida token →  → salva em 
5. Tela de sucesso com link 

### Auth Hook (Supabase trigger)



### RLS multi-tenant

Todas as 9 tabelas têm policy :


O backend usa SERVICE_KEY (bypassa RLS) e seta  manualmente via .
O frontend usa ANON_KEY + JWT (RLS filtra automaticamente).

### Migration

 — rodar no Supabase SQL Editor:
- Adiciona coluna  em todas as tabelas
- Backfill com UUID do Vinicius (dados existentes)
- Cria policies 
- Cria tabela 
- Cria trigger Auth Hook
- Insere registro do bot do Vinicius em 
