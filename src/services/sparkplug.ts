import { newClient, type UPayload } from 'sparkplug-client';
import type { MqttConfig } from '../types/config.js';
import { logInfo, logError } from '../utils/logger/index.js';
import { databaseService, type StoredMessage } from './database.js';
import { ReconnectionManager } from '../utils/reconnection.js';

const COMPONENT = 'SparkplugService';

interface MetricData {
  value: number;
  interval: number;
  lastPublished: number;
}

export class SparkplugService {
  private client?: ReturnType<typeof newClient>;
  private metrics: Map<string, MetricData> = new Map();
  private publishCheckInterval?: NodeJS.Timeout;
  private isConnected = false;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private reconnectionManager: ReconnectionManager;

  constructor(private readonly config: MqttConfig) {
    this.reconnectionManager = new ReconnectionManager(
      COMPONENT,
      { initialDelay: 1000, maxDelay: 30000 },
      () => this.connect()
    );
  }

  private setupEventHandlers() {
    this.client?.on('birth', () => {
      logInfo(COMPONENT, 'Sparkplug B birth certificate sent');
      this.sendDBirth();
    });

    this.client?.on('error', (error) => {
      logError(COMPONENT, 'Sparkplug B error', error);
      this.isConnected = false;
    });

    this.client?.on('offline', () => {
      logInfo(COMPONENT, 'Sparkplug B client went offline');
      this.isConnected = false;
    });

    this.client?.on('reconnect', () => {
      logInfo(COMPONENT, 'Sparkplug B client reconnecting');
    });

    this.client?.on('connect', this.handleConnect.bind(this));
  }

  private handleConnect() {
    logInfo(COMPONENT, 'Connected to Sparkplug broker');
    this.isConnected = true;
    this.sendStoredMessages();
  }

  async connect() {
    try {
      const clientId = `${this.config.clientId}-sparkplug`;
      this.client = newClient({
        serverUrl: this.config.broker,
        username: this.config.username,
        password: this.config.password,
        groupId: this.config.sparkplug.groupId,
        edgeNode: this.config.sparkplug.edgeNode,
        clientId,
        version: 'spBv1.0',
      });

      this.setupEventHandlers();
    } catch (error) {
      logError(COMPONENT, 'Failed to connect to Sparkplug broker:', error);
    }
  }

  public async start(): Promise<void> {
    try {
      await this.reconnectionManager.start();

      // Check metrics every 100ms to see which ones need to be published
      this.publishCheckInterval = setInterval(() => {
        this.checkAndPublishMetrics();
      }, 100);

      logInfo(COMPONENT, 'Sparkplug B service started');
    } catch (error) {
      logError(COMPONENT, 'Failed to start Sparkplug B service', error);
      throw error;
    }
  }

  public stop(): void {
    this.reconnectionManager.stop();
    if (this.publishCheckInterval) {
      clearInterval(this.publishCheckInterval);
    }
    this.client?.stop();
  }

  public updateMetric(name: string, value: number, interval: number): void {
    const currentMetric = this.metrics.get(name);

    if (!currentMetric) {
      // New metric
      this.metrics.set(name, {
        value,
        interval,
        lastPublished: 0, // Force first publish
      });
      this.publishMetric(name, value);
    } else if (currentMetric.value !== value) {
      // Value changed, update it
      this.metrics.set(name, {
        value,
        interval,
        lastPublished: currentMetric.lastPublished,
      });
    }
  }

  private sendDBirth(): void {
    // Convert current metrics to DBIRTH format
    const metrics: UPayload['metrics'] = Array.from(this.metrics.entries()).map(
      ([name, data]) => ({
        name,
        value: data.value,
        type: 'Double',
        timestamp: Date.now(),
      })
    );

    const payload: UPayload = {
      metrics,
    };

    try {
      this.client?.publishDeviceBirth(this.config.sparkplug.deviceId, payload);
      logInfo(COMPONENT, 'Published DBIRTH message');
    } catch (error) {
      logError(COMPONENT, 'Failed to publish DBIRTH message', error);
    }
  }

  private checkAndPublishMetrics(): void {
    const now = Date.now();

    for (const [name, metric] of this.metrics.entries()) {
      if (now - metric.lastPublished >= metric.interval) {
        this.publishMetric(name, metric.value);
      }
    }
  }

  private async publishMetric(name: string, value: number): Promise<void> {
    const payload: UPayload = {
      metrics: [
        {
          name,
          value,
          type: 'Double',
          timestamp: Date.now(),
        },
      ],
    };

    try {
      if (this.isConnected) {
        this.client?.publishDeviceData(this.config.sparkplug.deviceId, payload);
        logInfo(COMPONENT, `Published metric: ${name} = ${value}`);
      } else {
        await this.storeMessage(this.config.sparkplug.deviceId, payload);
        logInfo(COMPONENT, `Stored metric: ${name} = ${value}`);
      }

      // Update last published time
      const metric = this.metrics.get(name);
      if (metric) {
        metric.lastPublished = Date.now();
        this.metrics.set(name, metric);
      }
    } catch (error) {
      logError(COMPONENT, `Failed to publish metric ${name}`, error);
      await this.storeMessage(this.config.sparkplug.deviceId, payload);
    }
  }

  private async storeMessage(deviceId: string, payload: UPayload) {
    const topic = `spBv1.0/${this.config.sparkplug.groupId}/DDATA/${this.config.sparkplug.edgeNode}/${deviceId}`;
    const message: StoredMessage = {
      topic,
      payload: JSON.stringify(payload),
      timestamp: (payload.timestamp ?? Date.now()) as number,
    };
    await databaseService.storeMessage(message);
  }

  private async sendStoredMessages() {
    const storedMessages = await databaseService.getStoredMessages();
    const sentMessageIds: number[] = [];

    for (const message of storedMessages) {
      try {
        const historicalData = JSON.parse(message.payload) as UPayload;
        for (const metric of historicalData.metrics!) {
          metric.isHistorical = true;
        }
        this.client?.publishDeviceData(
          this.config.sparkplug.deviceId,
          historicalData
        );
        sentMessageIds.push(message.id!);
      } catch (error) {
        logError(COMPONENT, 'Error sending stored message:', error);
        break; // Stop sending if there's an error
      }
    }

    if (sentMessageIds.length > 0) {
      await databaseService.deleteMessages(sentMessageIds);
      logInfo(
        COMPONENT,
        `Sent and deleted ${sentMessageIds.length} stored messages`
      );
    }
  }
}
