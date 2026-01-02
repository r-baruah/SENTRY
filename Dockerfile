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

# Create directories to avoid copy errors
RUN mkdir -p backend frontend

COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies (from root to handle workspaces)
RUN npm install

# 4. Copy Source Code
COPY . .

# 5. Install forge-std in workspace (required for Step D tests)
RUN mkdir -p /app/workspace/lib && \
    rm -rf /app/workspace/lib/forge-std && \
    git clone --depth 1 https://github.com/foundry-rs/forge-std /app/workspace/lib/forge-std

# 6. Build Backend
WORKDIR /app/backend
RUN npm run build

# 6. Expose Port (Render uses environment variable PORT)
ENV PORT=3005
EXPOSE 3005

# 7. Start the server
CMD ["npm", "run", "start"]
