#!/bin/bash
# ============================================================
# QA-Copilot: Headed Chromium Setup for Headless Ubuntu Server
# ============================================================
# This script installs Xvfb (virtual display), a window manager,
# and optionally VNC/NoVNC so you can run Chromium in non-headless
# mode on a server without a physical monitor.
#
# Usage: sudo bash setup-headed-server.sh
# ============================================================

set -e

echo "╔══════════════════════════════════════════════════════╗"
echo "║  QA-Copilot: Headed Chromium Server Setup            ║"
echo "╚══════════════════════════════════════════════════════╝"

# 1. Install core dependencies
echo "[1/5] Installing Xvfb, Fluxbox, and display utilities..."
apt-get update -qq
apt-get install -y --no-install-recommends \
    xvfb \
    fluxbox \
    x11vnc \
    novnc \
    websockify \
    xdg-utils \
    xfonts-base \
    xfonts-75dpi \
    xfonts-100dpi \
    libgtk-3-0 \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libgbm1 \
    libasound2 \
    fonts-liberation \
    fonts-noto-color-emoji

# 2. Install Playwright browsers
echo "[2/5] Installing Playwright Chromium browser..."
npx -y playwright install chromium
npx -y playwright install-deps chromium

# 3. Create the virtual display startup script
echo "[3/5] Creating virtual display startup script..."
cat > /usr/local/bin/start-virtual-display.sh << 'SCRIPT'
#!/bin/bash
# Start Xvfb virtual display
export DISPLAY=:99
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
sleep 1

# Start lightweight window manager
fluxbox -display :99 &
sleep 1

# Start VNC server (no password, accessible on port 5900)
x11vnc -display :99 -nopw -forever -shared -bg -xkb

# Start NoVNC web proxy (accessible on port 6080)
websockify --web /usr/share/novnc/ 6080 localhost:5900 &

echo "✅ Virtual display started on :99"
echo "   VNC:   vnc://YOUR_SERVER_IP:5900"
echo "   NoVNC: http://YOUR_SERVER_IP:6080/vnc.html"
SCRIPT
chmod +x /usr/local/bin/start-virtual-display.sh

# 4. Create systemd service for auto-start
echo "[4/5] Creating systemd service..."
cat > /etc/systemd/system/virtual-display.service << 'SERVICE'
[Unit]
Description=Virtual Display for Headed Chromium (Xvfb + VNC)
After=network.target

[Service]
Type=forking
Environment=DISPLAY=:99
ExecStart=/usr/local/bin/start-virtual-display.sh
ExecStop=/usr/bin/killall Xvfb
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable virtual-display.service
systemctl start virtual-display.service

# 5. Set the DISPLAY env var globally
echo "[5/5] Setting DISPLAY=:99 globally..."
echo 'export DISPLAY=:99' >> /etc/environment
echo 'export DISPLAY=:99' >> /etc/profile.d/display.sh

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅ Setup Complete!                                  ║"
echo "║                                                      ║"
echo "║  Virtual display is running on :99                   ║"
echo "║  VNC:   vnc://YOUR_SERVER_IP:5900                    ║"
echo "║  NoVNC: http://YOUR_SERVER_IP:6080/vnc.html          ║"
echo "║                                                      ║"
echo "║  Now start your app:                                 ║"
echo "║  DISPLAY=:99 npm run start                           ║"
echo "║  (or pm2: DISPLAY=:99 pm2 start ecosystem.config.js) ║"
echo "╚══════════════════════════════════════════════════════╝"
