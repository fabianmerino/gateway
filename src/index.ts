import { readConfig } from './services/config.js';
import { ModbusService } from './services/modbus.js';
import { OpcuaService } from './services/opcua.js';
import { logInfo, logError, logWarn } from './utils/logger/index.js';
import { SparkplugService } from './services/sparkplug.js';
import { databaseService } from './services/database.js';

const COMPONENT = 'Main';

interface ServiceStatus {
  name: string;
  status: 'running' | 'failed';
  error?: Error;
}

async function startService(
  name: string,
  startFn: () => Promise<unknown>
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
    await databaseService.init();
    const sparkplugService = new SparkplugService(config.mqtt);

    const servicesToStart: Array<{ name: string; startFn: () => Promise<unknown> }> = [
      { name: 'Sparkplug', startFn: () => sparkplugService.start() }
    ];

    let modbusService: ModbusService;
    let opcuaService: OpcuaService;

    if (config.modbus.enabled) {
      modbusService = new ModbusService(config.modbus, sparkplugService);
      servicesToStart.push({ name: 'Modbus', startFn: () => modbusService.start() });
    } else {
      logWarn(COMPONENT, 'Modbus service disabled');
    }

    if (config.opcua.enabled) {
      opcuaService = new OpcuaService(config.opcua, sparkplugService);
      servicesToStart.push({ name: 'OPC UA', startFn: () => opcuaService.start() });
    } else {
      logWarn(COMPONENT, 'OPC UA service disabled');
    }

    const services = await Promise.allSettled(
      servicesToStart.map(service => startService(service.name, service.startFn))
    );

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
      modbusService?.stop();
      opcuaService?.stop();
      sparkplugService.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logInfo(COMPONENT, 'Stopping services...');
      modbusService?.stop();
      opcuaService?.stop();
      sparkplugService.stop();
      process.exit(0);
    });
  } catch (error) {
    logError(COMPONENT, 'Service startup error', error);
    process.exit(1);
  }
}

main();