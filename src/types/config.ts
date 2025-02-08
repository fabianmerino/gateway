export interface MqttConfig {
  broker: string;
  clientId: string;
  username: string;
  password: string;
  sparkplug: SparkplugConfig;
}

export interface SparkplugConfig {
  groupId: string;
  edgeNode: string;
  deviceId: string;
  scadaHostId: string;
  publishPeriod: number;
}

export interface OpcuaTag {
  nodeId: string;
  name: string;
  interval: number;
  delta?: number;
}

export interface OpcuaConfig {
  enabled: boolean;
  serverUrl: string;
  tags: OpcuaTag[];
}

export interface ModbusTag {
  register: number;
  name: string;
  type: 'holding' | 'input' | 'coil';
  interval: number;
  delta?: number;
}

export interface ModbusConfig {
  enabled: boolean;
  host: string;
  port: number;
  tags: ModbusTag[];
}

export interface AppConfig {
  mqtt: MqttConfig;
  opcua: OpcuaConfig;
  modbus: ModbusConfig;
}
