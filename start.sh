#!/bin/bash
# Fix DNS — HF Spaces Kubernetes blocks UDP port 53 and overwrites resolv.conf
# Hardcode known IPs directly into /etc/hosts (never overwritten by Kubernetes)

# Telegram API
echo "149.154.166.110 api.telegram.org" >> /etc/hosts

# Groq API (Cloudflare IPs)
echo "172.64.149.20 api.groq.com" >> /etc/hosts
echo "104.18.38.236 api.groq.com" >> /etc/hosts

# Supabase project (Cloudflare IP)
echo "104.18.38.10 uuezjatkibeprnqoigjc.supabase.co" >> /etc/hosts

exec gunicorn --bind 0.0.0.0:7860 --workers 1 --timeout 120 app:app
