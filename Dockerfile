# Dockerfile for QA-Copilot with headed Chrome (visual browser) and optional VNC
# Build image with Node and Chrome, then run app via Xvfb to provide display server.

FROM node:20-bullseye-slim

ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies for Chrome/Playwright and VNC
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl gnupg2 ca-certificates fonts-liberation libnss3 libatk1.0-0 libx11-xcb1 \
    libxcomposite1 libxdamage1 libxrandr2 libgbm1 libasound2 libatk-bridge2.0-0 \
    libgtk-3-0 libcups2 libxss1 xauth xvfb x11vnc fluxbox \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome stable
RUN curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-linux-signing-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-linux-signing-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update && apt-get install -y --no-install-recommends google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --silent
COPY . .

# Optional: if Playwright library is in use, install browsers for it too
RUN npx playwright install --with-deps || true

# Keep path for your app to find it
ENV CHROME_PATH=/usr/bin/google-chrome
ENV DISPLAY=:99

EXPOSE 3000 5900

CMD ["sh", "-c", "Xvfb :99 -screen 0 1920x1080x24 -ac & fluxbox & x11vnc -display :99 -nopw -forever -shared -bg -o /var/log/x11vnc.log && npm run dev"]
