# Dockerfile for the Claude webhook listener

FROM node:18-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . ./

EXPOSE 3000
CMD ["node", "server/index.js"]
