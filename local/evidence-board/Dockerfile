# The stack's MCP gateway: the evidence board MCP App plus a forwarder to the Grafana MCP server (see ../docker-compose.yml). Build context: this folder.
FROM node:22.22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN node build.mjs && npm prune --omit=dev

FROM node:22.22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/board.mjs /app/gateway.mjs /app/server.mjs /app/window.mjs ./
COPY --from=build /app/dist ./dist
USER node
EXPOSE 8001
CMD ["node", "server.mjs"]
