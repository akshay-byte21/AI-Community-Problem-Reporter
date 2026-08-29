FROM node:18-alpine

# Build the admin-web
WORKDIR /app/admin-web
COPY admin-web/package*.json ./
RUN npm install
COPY admin-web/ ./
RUN npm run build

# Setup the backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./

# Create data directory for Persistent Volume
RUN mkdir -p /data/uploads
ENV DB_PATH=/data/database.sqlite
ENV UPLOAD_DIR=/data/uploads

EXPOSE 8080

CMD ["node", "server.js"]
