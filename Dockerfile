# Use Node image
FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# IMPORTANT: This must match your app's listening port
EXPOSE 5000

CMD [ "node", "server/config/app.js" ]