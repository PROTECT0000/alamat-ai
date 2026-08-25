FROM node:22-alpine AS build

WORKDIR /src
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci
COPY api ./api
COPY frontend ./frontend
RUN cd frontend && npm run generate:api && npm run build

FROM nginx:1.29-alpine
ENV BACKEND_UPSTREAM=host.docker.internal:8787
ENV NGINX_ENVSUBST_FILTER=BACKEND_UPSTREAM
COPY frontend/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /src/frontend/dist /usr/share/nginx/html
EXPOSE 80
