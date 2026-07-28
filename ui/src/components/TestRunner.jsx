import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, AlertTriangle, Clock, RefreshCw, Layers, ChevronRight, Check, X } from 'lucide-react';
import { fetchTestCases, sendReActChat } from '../services/api';

export default function TestRunner({ onNewTrace }) {
  const [testCases, setTestCases] = useState([]);
  const [testResults, setTestResults] = useState({});
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [runningId, setRunningId] = useState(null);
  const [selectedTestCase, setSelectedTestCase] = useState(null);

  useEffect(() => {
    async function loadCases() {
      const cases = await fetchTestCases();
      setTestCases(cases);
    }
    loadCases();
  }, []);

  const runSingleTest = async (testCase) => {
    setRunningId(testCase.id);
    try {
      const res = await sendReActChat(testCase.question);
      setTestResults(prev => ({
        ...prev,
        [testCase.id]: res
      }));
      if (onNewTrace) onNewTrace(res);
    } catch (err) {
      console.error(err);
    } finally {
      setRunningId(null);
    }
  };

  const runAllTests = async () => {
    setIsRunningAll(true);
    const newResults = {};

    for (const tc of testCases) {
      setRunningId(tc.id);
      const res = await sendReActChat(tc.question);

      newResults[tc.id] = res;
      setTestResults({ ...newResults });
      if (onNewTrace) onNewTrace(res);
      await new Promise(r => setTimeout(r, 200));
    }

    setRunningId(null);
    setIsRunningAll(false);
  };


  // Metric summaries
  const totalExecuted = Object.keys(testResults).length;
  const passCount = Object.values(testResults).filter(r => !r.guardrailTriggered).length;
  const guardrailCount = Object.values(testResults).filter(r => r.guardrailTriggered).length;
  const avgTime = totalExecuted > 0
    ? Math.round(Object.values(testResults).reduce((acc, curr) => acc + curr.executionTimeMs, 0) / totalExecuted)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner & Control */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            🧪 Batch Test Suite (Config/test_cases.json)
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Chạy đánh giá tự động 5 kịch bản thử thách cho AI Agent (Đơn giản, Multi-step, và Edge Case bẫy Guardrail).
          </p>
        </div>

        <button
          onClick={runAllTests}
          disabled={isRunningAll || runningId !== null}
          className="flex items-center space-x-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-semibold text-sm transition-all shadow-sm shadow-indigo-200 shrink-0 self-start md:self-auto"
        >
          {isRunningAll ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Đang chạy Suite ({totalExecuted}/{testCases.length})...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Run All {testCases.length} Test Cases</span>
            </>
          )}
        </button>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng Test Cases</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{testCases.length} Cases</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Nạp từ test_cases.json</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Pass Hoàn Thành</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{passCount}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Xử lý đúng kỳ vọng</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Guardrail Triggered</div>
          <div className="text-2xl font-bold text-rose-700 mt-1">{guardrailCount}</div>
          <div className="text-[11px] text-rose-600 mt-0.5">Bắt lỗi & Dừng loop an toàn</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Latency Trung Bình</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{avgTime} ms</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Thời gian phản hồi suite</div>
        </div>

      </div>

      {/* Test Cases Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Danh Sách Kịch Bản Test</h3>
          <span className="text-xs text-slate-500">Bấm nút ▶ để test từng case đơn lẻ</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">ID</th>
                <th className="py-3.5 px-4">Phân loại & Độ phức tạp</th>
                <th className="py-3.5 px-4">Câu hỏi (Prompt)</th>
                <th className="py-3.5 px-4">Kỳ vọng Agentic Fit</th>
                <th className="py-3.5 px-4 text-center">Vòng lặp (Loop)</th>
                <th className="py-3.5 px-4 text-center">Latency</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {testCases.map((tc) => {
                const result = testResults[tc.id];
                const isRunningThis = runningId === tc.id;

                return (

                  <tr key={tc.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* ID */}
                    <td className="py-4 px-4 font-bold text-slate-700 text-center">#{tc.id}</td>

                    {/* Category badge */}
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${tc.badgeColor}`}>
                        {tc.category}
                      </span>
                    </td>

                    {/* Question */}
                    <td className="py-4 px-4 font-medium text-slate-900 max-w-xs">
                      {tc.question}
                    </td>

                    {/* Expected Behavior */}
                    <td className="py-4 px-4 text-slate-600 max-w-xs">
                      {tc.expected_behavior}
                    </td>

                    {/* Iterations */}
                    <td className="py-4 px-4 text-center font-mono">
                      {result ? (
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          result.iterations >= 3 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {result.iterations} / 3
                        </span>
                      ) : '-'}
                    </td>

                    {/* Latency */}
                    <td className="py-4 px-4 text-center font-mono text-slate-600">
                      {result ? `${result.executionTimeMs}ms` : '-'}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 text-center">
                      {isRunningThis ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 font-semibold">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Running...</span>
                        </span>
                      ) : result ? (
                        result.guardrailTriggered ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>Guardrail Dừng</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>PASS</span>
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400">Chưa chạy</span>
                      )}
                    </td>

                    {/* Action button */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {result && (
                          <button
                            onClick={() => setSelectedTestCase(selectedTestCase?.id === tc.id ? null : { tc, result })}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-[11px] transition-colors"
                          >
                            Xem Trace
                          </button>
                        )}
                        <button
                          onClick={() => runSingleTest(tc)}
                          disabled={isRunningThis || isRunningAll}
                          className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors"
                          title="Run Test Case"
                        >
                          <Play className="w-3.5 h-3.5 fill-indigo-600" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* Selected Test Trace Details Drawer */}
      {selectedTestCase && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md animate-fade-in space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="font-bold text-slate-900 text-base">
              🔍 Trace Log Chi Tiết Test Case #{selectedTestCase.tc.id}
            </h4>
            <button
              onClick={() => setSelectedTestCase(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-700">Câu hỏi: </span>
              <span>{selectedTestCase.tc.question}</span>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-slate-700">Các bước ReAct Execution:</span>
              {selectedTestCase.result.steps.map((s, idx) => (
                <div key={idx} className="bg-slate-900 text-indigo-200 p-3 rounded-xl font-mono text-[11px] space-y-1">
                  <div>[Step {s.stepNumber}] Thought: {s.thought}</div>
                  {s.action && <div>[Action] {s.action}({JSON.stringify(s.actionArgs)})</div>}
                  {s.observation && <div className="text-emerald-400">[Observation] {s.observation}</div>}
                </div>
              ))}
            </div>

            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200 text-indigo-900">
              <span className="font-bold">Final Answer: </span>
              <span>{selectedTestCase.result.finalAnswer}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
