"""
Monkey-patch socket.getaddrinfo to use Google DNS (8.8.8.8).
HF Spaces containers have broken DNS resolution for external services.
"""
import socket
import dns.resolver

_resolver = dns.resolver.Resolver(configure=False)
_resolver.nameservers = ["8.8.8.8", "1.1.1.1"]

_original_getaddrinfo = socket.getaddrinfo

def _patched_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    try:
        answers = _resolver.resolve(host, "A")
        ip = str(answers[0])
        return _original_getaddrinfo(ip, port, family, type, proto, flags)
    except Exception:
        return _original_getaddrinfo(host, port, family, type, proto, flags)

socket.getaddrinfo = _patched_getaddrinfo
