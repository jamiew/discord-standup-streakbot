FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm &&
  pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Command to run the bot
CMD ["node", "bot.js"]
