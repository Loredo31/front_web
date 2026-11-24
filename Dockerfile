# 1. Compilacion de React + Vite
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2. Servidor Nginx con proxy inverso hacia el backend en Railway
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

ENV BACKEND_HOST="proyecto-production-3aca5b05.up.railway.app"
EXPOSE 80

CMD ["/bin/sh", "-c", "sed -e 's|${PORT}|'\"${PORT:-80}\"'|g' -e 's|${BACKEND_HOST}|'\"${BACKEND_HOST:-proyecto-production-3aca5b05.up.railway.app}\"'|g' /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
