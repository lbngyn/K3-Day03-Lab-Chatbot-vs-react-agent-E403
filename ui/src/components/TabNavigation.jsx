import React from 'react';
import { MessageSquare, PlaySquare, Activity, GitFork } from 'lucide-react';

export default function TabNavigation({ activeTab, setActiveTab }) {
  const tabs = [
    {
      id: 'chat',
      label: 'Interactive Chat Studio',
      subtitle: 'Thử nghiệm & So sánh Chatbot vs Agent',
      icon: MessageSquare
    },
    {
      id: 'runner',
      label: 'Batch Test Runner',
      subtitle: 'Đánh giá tự động 5 Test Cases',
      icon: PlaySquare
    },
    {
      id: 'trace',
      label: 'Visual Trace Inspector',
      subtitle: 'Log thực thi & Guardrails',
      icon: Activity
    },
    {
      id: 'flowchart',
      label: 'Hybrid Flowchart',
      subtitle: 'Sơ đồ định tuyến câu hỏi',
      icon: GitFork
    }
  ];

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto py-2 scrollbar-none" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <div className="text-left">
                  <div className="font-semibold leading-tight">{tab.label}</div>
                  <div className={`text-[10px] ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {tab.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
