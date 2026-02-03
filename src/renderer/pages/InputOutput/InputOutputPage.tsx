import React, { useState } from 'react';
import { Select, message, Modal, Form, Input, InputNumber, Button } from 'antd';
import MainLayout from '../../components/Layout/MainLayout';
import ChannelGrid from './components/ChannelGrid';
import { store, AppState, SwitchRecord } from '../../utils/store';
import { commandSender } from '../../utils/CommandSender';

export default function InputOutputPage() {
  const [appState, setAppState] = React.useState(() => store.get());

  const [selectedInput, setSelectedInput] = React.useState<number | null>(null);
  const [selectedOutputs, setSelectedOutputs] = React.useState<number[]>([]);

  // Track switching history purely for Scene Saving context
  const [switchHistory, setSwitchHistory] = React.useState<SwitchRecord[]>([]);

  // Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [conflictingScene, setConflictingScene] = useState<boolean>(false);

  // Slice channels based on current count
  const visibleInputs = appState.inputChannels.slice(0, appState.channelCount);
  const visibleOutputs = appState.outputChannels.slice(
    0,
    appState.channelCount,
  );

  const handleInputSelect = (id: number) => {
    setSelectedInput(id === selectedInput ? null : id);
    setSelectedOutputs([]);
  };

  const handleOutputSelect = (id: number) => {
    setSelectedOutputs((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const updateState = (partial: Partial<AppState>) => {
    const newState = store.update(partial);
    setAppState(newState);
  };

  const handleRenameInput = (id: number, label: string) => {
    const newState = store.updateInputChannel(id, label);
    setAppState(newState);
  };

  const handleRenameOutput = (id: number, label: string) => {
    const newState = store.updateOutputChannel(id, label);
    setAppState(newState);
  };

  const executeSwitch = (
    input: number,
    outputs: number[],
    customCmd?: string,
  ) => {
    const outputsSorted = [...outputs].sort((a, b) => a - b);
    let cmd = customCmd;
    if (!cmd) {
      const outputsStr = outputsSorted.join(',');
      cmd = `${input}V${outputsStr}.`;
    }

    try {
      // Use commandSender wrapper
      commandSender.send(cmd, false);
      message.success(`已发送切换指令：${cmd}`);

      // Record to history
      setSwitchHistory((prev) => {
        const existingIndex = prev.findIndex((rec) => rec.input === input);
        const newRecord = {
          input,
          outputs: outputsSorted,
          cmd,
        };
        if (existingIndex >= 0) {
          const newHistory = [...prev];
          newHistory[existingIndex] = newRecord;
          return newHistory;
        }
        return [...prev, newRecord];
      });
    } catch (e) {
      console.error(e);
      message.error('发送指令失败');
    }
  };

  const handleConfirmSwitch = () => {
    if (selectedInput === null) {
      message.warning('请选择输入通道');
      return;
    }
    if (selectedOutputs.length === 0) {
      message.warning('请选择输出通道');
      return;
    }
    executeSwitch(selectedInput, selectedOutputs);
  };

  const handleSwitchToAllOutputs = () => {
    if (selectedInput === null) {
      message.warning('请先选择输入通道');
      return;
    }
    const allOutputIds = visibleOutputs.map((c) => c.id);
    setSelectedOutputs(allOutputIds);
    executeSwitch(selectedInput, allOutputIds, `${selectedInput}TOALL`);
  };

  const handleSaveSceneClick = () => {
    if (switchHistory.length === 0) {
      message.warning('没有可保存的切换记录');
      return;
    }

    // Calculate default ID
    const existingIds = appState.scenes.map((s) => s.id);
    let defaultId = 1;
    while (existingIds.includes(defaultId) && defaultId <= 32) {
      defaultId += 1;
    }
    if (defaultId > 32) defaultId = 1; // Fallback

    form.setFieldsValue({
      sceneId: defaultId,
      sceneName: '',
    });
    setConflictingScene(existingIds.includes(defaultId));
    setIsSaveModalOpen(true);
  };

  const handleSaveSceneConfirm = async () => {
    try {
      const values = await form.validateFields();
      const { sceneId } = values;

      // Save to store
      const newScene = {
        id: sceneId,
        name: values.sceneName,
        records: switchHistory,
        timestamp: Date.now(),
      };
      const newState = store.saveScene(newScene);
      setAppState(newState);

      // Send Command
      const saveCmd = `SAVE${sceneId}`;
      commandSender.send(saveCmd, false);

      message.success(`场景 ${sceneId} 保存成功`);
      setIsSaveModalOpen(false);
      setSwitchHistory([]);
    } catch (e) {
      // Form validation error or other
      console.error(e);
    }
  };

  const handleSceneIdChange = (val: number | null) => {
    if (val) {
      const exists = appState.scenes.some((s) => s.id === val);
      setConflictingScene(exists);
    }
  };

  // Generate switch path string for display
  const switchPathDisplay = switchHistory
    .map((rec) => {
      if (rec.cmd && rec.cmd.includes('TOALL')) {
        return `${rec.input} -> TOALL`;
      }
      return `${rec.input} -> ${rec.outputs.join(',')}`;
    })
    .join('; ');

  return (
    <MainLayout>
      {/* Header */}
      <header className="h-16 bg-slate-800 text-white flex items-center justify-between px-6 shadow-md z-10">
        <h1 className="text-xl font-medium">输入输出切换</h1>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => {
              setSelectedInput(null);
              setSelectedOutputs([]);
            }}
            className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-6 py-1.5 rounded transition-colors font-medium"
          >
            重置选择
          </button>
          <button
            type="button"
            onClick={handleSaveSceneClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-1.5 rounded transition-colors font-medium"
          >
            保存场景
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="flex h-full gap-4">
          {/* Left Panel: Input Channels */}
          <div className="flex-1 min-w-0">
            <ChannelGrid
              title="输入通道"
              items={visibleInputs}
              columns={appState.columns}
              selectedItems={selectedInput ? [selectedInput] : []}
              onSelect={handleInputSelect}
              onRename={handleRenameInput}
              actions={
                <>
                  <Select
                    value={appState.channelCount}
                    onChange={(value) => {
                      updateState({ channelCount: value });
                      setSelectedInput(null);
                      setSelectedOutputs([]);
                    }}
                    className="lg:w-32 w-28 h-7 text-sm lg:text-base"
                    options={[
                      { value: 4, label: '4进4出' },
                      { value: 8, label: '8进8出' },
                      { value: 16, label: '16进16出' },
                      { value: 32, label: '32进32出' },
                      { value: 40, label: '40进40出' },
                    ]}
                  />
                  <Select
                    value={appState.columns}
                    onChange={(value) => updateState({ columns: value })}
                    className="lg:w-32 w-28 h-7 text-sm lg:text-base"
                    options={[
                      { value: 1, label: '每行1个' },
                      { value: 2, label: '每行2个' },
                      { value: 4, label: '每行4个' },
                    ]}
                  />
                </>
              }
            />
          </div>

          {/* Right Panel: Output Channels */}
          <div className="flex-1 min-w-0">
            <ChannelGrid
              title="输出通道"
              items={visibleOutputs}
              columns={appState.columns}
              selectedItems={selectedOutputs}
              onSelect={handleOutputSelect}
              onRename={handleRenameOutput}
              actions={
                <>
                  <Button
                    type="primary"
                    disabled={selectedInput === null}
                    onClick={handleSwitchToAllOutputs}
                    className="text-sm px-3"
                    size="small"
                  >
                    切到全部
                  </Button>
                  <Button
                    type="primary"
                    disabled={
                      selectedInput === null || selectedOutputs.length === 0
                    }
                    onClick={handleConfirmSwitch}
                    className="text-sm px-3"
                    size="small"
                  >
                    确认切换
                  </Button>
                </>
              }
            />
          </div>
        </div>
      </div>

      <Modal
        title="保存为场景"
        open={isSaveModalOpen}
        onOk={handleSaveSceneConfirm}
        onCancel={() => setIsSaveModalOpen(false)}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item label="切换路径">
            <div className="p-2 bg-slate-50 rounded text-slate-700 break-all">
              {switchPathDisplay}
            </div>
          </Form.Item>
          <Form.Item
            label="场景编号"
            name="sceneId"
            rules={[{ required: true, message: '请输入场景编号' }]}
            help={
              conflictingScene ? (
                <span className="text-amber-500">该编号已存在，保存会覆盖</span>
              ) : (
                '场景号必须是 1-32 的数字'
              )
            }
          >
            <InputNumber
              min={1}
              max={32}
              className="w-full"
              onChange={handleSceneIdChange}
            />
          </Form.Item>
          <Form.Item
            label="场景名称"
            name="sceneName"
            rules={[{ required: false }]}
          >
            <Input
              placeholder={`如果不填则默认为: 矩阵场景${form.getFieldValue('sceneId') || ''}`}
            />
          </Form.Item>
        </Form>
      </Modal>
    </MainLayout>
  );
}
