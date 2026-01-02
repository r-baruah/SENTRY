# Use Node.js 20 on Debian (Bookworm) for broad compatibility
FROM node:20-bookworm-slim

# 1. Install system dependencies required for Foundry and Node-gyp
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# 2. Install Foundry (Forge)
# Install to global path so it's accessible everywhere
RUN curl -L https://foundry.paradigm.xyz | bash
ENV PATH="${PATH}:/root/.foundry/bin"
RUN foundryup

# Verify Forge
RUN forge --version

# 3. Setup Application
WORKDIR /app

# Copy dependency files first (for caching)
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies (from root to handle workspaces)
RUN npm ci

# 4. Copy Source Code
COPY . .

# 5. Build Backend
WORKDIR /app/backend
RUN npm run build

# 6. Expose Port (Render uses environment variable PORT)
ENV PORT=3005
EXPOSE 3005

# 7. Start the server
CMD ["npm", "run", "start"]
