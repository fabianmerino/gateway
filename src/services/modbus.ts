import type { MqttClient } from 'mqtt';
import * as net from 'node:net';
import Modbus from 'jsmodbus';
import type { ModbusConfig, ModbusTag } from '../types/config.js';
import { logInfo, logError } from '../utils/logger/index.js';
import { ReconnectionManager } from '../utils/reconnection.js';
import type { MqttService } from './mqtt.js';

const COMPONENT = 'MqttService';

export class ModbusService {
  private socket: net.Socket;
  private client: Modbus.ModbusTCPClient;
  private reconnectionManager: ReconnectionManager;
  private isConnected = false;

  constructor(
    private readonly config: ModbusConfig,
    private readonly mqttService: MqttService
  ) {
    this.socket = new net.Socket();
    this.client = new Modbus.client.TCP(this.socket);
    this.setupSocketHandlers();

    this.reconnectionManager = new ReconnectionManager(
      COMPONENT,
      { initialDelay: 1000, maxDelay: 30000 },
      () => this.connect()
    );
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
        logInfo(COMPONENT, 'Modbus connection closed, attempting to reconnect...');
        void this.reconnectionManager.start();
      }
    });
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);

      this.socket.connect({
        host: this.config.host,
        port: this.config.port
      }, () => {
        clearTimeout(timeout);
        resolve();
      });

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
        const message = {
          timestamp: new Date().toISOString(),
          register: tag.register,
          type: tag.type,
          value
        };

        const topic = `industrial/modbus/${tag.name}`;
        this.publishToMqtt(topic, message);
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

  private publishToMqtt(topic: string, message: object): void {
    this.mqttService.publish(topic, message);
  }
}
