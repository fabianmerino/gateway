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

    const servicesToStart: Array<{
      name: string;
      startFn: () => Promise<unknown>;
    }> = [{ name: 'Sparkplug', startFn: () => sparkplugService.start() }];

    const modbusServices: ModbusService[] = [];
    const opcuaServices: OpcuaService[] = [];

    // Handle multiple Modbus configurations
    for (let i = 0; i < config.modbus.length; i++) {
      const modbusConfig = config.modbus[i];

      if (!modbusConfig.enabled) {
        logWarn(COMPONENT, `Modbus service ${i + 1} disabled`);
        continue;
      }

      // Generate device name if not provided
      if (!modbusConfig.deviceName) {
        modbusConfig.deviceName = sparkplugService.generateDeviceName('modbus');
      }

      const modbusService = new ModbusService(modbusConfig, sparkplugService);
      modbusServices.push(modbusService);

      servicesToStart.push({
        name: `Modbus-${i + 1} (${modbusConfig.deviceName})`,
        startFn: () => modbusService.start(),
      });
    }

    // Handle multiple OPC UA configurations
    for (let i = 0; i < config.opcua.length; i++) {
      const opcuaConfig = config.opcua[i];

      if (!opcuaConfig.enabled) {
        logWarn(COMPONENT, `OPC UA service ${i + 1} disabled`);
        continue;
      }

      // Generate device name if not provided
      if (!opcuaConfig.deviceName) {
        opcuaConfig.deviceName = sparkplugService.generateDeviceName('opcua');
      }

      const opcuaService = new OpcuaService(opcuaConfig, sparkplugService);
      opcuaServices.push(opcuaService);

      servicesToStart.push({
        name: `OPC UA-${i + 1} (${opcuaConfig.deviceName})`,
        startFn: () => opcuaService.start(),
      });
    }

    // Log configuration summary
    logInfo(COMPONENT, 'Configuration Summary:');
    logInfo(COMPONENT, '- Sparkplug Service: 1 instance');
    logInfo(COMPONENT, `- Modbus Services: ${modbusServices.length} configured, ${config.modbus.filter(c => c.enabled).length} enabled`);
    logInfo(COMPONENT, `- OPC UA Services: ${opcuaServices.length} configured, ${config.opcua.filter(c => c.enabled).length} enabled`);
    logInfo(COMPONENT, `- Total Services to Start: ${servicesToStart.length}`);

    const services = await Promise.allSettled(
      servicesToStart.map((service) =>
        startService(service.name, service.startFn)
      )
    );

    const runningServices = services.filter(
      (result) =>
        result.status === 'fulfilled' && result.value.status === 'running'
    );

    const failedServices = services.filter(
      (result) =>
        result.status === 'fulfilled' && result.value.status === 'failed'
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
      for (const service of modbusServices) {
        service.stop();
      }
      for (const service of opcuaServices) {
        service.stop();
      }
      sparkplugService.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logInfo(COMPONENT, 'Stopping services...');
      for (const service of modbusServices) {
        service.stop();
      }
      for (const service of opcuaServices) {
        service.stop();
      }
      sparkplugService.stop();
      process.exit(0);
    });
  } catch (error) {
    logError(COMPONENT, 'Service startup error', error);
    process.exit(1);
  }
}

main();
