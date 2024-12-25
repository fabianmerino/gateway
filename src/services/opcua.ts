import {
  OPCUAClient,
  MessageSecurityMode,
  SecurityPolicy,
  AttributeIds,
  TimestampsToReturn,
  type ClientSession,
  type ClientSubscription,
  type MonitoringParametersOptions,
  type ReadValueIdOptions,
} from 'node-opcua';
import type { OpcuaConfig } from '../types/config.js';
import { logInfo, logError } from '../utils/logger/index.js';
import { ReconnectionManager } from '../utils/reconnection.js';
import type { MqttService } from './mqtt.js';

const COMPONENT = 'OpcuaService';

export class OpcuaService {
  private client?: OPCUAClient;
  private session?: ClientSession;
  private subscription?: ClientSubscription;
  private reconnectionManager: ReconnectionManager;

  constructor(
    private readonly config: OpcuaConfig,
    private readonly mqttService: MqttService
  ) {
    this.reconnectionManager = new ReconnectionManager(
      COMPONENT,
      { initialDelay: 1000, maxDelay: 30000 },
      () => this.connect()
    );
  }

  private async connect(): Promise<void> {
    this.client = OPCUAClient.create({
      applicationName: 'industrial-monitoring',
      connectionStrategy: {
        initialDelay: 0,
        maxRetry: 0, // Disable built-in reconnection
      },
      securityMode: MessageSecurityMode.None,
      securityPolicy: SecurityPolicy.None,
      endpointMustExist: false,
    });

    await this.client.connect(this.config.serverUrl);
    this.session = await this.client.createSession();

    logInfo(COMPONENT, 'Connected to OPC UA server');

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    // Subscribe to tags
    for (const tag of this.config.tags) {
      this.subscribe(
        tag.nodeId,
        (value) => {
          const message = {
            timestamp: new Date().toISOString(),
            nodeId: tag.nodeId,
            value,
            status: value === null ? 'null' : 'ok',
          };

          const topic = `industrial/opcua/${tag.name}`;
          this.publishToMqtt(topic, message);
          logInfo(COMPONENT, `Tag value updated: ${tag.name} = ${value}`);
        },
        { samplingInterval: tag.interval ?? 1000 }
      );
    }

    this.client.on('connection_lost', () => {
      logInfo(COMPONENT, 'OPC UA connection lost, attempting to reconnect...');
      void this.reconnectionManager.start();
    });

    this.client.on('backoff', (retry, delay) => {
      logInfo(
        COMPONENT,
        `Reconnection attempt ${retry}, next attempt in ${delay}ms`
      );
    });

    this.client.on('error', (error) => {
      logError(COMPONENT, 'OPC UA error', error);
    });
  }

  public async start(): Promise<void> {
    await this.reconnectionManager.start();
    if (!this.client || !this.session) {
      throw new Error('OPC UA client not initialized');
    }
  }

  public async stop(): Promise<void> {
    this.reconnectionManager.stop();

    if (this.subscription) {
      await this.subscription.terminate();
    }

    if (this.session) {
      await this.session.close();
    }

    if (this.client) {
      await this.client.disconnect();
    }
  }

  public async subscribe(
    nodeId: string,
    callback: (value: unknown) => void,
    options?: MonitoringParametersOptions
  ): Promise<void> {
    if (!this.session) {
      throw new Error('No active session');
    }

    try {
      if (!this.subscription) {
        this.subscription = await this.session.createSubscription2({
          requestedPublishingInterval: 1000,
          requestedLifetimeCount: 100,
          requestedMaxKeepAliveCount: 10,
          maxNotificationsPerPublish: 100,
          publishingEnabled: true,
          priority: 10,
        });
      }

      const itemToMonitor: ReadValueIdOptions = {
        nodeId,
        attributeId: AttributeIds.Value,
      };

      const parameters: MonitoringParametersOptions = {
        samplingInterval: 1000,
        discardOldest: true,
        queueSize: 10,
        ...options,
      };

      const monitoredItem = await this.subscription.monitor(
        itemToMonitor,
        parameters,
        TimestampsToReturn.Both
      );

      monitoredItem.on('changed', (dataValue) => {
        callback(dataValue.value.value);
      });
    } catch (error) {
      logError(COMPONENT, `Error subscribing to nodeId ${nodeId}`, error);
      throw error;
    }
  }

  private publishToMqtt(topic: string, message: object): void {
    this.mqttService.publish(topic, message);
  }
}
