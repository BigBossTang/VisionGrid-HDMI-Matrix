import React, { useEffect, useState } from 'react';
import {
  Button,
  Select,
  Input,
  Switch,
  InputNumber,
  message,
  Card,
  Form,
  Tooltip,
} from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import MainLayout from '../../components/Layout/MainLayout';
import { store, ConnectionSettings } from '../../utils/store';
import { commandSender } from '../../utils/CommandSender';

const { Option } = Select;

export default function ConnectionPage() {
  const [settings, setSettings] = useState<ConnectionSettings>(() => {
    const s = store.get().connectionSettings;
    // Ensure defaults if missing
    return (
      s || { type: 'UDP', ip: '192.168.1.200', port: 6789, serialPort: '' }
    );
  });

  const [ipSegments, setIpSegments] = useState<string[]>([
    '192',
    '168',
    '1',
    '200',
  ]);
  const [serialPorts, setSerialPorts] = useState<any[] | null>(null); // Mock list later

  useEffect(() => {
    const current = store.get().connectionSettings;
    if (current) {
      setSettings(current);
      if (current.ip) {
        setIpSegments(current.ip.split('.'));
      }

      // Sync switch status with actual connection state
      const isActuallyOpen = commandSender.isOpen();
      if (current.serialConnected !== isActuallyOpen) {
        const fixedSettings = { ...current, serialConnected: isActuallyOpen };
        setSettings(fixedSettings);
        // Optionally update store to fix it there too, but local state is most important for UI
        store.updateConnectionSettings(fixedSettings);
      }
    }
    // Mock fetch serial ports
    // In real app: window.electron.ipcRenderer.invoke('get-serial-ports').then(setSerialPorts)
    // setSerialPorts(['COM1', 'COM2', '/dev/ttyUSB0', '/dev/ttyUSB1']);

    // Listen for port list from main process
    // @ts-ignore
    const removeListener = window.electron.ipcRenderer.on(
      'serial-ports-list',
      (arg: unknown) => {
        const ports = arg as any[];
        console.log('serial-ports-list', ports);
        setSerialPorts(ports);
      },
    );

    return () => {
      // @ts-ignore
      if (removeListener) removeListener();
    };
  }, []);

  // Auto-refresh when entering page (if Serial) or switching to Serial
  useEffect(() => {
    if (settings.type === 'Serial') {
      refreshSerialPorts();
    }
  }, [settings.type]);

  // Validate selected port against fetched list
  useEffect(() => {
    // Only validate if we have fetched the list (serialPorts is not null) and we have a selected port
    if (serialPorts === null || !settings.serialPort) return;

    // settings.serialPort stores the Name/DisplayName
    const exists = serialPorts.some((p) => {
      const val = p.portName || p.displayName || '';
      return (
        val === settings.serialPort ||
        p.displayName === settings.serialPort ||
        p.portName === settings.serialPort
      );
    });

    if (!exists) {
      console.log('Selected port not found in refreshed list, clearing...');
      setSettings((prev) => {
        const next = { ...prev, serialPort: '', serialConnected: false };
        store.updateConnectionSettings(next);
        return next;
      });
    }
  }, [serialPorts, settings.serialPort]);

  const refreshSerialPorts = async () => {
    try {
      // Trigger Web Serial API to fire 'select-serial-port' in Main
      // We pass filters: [] to get all, but Electron intercepts it anyway.
      // @ts-ignore
      await navigator.serial.requestPort({ filters: [] });
    } catch {
      // Expected error because Main process cancels the selection via callback('')
      // We ignore this error as we rely on IPC to get the list
      // console.log('Request cancelled (expected)', e);
    }
  };

  const handleTypeChange = (val: 'TCP' | 'UDP' | 'Serial') => {
    setSettings((prev) => {
      let newIp = prev.ip;
      let newPort = prev.port;

      if (val === 'TCP') {
        newIp = prev.tcpIp || '192.168.1.200';
        newPort = prev.tcpPort || 6789;
      } else if (val === 'UDP') {
        newIp = prev.udpIp || '192.168.1.200';
        newPort = prev.udpPort || 6789;
      }

      setIpSegments(newIp.split('.'));

      return {
        ...prev,
        type: val,
        ip: newIp,
        port: newPort,
      };
    });
  };

  const handleIpChange = (index: number, val: string) => {
    // Only numbers
    if (!/^\d*$/.test(val)) return;
    if (val.length > 3) return;
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 255) return;

    const newSegs = [...ipSegments];
    newSegs[index] = val;
    const newIpString = newSegs.join('.');
    setIpSegments(newSegs);

    setSettings((prev) => {
      const updates: any = { ip: newIpString };
      if (prev.type === 'TCP') updates.tcpIp = newIpString;
      if (prev.type === 'UDP') updates.udpIp = newIpString;
      return { ...prev, ...updates };
    });
  };

  const handlePortChange = (val: number | null) => {
    const newPort = val || 0;
    setSettings((prev) => {
      const updates: any = { port: newPort };
      if (prev.type === 'TCP') updates.tcpPort = newPort;
      if (prev.type === 'UDP') updates.udpPort = newPort;
      return { ...prev, ...updates };
    });
  };

  const handleSerialPortChange = (val: string) => {
    setSettings((prev) => ({ ...prev, serialPort: val }));
  };

  const handleSerialSwitch = async (checked: boolean) => {
    if (checked) {
      // Find the port ID associated with the selected name
      // settings.serialPort stores the 'value' which is name/displayName
      // We need to look it up in serialPorts list
      const selectedPortObj = (serialPorts || []).find((p) => {
        const val = p.portName || p.displayName || '';
        // Matches the logic in the Select Option mapping
        return (
          val === settings.serialPort ||
          p.displayName === settings.serialPort ||
          p.portName === settings.serialPort
        );
      });

      const portId = selectedPortObj?.portId;

      if (!portId && !settings.serialPort) {
        message.error('请先选择串口');
        return;
      }

      const success = await commandSender.connectSerial(
        portId,
        settings.serialPort || '',
      );

      if (success) {
        const newSettings = { ...settings, serialConnected: true };
        setSettings(newSettings);
        store.updateConnectionSettings(newSettings);
        message.info('串口开启');
      } else {
        // Switch failed to open
        setSettings((prev) => ({ ...prev, serialConnected: false }));
      }
    } else {
      await commandSender.disconnectSerial();
      const newSettings = { ...settings, serialConnected: false };
      setSettings(newSettings);
      store.updateConnectionSettings(newSettings);
      message.info('串口关闭');
    }
  };

  const handleSave = () => {
    store.updateConnectionSettings(settings);
    try {
      commandSender.updateSettings(settings);
      message.success('连接设置已保存');
    } catch {
      message.warning('设置已保存至本地');
    }
  };

  const handleTestConnection = () => {
    // Update store and main process with current settings before testing
    store.updateConnectionSettings(settings);
    try {
      commandSender.updateSettings(settings);
    } catch {
      // ignore error
    }

    // Send a test string
    commandSender.send('TEST', false);
    message.loading('发送测试指令...', 0.5);
  };

  return (
    <MainLayout>
      <header className="h-16 bg-slate-800 text-white flex items-center px-6 shadow-md z-10 border-b border-slate-700">
        <h1 className="text-xl font-medium">连接设置</h1>
      </header>

      <div className="p-8 w-2xl mx-auto">
        <Card title="连接参数配置" className="shadow-sm">
          <Form
            layout="horizontal"
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 16 }}
          >
            {/* 1. Connection Type */}
            <Form.Item label="连接方式">
              <Select
                value={settings.type}
                onChange={handleTypeChange}
                style={{ width: '100%' }}
              >
                <Option value="Serial">串口 (Serial)</Option>
                <Option value="TCP">TCP</Option>
                <Option value="UDP">UDP</Option>
              </Select>
            </Form.Item>

            {/* 2. Parameters based on Type */}
            {settings.type === 'Serial' ? (
              <>
                <Form.Item label="串口设备">
                  <div className="flex gap-2">
                    <Select
                      value={settings.serialPort}
                      onChange={handleSerialPortChange}
                      placeholder="请选择串口"
                      style={{ flex: 1 }}
                    >
                      {(serialPorts || []).map((p, idx) => {
                        // Use portName (e.g., COM1) or displayName
                        const value =
                          p.portName || p.displayName || `Port ${idx}`;
                        return (
                          <Option key={p.portId || idx} value={value}>
                            {p.portName || p.displayName || value}
                          </Option>
                        );
                      })}
                    </Select>
                    <Tooltip title="刷新串口列表">
                      <Button
                        icon={<SyncOutlined />}
                        onClick={refreshSerialPorts}
                      />
                    </Tooltip>
                  </div>
                </Form.Item>
                <Form.Item label="串口开关">
                  <Switch
                    checked={settings.serialConnected}
                    onChange={handleSerialSwitch}
                    checkedChildren="开启"
                    unCheckedChildren="关闭"
                  />
                </Form.Item>
              </>
            ) : (
              <>
                <Form.Item label="IP 地址">
                  <div className="flex items-center gap-2">
                    {ipSegments.map((seg, idx) => (
                      <React.Fragment key={idx}>
                        <Input
                          value={seg}
                          onChange={(e) => handleIpChange(idx, e.target.value)}
                          className="w-16 text-center"
                          maxLength={3}
                        />
                        {idx < 3 && (
                          <span className="font-bold text-slate-400">.</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </Form.Item>
                <Form.Item label="端口号">
                  <InputNumber
                    value={settings.port}
                    onChange={handlePortChange}
                    min={1}
                    max={65535}
                    className="w-32"
                  />
                </Form.Item>
              </>
            )}

            <div className="border-t pt-6 flex justify-end gap-4">
              <Button onClick={handleTestConnection} size="large">
                测试连接
              </Button>
              <Button
                type="primary"
                onClick={handleSave}
                size="large"
                className="px-8"
              >
                保存设置
              </Button>
            </div>
          </Form>
        </Card>
      </div>
    </MainLayout>
  );
}
