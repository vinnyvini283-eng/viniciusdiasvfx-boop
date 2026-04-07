#!/bin/bash
# Fix DNS resolution in HF Spaces container
echo "nameserver 8.8.8.8" > /etc/resolv.conf
echo "nameserver 1.1.1.1" >> /etc/resolv.conf
exec gunicorn --bind 0.0.0.0:7860 --workers 1 --timeout 120 app:app
