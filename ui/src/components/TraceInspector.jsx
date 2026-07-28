import React, { useState } from 'react';
import { Activity, Download, ShieldAlert, Cpu, Code2, Clock, Check, Copy, FileText } from 'lucide-react';
import { REGISTERED_TOOLS } from '../data/toolsRegistry';

export default function TraceInspector({ traceHistory = [] }) {
  const [copied, setCopied] = useState(false);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'guardrail'

  const filteredHistory = filterMode === 'guardrail'
    ? traceHistory.filter(t => t.guardrailTriggered)
    : traceHistory;

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(traceHistory, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `trace_log_report_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportMarkdown = () => {
    let mdStr = `# 📊 BÁO CÁO TRACE LOG & GUARDRAILS REPORT\n\n`;
    mdStr += `**Thời gian xuất**: ${new Date().toLocaleString()}\n`;
    mdStr += `**Tổng số lượt gọi**: ${traceHistory.length}\n\n`;

    traceHistory.forEach((item, idx) => {
      mdStr += `---
### Trace #${idx + 1}: ${item.query}
- **Mode**: ${item.mode}
- **Latency**: ${item.executionTimeMs}ms
- **Vòng lặp (Iterations)**: ${item.iterations}
- **Guardrail Triggered**: ${item.guardrailTriggered ? 'CÓ (Đã ngắt an toàn)' : 'KHÔNG'}

#### Các bước suy luận (ReAct Steps):
`;
      item.steps.forEach(s => {
        mdStr += `1. **Thought**: ${s.thought}\n`;
        if (s.action) mdStr += `   - **Action**: \`${s.action}\` | Arguments: \`${JSON.stringify(s.actionArgs)}\`\n`;
        if (s.observation) mdStr += `   - **Observation**: ${s.observation}\n`;
      });
      mdStr += `\n**Final Answer**:\n${item.finalAnswer}\n\n`;
    });

    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(mdStr);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `trace_log_report_${Date.now()}.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Controller */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <span>Visual Trace Log & Guardrail Inspector</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Giám sát thời gian thực thi của Agent, theo dõi chi tiết Tool Calls, và xác minh cơ chế Guardrails.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleExportJson}
            disabled={traceHistory.length === 0}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl font-semibold text-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất JSON</span>
          </button>
          <button
            onClick={handleExportMarkdown}
            disabled={traceHistory.length === 0}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition-colors shadow-sm shadow-indigo-200"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Xuất Báo Cáo Markdown</span>
          </button>
        </div>
      </div>

      {/* Grid View: Registered Tools Specs + Guardrail Config */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Registered Tool Registry */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
            <Code2 className="w-4 h-4 text-indigo-600" />
            <span>Công Cụ Đã Đăng Ký (Tool Registry - src/tools.py)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {REGISTERED_TOOLS.map(tool => (
              <div key={tool.name} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-700 font-mono text-xs">
                    🛠️ {tool.name}()
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    {tool.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {tool.description}
                </p>
                <div className="bg-slate-900 text-slate-200 p-2.5 rounded-lg text-[11px] font-mono overflow-x-auto">
                  <div className="text-slate-400 text-[10px]">Parameters Schema:</div>
                  <pre className="text-indigo-300">
                    {JSON.stringify(tool.parameters.properties, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Guardrail Configuration */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Cấu Hình Guardrails & Safeguards</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
              <div className="font-bold">MAX_ITERATIONS: 3</div>
              <p className="text-[11px]">
                Ngăn chặn hiện tượng lặp vô hạn (Infinite Loop) khi Tool bị lỗi hoặc trả về kết quả rỗng.
              </p>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
              <div className="font-bold">Structured Prompt System</div>
              <p className="text-[11px]">
                Ép cấu trúc ReAct nghiêm ngặt qua `src/prompts.py` với cú pháp Thought, Action, Observation.
              </p>
            </div>

            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-900 space-y-1">
              <div className="font-bold">Safe Fallback Message</div>
              <p className="text-[11px]">
                Nếu ngắt guardrail, Agent luôn trả lời lịch sự thay vì văng exception hoặc crash ứng dụng.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Main Trace Log Stream Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            📜 Nhật Ký Thực Thi (Trace Log Stream) ({filteredHistory.length})
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                filterMode === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Tất cả Logs
            </button>
            <button
              onClick={() => setFilterMode('guardrail')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                filterMode === 'guardrail' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Chỉ Guardrail Triggers
            </button>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Chưa có trace log nào được ghi lại. Hãy thử nhập câu hỏi ở tab <b>Interactive Chat Studio</b> hoặc bấm <b>Run All Tests</b> ở tab Test Runner.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((trace, idx) => (
              <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2 text-xs">
                  <div className="flex items-center space-x-2 font-bold text-slate-900">
                    <span>Trace #{filteredHistory.length - idx}</span>
                    <span className="text-slate-400">|</span>
                    <span className="text-indigo-600">Query: "{trace.query}"</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                      {trace.executionTimeMs}ms
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-mono text-[10px]">
                      {trace.iterations} step(s)
                    </span>
                    {trace.guardrailTriggered && (
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">
                        ⛔ GUARDRAIL TRIGGERED
                      </span>
                    )}
                  </div>
                </div>

                {/* Steps Details */}
                <div className="space-y-2">
                  {trace.steps.map((step, sIdx) => (
                    <div key={sIdx} className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                      <div className="font-semibold text-slate-700">bước {step.stepNumber}:</div>
                      <div className="text-amber-800 bg-amber-50 p-2 rounded">💡 {step.thought}</div>
                      {step.action && (
                        <div className="text-indigo-800 bg-indigo-50 p-2 rounded font-mono text-[11px]">
                          🛠️ Action: {step.action}({JSON.stringify(step.actionArgs)})
                        </div>
                      )}
                      {step.observation && (
                        <div className="text-emerald-800 bg-emerald-50 p-2 rounded">
                          👁️ Observation: {step.observation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}
