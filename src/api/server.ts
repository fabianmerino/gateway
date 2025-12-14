import cors from 'cors';
import express, { type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import type { SparkplugService } from '../services/sparkplug.js';
import type {
  ApiResponse,
  AuthRequest,
  ConnectionStatus,
  DeviceInfo,
} from '../types/api.js';
import type { AppConfig } from '../types/config.js';
import { logError, logInfo } from '../utils/logger/index.js';
import { authenticateToken, login } from './auth.js';

const COMPONENT = 'ApiServer';

export class ApiServer {
  private app = express();
  private server?: ReturnType<typeof this.app.listen>;

  constructor(
    private readonly sparkplugService: SparkplugService,
    private readonly config: AppConfig,
    private readonly port = 3000
  ) {
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
      })
    );

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    });
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, _res, next) => {
      logInfo(COMPONENT, `${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/api/health', (_req: Request, res: Response) => {
      const response: ApiResponse = {
        success: true,
        data: { status: 'ok', timestamp: Date.now() },
      };
      res.json(response);
    });

    // Authentication
    this.app.post('/api/auth/login', async (req: Request, res: Response) => {
      try {
        const { username, password } = req.body as AuthRequest;

        if (!username || !password) {
          const response: ApiResponse = {
            success: false,
            error: 'Username and password are required',
          };
          res.status(400).json(response);
          return;
        }

        const authResponse = await login(username, password);

        if (!authResponse) {
          const response: ApiResponse = {
            success: false,
            error: 'Invalid credentials',
          };
          res.status(401).json(response);
          return;
        }

        const response: ApiResponse = {
          success: true,
          data: authResponse,
        };
        res.json(response);
      } catch (error) {
        logError(COMPONENT, 'Login error', error);
        const response: ApiResponse = {
          success: false,
          error: 'Internal server error',
        };
        res.status(500).json(response);
      }
    });

    // Get connection status
    this.app.get(
      '/api/status',
      authenticateToken,
      (_req: Request, res: Response) => {
        try {
          const devicesSummary = this.sparkplugService.getDevicesSummary();
          const devices: DeviceInfo[] = [];

          // Map devices from Sparkplug service
          for (const device of devicesSummary) {
            const deviceConfig = this.findDeviceConfig(device.deviceId);
            if (deviceConfig) {
              devices.push({
                deviceId: device.deviceId,
                protocol: deviceConfig.protocol,
                enabled: deviceConfig.enabled,
                deviceName: device.deviceId,
                metricCount: device.metricCount,
                lastActivity: device.lastActivity,
                registeredAt: device.registeredAt,
                isActive: device.isActive,
                config: deviceConfig.config,
              });
            }
          }

          const status: ConnectionStatus = {
            sparkplug: {
              connected: true, // TODO: Get actual connection status
              broker: this.config.mqtt.broker,
              groupId: this.config.mqtt.sparkplug.groupId,
              edgeNode: this.config.mqtt.sparkplug.edgeNode,
            },
            devices,
            totalDevices: devices.length,
            activeDevices: this.sparkplugService.getActiveDevicesCount(),
            totalMetrics: this.sparkplugService.getTotalMetricsCount(),
          };

          const response: ApiResponse<ConnectionStatus> = {
            success: true,
            data: status,
          };
          res.json(response);
        } catch (error) {
          logError(COMPONENT, 'Error getting status', error);
          const response: ApiResponse = {
            success: false,
            error: 'Failed to get status',
          };
          res.status(500).json(response);
        }
      }
    );

    // Get configuration
    this.app.get(
      '/api/config',
      authenticateToken,
      (_req: Request, res: Response) => {
        try {
          const response: ApiResponse = {
            success: true,
            data: {
              mqtt: {
                broker: this.config.mqtt.broker,
                clientId: this.config.mqtt.clientId,
                sparkplug: this.config.mqtt.sparkplug,
              },
              opcua: this.config.opcua.map((c) => ({
                enabled: c.enabled,
                serverUrl: c.serverUrl,
                deviceName: c.deviceName,
                tagCount: c.tags.length,
              })),
              modbus: this.config.modbus.map((c) => ({
                enabled: c.enabled,
                host: c.host,
                port: c.port,
                deviceName: c.deviceName,
                tagCount: c.tags.length,
              })),
            },
          };
          res.json(response);
        } catch (error) {
          logError(COMPONENT, 'Error getting config', error);
          const response: ApiResponse = {
            success: false,
            error: 'Failed to get config',
          };
          res.status(500).json(response);
        }
      }
    );

    // Get devices
    this.app.get(
      '/api/devices',
      authenticateToken,
      (_req: Request, res: Response) => {
        try {
          const devicesSummary = this.sparkplugService.getDevicesSummary();
          const devices: DeviceInfo[] = [];

          for (const device of devicesSummary) {
            const deviceConfig = this.findDeviceConfig(device.deviceId);
            if (deviceConfig) {
              devices.push({
                deviceId: device.deviceId,
                protocol: deviceConfig.protocol,
                enabled: deviceConfig.enabled,
                deviceName: device.deviceId,
                metricCount: device.metricCount,
                lastActivity: device.lastActivity,
                registeredAt: device.registeredAt,
                isActive: device.isActive,
                config: deviceConfig.config,
              });
            }
          }

          const response: ApiResponse<DeviceInfo[]> = {
            success: true,
            data: devices,
          };
          res.json(response);
        } catch (error) {
          logError(COMPONENT, 'Error getting devices', error);
          const response: ApiResponse = {
            success: false,
            error: 'Failed to get devices',
          };
          res.status(500).json(response);
        }
      }
    );

    // Get device metrics
    this.app.get(
      '/api/devices/:deviceId/metrics',
      authenticateToken,
      (req: Request, res: Response) => {
        try {
          const { deviceId } = req.params;
          const metrics = this.sparkplugService.getDeviceMetrics(deviceId);

          if (!metrics) {
            const response: ApiResponse = {
              success: false,
              error: 'Device not found',
            };
            res.status(404).json(response);
            return;
          }

          const metricsArray = Array.from(metrics.entries()).map(
            ([name, data]) => ({
              name,
              value: data.value,
              interval: data.interval,
              lastPublished: data.lastPublished,
              lastUpdated: data.lastUpdated,
            })
          );

          const response: ApiResponse = {
            success: true,
            data: metricsArray,
          };
          res.json(response);
        } catch (error) {
          logError(COMPONENT, 'Error getting device metrics', error);
          const response: ApiResponse = {
            success: false,
            error: 'Failed to get device metrics',
          };
          res.status(500).json(response);
        }
      }
    );

    // 404 handler
    this.app.use((_req: Request, res: Response) => {
      const response: ApiResponse = {
        success: false,
        error: 'Not found',
      };
      res.status(404).json(response);
    });
  }

  private findDeviceConfig(deviceId: string): {
    protocol: 'opcua' | 'modbus';
    enabled: boolean;
    config: DeviceInfo['config'];
  } | null {
    // Check OPC UA devices
    for (const opcuaConfig of this.config.opcua) {
      if (opcuaConfig.deviceName === deviceId) {
        return {
          protocol: 'opcua',
          enabled: opcuaConfig.enabled,
          config: {
            serverUrl: opcuaConfig.serverUrl,
            tags: opcuaConfig.tags,
          },
        };
      }
    }

    // Check Modbus devices
    for (const modbusConfig of this.config.modbus) {
      if (modbusConfig.deviceName === deviceId) {
        return {
          protocol: 'modbus',
          enabled: modbusConfig.enabled,
          config: {
            host: modbusConfig.host,
            port: modbusConfig.port,
            tags: modbusConfig.tags,
          },
        };
      }
    }

    return null;
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        logInfo(COMPONENT, `API server started on port ${this.port}`);
        resolve();
      });
    });
  }

  public stop(): void {
    if (this.server) {
      this.server.close();
      logInfo(COMPONENT, 'API server stopped');
    }
  }
}
