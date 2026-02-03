import { store } from './store';
import { message } from 'antd';

class CommandSender {
  private serialPort: any = null;
  private currentPortId: string | null = null;
  private currentPortName: string | null = null;

  async connectSerial(portId: string, portName: string) {
    // 1. Check if already connected to the SAME port
    if (this.serialPort && this.isOpen() && this.currentPortId === portId) {
      console.log('Already connected to this port:', portName);
      return true;
    }

    // 2. If connected to a DIFFERENT port, disconnect first
    if (this.serialPort && (this.isOpen() || this.serialPort.readable)) {
      console.log('Switching ports, closing old one...');
      await this.disconnectSerial();
    }

    try {
      if (portId) {
        // Tell main process which port we want to allow
        // @ts-ignore
        await window.electron.ipcRenderer.invoke('set-serial-connect-target', portId);

        // Request port - Main process will auto-select the one matching portId
        const port = await (navigator as any).serial.requestPort({ filters: [] });

        try {
           await port.open({ baudRate: 9600 });
        } catch (openErr: any) {
           // If port is already open (e.g. from previous session or duplicate request), we might still be able to use it.
           // However, Web Serial API usually throws if we try to open an open port on the same object.
           // If it's a new object for the same physical port, it might also throw.
           // We'll assume success if it says "already open".
           const msg = openErr.message || '';
           if (msg.includes('already open') || msg.includes('Failed to open')) {
               console.warn('Port potentially already open, attempting to use:', msg);
               // We don't return false here, we proceed to assign it, trusting it is readable.
           } else {
               throw openErr;
           }
        }

        this.serialPort = port;
        this.currentPortId = portId;
        this.currentPortName = portName;
      } else {
         throw new Error('端口无效, 请刷新端口列表后重新选择');
      }

      message.success('Serial Port Connected');
      return true;
    } catch (e: any) {
      console.error('Serial Connect Error:', e);
      message.error(`Serial Connect Failed: ${e.message}`);
      this.currentPortId = null;
      this.currentPortName = null;
      this.serialPort = null;
      return false;
    }
  }

  async disconnectSerial() {
    if (this.serialPort) {
      try {
        await this.serialPort.close();
      } catch (e) { console.error(e); }
      this.serialPort = null;
    }
    this.currentPortId = null;
    this.currentPortName = null;
    message.info('Serial Port Disconnected');
  }

  isOpen() {
    return !!this.serialPort && !!this.serialPort.readable;
  }

  // Sync connection settings to Main Process
  updateSettings(settings: any) {
    try {
      // @ts-ignore
      window.electron.ipcRenderer.sendMessage('update-connection-settings', settings);
    } catch (e) {
      console.error('Failed to update settings in main process:', e);
    }
  }

  async send(cmd: string, isHex: boolean = false) {
    const settings = store.get().connectionSettings;
    const { type } = settings;

    console.log(`Sending (${type}): ${cmd} [Hex: ${isHex}]`);

    if (type === 'Serial') {
      // 1. Check if configured port matches connected port
      // The store stores the 'value' which is usually the name.
      const configuredPortName = settings.serialPort;

      // If we are ostensibly connected but names don't match (and we have names), warn.
      if (this.currentPortName && configuredPortName && this.currentPortName !== configuredPortName) {
           console.warn(`Port Mismatch: Configured=${configuredPortName}, Connected=${this.currentPortName}`);
           // We might opt to fail here, or try to reconnect.
           // For now, let's fail to enforce consistency as requested.
           message.warning(`当前配置串口(${configuredPortName})与连接(${this.currentPortName})不一致，请重新连接`);
           return;
      }

      if (!this.isOpen()) {
        this.serialPort = null;
        this.currentPortId = null;
        // Update store to reflect reality
        store.updateConnectionSettings({ serialConnected: false });
        message.warning('串口连接已断开，请进入连接设置页面重新连接');
        return;
      }

      const writer = this.serialPort.writable.getWriter();

      try {
        let data: Uint8Array;
        if (isHex) {
          const hexParts = cmd.trim().split(/\s+/);
          data = new Uint8Array(hexParts.map(h => parseInt(h, 16)));
        } else {
          data = new TextEncoder().encode(cmd);
        }
        console.log('this.serialPort',this.serialPort,store.get().connectionSettings.serialPort)

        await writer.write(data);
        message.success(`Sent (Serial): ${cmd} - 当前串口：${store.get().connectionSettings.serialPort}`);

      } catch (e: any) {
        console.error('Serial Send Error:', e);
        message.error('Serial Send Failed');
      } finally {
        writer.releaseLock();
      }
      return;
    }

    // UDP or TCP
    // Delegate to Main Process via IPC
    const channel = isHex
        ? (type === 'TCP' ? 'tcp-send-hex' : 'udp-send-hex')
        : (type === 'TCP' ? 'tcp-send' : 'udp-send');

    try {
      // @ts-ignore
      window.electron.ipcRenderer.sendMessage(channel, cmd);
      // message.success is usually handled by the caller or we can do it here.
      // The caller often flashes success. I will let caller handle success message or log it.
      // But since this is a wrapper, maybe unified feedback is good?
      // Caller usually says "Command Sent".
    } catch (e) {
      console.error('IPC Send Error:', e);
    }
  }
}

export const commandSender = new CommandSender();
