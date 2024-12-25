# Industrial Monitoring Gateway

This is a simple Industrial Monitoring Gateway that connects to MQTT brokers, OPC UA servers, and Modbus TCP servers to collect data and publish it to a MQTT broker.

## Installation

1. Install Node.js and pnpm (if not already installed).
2. Clone the repository.
3. Install the dependencies by running `pnpm install` in the project directory.
4. Configure the project by editing the `config.yaml` file.
5. Start the service by running `pnpm start` in the project directory.

## Configuration

The configuration file is located at `config.yaml` and contains the following sections:

- `mqtt`: Configuration for the MQTT broker.
- `opcua`: Configuration for the OPC UA servers.
- `modbus`: Configuration for the Modbus TCP servers.

The `mqtt` section contains the following properties:

- `broker`: The MQTT broker URL.
- `clientId`: The MQTT client ID.
- `username`: The MQTT username (optional).
- `password`: The MQTT password (optional).

The `opcua` section contains the following properties:

- `serverUrl`: The OPC UA server URL.
- `tags`: An array of OPC UA tags to monitor.

Each OPC UA tag contains the following properties:

- `nodeId`: The OPC UA node ID.
- `name`: The name of the tag.
- `interval`: The sampling interval in milliseconds.

The `modbus` section contains the following properties:

- `host`: The Modbus TCP server host.
- `port`: The Modbus TCP server port.
- `tags`: An array of Modbus tags to monitor.

Each Modbus tag contains the following properties:

- `register`: The Modbus register address.
- `name`: The name of the tag.
- `type`: The type of the tag (`holding` or `input`).
- `interval`: The sampling interval in milliseconds.

## Usage

The service starts automatically when the `pnpm start` command is executed. It will connect to the configured MQTT broker, OPC UA servers, and Modbus TCP servers and start monitoring the specified tags. The service will publish the monitored data to the MQTT broker with the following topic structure:

```
industrial/<service>/<tag>
```

Where `<service>` is either `opcua`, `modbus`, or `mqtt`, and `<tag>` is the name of the tag.

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
```