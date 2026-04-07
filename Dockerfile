FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Fix DNS for Cloudflare-hosted APIs (HF Spaces blocks UDP port 53)
RUN echo "172.64.149.20 api.groq.com" >> /etc/hosts && \
    echo "104.18.38.236 api.groq.com" >> /etc/hosts && \
    echo "149.154.166.110 api.telegram.org" >> /etc/hosts

EXPOSE 7860

CMD ["/start.sh"]
