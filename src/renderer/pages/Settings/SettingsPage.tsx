import React, { useEffect, useState } from 'react';
import { Switch, Select, message, Button, Popconfirm } from 'antd';
import MainLayout from '../../components/Layout/MainLayout';
import { store, HardwareSettings } from '../../utils/store';
import { commandSender } from '../../utils/CommandSender';

export default function SettingsPage() {
  const [settings, setSettings] = useState<HardwareSettings>({
    osdEnabled: true,
    buzzerEnabled: true,
    resolution: 'RES0',
  });

  const [appState, setAppState] = useState(() => store.get());

  useEffect(() => {
    // Load initial settings
    const current = store.get();
    if (current.hardwareSettings) {
      setSettings(current.hardwareSettings);
    }
    setAppState(current);
  }, []);

  const sendUdpCommand = (cmd: string, successMsg?: string) => {
    try {
      commandSender.send(cmd, false);
      if (successMsg) {
        message.success(successMsg);
      }
    } catch (e) {
      console.error(e);
      message.error('指令发送失败');
    }
  };

  const handleOsdChange = (checked: boolean) => {
    const cmd = checked ? 'OSDON' : 'OSDOFF';
    sendUdpCommand(cmd);

    // Update local cache
    const newSettings = store.updateHardwareSettings({ osdEnabled: checked });
    setSettings(newSettings.hardwareSettings);
  };

  const handleBuzzerChange = (checked: boolean) => {
    const cmd = checked ? 'BUZON' : 'BUZOFF';
    sendUdpCommand(cmd);

    // Update local cache
    const newSettings = store.updateHardwareSettings({
      buzzerEnabled: checked,
    });
    setSettings(newSettings.hardwareSettings);
  };

  const handleResolutionChange = (value: string) => {
    sendUdpCommand(value, '分辨率指令已发送');

    // Update local cache
    const newSettings = store.updateHardwareSettings({ resolution: value });
    setSettings(newSettings.hardwareSettings);
  };

  const handleReset = () => {
    // Only send command, do not change local cache settings
    sendUdpCommand('RESET', '恢复出厂设置指令已发送');
  };

  return (
    <MainLayout>
      <header className="h-16 bg-slate-800 text-white flex items-center px-6 shadow-md z-10 border-b border-slate-700">
        <h1 className="text-xl font-medium">设置</h1>
      </header>

      <div className="flex-1 p-8 bg-slate-100 overflow-y-auto">
        <div className="max-w-3xl mx-auto bg-white rounded shadow-sm divide-y divide-slate-100">
          {/* OSD Switch */}
          <div className="flex items-center justify-between p-6">
            <span className="text-slate-700 font-medium">OSD开关</span>
            <Switch checked={settings.osdEnabled} onChange={handleOsdChange} />
          </div>

          {/* Device Buzzer */}
          <div className="flex items-center justify-between p-6">
            <span className="text-slate-700 font-medium">设备蜂鸣器</span>
            <Switch
              checked={settings.buzzerEnabled}
              onChange={handleBuzzerChange}
            />
          </div>

          {/* Output Resolution */}
          <div className="flex items-center justify-between p-6">
            <span className="text-slate-700 font-medium">设备输出分辨率</span>
            <Select
              value={settings.resolution}
              onChange={handleResolutionChange}
              className="w-48"
              options={[
                { value: 'RES0', label: '1920*1080p/60Hz' },
                { value: 'RES1', label: '3840*2160p/30Hz' },
                { value: 'RES2', label: '3840*2160p/60Hz' },
              ]}
            />
          </div>

          {/* Language (Static) */}
          <div className="flex items-center justify-between p-6">
            <span className="text-slate-700 font-medium">硬件语言</span>
            <span className="text-slate-500">中文</span>
          </div>

          {/* Factory Reset */}
          <div className="flex items-center justify-center p-6 bg-slate-50/50">
            <Popconfirm
              title="确定恢复出厂设置？"
              description="该操作仅发送复位指令，不清除本地缓存数据"
              onConfirm={handleReset}
              okText="确定"
              cancelText="取消"
            >
              <Button danger type="text" className="px-0 hover:bg-transparent">
                恢复出厂设置
              </Button>
            </Popconfirm>
          </div>
        </div>

        <div className="text-center mt-12 text-slate-400 text-sm">
          当前设备: {appState.channelCount}进{appState.channelCount}出
        </div>
      </div>
    </MainLayout>
  );
}
