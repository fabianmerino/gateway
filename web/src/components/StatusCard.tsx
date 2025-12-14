import type { ConnectionStatus } from '../types/api';

interface StatusCardProps {
  status: ConnectionStatus;
}

export function StatusCard({ status }: StatusCardProps) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-4">
          <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              MQTT Broker
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              <div className="flex items-center">
                <div
                  className={`h-3 w-3 rounded-full mr-2 ${
                    status.sparkplug.connected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                {status.sparkplug.connected ? 'Connected' : 'Disconnected'}
              </div>
            </dd>
            <dd className="mt-2 text-xs text-gray-500">
              {status.sparkplug.broker}
            </dd>
          </div>

          <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Total Devices
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {status.totalDevices}
            </dd>
          </div>

          <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Active Devices
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              <span className="text-green-600">{status.activeDevices}</span>
              <span className="text-gray-400"> / {status.totalDevices}</span>
            </dd>
          </div>

          <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Total Metrics
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {status.totalMetrics}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
