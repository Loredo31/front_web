# 1. Compilacion de React + Vite
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_URL
ARG VITE_ID_DISTRIBUIDOR
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ID_DISTRIBUIDOR=$VITE_ID_DISTRIBUIDOR
RUN npm run build

# 2. Servidor Nginx ultra rapido con soporte SPA (React Router)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
RUN printf 'server {\n    listen 80;\n    location / {\n        root /usr/share/nginx/html;\n        index index.html;\n        try_files $uri $uri/ /index.html;\n    }\n}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

# Soporta tanto port 80 como el $PORT dinamico de Railway
CMD ["/bin/sh", "-c", "sed -i -e 's/listen 80;/listen '${PORT:-80}';/g' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
