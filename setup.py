"""
VinBot Setup — coleta credenciais e cria o .env automaticamente.
Executa: python setup.py
"""
import os
import subprocess
import sys
import webbrowser

ENV_PATH = os.path.join(os.path.dirname(__file__), "backend", ".env")

STEPS = [
    {
        "key": "SUPABASE_URL",
        "label": "Supabase URL",
        "url": "https://supabase.com/dashboard/projects",
        "instrucao": (
            "1. Entre no Supabase → selecione ou crie seu projeto\n"
            "2. Settings → API → Project URL\n"
            "   Formato: https://XXXXXXXXXXXX.supabase.co"
        ),
    },
    {
        "key": "SUPABASE_SERVICE_KEY",
        "label": "Supabase Service Role Key",
        "url": None,
        "instrucao": (
            "Na mesma tela (Settings → API):\n"
            "   'service_role' secret key (clique em 'Reveal')\n"
            "   ⚠️  NUNCA compartilhe esta key — bypassa RLS"
        ),
    },
    {
        "key": "TELEGRAM_BOT_TOKEN",
        "label": "Telegram Bot Token",
        "url": "https://t.me/BotFather",
        "instrucao": (
            "1. Abra o BotFather no Telegram\n"
            "2. /newbot → escolha nome e username\n"
            "3. Copie o token gerado\n"
            "   Formato: 1234567890:ABCdef..."
        ),
    },
    {
        "key": "ALLOWED_USER_IDS",
        "label": "Seu Telegram User ID",
        "url": "https://t.me/userinfobot",
        "instrucao": (
            "1. Abra o @userinfobot no Telegram\n"
            "2. Envie /start\n"
            "3. Copie o número 'Id:' que aparecer"
        ),
    },
    {
        "key": "GROQ_API_KEY",
        "label": "Groq API Key",
        "url": "https://console.groq.com/keys",
        "instrucao": (
            "1. console.groq.com → API Keys\n"
            "2. Create API Key → copie\n"
            "   Formato: gsk_..."
        ),
    },
    {
        "key": "TELEGRAM_WEBHOOK_URL",
        "label": "URL do Webhook (Hugging Face Spaces)",
        "url": "https://huggingface.co/new-space",
        "instrucao": (
            "1. huggingface.co → New Space\n"
            "   Nome: vinbot | SDK: Docker | Visibilidade: Public\n"
            "2. Anote seu username HF\n"
            "   Formato final: https://SEU_USER-vinbot.hf.space/webhook\n"
            "   (pode preencher agora com seu username, mesmo sem deploy)"
        ),
    },
]


def abrir_url(url: str):
    try:
        webbrowser.open(url)
        print(f"   → Abrindo no browser: {url}")
    except Exception:
        print(f"   → Acesse: {url}")


def coletar(step: dict) -> str:
    print()
    print("=" * 60)
    print(f"  {step['label']}")
    print("=" * 60)
    print(step["instrucao"])
    if step.get("url"):
        abrir_url(step["url"])
        input("\n   Pressione ENTER quando estiver pronto...")
    valor = input(f"\n   Cole o valor de {step['key']}: ").strip()
    while not valor:
        valor = input(f"   (obrigatório) {step['key']}: ").strip()
    return valor


def criar_env(valores: dict):
    conteudo = f"""# VinBot Backend — gerado por setup.py
TELEGRAM_BOT_TOKEN={valores['TELEGRAM_BOT_TOKEN']}
TELEGRAM_WEBHOOK_URL={valores['TELEGRAM_WEBHOOK_URL']}
ALLOWED_USER_IDS={valores['ALLOWED_USER_IDS']}
GROQ_API_KEY={valores['GROQ_API_KEY']}
SUPABASE_URL={valores['SUPABASE_URL']}
SUPABASE_SERVICE_KEY={valores['SUPABASE_SERVICE_KEY']}
PORT=7860
"""
    with open(ENV_PATH, "w") as f:
        f.write(conteudo)
    print(f"\n✅ .env criado em: {ENV_PATH}")


def abrir_schema():
    schema_path = os.path.join(
        os.path.dirname(__file__), "backend", "db", "migrations", "001_schema.sql"
    )
    sql_url = "https://supabase.com/dashboard/projects"
    print()
    print("=" * 60)
    print("  SCHEMA SQL — execute no Supabase")
    print("=" * 60)
    print(f"  1. Abra: {sql_url}")
    print("  2. Selecione seu projeto → SQL Editor → New query")
    print(f"  3. Copie e cole o conteúdo de:")
    print(f"     {schema_path}")
    print("  4. Clique em Run")
    abrir_url(sql_url)

    # Tenta copiar para clipboard
    try:
        with open(schema_path) as f:
            sql = f.read()
        if sys.platform == "win32":
            subprocess.run(["clip"], input=sql.encode(), check=True)
            print("\n  📋 SQL copiado para o clipboard! Só colar no editor.")
        elif sys.platform == "darwin":
            subprocess.run(["pbcopy"], input=sql.encode(), check=True)
            print("\n  📋 SQL copiado para o clipboard! Só colar no editor.")
    except Exception:
        pass

    input("\n  Pressione ENTER após executar o SQL no Supabase...")


def main():
    print()
    print("╔══════════════════════════════════════════╗")
    print("║         VinBot Setup — Fase 1            ║")
    print("╚══════════════════════════════════════════╝")
    print()
    print("Vamos coletar 6 credenciais.")
    print("O browser vai abrir em cada etapa.")
    input("Pressione ENTER para começar...")

    valores = {}
    for step in STEPS:
        valores[step["key"]] = coletar(step)

    criar_env(valores)
    abrir_schema()

    print()
    print("╔══════════════════════════════════════════╗")
    print("║            Setup concluído! ✅            ║")
    print("╚══════════════════════════════════════════╝")
    print()
    print("Próximos passos:")
    print("  1. Confirme que o SQL rodou no Supabase sem erros")
    print("  2. Crie o repositório no GitHub e empurre o código")
    print("  3. Configure os secrets no HF Spaces:")
    print("     Settings → Variables and secrets → adicione cada linha do .env")
    print("  4. Deploy automático ao dar git push")
    print()
    print("Para registrar o webhook após o deploy:")
    print("  curl -X POST https://SEU_USER-vinbot.hf.space/set-webhook")
    print()


if __name__ == "__main__":
    main()
