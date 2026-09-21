FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json server.js manage-user.js ./
COPY public ./public
RUN mkdir -p /data
ENV DATA_DIR=/data
EXPOSE 3000
CMD ["node", "server.js"]
