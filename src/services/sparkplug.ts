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
  lastUpdated?: number;
}

interface DeviceMetrics {
  deviceId: string;
  metrics: Map<string, MetricData>;
  registeredAt: number;
  lastActivity: number;
}

export class SparkplugService {
  private client?: ReturnType<typeof newClient>;
  private devices: Map<string, DeviceMetrics> = new Map();
  private publishCheckInterval?: NodeJS.Timeout;
  private isConnected = false;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private reconnectionManager: ReconnectionManager;
  private deviceCounters: Map<string, number> = new Map(); // For auto-generating device names
  constructor(private readonly config: MqttConfig) {
    this.reconnectionManager = new ReconnectionManager(
      COMPONENT,
      { initialDelay: 1000, maxDelay: 30000 },
      () => this.connect()
    );
  }

  /**
   * Generates a unique device name based on the protocol type
   */
  public generateDeviceName(protocol: string): string {
    const currentCount = this.deviceCounters.get(protocol) || 0;
    const newCount = currentCount + 1;
    this.deviceCounters.set(protocol, newCount);
    return `device-${protocol}-${newCount}`;
  }

  private setupEventHandlers() {
    this.client?.on('birth', () => {
      logInfo(COMPONENT, 'Sparkplug B birth certificate sent');
      this.sendAllDBirths();
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

    // Handle device command messages
    this.client?.on('dcmd', (device, payload) => {
      logInfo(COMPONENT, `Received device command for ${device}`, payload);
      // Handle device rebirth
      if (this.devices.has(device)) {
        const commands = payload.metrics || [];
        for (const command of commands) {
          if (
            command.name === 'Device Control/Rebirth' &&
            command.value === true
          ) {
            logInfo(COMPONENT, `Device rebirth command received for ${device}`);
            this.sendDBirth(device);
          } else {
            logInfo(
              COMPONENT,
              `Received command for ${device}: ${command.name} = ${command.value}`
            );
          }
        }
      }
    });
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
      }, 100); // Check for inactive devices every 5 minutes
      setInterval(() => {
        this.removeInactiveDevices();
      }, 300000); // 5 minutes

      // Log device status every 10 minutes
      setInterval(() => {
        this.logDeviceStatus();
      }, 600000); // 10 minutes

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
  public updateMetric(
    deviceId: string,
    name: string,
    value: number,
    interval: number
  ): void {
    const now = Date.now();

    // Ensure device exists
    if (!this.devices.has(deviceId)) {
      this.devices.set(deviceId, {
        deviceId,
        metrics: new Map(),
        registeredAt: now,
        lastActivity: now,
      });
      logInfo(COMPONENT, `Registered new device: ${deviceId}`);

      // Send DBIRTH for new device if connected
      if (this.isConnected) {
        this.sendDBirth(deviceId);
      }
    }

    const device = this.devices.get(deviceId)!;
    device.lastActivity = now; // Update last activity

    const currentMetric = device.metrics.get(name);

    if (!currentMetric) {
      // New metric
      device.metrics.set(name, {
        value,
        interval,
        lastPublished: 0, // Force first publish
        lastUpdated: now,
      });
      this.publishMetric(deviceId, name, value);
    } else if (currentMetric.value !== value) {
      // Value changed, update it
      device.metrics.set(name, {
        value,
        interval,
        lastPublished: currentMetric.lastPublished,
        lastUpdated: now,
      });
    }
  }

  private sendAllDBirths(): void {
    for (const device of this.devices.values()) {
      this.sendDBirth(device.deviceId);
    }
  }

  private sendDBirth(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (!device) {
      logError(COMPONENT, `Device ${deviceId} not found for DBIRTH`);
      return;
    }

    // Convert current metrics to DBIRTH format
    const metrics: UPayload['metrics'] = Array.from(
      device.metrics.entries()
    ).map(([name, data]) => ({
      name,
      value: data.value,
      type: 'Double',
      timestamp: data.lastPublished || Date.now(),
    }));

    const payload: UPayload = {
      metrics,
    };

    try {
      this.client?.publishDeviceBirth(deviceId, payload);
      logInfo(COMPONENT, `Published DBIRTH message for device ${deviceId}`);
    } catch (error) {
      logError(
        COMPONENT,
        `Failed to publish DBIRTH message for device ${deviceId}`,
        error
      );
    }
  }

  private checkAndPublishMetrics(): void {
    const now = Date.now();

    for (const device of this.devices.values()) {
      for (const [name, metric] of device.metrics.entries()) {
        if (now - metric.lastPublished >= metric.interval) {
          this.publishMetric(device.deviceId, name, metric.value);
        }
      }
    }
  }

  private async publishMetric(
    deviceId: string,
    name: string,
    value: number
  ): Promise<void> {
    const payload: UPayload = {
      timestamp: Date.now(),
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
        this.client?.publishDeviceData(deviceId, payload);
        logInfo(
          COMPONENT,
          `Published metric for ${deviceId}: ${name} = ${value}`
        );
      } else {
        await this.storeMessage(deviceId, payload);
        logInfo(COMPONENT, `Stored metric for ${deviceId}: ${name} = ${value}`);
      } // Update last published time
      const device = this.devices.get(deviceId);
      if (device?.metrics.has(name)) {
        const metric = device.metrics.get(name)!;
        metric.lastPublished = Date.now();
        device.metrics.set(name, metric);
      }
    } catch (error) {
      logError(
        COMPONENT,
        `Failed to publish metric ${name} for device ${deviceId}`,
        error
      );
      await this.storeMessage(deviceId, payload);
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

        // Extract device ID from topic
        const topicParts = message.topic.split('/');
        const deviceId = topicParts[topicParts.length - 1];

        this.client?.publishDeviceData(deviceId, historicalData);
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
  public getRegisteredDevices(): string[] {
    return Array.from(this.devices.keys());
  }

  public getDeviceMetrics(
    deviceId: string
  ): Map<string, MetricData> | undefined {
    return this.devices.get(deviceId)?.metrics;
  }
  /**
   * Get all devices with their metrics summary
   */
  public getDevicesSummary(): Array<{
    deviceId: string;
    metricCount: number;
    lastActivity: number;
    registeredAt: number;
    isActive: boolean;
  }> {
    const now = Date.now();
    return Array.from(this.devices.entries()).map(([deviceId, device]) => ({
      deviceId,
      metricCount: device.metrics.size,
      lastActivity: device.lastActivity,
      registeredAt: device.registeredAt,
      isActive: now - device.lastActivity < 30000, // Active if updated within last 30 seconds
    }));
  }
  /**
   * Remove a device and all its metrics
   */
  public removeDevice(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (device) {
      // Send DDEATH message before removing device
      if (this.isConnected) {
        this.sendDDeath(deviceId);
      }

      this.devices.delete(deviceId);
      logInfo(COMPONENT, `Removed device: ${deviceId}`);
      return true;
    }
    return false;
  }
  /**
   * Send Device Death (DDEATH) message
   */
  private sendDDeath(deviceId: string): void {
    try {
      const payload: UPayload = {
        timestamp: Date.now(),
        metrics: [],
      };

      this.client?.publishDeviceDeath(deviceId, payload);
      logInfo(COMPONENT, `Published DDEATH message for device ${deviceId}`);
    } catch (error) {
      logError(
        COMPONENT,
        `Failed to publish DDEATH message for device ${deviceId}`,
        error
      );
    }
  }
  /**
   * Check for inactive devices and optionally remove them
   */
  public checkDeviceHealth(maxInactiveTime = 300000): Array<string> {
    // 5 minutes default
    const now = Date.now();
    const inactiveDevices: string[] = [];

    for (const [deviceId, device] of this.devices.entries()) {
      if (now - device.lastActivity > maxInactiveTime) {
        inactiveDevices.push(deviceId);
      }
    }

    return inactiveDevices;
  }

  /**
   * Remove inactive devices
   */
  public removeInactiveDevices(maxInactiveTime = 300000): number {
    const inactiveDevices = this.checkDeviceHealth(maxInactiveTime);
    let removedCount = 0;

    for (const deviceId of inactiveDevices) {
      if (this.removeDevice(deviceId)) {
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logInfo(COMPONENT, `Removed ${removedCount} inactive devices`);
    }
    return removedCount;
  }

  /**
   * Log current device status for monitoring
   */
  public logDeviceStatus(): void {
    const devicesSummary = this.getDevicesSummary();

    if (devicesSummary.length === 0) {
      logInfo(COMPONENT, 'No devices registered');
      return;
    }

    logInfo(
      COMPONENT,
      `Device Status Report (${devicesSummary.length} devices):`
    );
    for (const device of devicesSummary) {
      const status = device.isActive ? 'ACTIVE' : 'INACTIVE';
      const uptime = Math.floor((Date.now() - device.registeredAt) / 1000);
      logInfo(
        COMPONENT,
        `  ${device.deviceId}: ${status} | ${device.metricCount} metrics | uptime: ${uptime}s`
      );
    }
  }

  /**
   * Get total metrics count across all devices
   */
  public getTotalMetricsCount(): number {
    let total = 0;
    for (const device of this.devices.values()) {
      total += device.metrics.size;
    }
    return total;
  }

  /**
   * Get count of active devices
   */
  public getActiveDevicesCount(): number {
    const now = Date.now();
    let activeCount = 0;
    for (const device of this.devices.values()) {
      if (now - device.lastActivity < 30000) { // Active if updated within last 30 seconds
        activeCount++;
      }
    }
    return activeCount;
  }
}
