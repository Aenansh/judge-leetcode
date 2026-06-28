# Use the official lightweight Node.js 20 Alpine image
FROM node:22-alpine

WORKDIR /app
COPY package*.json ./

RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate

COPY src ./src

EXPOSE 3000

CMD ["npm", "start"]