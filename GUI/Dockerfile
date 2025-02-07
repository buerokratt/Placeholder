ARG nginx_version=nginx:1.27.4-alpine

FROM node:22.0.0-alpine AS image
WORKDIR /usr/buerokratt-chatbot
COPY ./package*.json ./

FROM image AS build
RUN npm install --legacy-peer-deps --mode=development
COPY . .
RUN ./node_modules/.bin/vite build --mode=development
VOLUME /usr/buerokratt-chatbot

FROM $nginx_version AS web
COPY ./nginx/http-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build ./usr/buerokratt-chatbot/build/assets /usr/share/nginx/html/buerokratt-chatbot/chat/assets
COPY --from=build ./usr/buerokratt-chatbot/build/index.html /usr/share/nginx/html/buerokratt-chatbot
COPY --from=build ./usr/buerokratt-chatbot/build/favicon.ico /usr/share/nginx/html/buerokratt-chatbot
RUN apk add --no-cache bash
COPY ./nginx/scripts/env.sh /docker-entrypoint.d/env.sh
RUN chmod +x /docker-entrypoint.d/env.sh
EXPOSE 3001

ENTRYPOINT [ "bash", "/docker-entrypoint.d/env.sh" ]
