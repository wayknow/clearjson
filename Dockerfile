FROM node:18-alpine
WORKDIR /app

COPY clearjson-mcp/package*.json ./
RUN npm ci --omit=dev

COPY clearjson-mcp/src/ ./src/
COPY clearjson-mcp/LICENSE ./

CMD ["node", "src/index.js"]
