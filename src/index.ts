import { readConfig } from './services/config.js';
import { MqttService } from './services/mqtt.js';
import { ModbusService } from './services/modbus.js';
import { logInfo, logError } from './utils/logger/index.js';

const COMPONENT = 'Main';

async function main() {
  try {
    const config = await readConfig();
    const mqttService = new MqttService(config.mqtt);
    const mqttClient = await mqttService.start();

    const modbusService = new ModbusService(config.modbus, mqttClient);
    await modbusService.start();

    logInfo(COMPONENT, 'Industrial monitoring service started');

    process.on('SIGINT', () => {
      logInfo(COMPONENT, 'Stopping services...');
      modbusService.stop();
      mqttService.stop();
      process.exit(0);
    });
  } catch (error) {
    logError(COMPONENT, 'Service startup error', error);
    process.exit(1);
  }
}

main();