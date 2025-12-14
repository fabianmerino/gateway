export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DeviceInfo {
  deviceId: string;
  protocol: 'opcua' | 'modbus';
  enabled: boolean;
  deviceName: string;
  metricCount: number;
  lastActivity?: number;
  registeredAt?: number;
  isActive: boolean;
  config: OpcuaDeviceConfig | ModbusDeviceConfig;
}

export interface OpcuaDeviceConfig {
  serverUrl: string;
  tags: Array<{
    nodeId: string;
    name: string;
    interval: number;
    delta?: number;
  }>;
}

export interface ModbusDeviceConfig {
  host: string;
  port: number;
  tags: Array<{
    register: number;
    name: string;
    type: 'holding' | 'input' | 'coil';
    interval: number;
    delta?: number;
  }>;
}

export interface ConnectionStatus {
  sparkplug: {
    connected: boolean;
    broker: string;
    groupId: string;
    edgeNode: string;
  };
  devices: DeviceInfo[];
  totalDevices: number;
  activeDevices: number;
  totalMetrics: number;
}

export interface AuthRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  expiresIn: number;
}

export interface User {
  username: string;
  passwordHash: string;
  role: 'admin' | 'user';
}
