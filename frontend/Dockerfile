FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Default matches Docker Compose's internal DNS name for the backend
# service; override BACKEND_ORIGIN at deploy time (e.g. on Render,
# where services don't share a private network by that name) to the
# backend's own public URL instead. NGINX_ENVSUBST_FILTER restricts
# template substitution to just this one variable, so nginx's own
# request variables ($host, $remote_addr, etc.) are never touched.
ENV BACKEND_ORIGIN=http://backend:8000 \
    NGINX_ENVSUBST_FILTER=BACKEND_ORIGIN

EXPOSE 80
