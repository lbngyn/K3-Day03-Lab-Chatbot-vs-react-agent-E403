import React, { useState } from 'react';
import { GitFork, ArrowDown, Sparkles, CheckCircle2, ShieldAlert, Zap, MessageSquare, Bot } from 'lucide-react';

export default function FlowchartView() {
  const [activePath, setActivePath] = useState('both'); // 'both' | 'baseline' | 'react'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <GitFork className="w-5 h-5 text-indigo-600" />
            <span>Hybrid Flowchart Architect (Role 5B)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Minh họa trực quan sơ đồ định tuyến câu hỏi: Khi nào hệ thống chọn <b>Chatbot Baseline Path</b> vs <b>ReAct Agent Path</b>.
          </p>
        </div>

        {/* Path Filter Buttons */}
        <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-xl text-xs font-semibold shrink-0">
          <button
            onClick={() => setActivePath('both')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activePath === 'both' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
            }`}
          >
            Hiển thị cả 2 luồng
          </button>
          <button
            onClick={() => setActivePath('baseline')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activePath === 'baseline' ? 'bg-sky-600 text-white shadow-2xs' : 'text-slate-600'
            }`}
          >
            🟢 Chỉ Luồng Chatbot
          </button>
          <button
            onClick={() => setActivePath('react')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activePath === 'react' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600'
            }`}
          >
            🟡 Luồng ReAct Agent
          </button>
        </div>
      </div>

      {/* Interactive Visual Diagram Canvas */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-8 flex flex-col items-center">
        
        {/* Node A: User Query */}
        <div className="bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-bold text-sm shadow-md flex items-center space-x-3">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          <span>👤 User Query (Câu hỏi người dùng)</span>
        </div>

        <ArrowDown className="w-6 h-6 text-slate-300 animate-bounce" />

        {/* Node B: Intent Router */}
        <div className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-8 py-4 rounded-2xl font-bold text-base shadow-lg text-center space-y-1">
          <div className="flex items-center justify-center space-x-2">
            <Zap className="w-5 h-5 text-amber-300" />
            <span>🧠 Intent Router - Bộ Định Tuyến Phân Loại</span>
          </div>
          <div className="text-xs text-indigo-100 font-normal">
            Đánh giá 4 tiêu chí Agentic Fit (Thông tin thời gian thực, Multi-step, Tool call, Edge case)
          </div>
        </div>

        {/* Split Branches */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl pt-4">
          
          {/* LEFT BRANCH: Baseline Chatbot */}
          {(activePath === 'both' || activePath === 'baseline') && (
            <div className="border-2 border-sky-200 bg-sky-50/40 rounded-2xl p-6 space-y-4 shadow-sm animate-fade-in flex flex-col items-center">
              <span className="px-3 py-1 bg-sky-100 text-sky-800 font-bold text-xs rounded-full border border-sky-300">
                🟢 Nhánh 1: Câu hỏi đơn giản / Tri thức tĩnh
              </span>

              <div className="w-full bg-white p-4 rounded-xl border border-sky-200 shadow-2xs space-y-2 text-center">
                <div className="font-bold text-sky-900 text-sm flex items-center justify-center space-x-1.5">
                  <Bot className="w-4 h-4 text-sky-600" />
                  <span>💬 CHATBOT BASELINE PATH</span>
                </div>
                <p className="text-xs text-slate-600">
                  Gửi Prompt tĩnh `CHATBOT_BASELINE_PROMPT`. LLM sinh ngay câu trả lời không cần Tool.
                </p>
              </div>

              <ArrowDown className="w-4 h-4 text-sky-400" />

              <div className="w-full bg-white p-3 rounded-xl border border-emerald-300 text-center font-bold text-xs text-emerald-700 bg-emerald-50/60">
                🏁 Trao Phản Hồi Trực Tiếp Cho User
              </div>
            </div>
          )}

          {/* RIGHT BRANCH: ReAct Agent Loop */}
          {(activePath === 'both' || activePath === 'react') && (
            <div className="border-2 border-indigo-200 bg-indigo-50/40 rounded-2xl p-6 space-y-4 shadow-sm animate-fade-in flex flex-col items-center">
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 font-bold text-xs rounded-full border border-indigo-300">
                🟡🔴 Nhánh 2: Câu hỏi phức tạp / Đa bước / Gọi Tool
              </span>

              <div className="w-full bg-white p-4 rounded-xl border border-indigo-200 shadow-2xs space-y-3 text-center">
                <div className="font-bold text-indigo-900 text-sm flex items-center justify-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>🤖 REACT AGENT LOOP & SAFEGUARDS</span>
                </div>

                <div className="space-y-1.5 text-xs text-left bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="font-bold text-amber-800">1. 🧠 Thought: Suy luận logic</div>
                  <div className="font-bold text-indigo-800">2. 🛠️ Action: Gọi get_weather / search_flights</div>
                  <div className="font-bold text-emerald-800">3. 👁️ Observation: Nhận kết quả từ công cụ</div>
                </div>

                {/* Guardrail Decision Box */}
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-300 text-amber-900 text-xs font-semibold">
                  🛡️ Check Guardrail: Iteration &lt; MAX_ITERATIONS (3)?
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full text-xs">
                <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-emerald-800 font-medium text-center">
                  ✅ Đủ dữ liệu → <br /><b>Final Answer</b>
                </div>
                <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-rose-800 font-medium text-center">
                  ⚠️ Đạt Max (3) → <br /><b>Guardrail Dừng</b>
                </div>
              </div>

              <ArrowDown className="w-4 h-4 text-indigo-400" />

              <div className="w-full bg-white p-3 rounded-xl border border-emerald-300 text-center font-bold text-xs text-emerald-700 bg-emerald-50/60">
                🏁 Trao Phản Hồi Đầy Đủ / Thông Báo An Toàn
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
