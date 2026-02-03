import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const menuItems = [
  { label: '输入输出切换', path: '/' },
  { label: '设备拼接控制', path: '/splicing' },
  { label: '场景预案', path: '/scenes' },
  { label: '硬件设置', path: '/settings' },
  { label: '连接设置', path: '/connection' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="w-32 bg-slate-800 text-slate-300 flex flex-col h-screen">
      <div className="h-16 flex items-center justify-center border-r border-slate-700">
        <div className="w-10 h-10 border-2 border-slate-400 flex items-center justify-center text-xl font-bold text-white">
          H
        </div>
      </div>
      <nav className="flex-1">
        <ul>
          {menuItems.map((item) => (
            <li key={item.path}>
              <button
                type="button"
                className={`w-full text-sm text-center py-4 px-4 hover:bg-slate-700 transition-colors ${
                  location.pathname === item.path
                    ? 'bg-slate-700 text-white border-l-4 border-blue-500'
                    : ''
                }`}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
