FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# Corepack resolves the exact pnpm version from package.json's packageManager field.
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm run build

FROM base AS production-deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM base
ENV NODE_ENV=production
ENV PORT=3000
COPY package.json pnpm-lock.yaml ./
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
EXPOSE 3000
# Run the server entry directly. Going through `pnpm run` would make corepack
# fetch pnpm from the npm registry on every cold boot, for nothing. Point at the
# package's bin.js, not node_modules/.bin — pnpm puts a shell shim there, and
# Node cannot parse that as JavaScript.
CMD ["node", "./node_modules/@react-router/serve/bin.js", "./build/server/index.js"]
