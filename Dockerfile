FROM node:22-alpine
WORKDIR /app
COPY analyzer.js blueprint.js generator.js server.js index.html ./
ENV HOST=0.0.0.0 PORT=3000 PUBLIC=1
EXPOSE 3000
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
