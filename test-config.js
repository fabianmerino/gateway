#!/usr/bin/env node

// Simple test script to validate the configuration loading
import { parse } from 'yaml';
import { readFileSync } from 'node:fs';

try {
  // Load configuration
  const configPath = './config.yaml';
  const fileContents = readFileSync(configPath, 'utf8');
  const config = parse(fileContents);

  console.log('✅ Configuration loaded successfully!');
  console.log('\n📊 Configuration Summary:');
  console.log(`- MQTT Broker: ${config.mqtt.broker}`);
  console.log(`- Sparkplug Group: ${config.mqtt.sparkplug.groupId}`);
  console.log(`- Sparkplug Edge Node: ${config.mqtt.sparkplug.edgeNode}`);

  // Check OPC UA configurations
  console.log(`\n🔧 OPC UA Configurations: ${config.opcua.length}`);
  config.opcua.forEach((opcuaConfig, index) => {
    const status = opcuaConfig.enabled ? '✅ ENABLED' : '❌ DISABLED';
    console.log(`  ${index + 1}. ${opcuaConfig.deviceName || 'NO NAME'} (${opcuaConfig.serverUrl}) - ${status}`);
    console.log(`     Tags: ${opcuaConfig.tags.length}`);
  });

  // Check Modbus configurations
  console.log(`\n⚡ Modbus Configurations: ${config.modbus.length}`);
  config.modbus.forEach((modbusConfig, index) => {
    const status = modbusConfig.enabled ? '✅ ENABLED' : '❌ DISABLED';
    console.log(`  ${index + 1}. ${modbusConfig.deviceName || 'NO NAME'} (${modbusConfig.host}:${modbusConfig.port}) - ${status}`);
    console.log(`     Tags: ${modbusConfig.tags.length}`);
  });

  // Count enabled services
  const enabledOpcua = config.opcua.filter(c => c.enabled).length;
  const enabledModbus = config.modbus.filter(c => c.enabled).length;

  console.log('\n📈 Active Services:');
  console.log(`- OPC UA: ${enabledOpcua}/${config.opcua.length}`);
  console.log(`- Modbus: ${enabledModbus}/${config.modbus.length}`);
  console.log(`- Total: ${enabledOpcua + enabledModbus} devices`);

} catch (error) {
  console.error('❌ Configuration validation failed:', error.message);
  process.exit(1);
}
