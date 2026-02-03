import React, { useEffect, useState } from 'react';
import { Button, message, InputNumber, Modal, Radio, Input, Form } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import MainLayout from '../../components/Layout/MainLayout';
import { store, SplicingSettings, SwitchRecord } from '../../utils/store';
import { commandSender } from '../../utils/CommandSender';

interface SplicingDisplayItemProps {
  id: number;
  label: string;
  isSelected: boolean;
  onClick: () => void;
  onSaveLabel: (label: string) => void;
  type: 'Input' | 'Output';
  style?: React.CSSProperties;
}

function SplicingDisplayItem({
  id,
  label,
  isSelected,
  onClick,
  onSaveLabel,
  type,
  style,
}: SplicingDisplayItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempLabel, setTempLabel] = useState(label);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempLabel(label);
    setIsEditing(true);
  };

  const handleSave = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    if (tempLabel.trim()) {
      onSaveLabel(tempLabel);
    }
    setIsEditing(false);
  };

  // Styles based on selection and type
  const baseClasses =
    'relative flex flex-col items-center justify-center rounded border-2 cursor-pointer transition-all select-none overflow-hidden group';
  const selectedClasses = 'bg-blue-600 border-blue-600 text-white shadow-md';
  const unselectedClasses =
    'bg-white border-slate-200 text-slate-800 hover:border-blue-300 hover:shadow';

  // Height/Aspect classes could be dynamic or fixed. Outputs usually square-ish, inputs rectangle.
  // But let's follow the image: Inputs are rectangular. Outputs are square-ish in grid.
  const aspectClass = type === 'Output' ? 'aspect-square' : 'min-h-[80px]';

  return (
    <div
      className={`${baseClasses} ${isSelected ? selectedClasses : unselectedClasses} min-h-[80px]`}
      onClick={onClick}
      style={style}
    >
      {/* Top Left CH ID */}
      <div
        className={`absolute top-2 text-xs font-medium uppercase tracking-wider ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}
      >
        CH {id}
      </div>

      {/* Edit Icon (Top Right) */}
      {!isEditing && (
        <div
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/10 rounded"
          onClick={handleEditClick}
        >
          <EditOutlined
            className={isSelected ? 'text-white' : 'text-slate-400'}
          />
        </div>
      )}

      {/* Main Label */}
      <div className="mt-4 w-full px-2 text-center">
        {isEditing ? (
          <Input
            value={tempLabel}
            onChange={(e) => setTempLabel(e.target.value)}
            onBlur={() => handleSave()}
            onPressEnter={() => handleSave()}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            size="small"
            className="text-center text-sm"
          />
        ) : (
          <div
            className="text-sm lg:text-base font-bold truncate px-1"
            title={label}
          >
            {label}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SplicingPage() {
  const [appState, setAppState] = useState(() => store.get());
  const [splicingSettings, setSplicingSettings] = useState<SplicingSettings>(
    appState.splicingSettings || { rows: 4, cols: 5 },
  );

  // States for right panel view
  const [inputColumns, setInputColumns] = useState<2 | 4>(2);

  // Layout Edit Modal
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);
  const [editRows, setEditRows] = useState(4);
  const [editCols, setEditCols] = useState(5);

  // Selections
  const [selectedOutputs, setSelectedOutputs] = useState<number[]>([]);
  const [selectedInput, setSelectedInput] = useState<number | null>(null);

  // Switch History & Save Scene
  const [switchHistory, setSwitchHistory] = useState<SwitchRecord[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [conflictingScene, setConflictingScene] = useState<boolean>(false);

  // Power Settings Modal
  const [isPowerModalOpen, setIsPowerModalOpen] = useState(false);
  const [onCommand, setOnCommand] = useState('');
  const [offCommand, setOffCommand] = useState('');

  useEffect(() => {
    const current = store.get();
    setAppState(current);
    if (current.splicingSettings) {
      setSplicingSettings(current.splicingSettings);
      setEditRows(current.splicingSettings.rows);
      setEditCols(current.splicingSettings.cols);
    }
    if (current.powerSettings) {
      setOnCommand(current.powerSettings.onCommand || '');
      setOffCommand(current.powerSettings.offCommand || '');
    }
  }, []);

  // Handlers
  const handleLayoutEditOpen = () => {
    setEditRows(splicingSettings.rows);
    setEditCols(splicingSettings.cols);
    setIsLayoutModalOpen(true);
  };

  const handleLayoutSave = () => {
    store.updateSplicingSettings({ rows: editRows, cols: editCols });
    setSplicingSettings({ rows: editRows, cols: editCols });
    setIsLayoutModalOpen(false);
    setSelectedOutputs([]); // Reset selection on layout change
    message.success('布局已更新');
  };

  // Switch Logic
  const executeSwitch = (input: number, outputs: number[]) => {
    const outputsSorted = [...outputs].sort((a, b) => a - b);
    const outputsStr = outputsSorted.join(',');
    const cmd = `${input}V${outputsStr}.`;
    try {
      commandSender.send(cmd, false);
      message.success(`已发送切换指令：${cmd}`);

      setSwitchHistory((prev) => {
        const existingIndex = prev.findIndex((rec) => rec.input === input);
        const newRecord = { input, outputs: outputsSorted, cmd };
        if (existingIndex >= 0) {
          const newHistory = [...prev];
          newHistory[existingIndex] = newRecord;
          return newHistory;
        }
        return [...prev, newRecord];
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedInput !== null && selectedOutputs.length > 0) {
      executeSwitch(selectedInput, selectedOutputs);
    }
  }, [selectedInput, selectedOutputs]);

  // Scene Save Helpers
  const handleSaveSceneClick = () => {
    if (switchHistory.length === 0) {
      message.warning('没有可保存的切换记录');
      return;
    }
    const existingIds = appState.scenes.map((s) => s.id);
    let defaultId = 1;
    while (existingIds.includes(defaultId) && defaultId <= 32) defaultId += 1;
    if (defaultId > 32) defaultId = 1;

    form.setFieldsValue({ sceneId: defaultId, sceneName: '' });
    setConflictingScene(existingIds.includes(defaultId));
    setIsSaveModalOpen(true);
  };

  const handleSaveSceneConfirm = async () => {
    try {
      const values = await form.validateFields();
      const { sceneId } = values;
      const newScene = {
        id: sceneId,
        name: values.sceneName,
        records: switchHistory,
        timestamp: Date.now(),
      };
      const newState = store.saveScene(newScene);
      setAppState(newState);

      const saveCmd = `SAVE${sceneId}`;
      commandSender.send(saveCmd, false);
      message.success(`场景 ${sceneId} 保存成功`);
      setIsSaveModalOpen(false);
      setSwitchHistory([]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSceneIdChange = (val: number | null) => {
    if (val) {
      const exists = appState.scenes.some((s) => s.id === val);
      setConflictingScene(exists);
    }
  };

  const getGroupById = (id: number) => {
    return appState.splicingGroups?.find((g) => g.outputIds.includes(id));
  };

  const isSpliced = (id: number) => {
    return !!getGroupById(id);
  };

  // Helper to send command
  const sendSpliceCommand = (
    isSplice: boolean,
    startId: number,
    endId: number,
  ) => {
    // Header
    // Splice: A5 5A 0B F0 00 0F
    // Cancel: A5 5A 0C F0 00 00
    const header = isSplice ? 'A5 5A 0B F0 00 0F' : 'A5 5A 0C F0 00 00';

    // Params: TL BR Cols Rows 00 AA
    const toHex = (n: number) => n.toString(16).toUpperCase().padStart(2, '0');

    const p1 = toHex(startId);
    const p2 = toHex(endId);
    const p3 = toHex(splicingSettings.cols);
    const p4 = toHex(splicingSettings.rows);

    const cmd = `${header} ${p1} ${p2} ${p3} ${p4} 00 AA`;

    // Send via CommandSender (Hex)
    commandSender.send(cmd, true);

    if (isSplice) {
      message.success(`已发送拼接指令: ${cmd}`);
    } else {
      message.success(`已发送取消拼接指令: ${cmd}`);
    }
  };

  const checkIsRectangle = (ids: number[], totalCols: number) => {
    if (ids.length < 2) return true;
    const sortedIds = [...ids].sort((a, b) => a - b);
    const coords = sortedIds.map((id) => ({
      r: Math.floor((id - 1) / totalCols),
      c: (id - 1) % totalCols,
    }));
    const minR = Math.min(...coords.map((x) => x.r));
    const maxR = Math.max(...coords.map((x) => x.r));
    const minC = Math.min(...coords.map((x) => x.c));
    const maxC = Math.max(...coords.map((x) => x.c));

    const expectedCount = (maxR - minR + 1) * (maxC - minC + 1);
    if (sortedIds.length !== expectedCount) return false;

    for (let r = minR; r <= maxR; r += 1) {
      for (let c = minC; c <= maxC; c += 1) {
        const expectedId = r * totalCols + c + 1;
        if (!sortedIds.includes(expectedId)) return false;
      }
    }
    return true;
  };

  const handleSplice = () => {
    if (selectedOutputs.length < 2) {
      message.warning('请至少选择两个屏幕进行拼接');
      return;
    }
    const alreadySpliced = selectedOutputs.some((id) => isSpliced(id));
    if (alreadySpliced) {
      message.error('无法拼接：选中的屏幕中包含已拼接的屏幕');
      return;
    }
    if (!checkIsRectangle(selectedOutputs, splicingSettings.cols)) {
      message.error('选择的屏幕不能组成矩形');
      return;
    }

    const sorted = [...selectedOutputs].sort((a, b) => a - b);
    const minId = sorted[0];
    const maxId = sorted[sorted.length - 1];

    // Send Command
    sendSpliceCommand(true, minId, maxId);

    const newGroup = {
      id: Date.now().toString(),
      outputIds: sorted,
    };
    const newState = store.addSplicingGroup(newGroup);
    setAppState(newState);
  };

  const handleUnsplice = () => {
    if (!appState.splicingGroups || appState.splicingGroups.length === 0) {
      message.info('当前没有拼接屏幕');
      return;
    }

    // Send Cancel Command (using full range 1 to Total)
    const total = splicingSettings.rows * splicingSettings.cols;
    sendSpliceCommand(false, 1, total);

    const newState = store.update({ splicingGroups: [] });
    setAppState(newState);
    setSelectedOutputs([]);
  };

  const handleOutputSelect = (index: number) => {
    const group = getGroupById(index);
    setSelectedOutputs((prev) => {
      let newSelection = [...prev];
      const idsToToggle = group ? group.outputIds : [index];
      const isSelecting = !newSelection.includes(index);
      if (isSelecting) {
        idsToToggle.forEach((id) => {
          if (!newSelection.includes(id)) newSelection.push(id);
        });
      } else {
        newSelection = newSelection.filter((id) => !idsToToggle.includes(id));
      }
      return newSelection;
    });
  };

  const handleInputSelect = (id: number) => {
    setSelectedInput(id === selectedInput ? null : id);
  };

  const getSplicingStyle = (id: number) => {
    const group = getGroupById(id);
    if (!group) return {};
    const ids = group.outputIds;
    const { cols } = splicingSettings;
    const myR = Math.floor((id - 1) / cols);
    const myC = (id - 1) % cols;
    const hasTop = ids.includes((myR - 1) * cols + myC + 1);
    const hasBottom = ids.includes((myR + 1) * cols + myC + 1);
    const hasLeft = ids.includes(myR * cols + (myC - 1) + 1) && myC > 0;
    const hasRight = ids.includes(myR * cols + (myC + 1) + 1) && myC < cols - 1;
    return {
      borderTopColor: hasTop ? 'transparent' : '#f97316',
      borderBottomColor: hasBottom ? 'transparent' : '#f97316',
      borderLeftColor: hasLeft ? 'transparent' : '#f97316',
      borderRightColor: hasRight ? 'transparent' : '#f97316',
      borderWidth: '4px',
      zIndex: 1,
    };
  };

  const handlePowerSettingsSave = () => {
    store.updatePowerSettings({
      onCommand,
      offCommand,
    });
    setAppState((prev) => ({
      ...prev,
      powerSettings: { onCommand, offCommand },
    }));
    setIsPowerModalOpen(false);
    message.success('指令保存成功，现在可以进行对应操作');
  };

  const handlePowerAction = (type: 'on' | 'off') => {
    const {
      onCommand: savedOn,
      offCommand: savedOff,
    } = appState.powerSettings || {};

    const cmd = type === 'on' ? savedOn : savedOff;
    const actionName = type === 'on' ? '打开电源' : '关闭电源';

    if (!cmd) {
      message.warning(`请先设置${actionName}指令`);
      setIsPowerModalOpen(true);
      return;
    }

    commandSender.send(cmd, true);

    message.success(`已发送${actionName}指令: ${cmd}`);
  };

  return (
    <MainLayout>
      <header className="h-16 bg-slate-800 text-white flex items-center justify-between px-6 shadow-md z-10 border-b border-slate-700">
        <h1 className="text-xl font-medium">设备拼接控制</h1>
        <div className="flex gap-4">
          {/* Top Right Buttons from Image */}
          <button
            className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-6 py-1.5 rounded transition-colors font-medium"
            onClick={() => {
              setSelectedOutputs([]);
              setSelectedInput(null);
              message.success('已清空所有选择');
            }}
          >
            重置选择
          </button>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-1.5 rounded transition-colors font-medium"
            onClick={handleSaveSceneClick}
          >
            保存场景
          </button>
        </div>
      </header>

      <div className="flex-1 p-4 bg-slate-100 overflow-hidden flex gap-4 h-[calc(100vh-64px)]">
        {/* Left Panel: Output Screens */}
        <div className="flex-1 bg-white rounded shadow-sm flex flex-col min-w-0">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
              输出屏幕
              <span className="text-slate-500 font-normal text-sm ml-2">
                当前布局: {splicingSettings.rows} × {splicingSettings.cols}
              </span>
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={handleLayoutEditOpen}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              />
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            <div
              className="grid gap-2 mx-auto"
              style={{
                gridTemplateColumns: `repeat(${splicingSettings.cols}, minmax(0, 1fr))`,
              }}
            >
              {/* Slice the output channels based on layout count */}
              {appState.outputChannels
                .slice(0, splicingSettings.rows * splicingSettings.cols)
                .map((channel) => {
                  const isGrouped = !!getGroupById(channel.id);
                  const splicingStyle = isGrouped
                    ? getSplicingStyle(channel.id)
                    : {};

                  return (
                    <SplicingDisplayItem
                      key={channel.id}
                      id={channel.id}
                      label={channel.label}
                      isSelected={selectedOutputs.includes(channel.id)}
                      onClick={() => handleOutputSelect(channel.id)}
                      onSaveLabel={(newLabel) => {
                        const newerState = store.updateOutputChannel(
                          channel.id,
                          newLabel,
                        );
                        setAppState(newerState);
                      }}
                      type="Output"
                      style={isGrouped ? splicingStyle : undefined}
                    />
                  );
                })}
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 overflow-auto gap-2 flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                className="mr-2"
                onClick={() => setIsPowerModalOpen(true)}
              >
                指令设置
              </Button>
              <Button
                danger
                type="primary"
                className="h-10 text-base"
                onClick={() => handlePowerAction('off')}
              >
                关闭电源
              </Button>
              <Button
                type="primary"
                className="h-10 text-base"
                onClick={() => handlePowerAction('on')}
              >
                打开电源
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                type="primary"
                className="h-10 text-base bg-blue-600"
                onClick={handleSplice}
              >
                拼接屏幕
              </Button>
              <Button
                type="primary"
                className="h-10 text-base bg-blue-600"
                onClick={handleUnsplice}
              >
                取消拼接
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel: Input Channels */}
        <div className="w-2/5 bg-white rounded shadow-sm flex flex-col min-w-0">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <span className="text-slate-700 font-bold text-sm lg:text-base">
              输入通道
            </span>
            <Radio.Group
              value={inputColumns}
              onChange={(e) => setInputColumns(e.target.value)}
              buttonStyle="solid"
              size="small"
            >
              <Radio.Button value={2}>每行2个</Radio.Button>
              <Radio.Button value={4}>每行4个</Radio.Button>
            </Radio.Group>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${inputColumns}, minmax(0, 1fr))`,
              }}
            >
              {appState.inputChannels.slice(0, 32).map((input) => (
                <SplicingDisplayItem
                  key={input.id}
                  id={input.id}
                  label={input.label}
                  isSelected={selectedInput === input.id}
                  onClick={() => handleInputSelect(input.id)}
                  onSaveLabel={(newLabel) => {
                    const newerState = store.updateInputChannel(
                      input.id,
                      newLabel,
                    );
                    setAppState(newerState);
                  }}
                  type="Input"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal
        title="设置屏幕布局"
        open={isLayoutModalOpen}
        onOk={handleLayoutSave}
        onCancel={() => setIsLayoutModalOpen(false)}
        width={300}
      >
        <div className="flex flex-col gap-4 py-4">
          <div className="flex items-center gap-4">
            <span className="w-16 text-right">行数:</span>
            <InputNumber
              min={1}
              max={8}
              value={editRows}
              onChange={(val) => setEditRows(val || 1)}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="w-16 text-right">列数:</span>
            <InputNumber
              min={1}
              max={8}
              value={editCols}
              onChange={(val) => setEditCols(val || 1)}
              className="flex-1"
            />
          </div>
        </div>
      </Modal>

      <Modal
        title="设置电源指令"
        open={isPowerModalOpen}
        onOk={handlePowerSettingsSave}
        onCancel={() => setIsPowerModalOpen(false)}
        width={500}
      >
        <div className="flex flex-col gap-6 py-4">
          {/* Power ON Settings */}
          <div className="space-y-3">
            <div className="font-medium text-slate-700 border-b pb-1">
              打开电源 (Power ON)
            </div>
            <div className="flex items-center gap-4">
              <span className="w-20 text-right">指令:</span>
              <Input
                value={onCommand}
                onChange={(e) => setOnCommand(e.target.value)}
                placeholder="十六进制指令"
                className="flex-1"
              />
            </div>
          </div>

          {/* Power OFF Settings */}
          <div className="space-y-3">
            <div className="font-medium text-slate-700 border-b pb-1">
              关闭电源 (Power OFF)
            </div>
            <div className="flex items-center gap-4">
              <span className="w-20 text-right">指令:</span>
              <Input
                value={offCommand}
                onChange={(e) => setOffCommand(e.target.value)}
                placeholder="十六进制指令"
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </Modal>

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
              {switchHistory
                .map((rec) => `${rec.input} -> ${rec.outputs.join(',')}`)
                .join('; ')}
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
