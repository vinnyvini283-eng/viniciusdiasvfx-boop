-- ============================================================
-- MIGRATION 004 — Multi-tenant (Fase 4)
-- Rodar no Supabase SQL Editor
-- ============================================================

-- 1. Tabela user_bots (nova)
CREATE TABLE IF NOT EXISTS user_bots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    bot_token       TEXT NOT NULL,
    bot_username    TEXT,
    telegram_user_id BIGINT,
    webhook_ativo   BOOLEAN DEFAULT false,
    criado_em       TIMESTAMPTZ DEFAULT now(),
    atualizado_em   TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE user_bots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_isolation" ON user_bots;
CREATE POLICY "user_isolation" ON user_bots FOR ALL USING (auth.uid() = user_id);

-- 2. Backfill user_id nos registros existentes (UUID do Vinicius)
DO $$
DECLARE v_uid UUID := '1c934744-d806-4185-9344-1bfd7342b053';
BEGIN
    UPDATE lancamentos          SET user_id = v_uid WHERE user_id IS NULL;
    UPDATE entradas             SET user_id = v_uid WHERE user_id IS NULL;
    UPDATE investimentos        SET user_id = v_uid WHERE user_id IS NULL;
    UPDATE contas_fixas         SET user_id = v_uid WHERE user_id IS NULL;
    UPDATE config_financeiro    SET user_id = v_uid WHERE user_id IS NULL;
    UPDATE tarefas              SET user_id = v_uid WHERE user_id IS NULL;
    UPDATE clientes             SET user_id = v_uid WHERE user_id IS NULL;
    UPDATE pagamentos_clientes  SET user_id = v_uid WHERE user_id IS NULL;
    UPDATE documentos           SET user_id = v_uid WHERE user_id IS NULL;
END $$;

-- 3. RLS: substituir "auth_only" por isolamento por user_id
-- lancamentos
DROP POLICY IF EXISTS "auth_only"       ON lancamentos;
DROP POLICY IF EXISTS "user_isolation"  ON lancamentos;
CREATE POLICY "user_isolation" ON lancamentos FOR ALL USING (auth.uid() = user_id);

-- entradas
DROP POLICY IF EXISTS "auth_only"       ON entradas;
DROP POLICY IF EXISTS "user_isolation"  ON entradas;
CREATE POLICY "user_isolation" ON entradas FOR ALL USING (auth.uid() = user_id);

-- investimentos
DROP POLICY IF EXISTS "auth_only"       ON investimentos;
DROP POLICY IF EXISTS "user_isolation"  ON investimentos;
CREATE POLICY "user_isolation" ON investimentos FOR ALL USING (auth.uid() = user_id);

-- contas_fixas
DROP POLICY IF EXISTS "auth_only"       ON contas_fixas;
DROP POLICY IF EXISTS "user_isolation"  ON contas_fixas;
CREATE POLICY "user_isolation" ON contas_fixas FOR ALL USING (auth.uid() = user_id);

-- config_financeiro
DROP POLICY IF EXISTS "auth_only"       ON config_financeiro;
DROP POLICY IF EXISTS "user_isolation"  ON config_financeiro;
CREATE POLICY "user_isolation" ON config_financeiro FOR ALL USING (auth.uid() = user_id);

-- tarefas
DROP POLICY IF EXISTS "auth_only"       ON tarefas;
DROP POLICY IF EXISTS "user_isolation"  ON tarefas;
CREATE POLICY "user_isolation" ON tarefas FOR ALL USING (auth.uid() = user_id);

-- clientes
DROP POLICY IF EXISTS "auth_only"       ON clientes;
DROP POLICY IF EXISTS "user_isolation"  ON clientes;
CREATE POLICY "user_isolation" ON clientes FOR ALL USING (auth.uid() = user_id);

-- pagamentos_clientes
DROP POLICY IF EXISTS "auth_only"       ON pagamentos_clientes;
DROP POLICY IF EXISTS "user_isolation"  ON pagamentos_clientes;
CREATE POLICY "user_isolation" ON pagamentos_clientes FOR ALL USING (auth.uid() = user_id);

-- documentos
DROP POLICY IF EXISTS "auth_only"       ON documentos;
DROP POLICY IF EXISTS "user_isolation"  ON documentos;
CREATE POLICY "user_isolation" ON documentos FOR ALL USING (auth.uid() = user_id);

-- 4. Auth Hook — provisioning automático ao criar nova conta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- config_financeiro zerada para o novo usuário
    INSERT INTO public.config_financeiro (user_id, salario_fixo, meta_investimento_pct, cdi_atual)
    VALUES (NEW.id, 0, 0.20, 13.75)
    ON CONFLICT DO NOTHING;

    -- Clientes padrão
    INSERT INTO public.clientes (user_id, nome) VALUES
        (NEW.id, 'Cliente 1'),
        (NEW.id, 'Cliente 2')
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Registrar bot do Vinicius na user_bots
-- ATENÇÃO: substitua TOKEN_DO_BOT pelo token real
INSERT INTO user_bots (user_id, bot_token, telegram_user_id, webhook_ativo)
VALUES (
    '1c934744-d806-4185-9344-1bfd7342b053',
    'TOKEN_DO_BOT',        -- <-- SUBSTITUIR
    6903527008,            -- ALLOWED_USER_IDS do Vinicius
    true
)
ON CONFLICT (user_id) DO UPDATE
    SET telegram_user_id = EXCLUDED.telegram_user_id,
        webhook_ativo     = EXCLUDED.webhook_ativo;
