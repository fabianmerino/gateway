# Deployment Guide

## Prerequisites

- Node.js v18 or higher
- pnpm v10.13.1 or higher
- OPC UA servers and/or Modbus TCP devices to connect to
- MQTT broker (e.g., Mosquitto)

## Installation Steps

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd gateway
pnpm install
cd web && pnpm install && cd ..
```

### 2. Configuration

#### Gateway Configuration

Edit `config.yaml` to configure your MQTT broker, OPC UA servers, and Modbus devices:

```yaml
mqtt:
  broker: mqtt://your-broker:1883
  clientId: industrial-monitor
  username: your_username
  password: your_password
  sparkplug:
    groupId: "Sparkplug B Devices"
    edgeNode: "Node-1"
    scadaHostId: "SCADA-1"
    publishPeriod: 1000

opcua:
  - enabled: true
    serverUrl: opc.tcp://your-opcua-server:49320
    deviceName: "OPC-UA-Device-1"
    tags:
      - nodeId: "ns=2;s=YourNodeId"
        name: "sensor_1"
        interval: 1000
        delta: 0.5

modbus:
  - enabled: true
    host: your-modbus-host
    port: 502
    deviceName: "Modbus-Device-1"
    tags:
      - register: 40001
        name: "temperature"
        type: "holding"
        interval: 1000
        delta: 0.1
```

#### Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

**IMPORTANT**: Edit `.env` and set secure values:

```env
API_PORT=3000

# CRITICAL: Generate strong random secrets for production!
JWT_SECRET=$(openssl rand -base64 32)
CSRF_SECRET=$(openssl rand -base64 32)

CORS_ORIGIN=http://your-domain.com
NODE_ENV=production
```

### 3. Build

Build both backend and frontend:

```bash
pnpm build
```

This will:
1. Compile TypeScript backend to JavaScript
2. Install frontend dependencies
3. Build optimized frontend for production

### 4. Start the Gateway

```bash
pnpm start
```

The gateway will:
- Connect to configured OPC UA servers and Modbus devices
- Publish data to MQTT broker using Sparkplug B protocol
- Start REST API server on port 3000 (or configured port)
- Serve web interface at http://localhost:3000

## Web Interface

Access the management interface at: `http://localhost:3000`

**Default Credentials:**
- Username: `admin`
- Password: `admin123`

**IMPORTANT**: Change default credentials in production by modifying `src/api/auth.ts`

## Security Checklist for Production

- [ ] Set strong `JWT_SECRET` in environment variables
- [ ] Set strong `CSRF_SECRET` in environment variables  
- [ ] Change default admin password
- [ ] Configure CORS to allow only specific origins
- [ ] Use HTTPS in production
- [ ] Set `NODE_ENV=production`
- [ ] Review and adjust rate limits if needed
- [ ] Keep dependencies updated
- [ ] Monitor logs for security issues

## Systemd Service (Linux)

Create `/etc/systemd/system/gateway.service`:

```ini
[Unit]
Description=Industrial Monitoring Gateway
After=network.target

[Service]
Type=simple
User=gateway
WorkingDirectory=/opt/gateway
Environment="NODE_ENV=production"
EnvironmentFile=/opt/gateway/.env
ExecStart=/usr/bin/pnpm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable gateway
sudo systemctl start gateway
sudo systemctl status gateway
```

## Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.13.1

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY web/package.json web/pnpm-lock.yaml ./web/

# Install dependencies
RUN pnpm install --frozen-lockfile
RUN cd web && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build
RUN pnpm build

# Expose API port
EXPOSE 3000

# Start gateway
CMD ["pnpm", "start"]
```

Build and run:

```bash
docker build -t gateway:latest .
docker run -d \
  --name gateway \
  -p 3000:3000 \
  -v $(pwd)/config.yaml:/app/config.yaml \
  -e JWT_SECRET=your-secret \
  -e CSRF_SECRET=your-secret \
  gateway:latest
```

## Monitoring

### Logs

The gateway uses Pino for structured logging. View logs:

```bash
# With pnpm (pretty format)
pnpm dev

# In production (JSON format)
pnpm start 2>&1 | tee gateway.log
```

### Health Check

```bash
curl http://localhost:3000/api/health
```

### Device Status

```bash
# Get auth token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.data.token')

# Check status
curl http://localhost:3000/api/status \
  -H "Authorization: Bearer $TOKEN"
```

## Troubleshooting

### Gateway won't start

1. Check config.yaml syntax
2. Verify MQTT broker is accessible
3. Check if port 3000 is available
4. Review logs for errors

### Devices not appearing

1. Verify device configuration in config.yaml
2. Check network connectivity to devices
3. Confirm credentials are correct
4. Check firewall rules

### Web interface not accessible

1. Verify API server started (check logs)
2. Check port 3000 is not blocked
3. Ensure frontend was built successfully
4. Check browser console for errors

### MQTT not connecting

1. Verify broker URL and credentials
2. Check broker is running and accessible
3. Review MQTT broker logs
4. Test connection with mosquitto_sub/pub

## Performance Tuning

### Adjust Update Intervals

In `config.yaml`, set appropriate intervals for your use case:

```yaml
tags:
  - nodeId: "..."
    name: "fast_sensor"
    interval: 100  # Very fast updates (100ms)
    delta: 0.01    # Small change threshold
  
  - nodeId: "..."
    name: "slow_sensor"  
    interval: 5000  # Slower updates (5s)
    delta: 1.0      # Larger change threshold
```

### Database Cleanup

The gateway stores unsent messages in SQLite. Monitor database size:

```bash
ls -lh messages.db
```

## Support

For issues or questions:
- Check logs first
- Review documentation
- Open an issue on GitHub
- Check MQTT broker and device connectivity
