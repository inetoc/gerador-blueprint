# Gerador de Blueprint

Cole o link de um site e receba tokens, blueprint (.md) e um HTML com modos GUIA/CLONE.

    node server.js          # http://localhost:3000 (salva aprovados em banco-de-templates/)
    PUBLIC=1 HOST=0.0.0.0 node server.js   # modo público: não grava em disco

Sem dependências npm. Bloqueia destinos internos (SSRF) e limita requisições por IP.
