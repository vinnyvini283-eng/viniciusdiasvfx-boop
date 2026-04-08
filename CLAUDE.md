# VinBot — CLAUDE.md

Assistente pessoal via Telegram com dashboard web. Gerencia finanças pessoais e tarefas de trabalho freelance.

---

## Stack

| Camada | Tecnologia | Onde roda |
|---|---|---|
| Bot / API | Python Flask + Gunicorn | Hugging Face Spaces (Docker) |
| LLM | Groq `meta-llama/llama-4-scout-17b-16e-instruct` | Groq API |
| Banco | Supabase PostgreSQL | Supabase (free tier) |
| Frontend | React + Vite + Tailwind + Recharts | Vercel |
| Scheduler | APScheduler (BackgroundScheduler) | Dentro do Flask |

---

## Repositório

```
vinbot/
├── Dockerfile
├── README.md               # config YAML do HF Space
├── start.sh                # DNS fix + gunicorn startup
├── backend/
│   ├── app.py              # Flask: /webhook /health /set-webhook /importar-extrato (CORS ativo)
│   ├── dns_fix.py          # monkey-patch socket para usar 8.8.8.8
│   ├── config.py           # is_authorized(), get_supabase_user_uuid(), ALIASES_CLIENTES
│   ├── requirements.txt    # inclui pdfplumber, flask-cors
│   ├── bot/
│   │   ├── handlers.py     # handle_message() + handle_pdf_extrato()
│   │   ├── parser.py       # Groq LLM → intent JSON + histórico por usuário
│   │   ├── telegram_api.py # send_message, set_webhook, download_file
│   │   ├── ocr.py          # processar_foto(file_id) → {valor, descricao, categoria, confianca}
│   │   ├── scheduler.py    # APScheduler: lembrete 07h seg-sex + relatório semanal segunda 08h
│   │   └── formatter.py    # formata respostas do bot
│   ├── db/
│   │   └── supabase_client.py
│   ├── financeiro/
│   │   ├── lancamentos.py
│   │   ├── entradas.py
│   │   ├── fixas.py        # CRUD dinâmico de contas_fixas
│   │   ├── investimentos.py
│   │   ├── importar.py     # parse_pdf_nubank() → {lancamentos, entradas, pagamentos_clientes}
│   │   └── queries.py
│   └── work/
│       ├── tarefas.py
│       ├── clientes.py
│       └── documentos.py
└── frontend/
    ├── src/
    │   ├── App.jsx              # rotas: / /financeiro /relatorios /work /work/tarefas /work/relatorios
    │   ├── components/
    │   │   ├── Navbar.jsx       # sidebar 2 seções: CONTÁBIL | TRABALHO
    │   │   ├── Modal.jsx        # modal reutilizável com ESC/backdrop
    │   │   ├── ProtectedRoute.jsx
    │   │   └── StatCard.jsx     # card KPI com icon, value, trend
    │   ├── contexts/
    │   │   └── AuthContext.jsx  # Supabase Auth (signIn/signUp/signOut)
    │   ├── lib/
    │   │   └── supabase.js
    │   └── pages/
    │       ├── Login.jsx          # tabs: Entrar / Criar conta (signUp Supabase)
    │       ├── Dashboard.jsx      # KPIs financeiros + PieChart + últimos lançamentos
    │       ├── Financeiro.jsx     # 5 tabs: Resumo|Lançamentos|Fixas|Entradas|Investimentos
    │       │                      # botão "Importar extrato" (PDF Nubank) + preview modal
    │       │                      # calculadora de projeção de investimentos com gráfico
    │       ├── Relatorios.jsx     # 4 tabs: Evolução | Categorias | Investimentos | Clientes
    │       ├── WorkDashboard.jsx  # /work — KPIs: pendentes, vence hoje, atrasadas, receita mês
    │       ├── Work.jsx           # /work/tarefas — CRUD tarefas+clientes+pagamentos+docs
    │       └── WorkRelatorios.jsx # /work/relatorios — receita por cliente, tarefas por status
    ├── .env                  # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY + VITE_HF_API_URL
    └── package.json
```

