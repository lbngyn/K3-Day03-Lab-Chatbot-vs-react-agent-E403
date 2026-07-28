import React from 'react';
import { Bot, Cpu, Zap, Key, ShieldCheck, Wrench, Calendar, Server } from 'lucide-react';

export default function Header({ 
  activeToolsCount = 3, 
  appointmentsCount = 0, 
  avgLatency = '320ms',
  isBackendOnline = false,
  onOpenBookingSidebar 
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight font-sans">
                Trợ Lý Thuê Nhà AI Studio
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                ReAct Cấp 3/4
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Tìm Căn Hộ & Đặt Lịch Xem Nhà (find_houses, rerank, contact_sales)
            </p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center space-x-3 text-xs font-medium text-slate-600">
          
          {/* Backend Connection Status Badge */}
          <div className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border font-semibold ${
            isBackendOnline 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            <Server className={`w-3.5 h-3.5 ${isBackendOnline ? 'text-emerald-600' : 'text-amber-600'}`} />
            <span>{isBackendOnline ? 'FastAPI Connected' : 'Mock Mode (Local)'}</span>
          </div>

          {/* Appointment Drawer Trigger Button */}
          <button
            onClick={onOpenBookingSidebar}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-sm shadow-indigo-200"
          >
            <Calendar className="w-4 h-4" />
            <span>📅 {appointmentsCount} Lịch Hẹn Xem Nhà</span>
          </button>

          {/* Active Tools Badge */}
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
            <Wrench className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-semibold">{activeToolsCount} Tools</span>
          </div>

          {/* Latency counter */}
          <div className="hidden md:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Avg: {avgLatency}</span>
          </div>

        </div>

      </div>
    </header>
  );
}

