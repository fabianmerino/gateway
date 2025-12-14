import { useState } from 'react';
import type { DeviceInfo } from '../types/api';
import { DeviceDetails } from './DeviceDetails';

interface DeviceCardProps {
  device: DeviceInfo;
}

export function DeviceCard({ device }: DeviceCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getProtocolBadgeColor = (protocol: string) => {
    return protocol === 'opcua' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
  };

  const formatLastActivity = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <>
      <div 
        className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setShowDetails(true)}
      >
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">{device.deviceName}</h3>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${getProtocolBadgeColor(
                  device.protocol
                )}`}
              >
                {device.protocol.toUpperCase()}
              </span>
              <div
                className={`h-3 w-3 rounded-full ${
                  device.isActive ? 'bg-green-500' : 'bg-gray-400'
                }`}
                title={device.isActive ? 'Active' : 'Inactive'}
              />
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Metrics</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {device.metricCount}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Activity</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatLastActivity(device.lastActivity)}
              </dd>
            </div>
          </dl>

          {device.protocol === 'opcua' && 'serverUrl' in device.config && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 truncate">
                {device.config.serverUrl}
              </p>
            </div>
          )}

          {device.protocol === 'modbus' && 'host' in device.config && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                {device.config.host}:{device.config.port}
              </p>
            </div>
          )}
        </div>
      </div>

      {showDetails && (
        <DeviceDetails device={device} onClose={() => setShowDetails(false)} />
      )}
    </>
  );
}
