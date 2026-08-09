FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Ensure data directory exists inside the container
RUN mkdir -p /app/data && chown -R node:node /app/data

# Expose port
EXPOSE 3000

# Start command
CMD [ "node", "server.js" ]
