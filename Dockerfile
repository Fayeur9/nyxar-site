# Build du frontend (Node 22)
FROM node:22.12.0-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Build du backend (Node 22)
FROM node:22.12.0-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ ./

# Image finale
FROM node:22.12.0-alpine
WORKDIR /app/backend
COPY --from=backend-build /app/backend /app/backend
COPY --from=frontend-build /app/frontend/dist /app/backend/public
COPY frontend/public/uploads /app/backend/public/uploads
ENV NODE_ENV=production
ENV PORT=80
EXPOSE 80
CMD ["node", "server.js"]
