export interface VM {
  id: string;
  path: string;
}

export interface VMInformation {
  id: string;
  cpu?: {
    processors: number;
  };
  memory?: {
    size: number;
  };
}

export interface VMPowerState {
  power_state: 'poweredOn' | 'poweredOff' | 'paused' | 'suspended';
}

export interface VMPowerOperationRequest {
  operation: 'on' | 'off' | 'shutdown' | 'suspend' | 'pause' | 'unpause';
}

export interface NICDevice {
  index: number;
  type: 'bridged' | 'nat' | 'hostonly' | 'custom';
  vmnet: string;
  macAddress: string;
}

export interface SharedFolder {
  folder_id: string;
  host_path: string;
  flags: number;
}

export interface ErrorResponse {
  code: number;
  message: string;
}

export interface Network {
  name: string;
  type: 'bridged' | 'nat' | 'hostOnly';
  dhcp: 'true' | 'false';
  subnet: string;
  mask: string;
}

export interface VmNicInfo {
  macAddress: string;
  ip?: string[];
  dhcp4?: { enabled: boolean };
} 