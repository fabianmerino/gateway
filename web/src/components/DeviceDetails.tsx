import { useEffect, useState } from 'react';
import type { DeviceInfo, Metric } from '../types/api';
import { apiService } from '../services/api';

interface DeviceDetailsProps {
  device: DeviceInfo;
  onClose: () => void;
}

export function DeviceDetails({ device, onClose }: DeviceDetailsProps) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const data = await apiService.getDeviceMetrics(device.deviceId);
        setMetrics(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000); // Refresh every 2 seconds

    return () => clearInterval(interval);
  }, [device.deviceId]);

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {device.deviceName} Details
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-8rem)]">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Device Information
            </h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Protocol</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {device.protocol.toUpperCase()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {device.isActive ? (
                    <span className="text-green-600 font-medium">Active</span>
                  ) : (
                    <span className="text-gray-600">Inactive</span>
                  )}
                </dd>
              </div>
              {device.protocol === 'opcua' && 'serverUrl' in device.config && (
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-gray-500">
                    Server URL
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {device.config.serverUrl}
                  </dd>
                </div>
              )}
              {device.protocol === 'modbus' && 'host' in device.config && (
                <>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Host</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {device.config.host}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Port</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {device.config.port}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Metrics ({metrics.length})
            </h3>
            {loading && metrics.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Loading metrics...</p>
              </div>
            ) : error ? (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            ) : metrics.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No metrics available</p>
            ) : (
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Interval
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {metrics.map((metric) => (
                      <tr key={metric.name}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {metric.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {metric.value.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {metric.interval}ms
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {metric.lastUpdated
                            ? new Date(metric.lastUpdated).toLocaleTimeString()
                            : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
