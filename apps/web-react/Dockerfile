# Static frontend served by nginx. Despite the directory name, the workshop
# intentionally keeps the frontend as a static HTML file to avoid a Node build
# step — focus is AKS, not toolchains. Module 04 demonstrates how Istio routes
# traffic to v1/v2 of the backend, which the page renders distinctly.
FROM nginx:1.27-alpine
COPY public/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
USER 101
EXPOSE 8080
