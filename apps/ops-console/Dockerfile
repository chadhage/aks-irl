# Static React-style ops console. Built with vanilla HTML+JS to keep the
# workshop focused on AKS, not toolchains. Serves over NGINX, proxies /api/*
# to the gateway-java HTTP control plane.
FROM nginx:1.27-alpine
COPY public/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
USER 101
EXPOSE 8080
