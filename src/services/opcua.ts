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
  type DataValue,
} from 'node-opcua';
import type { OpcuaConfig } from '../types/config.js';
import { logInfo, logError } from '../utils/logger/index.js';
import { ReconnectionManager } from '../utils/reconnection.js';
import type { MonitoredVariable } from '../types/index.js';
import type { SparkplugService } from './sparkplug.js';

const COMPONENT = 'OpcuaService';

export class OpcuaService {
  private client: OPCUAClient;
  private session?: ClientSession;
  private subscription?: ClientSubscription;
  private reconnectionManager: ReconnectionManager;
  private monitoredVariables: Map<string, MonitoredVariable> = new Map();
  private deviceName: string;
  constructor(
    private readonly config: OpcuaConfig,
    private readonly sparkplugService: SparkplugService
  ) {
    // Generate device name if not provided
    this.deviceName = config.deviceName || 'device-opcua-1';

    this.reconnectionManager = new ReconnectionManager(
      COMPONENT,
      { initialDelay: 1000, maxDelay: 30000 },
      () => this.connect()
    );

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

    this.initializeMonitoredVariables();
  }

  private async connect(): Promise<void> {
    try {
      await this.client.connect(this.config.serverUrl);
      logInfo(COMPONENT, 'Connected to OPC UA server');

      this.session = await this.client.createSession();
      logInfo(COMPONENT, 'OPC UA session created');

      logInfo(COMPONENT, 'Connected to OPC UA server');

      this.setupEventHandlers();
    } catch (error) {
      logError(COMPONENT, 'OPC UA error', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    // Subscribe to tags
    for (const tag of this.config.tags) {
      this.subscribe(
        tag.nodeId,
        (dataValue) => {
          const value = dataValue.value.value;
          // Update local variable state
          const variable = this.monitoredVariables.get(tag.name);
          if (
            variable?.value &&
            Math.abs(value - variable.value) >= (tag.delta ?? 0)
          ) {
            variable.value = value;
            this.monitoredVariables.set(tag.name, variable);
            this.sparkplugService.updateMetric(
              this.deviceName,
              tag.name,
              value,
              tag.interval
            );
            logInfo(COMPONENT, `Tag value updated: ${tag.name} = ${value}`);
          }

          // Update Sparkplug metric
          this.sparkplugService.updateMetric(
            this.deviceName,
            tag.name,
            value,
            tag.interval
          );
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

  private initializeMonitoredVariables(): void {
    for (const tag of this.config.tags) {
      this.monitoredVariables.set(tag.name, {
        name: tag.name,
        type: 'Double',
        value: null,
      });
    }
  }

  public getMonitoredVariables(): MonitoredVariable[] {
    return Array.from(this.monitoredVariables.values());
  }

  public async start(): Promise<void> {
    await this.reconnectionManager.start();
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
    callback: (value: DataValue) => void,
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

      monitoredItem.on('changed', callback);
    } catch (error) {
      logError(COMPONENT, `Error subscribing to nodeId ${nodeId}`, error);
      throw error;
    }
  }
}
