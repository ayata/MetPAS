# Use the official Nginx image (with envsubst support)
FROM nginx:1.27-alpine

# Copy SSL certificates (adjust paths if different)
# COPY server.crt /etc/nginx/ssl/server.crt
# COPY server.key /etc/nginx/ssl/server.key

# Copy frontend build to Nginx web root
COPY dist/ /usr/share/nginx/html/

# Copy the nginx template config
COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template

# Expose HTTP and HTTPS ports
EXPOSE 3000

# Use the default Nginx entrypoint (already runs envsubst on templates)
CMD ["nginx", "-g", "daemon off;"]
