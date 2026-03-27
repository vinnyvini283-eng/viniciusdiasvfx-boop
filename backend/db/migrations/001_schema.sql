-- VinBot — Schema completo Fase 1
-- Execute no Supabase SQL Editor

-- ============================================================
-- MÓDULO FINANCEIRO
-- ============================================================

CREATE TABLE IF NOT EXISTS config_financeiro (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salario_fixo DECIMAL(10,2) DEFAULT 0,
    meta_investimento_pct DECIMAL(4,2) DEFAULT 0.20,
    taxa_rendimento_anual DECIMAL(4,2) DEFAULT 0.10,
    atualizado_em TIMESTAMPTZ DEFAULT now()
);
-- Garante exatamente 1 linha de configuração
INSERT INTO config_financeiro DEFAULT VALUES
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS despesas_fixas (
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

CREATE TABLE IF NOT EXISTS lancamentos (
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

CREATE TABLE IF NOT EXISTS entradas (
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

CREATE TABLE IF NOT EXISTS investimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    descricao TEXT NOT NULL,
    valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
    mes INTEGER GENERATED ALWAYS AS (EXTRACT(MONTH FROM data)::INTEGER) STORED,
    ano INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM data)::INTEGER) STORED,
    criado_em TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MÓDULO WORK
-- ============================================================

CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tarefas (
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

CREATE TABLE IF NOT EXISTS pagamentos_clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
    descricao TEXT,
    data DATE DEFAULT CURRENT_DATE,
    entrada_id UUID REFERENCES entradas(id),
    criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    url TEXT,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    arquivado BOOLEAN DEFAULT false,
    criado_em TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SEEDS
-- ============================================================

INSERT INTO clientes (nome) VALUES
  ('GSPNEUS'), ('CIDACAR'), ('ACELERAÇÃO VFX'), ('ALPHA CENTRO')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO documentos (nome, url) VALUES
  ('Plano de Ação', NULL),
  ('Modelo de Contrato', NULL),
  ('Cartão de Visita', 'https://airgo.bio/a785fb40'),
  ('Mídia Kit', NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE config_financeiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesas_fixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE entradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE investimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

-- Política: apenas usuários autenticados (JWT válido)
-- Backend usa SERVICE_KEY → bypassa RLS automaticamente
-- Frontend usa ANON_KEY + JWT → respeita RLS

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'config_financeiro','despesas_fixas','lancamentos',
        'entradas','investimentos','clientes','tarefas',
        'pagamentos_clientes','documentos'
    ] LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS auth_only ON %I; '
            'CREATE POLICY auth_only ON %I FOR ALL USING (auth.role() = ''authenticated'');',
            tbl, tbl
        );
    END LOOP;
END $$;

-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_lancamentos_mes_ano ON lancamentos(mes, ano);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON lancamentos(data);
CREATE INDEX IF NOT EXISTS idx_lancamentos_categoria ON lancamentos(categoria);
CREATE INDEX IF NOT EXISTS idx_entradas_mes_ano ON entradas(mes, ano);
CREATE INDEX IF NOT EXISTS idx_investimentos_mes_ano ON investimentos(mes, ano);
CREATE INDEX IF NOT EXISTS idx_tarefas_cliente ON tarefas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_feito ON tarefas(feito);
