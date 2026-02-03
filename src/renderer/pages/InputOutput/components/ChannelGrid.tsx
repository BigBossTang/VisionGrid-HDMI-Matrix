import React, { useState } from 'react';
import { Button, Input } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { Channel } from '../../../utils/store';

interface ChannelGridProps {
  title: string;
  actions?: React.ReactNode;
  items: Channel[];
  columns?: number;
  selectedItems?: number[];
  onSelect?: (id: number) => void;
  onRename?: (id: number, newLabel: string) => void;
}

export default function ChannelGrid({
  title,
  actions = null,
  items,
  columns = 2,
  selectedItems = [],
  onSelect,
  onRename,
}: ChannelGridProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEditing = (e: React.MouseEvent, item: Channel) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditValue(item.label);
  };

  const saveEditing = (id: number) => {
    if (editingId === id && onRename) {
      onRename(id, editValue);
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: number) => {
    if (e.key === 'Enter') {
      saveEditing(id);
    }
  };

  // Click outside to cancel/save is handled by onBlur of the input usually,
  // but we need to ensure we don't trigger selection when clicking the input.
  // The input onClick stopPropagation handles that.

  const handleItemKeyDown = (e: React.KeyboardEvent, id: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      // Prevent screen scrolling with Space
      if (e.key === ' ') e.preventDefault();
      if (!editingId && onSelect) {
        onSelect(id);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="lg:text-lg font-bold text-slate-800 text-sm">{title}</h2>
        <div className="flex gap-2">{actions}</div>
      </div>
      <div className="flex-1 overflow-y-auto pr-2">
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {items.map((item) => {
            const isSelected = selectedItems.includes(item.id);
            const isEditing = editingId === item.id;

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (!isEditing) {
                    onSelect?.(item.id);
                  }
                }}
                onKeyDown={(e) => handleItemKeyDown(e, item.id)}
                className={`
                  relative rounded p-4 h-24 flex items-center justify-center
                  transition-all cursor-pointer border group
                  ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                      : 'bg-white border-slate-200 text-slate-900 hover:border-blue-500 hover:text-blue-500 hover:shadow-md'
                  }
                `}
              >
                {isEditing ? (
                  <Input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveEditing(item.id)}
                    onKeyDown={(e) => handleKeyDown(e, item.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-center"
                    size="middle"
                  />
                ) : (
                  <>
                    <div className="flex flex-col items-center">
                      <span className="text-xs opacity-60 mb-1">
                        CH {item.id}
                      </span>
                      <span
                        className="font-medium text-sm lg:text-base text-inherit text-center px-2 truncate w-full max-w-[150px]"
                        title={item.label}
                      >
                        {item.label || `Channel ${item.id}`}
                      </span>
                    </div>

                    {/* Rename Button - Visible on hover or when selected */}
                    {!isEditing && (
                      <div className="absolute top-1 right-1 transition-opacity opacity-0 group-hover:opacity-100">
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={(e) => startEditing(e, item)}
                          className={
                            isSelected
                              ? 'text-white hover:text-blue-100'
                              : 'text-slate-400 hover:text-blue-600'
                          }
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
