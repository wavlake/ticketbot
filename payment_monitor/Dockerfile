# Custom build image for running application, invoked in app.yaml runtime config
FROM node:16.20.0-slim

WORKDIR /app

# Install Python 3
RUN apt-get -y update && \
    apt-get install -y \
    python3 \
    python3-pip \
    apt-transport-https \
    ca-certificates \
    gnupg \
    curl \
    sudo
    
# Copy repo source and build ticket service
COPY ./ /app/
WORKDIR /app
RUN npm install --unsafe-perm ||  ((if [ -f npm-debug.log ]; then cat npm-debug.log; fi) && false)
RUN npx tsc

ENTRYPOINT ["npm", "start"]