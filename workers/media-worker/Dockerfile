FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates fonts-dejavu-core fontconfig && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
COPY server.mjs ./
COPY media-url-security.mjs ./
COPY render-job.mjs ./
COPY vendor ./vendor
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.mjs"]
