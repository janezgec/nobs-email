# Use Node.js 22 as the base image
FROM node:22-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD [ "npm", "start" ]
