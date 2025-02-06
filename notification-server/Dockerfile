FROM node:22.13.1-alpine

WORKDIR /app

COPY package.json package-lock.json /app/

RUN npm install

COPY . /app/

EXPOSE 4040

CMD ["npm", "run", "start"]
