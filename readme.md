# Industrial Monitoring Gateway

This Industrial Monitoring Gateway collects data from OPC UA servers and Modbus TCP devices. It then publishes this data to an MQTT broker using the Sparkplug B protocol, acting as a Sparkplug Edge Node. The gateway also includes a local database to temporarily store messages if the MQTT broker is unavailable, ensuring data resilience.

## Installation

1. Install Node.js and pnpm (if not already installed).
2. Clone the repository.
3. Install the dependencies by running `pnpm install` in the project directory.
4. Configure the project by editing the `config.yaml` file.
5. Start the service by running `pnpm start` in the project directory.

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
- `deviceId`: The device identifier.
- `scadaHostId`: The SCADA host identifier.
- `publishPeriod`: The publish period in milliseconds.

### OPC UA Configuration

The `opcua` section contains the following properties:

- `enabled`: Whether OPC UA is enabled (true/false).
- `serverUrl`: The OPC UA server URL.
- `tags`: An array of OPC UA tags to monitor.

Each OPC UA tag contains the following properties:

- `nodeId`: The OPC UA node ID.
- `name`: The name of the tag.
- `interval`: The sampling interval in milliseconds.
- `delta`: The minimum change threshold to trigger a data update.

### Modbus Configuration

The `modbus` section contains the following properties:

- `enabled`: Whether Modbus is enabled (true/false).
- `host`: The Modbus TCP server host.
- `port`: The Modbus TCP server port.
- `tags`: An array of Modbus tags to monitor.

Each Modbus tag contains the following properties:

- `register`: The Modbus register address.
- `name`: The name of the tag.
- `type`: The type of the tag (`holding` or `input`).
- `interval`: The sampling interval in milliseconds.
- `delta`: The minimum change threshold to trigger a data update.

## Usage

The service starts automatically when the `pnpm start` command is executed. It connects to the configured OPC UA servers and Modbus TCP devices to monitor the specified tags. This data is then published to the configured MQTT broker using the Sparkplug B protocol. The gateway acts as a Sparkplug Edge Node, with its identity (`groupId`, `edgeNodeId`, `deviceId`) configured in `config.yaml`.

Data is published using Sparkplug B messages, primarily:
- **Device Birth (DBIRTH):** Announces the device and its metrics.
  - Topic: `spBv1.0/<groupId>/DBIRTH/<edgeNodeId>/<deviceId>`
- **Device Data (DDATA):** Transmits metric values.
  - Topic: `spBv1.0/<groupId>/DDATA/<edgeNodeId>/<deviceId>`

The specific tag data (name, value, type, timestamp) is contained within the payload of these Sparkplug B messages. For detailed information on the Sparkplug B specification, including full topic structures and payload formats, please refer to the official Sparkplug documentation.

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