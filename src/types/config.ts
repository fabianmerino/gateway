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
  deviceName?: string;
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
  deviceName?: string;
  tags: ModbusTag[];
}

export interface AppConfig {
  mqtt: MqttConfig;
  opcua: OpcuaConfig[];
  modbus: ModbusConfig[];
}
