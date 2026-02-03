export interface Channel {
  id: number;
  label: string;
}

export interface SwitchRecord {
  input: number;
  outputs: number[];
  cmd: string;
}

export interface Scene {
  id: number;
  name: string;
  records: SwitchRecord[];
  timestamp: number;
}

export interface HardwareSettings {
  osdEnabled: boolean;
  buzzerEnabled: boolean;
  resolution: string; // "RES0", "RES1", "RES2"
}

export interface SplicingSettings {
  rows: number;
  cols: number;
}

export interface SplicingGroup {
  id: string; // unique ID for the group
  outputIds: number[];
}

export interface PowerSettings {
  onCommand: string;
  offCommand: string;
}

export interface ConnectionSettings {
  type: 'TCP' | 'UDP' | 'Serial';
  ip: string;
  port: number;
  // Separate records
  udpIp: string;
  udpPort: number;
  tcpIp: string;
  tcpPort: number;

  serialPort?: string;
  serialConnected?: boolean;
}

// ... (interfaces)

export interface AppState {
  inputChannels: Channel[];
  outputChannels: Channel[];
  channelCount: number;
  columns: number;
  scenes: Scene[];
  hardwareSettings: HardwareSettings;
  splicingSettings: SplicingSettings;
  splicingGroups: SplicingGroup[];
  powerSettings: PowerSettings;
  connectionSettings: ConnectionSettings;
}

const STORAGE_KEY = 'video-app-storage';

const DEFAULT_CHANNEL_COUNT = 8;
const MAX_INPUTS = 40;
const MAX_OUTPUTS = 64;
const DEFAULT_COLUMNS = 2;

const createDefaultChannels = (count: number, prefix: string): Channel[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    label: `${prefix} ${i + 1}`,
  }));
};

const getInitialState = (): AppState => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Validate or merge if needed

      // Ensure connectionSettings exists for migration
      if (!parsed.connectionSettings) {
          parsed.connectionSettings = {
              type: 'UDP',
              ip: '192.168.1.200',
              port: 6789,
              udpIp: '192.168.1.200',
              udpPort: 6789,
              tcpIp: '192.168.1.100',
              tcpPort: 6789,
              serialPort: '',
              serialConnected: false
          };
      } else {
          // Migration for existing settings to add udp/tcp specific fields if missing
          const s = parsed.connectionSettings;
          if (!s.udpIp) s.udpIp = s.type === 'UDP' ? s.ip : '192.168.1.200';
          if (!s.udpPort) s.udpPort = s.type === 'UDP' ? s.port : 6789;
          if (!s.tcpIp) s.tcpIp = s.type === 'TCP' ? s.ip : '192.168.1.100';
          if (!s.tcpPort) s.tcpPort = s.type === 'TCP' ? s.port : 6789;
      }
      return parsed;
    } catch (e) {
      console.error('Failed to parse stored state', e);
    }
  }

  return {
    inputChannels: createDefaultChannels(MAX_INPUTS, 'Input'),
    outputChannels: createDefaultChannels(MAX_OUTPUTS, 'Output'),
    channelCount: DEFAULT_CHANNEL_COUNT,
    columns: DEFAULT_COLUMNS,
    scenes: [],
    hardwareSettings: {
      osdEnabled: true,
      buzzerEnabled: true,
      resolution: 'RES0',
    },
    splicingSettings: {
      rows: 4,
      cols: 5,
    },
    splicingGroups: [],
    powerSettings: {
      onCommand: '',
      offCommand: '',
    },
    connectionSettings: {
      type: 'UDP',
      ip: '192.168.1.200',
      port: 6789,
      udpIp: '192.168.1.200',
      udpPort: 6789,
      tcpIp: '192.168.1.100',
      tcpPort: 6789,
      serialPort: '',
      serialConnected: false
    },
  };
};

export const store = {
    get: (): AppState => {
        return getInitialState();
    },
    set: (state: AppState) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    },
    // Update a specific part of the state
    update: (partialState: Partial<AppState>) => {
        const current = getInitialState();
        const next = { ...current, ...partialState };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
    },
  saveScene: (scene: Scene) => {
    const current = getInitialState();
    const existingIndex = current.scenes.findIndex((s) => s.id === scene.id);
    const newScenes = [...current.scenes];
    if (existingIndex >= 0) {
      newScenes[existingIndex] = scene;
    } else {
      newScenes.push(scene);
    }
    // Sort by ID for easier viewing
    newScenes.sort((a, b) => a.id - b.id);

    const next = { ...current, scenes: newScenes };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  },
  // Helpers specifically for channels to easier management
  updateInputChannel: (id: number, label: string) => {
    const current = getInitialState();
    const updatedInputs = current.inputChannels.map((ch) =>
      ch.id === id ? { ...ch, label } : ch,
    );
    const next = { ...current, inputChannels: updatedInputs };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  },
  updateOutputChannel: (id: number, label: string) => {
    const current = getInitialState();
    const updatedOutputs = current.outputChannels.map((ch) =>
      ch.id === id ? { ...ch, label } : ch,
    );
    const next = { ...current, outputChannels: updatedOutputs };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  },
  updatePowerSettings: (settings: Partial<PowerSettings>) => {
    const current = getInitialState();
    const next = {
      ...current,
      powerSettings: { ...current.powerSettings, ...settings },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  },
  updateHardwareSettings: (settings: Partial<HardwareSettings>) => {
    const current = getInitialState();
    const next = {
      ...current,
      hardwareSettings: { ...current.hardwareSettings, ...settings },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  },
  updateSplicingSettings: (settings: Partial<SplicingSettings>) => {
    const current = getInitialState();
    // Clear splicing groups when layout changes as per requirements
    const next = {
      ...current,
      splicingSettings: { ...current.splicingSettings, ...settings },
      splicingGroups: [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  },
  addSplicingGroup: (group: SplicingGroup) => {
    const current = getInitialState();
    const next = {
      ...current,
      splicingGroups: [...(current.splicingGroups || []), group],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  },
  removeSplicingGroup: (groupId: string) => {
    const current = getInitialState();
    const next = {
      ...current,
      splicingGroups: (current.splicingGroups || []).filter((g) => g.id !== groupId),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  },
  updateConnectionSettings: (settings: Partial<ConnectionSettings>) => {
      const current = getInitialState();
      const next = {
          ...current,
          connectionSettings: { ...current.connectionSettings, ...settings },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
  },
};
