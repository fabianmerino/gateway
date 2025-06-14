import * as net from 'node:net';
import * as Modbus from 'jsmodbus';
import type { ModbusConfig, ModbusTag } from '../types/config.js';
import { logInfo, logError } from '../utils/logger/index.js';
import { ReconnectionManager } from '../utils/reconnection.js';
import type { SparkplugService } from './sparkplug.js';
import type { MonitoredVariable } from '../types/index.js';

const COMPONENT = 'ModbusService';

export class ModbusService {
  private socket: net.Socket;
  private client: Modbus.ModbusTCPClient;
  private reconnectionManager: ReconnectionManager;
  private isConnected = false;
  private monitoredVariables: Map<string, MonitoredVariable> = new Map();
  private deviceName: string;

  constructor(
    private readonly config: ModbusConfig,
    private readonly sparkplugService: SparkplugService
  ) {
    // Generate device name if not provided
    this.deviceName = config.deviceName || 'device-modbus-1';
    this.sparkplugService.registerDevice(this.deviceName);
    // Inform Sparkplug service about expected number of tags
    this.sparkplugService.setExpectedTags(
      this.deviceName,
      this.config.tags.length
    );

    this.socket = new net.Socket();
    this.client = new Modbus.client.TCP(this.socket);
    this.setupSocketHandlers();
    this.initializeMonitoredVariables();

    this.reconnectionManager = new ReconnectionManager(
      COMPONENT,
      { initialDelay: 1000, maxDelay: 30000 },
      () => this.connect()
    );
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

  private setupSocketHandlers(): void {
    this.socket.on('connect', () => {
      this.isConnected = true;
      logInfo(COMPONENT, 'Connected to Modbus device');

      for (const tag of this.config.tags) {
        this.startTagMonitoring(tag);
      }
    });

    this.socket.on('error', (err) => {
      logError(COMPONENT, 'Modbus socket error', err);
    });

    this.socket.on('close', () => {
      if (this.isConnected) {
        this.isConnected = false;
        logInfo(
          COMPONENT,
          'Modbus connection closed, attempting to reconnect...'
        );
        void this.reconnectionManager.start();
      }
    });
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);

      this.socket.connect(
        {
          host: this.config.host,
          port: this.config.port,
        },
        () => {
          clearTimeout(timeout);
          resolve();
        }
      );

      this.socket.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  public async start(): Promise<void> {
    await this.reconnectionManager.start();
  }

  public stop(): void {
    this.reconnectionManager.stop();
    this.socket.end();
  }

  private startTagMonitoring(tag: ModbusTag): void {
    setInterval(async () => {
      if (!this.isConnected) return;

      try {
        const value = await this.readModbusValue(tag);

        // Update local variable state
        const variable = this.monitoredVariables.get(tag.name);
        if (variable) {
          variable.value = value;
          this.monitoredVariables.set(tag.name, variable);
        } // Update Sparkplug B metric with the tag's interval
        this.sparkplugService.updateMetric(
          this.deviceName,
          tag.name,
          value,
          tag.interval
        );
        logInfo(COMPONENT, `Tag value updated: ${tag.name} = ${value}`);
      } catch (error) {
        logError(COMPONENT, `Error reading tag ${tag.name}`, error);
      }
    }, tag.interval);
  }

  private async readModbusValue(tag: ModbusTag): Promise<number> {
    const registerAddress = tag.register - 1;

    try {
      const response = await (tag.type === 'holding'
        ? this.client.readHoldingRegisters(registerAddress, 1)
        : this.client.readInputRegisters(registerAddress, 1));

      return response.response.body.values[0];
    } catch (error) {
      throw new Error(`Failed to read Modbus register: ${error}`);
    }
  }
}
