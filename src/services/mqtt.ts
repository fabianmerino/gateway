import mqtt, { type MqttClient } from 'mqtt';
import type { MqttConfig } from '../types/config.js';
import { logInfo, logError } from '../utils/logger/index.js';
import { ReconnectionManager } from '../utils/reconnection.js';

const COMPONENT = 'MqttService';

export class MqttService {
  private client?: MqttClient;
  private reconnectionManager: ReconnectionManager;

  constructor(private readonly config: MqttConfig) {
    this.reconnectionManager = new ReconnectionManager(
      COMPONENT,
      { initialDelay: 1000, maxDelay: 30000 },
      () => this.connect()
    );
  }

  private async connect(): Promise<void> {
    this.client = await mqtt.connectAsync(this.config.broker, {
      clientId: this.config.clientId,
      username: this.config.username,
      password: this.config.password,
    });

    this.client?.once('connect', () => {
      logInfo(COMPONENT, 'Connected to MQTT broker');
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('close', () => {
      logInfo(COMPONENT, 'MQTT connection closed, attempting to reconnect...');
      void this.reconnectionManager.start();
    });

    this.client.on('error', (error) => {
      logError(COMPONENT, 'MQTT connection error', error);
    });

    this.client.on('offline', () => {
      logInfo(COMPONENT, 'MQTT connection offline, attempting to reconnect...');
      void this.reconnectionManager.start();
    });
  }

  public async start(): Promise<void> {
    await this.reconnectionManager.start();
    if (!this.client) {
      throw new Error('MQTT client not initialized');
    }
  }

  public stop(): void {
    this.reconnectionManager.stop();
    this.client?.end();
  }

  public publish(topic: string, message: object): void {
    if (!this.client?.connected) {
      logError(COMPONENT, 'Cannot publish: not connected to MQTT broker');
      return;
    }

    try {
      this.client.publish(topic, JSON.stringify(message));
    } catch (error) {
      logError(COMPONENT, `Error publishing to topic ${topic}`, error);
    }
  }
}
