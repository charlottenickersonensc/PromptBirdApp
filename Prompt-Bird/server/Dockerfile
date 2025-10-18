FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

RUN npm install --legacy-peer-deps || yarn install || pnpm install --shamefully-hoist

COPY . .

RUN npm run build

CMD ["node", "dist/index.js"]