---

## Banco de dados — tabelas Supabase

```sql
-- Financeiro
lancamentos      (id, user_id, descricao, valor, categoria, data, mes, ano, criado_em)
entradas         (id, user_id, descricao, valor, fonte, mes, ano, criado_em)
contas_fixas     (id, user_id, nome, valor, ativo, criado_em)
                 -- tabela dinâmica: cada conta fixa é uma linha, não coluna
                 -- bot escreve com user_id = SUPABASE_USER_UUID (uuid do auth)
investimentos    (id, user_id, descricao, valor, tipo, rentabilidade_pct, indice,
                  mes, ano, criado_em)
                 -- rentabilidade_pct: % do índice (ex: 110 = 110% CDI, 6.5 = IPCA+6.5%)
                 -- indice: 'CDI' | 'IPCA' | 'Prefixado' | 'Poupança' | null
config_financeiro (id, user_id, salario_fixo, meta_investimento_pct, cdi_atual, criado_em)
                 -- cdi_atual: taxa CDI base para cálculos (ex: 13.75) — atualizar quando Copom mudar

-- SQL para adicionar campos novos (rodar no Supabase SQL Editor):
-- ALTER TABLE investimentos ADD COLUMN IF NOT EXISTS rentabilidade_pct numeric;
-- ALTER TABLE investimentos ADD COLUMN IF NOT EXISTS indice text CHECK (indice IN ('CDI','IPCA','Prefixado','Poupança'));
-- ALTER TABLE config_financeiro ADD COLUMN IF NOT EXISTS cdi_atual numeric DEFAULT 13.75;

-- Work
tarefas          (id, user_id, nome, descricao, feito, status, data_limite,
                  cliente_id, observacao, concluido_em, criado_em)
clientes         (id, user_id, nome, email, telefone, criado_em)
documentos       (id, user_id, titulo, conteudo, cliente_id, criado_em)
pagamentos_clientes (id, user_id, cliente_id, valor, descricao, data, criado_em)
```

---

## Variáveis de ambiente (HF Space)

Usar **Variables** (não Secrets) — a API de Secrets tem bug no HF.

| Variável | Descrição |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Token do @BotFather |
| `TELEGRAM_WEBHOOK_URL` | `https://<space>.hf.space/webhook` |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_KEY` | Service role key (bypassa RLS — bot precisa disso) |
| `GROQ_API_KEY` | Chave da Groq API |
| `ALLOWED_USER_IDS` | Telegram user_id autorizado (ex: `6903527008`) |
| `SUPABASE_USER_UUID` | UUID do usuário no Supabase Auth (para bot inserir com user_id correto) |

> **Por que SUPABASE_USER_UUID?** O bot usa service key (bypassa RLS), mas o frontend usa anon key (vê só próprios registros via RLS). Para que o bot escreva registros visíveis no frontend, precisa inserir o uuid correto do usuário auth.

---

## Problemas conhecidos e soluções

### DNS no HF Spaces
Kubernetes sobrescreve `/etc/resolv.conf` e bloqueia UDP porta 53.
**Solução:** `start.sh` adiciona IPs em `/etc/hosts` no startup.

```bash
echo "149.154.166.110 api.telegram.org" >> /etc/hosts
echo "172.64.149.20 api.groq.com" >> /etc/hosts
echo "104.18.38.10 uuezjatkibeprnqoigjc.supabase.co" >> /etc/hosts
```

### Supabase free tier pausa após ~7 dias sem uso
Sintoma: NXDOMAIN no DNS. Solução: entrar no dashboard Supabase → restaurar projeto → atualizar IP no start.sh se necessário.

### HF Space CONFIG_ERROR "collision on variables and secrets"
Ocorre quando o mesmo nome existe em Secrets E Variables. Solução: deletar da seção Secrets, manter só em Variables.

### Supabase email confirmation redireciona para localhost:3000
Padrão do Supabase. Solução: Authentication → Providers → Email → desabilitar "Confirm email" OU definir Site URL para URL de produção do Vercel.

---

## Deploy

### Backend (HF Spaces)
```bash
cd vinbot
git push hf main
# após deploy, registrar webhook:
curl -X POST https://<space>.hf.space/set-webhook
```

### Frontend (Vercel)
```bash
cd vinbot/frontend
npx vercel deploy --prod \
  --token <VERCEL_TOKEN> \
  --scope <VERCEL_SCOPE>
