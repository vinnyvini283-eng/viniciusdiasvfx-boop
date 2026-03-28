-- ─────────────────────────────────────────────────
-- Tabelas do módulo Work
-- Rodar no SQL Editor do Supabase
-- ─────────────────────────────────────────────────

-- Clientes
CREATE TABLE IF NOT EXISTS work_clients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  contato     text,
  valor_mensal numeric(10,2) DEFAULT 0,
  ativo       boolean DEFAULT true,
  observacao  text,
  created_at  timestamptz DEFAULT now()
);

-- Tarefas
CREATE TABLE IF NOT EXISTS work_tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo      text NOT NULL,
  cliente     text,
  prioridade  text CHECK (prioridade IN ('alta','media','baixa')) DEFAULT 'media',
  done        boolean DEFAULT false,
  prazo       date,
  observacao  text,
  created_at  timestamptz DEFAULT now()
);

-- Documentos
CREATE TABLE IF NOT EXISTS work_docs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo      text NOT NULL,
  tipo        text DEFAULT 'doc',
  cliente     text,
  conteudo    text,
  created_at  timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE work_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_tasks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_docs    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_only" ON work_clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_only" ON work_tasks   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_only" ON work_docs    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_work_tasks_done ON work_tasks(done);
CREATE INDEX IF NOT EXISTS idx_work_clients_ativo ON work_clients(ativo);
