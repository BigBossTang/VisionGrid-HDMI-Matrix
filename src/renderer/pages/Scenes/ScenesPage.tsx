import React, { useEffect, useState } from 'react';
import { Button, message, Popconfirm, Input } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import MainLayout from '../../components/Layout/MainLayout';
import { store, Scene } from '../../utils/store';
import { commandSender } from '../../utils/CommandSender';

export default function ScenesPage() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    // Initial fetch
    const current = store.get();
    // Sort descending by created time or ID?
    // Screenshot shows descending time (or ID). "Scene 3", "Scene 2", "Scene 1".
    // And user said "displayed content as figure 1".
    // We already sort by ID ascending in store.saveScene, but here let's reverse for display if needed.
    // Let's stick to store order or reverse it. The screenshot shows 3 at top.
    setScenes([...current.scenes].reverse());
  }, []);

  const refreshScenes = () => {
    setScenes([...store.get().scenes].reverse());
  };

  const handleEditStart = (scene: Scene) => {
    setEditingId(scene.id);
    setEditName(scene.name || `场景${scene.id}`);
  };

  const handleEditSave = (id: number) => {
    if (editingId !== id) return;

    // Update store
    const current = store.get();
    const newScenes = current.scenes.map((s) => {
      if (s.id === id) {
        return { ...s, name: editName };
      }
      return s;
    });
    store.update({ scenes: newScenes });
    refreshScenes();

    setEditingId(null);
    setEditName('');
    message.success('场景名称已更新');
  };

  const handleDelete = (id: number) => {
    const current = store.get();
    const newScenes = current.scenes.filter((s) => s.id !== id);
    store.update({ scenes: newScenes });
    refreshScenes();
    message.success('删除成功');
  };

  const handleDeleteAll = () => {
    store.update({ scenes: [] });
    refreshScenes();
    message.success('已删除全部');
  };

  const handleCallScene = (scene: Scene) => {
    if (!scene.id) {
      message.error('该场景没有配置场景编号，无法调用');
      return;
    }
    const cmd = `CALL${scene.id}`;
    try {
      commandSender.send(cmd, false);
      message.success(`已发送指令: ${cmd}`);
    } catch (e) {
      console.error(e);
      message.error('发送指令失败');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp)
      .toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
      .replace(/\//g, '-');
  };

  const formatPath = (scene: Scene) => {
    // "input1->output1; input4->output4"
    return scene.records
      .map((r) => {
        if (r.cmd && r.cmd.includes('TOALL')) {
          return `输入${r.input}->TOALL`;
        }
        return `输入${r.input}->输出${r.outputs.join(',')}`;
      })
      .join('; ');
  };

  return (
    <MainLayout>
      <header className="h-16 bg-slate-800 text-white flex items-center justify-between px-6 shadow-md z-10">
        <h1 className="text-xl font-medium">场景预案</h1>
        <Popconfirm
          title="确认删除全部场景？"
          onConfirm={handleDeleteAll}
          okText="是"
          cancelText="否"
        >
          <button
            type="button"
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded transition-colors font-medium text-sm"
          >
            删除全部
          </button>
        </Popconfirm>
      </header>

      <div className="flex-1 p-6 overflow-y-auto bg-slate-100">
        <div className="flex flex-col gap-4">
          {scenes.map((scene) => (
            <div
              key={scene.id}
              className="bg-white p-4 rounded shadow-sm flex justify-between items-center group relative"
            >
              <div className="flex-1">
                <div className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2 min-h-[32px]">
                  {editingId === scene.id ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => handleEditSave(scene.id)}
                      onPressEnter={() => handleEditSave(scene.id)}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      className="max-w-[300px]"
                    />
                  ) : (
                    <>
                      <span>
                        场景{scene.id}: {scene.name || `场景${scene.id}`}
                      </span>
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-600"
                        onClick={() => handleEditStart(scene)}
                        size="small"
                      />
                    </>
                  )}
                </div>
                <div className="text-xs text-slate-500 mb-2">
                  {formatDate(scene.timestamp)}
                </div>
                <div className="text-sm text-slate-600">
                  {formatPath(scene)}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Popconfirm
                    title="可以删除该场景？"
                    onConfirm={() => handleDelete(scene.id)}
                    okText="是"
                    cancelText="否"
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      size="large"
                    />
                  </Popconfirm>
                </div>
                <button
                  type="button"
                  onClick={() => handleCallScene(scene)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium transition-colors"
                >
                  调用
                </button>
              </div>
            </div>
          ))}

          {scenes.length === 0 && (
            <div className="text-center text-slate-400 py-10">
              暂无保存的场景
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
