FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends blender libegl1 libgl1 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
COPY server.mjs ./
COPY scene-spec.mjs ./
ENV NODE_ENV=production
ENV PORT=8081
EXPOSE 8081
CMD ["node", "server.mjs"]
