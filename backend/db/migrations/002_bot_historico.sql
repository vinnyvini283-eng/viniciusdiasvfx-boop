-- VinBot — Histórico de conversa persistente do bot
-- Execute no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS bot_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_user_id BIGINT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bot_historico_user_time
    ON bot_historico (telegram_user_id, criado_em DESC);

-- RLS: backend usa SERVICE_KEY (bypassa). Desabilitar para simplicidade.
-- Ou habilitar com policy permissiva para service role:
ALTER TABLE bot_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_full_access" ON bot_historico
    FOR ALL USING (true);
