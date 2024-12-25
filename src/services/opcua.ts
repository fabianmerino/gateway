import type { MqttClient } from 'mqtt';
import {
  OPCUAClient,
  AttributeIds,
  ClientMonitoredItem,
  ClientSubscription,
  type DataValue,
  TimestampsToReturn,
} from 'node-opcua';
import type { OpcuaConfig, OpcuaTag } from '../types/config.js';
import { publishMessage } from './mqtt.js';
import { logInfo, logError } from '../utils/logger/index.js';

const COMPONENT = 'OpcuaService';

export async function startOpcuaClient(
  config: OpcuaConfig,
  mqttClient: MqttClient
): Promise<void> {
  const client = OPCUAClient.create({
    endpointMustExist: false,
  });

  try {
    await client.connect(config.serverUrl);
    logInfo(COMPONENT, 'Connected to OPC UA server');

    const session = await client.createSession();
    logInfo(COMPONENT, 'OPC UA session created');

    const subscription = ClientSubscription.create(session, {
      requestedPublishingInterval: 1000,
      requestedLifetimeCount: 100,
      requestedMaxKeepAliveCount: 10,
      maxNotificationsPerPublish: 100,
      publishingEnabled: true,
      priority: 10,
    });

    subscription.on('started', () => {
      logInfo(COMPONENT, 'Subscription started');
    });

    for (const tag of config.tags) {
      await monitorTag(tag, subscription, mqttClient);
    }

    // Cleanup on process termination
    process.on('SIGINT', async () => {
      logInfo(COMPONENT, 'Closing OPC UA connection...');
      await session.close();
      await client.disconnect();
    });
  } catch (error) {
    logError(COMPONENT, 'OPC UA error', error);
    throw error;
  }
}

async function monitorTag(
  tag: OpcuaTag,
  subscription: ClientSubscription,
  mqttClient: MqttClient
): Promise<void> {
  try {
    const itemToMonitor = {
      nodeId: tag.nodeId,
      attributeId: AttributeIds.Value,
    };

    const parameters = {
      samplingInterval: tag.interval,
      discardOldest: true,
      queueSize: 10,
    };

    const monitoredItem = ClientMonitoredItem.create(
      subscription,
      itemToMonitor,
      parameters,
      TimestampsToReturn.Both
    );

    monitoredItem.on('changed', (dataValue: DataValue) => {
      const message = {
        timestamp: new Date().toISOString(),
        nodeId: tag.nodeId,
        value: dataValue.value.value,
        status: dataValue.statusCode.toString(),
      };

      const topic = `industrial/opcua/${tag.name}`;
      publishMessage(mqttClient, topic, message);
      logInfo(
        COMPONENT,
        `Tag value updated: ${tag.name} = ${dataValue.value.value}`
      );
    });
  } catch (error) {
    logError(COMPONENT, `Error monitoring tag ${tag.name}`, error);
    throw error;
  }
}
