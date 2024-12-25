import { readConfig } from './services/config.js';
import { MqttService } from './services/mqtt.js';
import { ModbusService } from './services/modbus.js';
import { OpcuaService } from './services/opcua.js';
import { logInfo, logError, logWarn } from './utils/logger/index.js';

const COMPONENT = 'Main';

interface ServiceStatus {
  name: string;
  status: 'running' | 'failed';
  error?: Error;
}

async function startService(
  name: string,
  startFn: () => Promise<void>
): Promise<ServiceStatus> {
  try {
    await startFn();
    return { name, status: 'running' };
  } catch (error) {
    logError(COMPONENT, `Failed to start ${name} service`, error);
    return { name, status: 'failed', error: error as Error };
  }
}

async function main() {
  try {
    const config = await readConfig();
    const mqttService = new MqttService(config.mqtt);
    const modbusService = new ModbusService(config.modbus, mqttService);
    const opcuaService = new OpcuaService(config.opcua, mqttService);

    const services = await Promise.allSettled([
      startService('MQTT', () => mqttService.start()),
      startService('Modbus', () => modbusService.start()),
      startService('OPC UA', () => opcuaService.start()),
    ]);

    const runningServices = services.filter(
      (result) => result.status === 'fulfilled' && result.value.status === 'running'
    );

    const failedServices = services.filter(
      (result) => result.status === 'fulfilled' && result.value.status === 'failed'
    );

    if (runningServices.length > 0) {
      logInfo(
        COMPONENT,
        `Services started: ${runningServices
          .map((r) => (r.status === 'fulfilled' ? r.value.name : ''))
          .join(', ')}`
      );
    }

    if (failedServices.length > 0) {
      logWarn(
        COMPONENT,
        `Failed services: ${failedServices
          .map((r) => (r.status === 'fulfilled' ? r.value.name : ''))
          .join(', ')}`
      );
    }

    process.on('SIGINT', () => {
      logInfo(COMPONENT, 'Stopping services...');
      modbusService.stop();
      mqttService.stop();
      opcuaService.stop();
      process.exit(0);
    });
  } catch (error) {
    logError(COMPONENT, 'Service startup error', error);
    process.exit(1);
  }
}

main();