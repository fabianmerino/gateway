# Industrial Monitoring Gateway

This Industrial Monitoring Gateway collects data from OPC UA servers and Modbus TCP devices. It then publishes this data to an MQTT broker using the Sparkplug B protocol, acting as a Sparkplug Edge Node. The gateway also includes a local database to temporarily store messages if the MQTT broker is unavailable, ensuring data resilience.

## Features

- **OPC UA & Modbus Support**: Connect to multiple OPC UA servers and Modbus TCP devices
- **Sparkplug B Protocol**: Publish data using the industry-standard Sparkplug B protocol
- **Web Management Interface**: Modern React-based UI for monitoring and managing connections
- **REST API**: Secure API for programmatic access to gateway data
- **Data Resilience**: Local database for storing messages when the MQTT broker is unavailable
- **Real-time Monitoring**: Live updates of device metrics and connection status

## Installation

### Backend Setup

1. Install Node.js (v18 or higher) and pnpm (if not already installed).
2. Clone the repository.
3. Install the backend dependencies by running `pnpm install` in the project root.
4. Configure the project by editing the `config.yaml` file.
5. Build the backend: `pnpm build`

### Frontend Setup

1. Navigate to the `web` directory: `cd web`
2. Install frontend dependencies: `pnpm install`
3. Build the frontend: `pnpm build`

### Running the Gateway

Start the service by running `pnpm start` in the project root directory. This will:
- Start the gateway services (OPC UA, Modbus, Sparkplug)
- Start the REST API server on port 3000
- Serve the web interface at http://localhost:3000

You can customize the API port by setting the `API_PORT` environment variable.

## Configuration

The configuration file is located at `config.yaml` and contains the following sections:

- `mqtt`: Configuration for the MQTT broker and Sparkplug B protocol.
- `opcua`: Configuration for the OPC UA servers.
- `modbus`: Configuration for the Modbus TCP servers.

### MQTT Configuration

The `mqtt` section contains the following properties:

- `broker`: The MQTT broker URL.
- `clientId`: The MQTT client ID.
- `username`: The MQTT username (optional).
- `password`: The MQTT password (optional).
- `sparkplug`: Sparkplug B protocol configuration.

The `sparkplug` subsection contains:

- `groupId`: The Sparkplug group identifier.
- `edgeNode`: The edge node identifier.
- `scadaHostId`: The SCADA host identifier.
- `publishPeriod`: The publish period in milliseconds.

### OPC UA Configuration

The `opcua` section is an array that supports multiple OPC UA servers. Each entry contains the following properties:

- `enabled`: Whether this OPC UA server is enabled (true/false).
- `serverUrl`: The OPC UA server URL.
- `deviceName`: (Optional) The name for this OPC UA device. If not provided, automatically generates "device-opcua-1", "device-opcua-2", etc.
- `tags`: An array of OPC UA tags to monitor.

Each OPC UA tag contains the following properties:

- `nodeId`: The OPC UA node ID.
- `name`: The name of the tag.
- `interval`: The sampling interval in milliseconds.
- `delta`: The minimum change threshold to trigger a data update.

### Modbus Configuration

The `modbus` section is an array that supports multiple Modbus TCP devices. Each entry contains the following properties:

- `enabled`: Whether this Modbus device is enabled (true/false).
- `host`: The Modbus TCP server host.
- `port`: The Modbus TCP server port.
- `deviceName`: (Optional) The name for this Modbus device. If not provided, automatically generates "device-modbus-1", "device-modbus-2", etc.
- `tags`: An array of Modbus tags to monitor.

Each Modbus tag contains the following properties:

- `register`: The Modbus register address.
- `name`: The name of the tag.
- `type`: The type of the tag (`holding` or `input`).
- `interval`: The sampling interval in milliseconds.
- `delta`: The minimum change threshold to trigger a data update.

## Multiple Device Support

The gateway now supports multiple OPC UA servers and Modbus TCP devices. Each device operates independently and publishes its metrics to separate Sparkplug B device topics.

**Configuration Example:**

