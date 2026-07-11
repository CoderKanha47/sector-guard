FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]