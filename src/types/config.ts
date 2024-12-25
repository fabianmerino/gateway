export interface MqttConfig {
  broker: string;
  clientId: string;
  username: string;
  password: string;
}

export interface OpcuaTag {
  nodeId: string;
  name: string;
  interval: number;
}

export interface OpcuaConfig {
  serverUrl: string;
  tags: OpcuaTag[];
}

export interface ModbusTag {
  register: number;
  name: string;
  type: 'holding' | 'input' | 'coil';
  interval: number;
}

export interface ModbusConfig {
  host: string;
  port: number;
  tags: ModbusTag[];
}

export interface AppConfig {
  mqtt: MqttConfig;
  opcua: OpcuaConfig;
  modbus: ModbusConfig;
}
