# Use an official Node runtime as a parent image
FROM --platform=linux/amd64 node:16

# Set the working directory in the container
WORKDIR /src

# Copy the package.json and package-lock.json
COPY package*.json ./

# Install any needed packages specified in package.json
RUN npm install

# Bundle the app source inside the Docker container
COPY . .

# Build the TypeScript project
RUN npm run build

# Make port 80 available to the world outside this container
EXPOSE 80

# Define environment variable
ENV NODE_ENV production

# Run the compiled app from the dist directory
CMD ["node", "dist/app.js"]