```yaml
opcua:
  - enabled: true
    serverUrl: opc.tcp://localhost:49320
    deviceName: "OPC-UA-Device-1"
    tags: [...]
  - enabled: true
    serverUrl: opc.tcp://localhost:49321
    deviceName: "OPC-UA-Device-2"
    tags: [...]

modbus:
  - enabled: true
    host: localhost
    port: 5020
    deviceName: "Modbus-Device-1"
    tags: [...]
  - enabled: true
    host: localhost
    port: 5021
    deviceName: "Modbus-Device-2"
    tags: [...]
```

## Usage

The service starts automatically when the `pnpm start` command is executed. It connects to the configured OPC UA servers and Modbus TCP devices to monitor the specified tags. This data is then published to the configured MQTT broker using the Sparkplug B protocol. The gateway acts as a Sparkplug Edge Node, with its identity (`groupId`, `edgeNodeId`) configured in `config.yaml`.

### Device Management

The service now includes enhanced device management features:

- **Multiple Device Support**: Connect to multiple OPC UA servers and Modbus devices simultaneously.
- **Automatic Device Naming**: If `deviceName` is not specified in the configuration, devices are automatically named following the pattern `device-{protocol}-{number}` (e.g., `device-opcua-1`, `device-modbus-1`).
- **Device Lifecycle Tracking**: Each device tracks registration time, last activity, and metrics count.
- **Automatic Cleanup**: Inactive devices (no updates for 5 minutes) are automatically removed and a DDEATH message is sent.
- **Health Monitoring**: The service logs device status every 10 minutes for monitoring purposes.

Data is published using Sparkplug B messages, primarily:
- **Device Birth (DBIRTH):** Announces the device and its metrics.
  - Topic: `spBv1.0/<groupId>/DBIRTH/<edgeNodeId>/<deviceId>`
- **Device Data (DDATA):** Transmits metric values.
  - Topic: `spBv1.0/<groupId>/DDATA/<edgeNodeId>/<deviceId>`
- **Device Death (DDEATH):** Announces device disconnection.
  - Topic: `spBv1.0/<groupId>/DDEATH/<edgeNodeId>/<deviceId>`

The specific tag data (name, value, type, timestamp) is contained within the payload of these Sparkplug B messages. For detailed information on the Sparkplug B specification, including full topic structures and payload formats, please refer to the official Sparkplug documentation.

## Web Management Interface

The gateway includes a modern web interface for monitoring and managing connections. Access it at http://localhost:3000 after starting the gateway.

### Features

- **Dashboard**: Real-time view of connection status and device metrics
- **Device Monitoring**: View detailed information about each connected device
- **Authentication**: Secure login with JWT-based authentication
- **Auto-refresh**: Live updates every 5 seconds

### Default Credentials

- Username: `admin`
- Password: `admin123`

**Important**: Change the default credentials in production by modifying `src/api/auth.ts` and setting a secure JWT secret via the `JWT_SECRET` environment variable.

## REST API

The gateway provides a REST API for programmatic access to device and connection data.

### Authentication

All API endpoints (except `/api/auth/login` and `/api/health`) require authentication using a JWT token.

1. **Login**: `POST /api/auth/login`
   ```json
   {
     "username": "admin",
     "password": "admin123"
   }
   ```
   Response:
   ```json
   {
     "success": true,
     "data": {
       "token": "jwt_token_here",
       "username": "admin",
       "expiresIn": 86400
     }
   }
   ```

2. Use the token in subsequent requests:
   ```
   Authorization: Bearer <token>
   ```

### API Endpoints

- `GET /api/health` - Health check (no auth required)
- `GET /api/status` - Get connection status and device summary
- `GET /api/devices` - Get all devices with details
- `GET /api/devices/:deviceId/metrics` - Get metrics for a specific device
- `GET /api/config` - Get gateway configuration

### Example Usage

```bash
# Login
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.data.token')

# Get status
curl http://localhost:3000/api/status \
  -H "Authorization: Bearer $TOKEN"

# Get devices
curl http://localhost:3000/api/devices \
  -H "Authorization: Bearer $TOKEN"
```

## Environment Variables

- `API_PORT`: Port for the REST API server (default: 3000)
- `JWT_SECRET`: Secret key for JWT token generation (change in production!)
- `CORS_ORIGIN`: CORS origin for API requests (default: *)
- `NODE_ENV`: Environment mode (production/development)

## License

This project is licensed under the MIT License.
```
MIT License

Copyright (c) 2024 Fabian Merino

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.