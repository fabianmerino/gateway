import { create } from 'zustand';
import type { ConnectionStatus, DeviceInfo } from '../types/api';

interface ConnectionState {
  status: ConnectionStatus | null;
  devices: DeviceInfo[];
  loading: boolean;
  error: string | null;
  setStatus: (status: ConnectionStatus) => void;
  setDevices: (devices: DeviceInfo[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: null,
  devices: [],
  loading: false,
  error: null,
  setStatus: (status) => set({ status }),
  setDevices: (devices) => set({ devices }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
