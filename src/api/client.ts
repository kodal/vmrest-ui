import axios from 'axios';
import type { VM, VMInformation, VMPowerState, NICDevice, SharedFolder } from '../types/api';

declare global {
  interface Window {
    __APP_CONFIG__?: {
      VMREST_URL?: string;
    };
  }
}

function buildApiBaseUrl(): string {
  const runtimeUrl = typeof window !== 'undefined' ? window.__APP_CONFIG__?.VMREST_URL : undefined;
  const rawHost: string | undefined = runtimeUrl
    || (import.meta as any).env?.VITE_VMREST_URL
    || (import.meta as any).env?.VMREST_URL;

  if (!rawHost) return '/api';

  const trimmed = rawHost.trim().replace(/\/$/, '');
  const hasProtocol = /^https?:\/\//i.test(trimmed);
  const origin = hasProtocol ? trimmed : `http://${trimmed}`;
  return `${origin}/api`;
}

const api = axios.create({
  baseURL: buildApiBaseUrl(),
  headers: {
    'Content-Type': 'application/vnd.vmware.vmw.rest-v1+json',
    'Accept': 'application/vnd.vmware.vmw.rest-v1+json'
  }
});

// VM Management
export const getAllVMs = () => api.get<VM[]>('/vms');
export const getVM = (id: string) => api.get<VMInformation>(`/vms/${id}`);
export const updateVM = (id: string, data: Partial<VMInformation>) => api.put<VMInformation>(`/vms/${id}`, data);
export const deleteVM = (id: string) => api.delete(`/vms/${id}`);

// Power Management
export const getPowerState = (id: string) => api.get<VMPowerState>(`/vms/${id}/power`);
export const changePowerState = (id: string, op: 'on' | 'off' | 'shutdown' | 'suspend' | 'pause' | 'unpause') => 
  api.put<VMPowerState>(`/vms/${id}/power`, op, {
    headers: { 'Content-Type': 'application/vnd.vmware.vmw.rest-v1+json' }
  });

// Network Management
export const getNICs = (id: string) => api.get<{ num: number; nics: NICDevice[] }>(`/vms/${id}/nic`);
export const createNIC = (id: string, data: Partial<NICDevice>) => api.post<NICDevice>(`/vms/${id}/nic`, data);
export const updateNIC = (id: string, index: number, data: Partial<NICDevice>) => api.put(`/vms/${id}/nic/${index}`, data);
export const deleteNIC = (id: string, index: number) => api.delete(`/vms/${id}/nic/${index}`);

// Shared Folders
export const getSharedFolders = (id: string) => api.get<SharedFolder[]>(`/vms/${id}/sharedfolders`);
export const createSharedFolder = (id: string, data: SharedFolder) => 
  api.post<SharedFolder[]>(`/vms/${id}/sharedfolders`, data);
export const deleteSharedFolder = (id: string, folderId: string) => 
  api.delete(`/vms/${id}/sharedfolders/${folderId}`);
export const updateSharedFolder = (id: string, folderId: string, data: Partial<SharedFolder>) => api.put(`/vms/${id}/sharedfolders/${folderId}`, data);

// Получить IP-адрес VM
export const getVMIP = (id: string) => api.get<{ ip: string }>(`/vms/${id}/ip`);

// Клонировать VM
export const cloneVM = (name: string, parentId: string) => api.post('/vms', { name, parentId });

// Зарегистрировать VM
export const registerVM = (name: string, path: string) => api.post('/vms/registration', { name, path });

// Получить ограничения VM
export const getVMRestrictions = (id: string) => api.get(`/vms/${id}/restrictions`);

// Получить расширенную информацию о сетевых интерфейсах и IP
export const getVMNicIps = (id: string) => api.get(`/vms/${id}/nicips`);

// Получить все виртуальные сети
export const getAllNetworks = () => api.get('/vmnet');
// Создать виртуальную сеть
export const createNetwork = (data: { name: string; type: string }) => api.post('/vmnets', data);
// Получить все пробросы портов для сети
export const getPortforwards = (vmnet: string) => api.get(`/vmnet/${vmnet}/portforward`);
// Обновить проброс порта
export const updatePortforward = (vmnet: string, protocol: string, port: number, data: { guestIp: string; guestPort: number; desc?: string }) => api.put(`/vmnet/${vmnet}/portforward/${protocol}/${port}`, data);
// Удалить проброс порта
export const deletePortforward = (vmnet: string, protocol: string, port: number) => api.delete(`/vmnet/${vmnet}/portforward/${protocol}/${port}`);
// Добавить проброс порта
export const addPortforward = (vmnet: string, protocol: string, port: number, data: { guestIp: string; guestPort: number; desc?: string }) => api.put(`/vmnet/${vmnet}/portforward/${protocol}/${port}`, data);

export default api; 