```

URL produção: **https://vinbot-dashboard.vercel.app**

---

## Intents do bot (parser.py)

### Financeiro
| Intent | Exemplo |
|---|---|
| `inserir_lancamento` | "gastei 50 no mercado" |
| `inserir_entrada` | "recebi 1000 de freela" |
| `inserir_investimento` | "investi 500 no tesouro" |
| `adicionar_fixa` | "adicionar fixa Academia 150" |
| `atualizar_fixa` | "aluguel agora é 1500" |
| `deletar_fixa` | "remove a fixa Netflix" (confirmacao_necessaria=true) |
| `consulta_fixas` | "minhas fixas" |
| `atualizar_salario` | "meu salário é 5000" |
| `consulta_hoje` | "quanto gastei hoje?" |
| `consulta_semana` | "quanto gastei essa semana?" |
| `consulta_mes` | "quanto gastei esse mês?" |
| `consulta_resumo` | "qual meu saldo / resumo" |
| `consulta_categoria` | "quanto gastei em alimentação?" |
| `consulta_maior_gasto` | "meu maior gasto do mês" |
| `consulta_investimentos_ano` | "quanto investi esse ano?" |
| `editar_ultimo_lancamento` | "corrige o último lançamento para 80" |
| `deletar_lancamento` | "apaga o último lançamento" (confirmacao_necessaria=true) |
| `deletar_entrada` | "apaga aquela entrada" (confirmacao_necessaria=true) |

### Work
| Intent | Exemplo |
|---|---|
| `nova_tarefa` | "nova tarefa GSPNEUS: relatório até sexta" |
| `consulta_pendentes` | "tarefas pendentes / pendentes da Cida Car" |
| `concluir_tarefa` | "conclui a tarefa de relatório" |
| `deletar_tarefa` | "deleta tarefa Y" (confirmacao_necessaria=true) |
| `registrar_pagamento_cliente` | "Cida Car pagou 1500" |
| `consulta_pagamentos_cliente` | "quanto a Cida Car me pagou?" |

### OCR (foto)
Foto enviada → `processar_foto(file_id)` → Groq Vision → categoriza automaticamente com confirmação.

### Áudio / Voz
Mensagem de voz enviada → `download_file(file_id)` → `transcrever_audio()` → Groq `whisper-large-v3` (pt) → texto transcrito exibido em itálico → processado como mensagem normal (`handle_message`).

Implementado em `bot/telegram_api.py` (`transcrever_audio`) e `app.py` (handler `voice`/`audio` antes do PDF).

### Importação de extrato PDF
PDF enviado no Telegram → `handle_pdf_extrato()` → `parse_pdf_nubank()` → LLM extrai e categoriza → preview no chat → usuário responde "sim" para confirmar.

- Gastos (saídas/compras/pix enviados) → `lancamentos` com categoria automática
- Entradas de clientes conhecidos → `pagamentos_clientes` (detecta por alias: cidacar, gspneus, aceleração, alpha)
- Outras entradas (pix recebidos de desconhecidos) → `entradas`

O mesmo endpoint `/importar-extrato` serve o dashboard web (upload via modal em Financeiro).

---

## Scheduler (APScheduler)

Roda dentro do Flask no HF Space. Timezone: `America/Sao_Paulo`.

| Job | Horário | Função |
|---|---|---|
| Lembrete tarefas do dia | Todos os dias 07:00 | Tarefas com `data_limite = hoje` + atrasadas (`feito=False`) |
| Relatório semanal | Segunda 08:00 | Gastos da semana + saldo do mês |

O lembrete das 07h mostra duas seções: "Vence hoje" e "Atrasadas" (data_limite < hoje).

---

## Lógica de Investimentos (implementado)

### Campos na tabela `investimentos`
- `rentabilidade_pct`: percentual do índice
  - CDI: 110 = 110% do CDI
  - IPCA: 6.5 = IPCA+6.5% a.a.
  - Prefixado: 13.5 = 13.5% a.a.
- `indice`: `'CDI' | 'IPCA' | 'Prefixado' | 'Poupança' | null`

### Taxa CDI base
`config_financeiro.cdi_atual` (default: 13.75%). Atualizar em ⚙ Salário & Meta quando Copom mudar.

### Calculadora de projeção (frontend — aba Investimentos)
- Input: principal, índice, rentabilidade_pct, período (6/12/18/24/36/60 meses)
- Fórmula: `valor_futuro(t) = principal * (1 + taxa_mensal)^t`
- Exibe gráfico de área (AreaChart) + valor final + ganho total

### Cálculo de rentabilidade efetiva
```
CDI-linked:   taxa_efetiva = cdi_atual * (rentabilidade_pct / 100)
IPCA-linked:  taxa_efetiva = ipca_atual + rentabilidade_pct  (não implementado ainda)
Prefixado:    taxa_efetiva = rentabilidade_pct
Poupança:     taxa_efetiva = 70% do CDI (automático)
```

### Projeção (gráfico)
- Input: valor investido, taxa efetiva a.a., período em meses
- Fórmula: `valor_futuro(t) = principal * (1 + taxa_mensal)^t`
  onde `taxa_mensal = (1 + taxa_aa/100)^(1/12) - 1`
- Exibir curva de 1 a 24 meses no gráfico

---

## Estrutura do Frontend (nova)

### Seção CONTÁBIL
- `/` → Dashboard contábil (KPIs: saldo, gastos mês, investido, receita)
- `/financeiro` → Financeiro (5 tabs: Resumo | Lançamentos | Fixas | Entradas | Investimentos)
- `/relatorios` → Relatórios contábeis (Evolução | Categorias | Investimentos c/ projeção | Clientes)

### Seção TRABALHO
- `/work` → Dashboard trabalho (KPIs: tarefas pendentes, vencendo hoje, receita mês, clientes ativos)
- `/work/tarefas` → CRUD completo (tarefas + clientes + pagamentos + docs) ← atual Work.jsx
- `/work/relatorios` → Relatórios work (receita por cliente, tarefas por status/cliente)

### Navbar
Visual separado em dois grupos com label:
```
[V] VinBot

── CONTÁBIL ──
  Dashboard
  Financeiro
  Relatórios

── TRABALHO ──
  Dashboard
  Tarefas
  Relatórios
```

---

## Mapeamento de clientes (aliases)

| Alias | Nome canônico |
|---|---|
| "cida", "cida car" | CIDACAR |
| "gs", "gs pneus", "pneus" | GSPNEUS |
| "aceleração", "aceleracao", "vfx" | ACELERAÇÃO VFX |
| "alpha" | ALPHA CENTRO |

---

## Modelo de negócio — Opção C (Serviço Gerenciado)

Para cada novo cliente:
1. Criar bot no @BotFather → anotar token
2. Criar projeto Supabase → rodar SQL das tabelas → anotar URL + service key + user UUID
3. Criar HF Space → push do mesmo repo → configurar Variables
4. Deploy Vercel com `.env` do cliente
5. `POST /set-webhook` para registrar webhook

Custo por cliente: ~R$0–10/mês (Groq API)
Sugestão de preço: R$300–500 setup + R$80–150/mês recorrente
