# syntax=docker/dockerfile:1
FROM node:22.14.0-alpine3.21 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM node:22.14.0-alpine3.21
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
WORKDIR /app
COPY package.json package-lock.json LICENSE README.md ./
COPY --from=build /app/dist ./dist
RUN npm ci --omit=dev && npm cache clean --force
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget --quiet --output-document=- http://127.0.0.1:3000/health || exit 1
CMD ["node", "dist/bin.js"]
