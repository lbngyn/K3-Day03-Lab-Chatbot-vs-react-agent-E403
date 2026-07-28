import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Bot, User, Brain, Wrench, Eye, CheckCircle2, 
  AlertTriangle, Copy, Check, Sparkles, ChevronDown, ChevronUp, RefreshCw, Layers, Calendar, MapPin, Star, Building
} from 'lucide-react';
import { sendBaselineChat, sendReActChat } from '../services/api';
import { TEST_CASES } from '../data/testCases';

export default function ChatStudio({ onNewTrace, onOpenBookingForProperty }) {
  const [mode, setMode] = useState('react'); // 'react' | 'baseline'
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDeveloperTrace, setShowDeveloperTrace] = useState(false); // Toggle developer trace details
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      mode: 'react',
      content: 'Xin chào! Tôi là Trợ Lý Tìm & Đặt Lịch Xem Nhà Trọ / Căn Hộ Cho Thuê. Bạn hãy nhập khu vực hoặc mức giá mong muốn để tôi tìm căn hộ phù hợp nhất cho bạn nhé!',
      steps: [],
      propertiesResult: null,
      executionTimeMs: 0
    }
  ]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [expandedSteps, setExpandedSteps] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!inputQuery.trim() || isLoading) return;

    const userText = inputQuery.trim();
    setInputQuery('');
    
    // Add user message
    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      content: userText
    };

    // Chuẩn hóa lịch sử tin nhắn trước đó làm Memory Context cho Agent
    const historyContext = messages
      .filter(m => m.id !== 'welcome' && m.content)
      .map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.content
      }));

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const result = mode === 'baseline' 
        ? await sendBaselineChat(userText, null, historyContext)
        : await sendReActChat(userText, null, historyContext);

      
      const botMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        mode: result.mode,
        content: result.finalAnswer,
        steps: result.steps,
        propertiesResult: result.propertiesResult,
        bookingResult: result.bookingResult,
        guardrailTriggered: result.guardrailTriggered,
        executionTimeMs: result.executionTimeMs,
        iterations: result.iterations
      };

      setMessages(prev => [...prev, botMsg]);
      if (onNewTrace) {
        onNewTrace(result);
      }
    } catch (err) {
      console.error('Error submitting chat:', err);
    } finally {
      setIsLoading(false);
    }
  };


  const handlePresetClick = (q) => {
    setInputQuery(q);
  };

  const toggleAccordion = (msgId) => {
    setExpandedSteps(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const handleCopyJson = (text, idx) => {
    navigator.clipboard.writeText(typeof text === 'object' ? JSON.stringify(text, null, 2) : text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      
      {/* Top Controller Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-4 flex flex-wrap items-center justify-between gap-4">
        
        {/* Mode Toggle Switch */}
        <div className="flex items-center space-x-3">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Chế độ Trợ lý:</span>
          <div className="bg-slate-100 p-1 rounded-xl flex space-x-1">
            <button
              onClick={() => setMode('baseline')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'baseline'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Chatbot cơ bản</span>
            </button>
            <button
              onClick={() => setMode('react')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'react'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Trợ lý ReAct (Thông minh)</span>
            </button>
          </div>
        </div>

        {/* Developer Trace Toggle */}
        <div className="flex items-center space-x-2">
          <label className="text-xs text-slate-500 flex items-center space-x-1.5 cursor-pointer selection:bg-none">
            <input 
              type="checkbox"
              checked={showDeveloperTrace}
              onChange={(e) => setShowDeveloperTrace(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
            />
            <span>Hiển thị chi tiết suy luận AI (Dành cho Dev)</span>
          </label>
        </div>

      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 overflow-y-auto space-y-6">
        
        {messages.map((msg) => {
          const isBot = msg.sender === 'bot';
          const isAccordionOpen = expandedSteps[msg.id] ?? false; // Collapsed by default for clean end-user experience

          return (
            <div
              key={msg.id}
              className={`flex ${isBot ? 'justify-start' : 'justify-end'} animate-fade-in`}
            >
              <div className={`flex items-start space-x-3 max-w-3xl ${isBot ? 'w-full' : ''}`}>
                
                {/* Avatar */}
                {isBot && (
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 mt-1 shadow-sm ${
                    msg.mode === 'react' ? 'bg-indigo-600' : 'bg-sky-600'
                  }`}>
                    {msg.mode === 'react' ? <Brain className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                )}

                {/* Message Content Bubble */}
                <div className={`rounded-2xl p-4 text-sm leading-relaxed ${
                  isBot
                    ? 'bg-slate-50 border border-slate-200 text-slate-800 w-full'
                    : 'bg-indigo-600 text-white shadow-sm'
                }`}>
                  
                  {/* Clean Message Header info for Bot */}
                  {isBot && (
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 text-xs">
                      <span className="font-bold text-slate-700">
                        {msg.mode === 'react' ? 'Trợ Lý Thuê Nhà AI' : 'Chatbot Cơ Bản'}
                      </span>
                    </div>
                  )}

                  {/* Optional Developer Trace Accordion (ONLY if enabled by checkbox) */}
                  {isBot && showDeveloperTrace && msg.steps && msg.steps.length > 0 && (
                    <div className="mb-4 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                      <button
                        onClick={() => toggleAccordion(msg.id)}
                        className="w-full px-3.5 py-2 bg-slate-100/70 hover:bg-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-600 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <Layers className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Chi tiết suy luận kỹ thuật ({msg.steps.length} bước)</span>
                        </div>
                        {isAccordionOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isAccordionOpen && (
                        <div className="p-3 space-y-2 bg-slate-50/50 text-xs">
                          {msg.steps.map((step, idx) => (
                            <div key={idx} className="space-y-1.5 border-l-2 border-indigo-300 pl-2.5">
                              {step.thought && (
                                <div className="bg-amber-50 p-2 rounded text-amber-900 text-[11px]">
                                  💡 <b>Thought:</b> {step.thought}
                                </div>
                              )}
                              {step.action && (
                                <div className="bg-indigo-50 p-2 rounded text-indigo-900 text-[11px] font-mono">
                                  🛠️ <b>Action:</b> {step.action}({JSON.stringify(step.actionArgs)})
                                </div>
                              )}
                              {step.observation && (
                                <div className="bg-emerald-50 p-2 rounded text-emerald-900 text-[11px]">
                                  👁️ <b>Observation:</b> {step.observation}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Clean User-Facing Text Response */}
                  <div className={`whitespace-pre-line font-medium ${isBot ? 'text-slate-800' : 'text-white'}`}>
                    {msg.content}
                  </div>

                  {/* 🏢 CLEAN IN-CHAT PROPERTY CARDS (Thông tin căn hộ hiển thị sạch sẽ cho người dùng) */}
                  {isBot && msg.propertiesResult && msg.propertiesResult.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-3">
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                        <Building className="w-4 h-4 text-indigo-600" />
                        <span>Danh Sách Căn Hộ Phù Hợp ({msg.propertiesResult.length})</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {msg.propertiesResult.map((prop) => (
                          <div 
                            key={prop.id}
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                          >
                            <div>
                              {/* Image Banner */}
                              <div className="relative h-32 w-full overflow-hidden bg-slate-100">
                                <img 
                                  src={prop.image} 
                                  alt={prop.title}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" 
                                />
                                <div className="absolute top-2 left-2 bg-slate-900/85 backdrop-blur-xs text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-md shadow-xs border border-slate-700/50 flex items-center space-x-1">
                                  <Building className="w-3 h-3 text-indigo-400 shrink-0" />
                                  <span>Mã: {prop.propertyCode || prop.id}</span>
                                </div>
                                <div className="absolute top-2 right-2 bg-amber-400 text-amber-950 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center space-x-1 shadow-2xs">
                                  <Star className="w-3 h-3 fill-amber-950" />
                                  <span>{prop.rating}</span>
                                </div>
                              </div>

                              {/* Card Content */}
                              <div className="p-3 space-y-1.5 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200/80">
                                    Mã BĐS: {prop.propertyCode || prop.id}
                                  </span>
                                </div>

                                <h5 className="font-bold text-slate-900 line-clamp-1 leading-snug">
                                  {prop.title}
                                </h5>

                                <div className="flex items-center space-x-1 text-slate-500 text-[11px]">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{prop.address}</span>
                                </div>

                                <div className="flex items-center space-x-3 text-[11px] font-semibold text-slate-700 pt-1">
                                  <span className="text-indigo-600 font-bold text-sm">
                                    {String(prop.price).includes('triệu') || String(prop.price).includes('VNĐ') || String(prop.price).includes('tháng')
                                      ? prop.price 
                                      : `${prop.price} tr/tháng`}
                                  </span>
                                  <span>•</span>
                                  <span>{prop.area}</span>
                                  <span>•</span>
                                  <span>{prop.bedrooms} PN</span>
                                </div>

                                {/* Amenities pills */}
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {prop.amenities?.slice(0, 2).map((am, i) => (
                                    <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                      {am}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="p-3 pt-0 flex">
                              {prop.url && prop.url !== '#' ? (
                                <a
                                  href={prop.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-xs transition-all flex items-center justify-center space-x-1.5 border border-indigo-200/80 shadow-2xs"
                                >
                                  <span>🔗 Xem chi tiết tin đăng</span>
                                </a>
                              ) : (
                                <span className="w-full text-center text-[11px] text-slate-400 py-1 font-medium italic">
                                  Tin đăng từ hệ thống
                                </span>
                              )}
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 📅 CLEAN IN-CHAT BOOKING CONFIRMATION CARD (Thông tin đặt lịch hiển thị trực quan UI) */}
                  {isBot && msg.bookingResult && (
                    <div className="mt-4 pt-4 border-t border-slate-200/80">
                      <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-4 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            <span>XÁC NHẬN ĐẶT LỊCH XEM NHÀ THÀNH CÔNG</span>
                          </div>
                          <span className="bg-emerald-100 text-emerald-800 text-xs font-mono font-bold px-2.5 py-1 rounded-lg">
                            {msg.bookingResult.booking_id}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 bg-white/70 p-3 rounded-lg border border-emerald-100/80">
                          <div>
                            <span className="text-slate-500 font-medium">Khách hàng:</span>{' '}
                            <span className="font-bold text-slate-900">{msg.bookingResult.customer_name}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium">Số điện thoại:</span>{' '}
                            <span className="font-bold text-slate-900">{msg.bookingResult.customer_phone}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium">Căn hộ/BĐS:</span>{' '}
                            <span className="font-bold text-slate-900">{msg.bookingResult.property?.title || msg.bookingResult.property_id}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium">Thời gian hẹn:</span>{' '}
                            <span className="font-bold text-emerald-700">{msg.bookingResult.scheduled_time}</span>
                          </div>
                        </div>

                        <p className="text-[11px] text-emerald-700 italic">
                          💡 Thông tin đặt lịch đã được tự động lưu vào Sổ Tay Lịch Hẹn. Tư vấn viên sẽ liên hệ xác nhận trước giờ hẹn.
                        </p>
                      </div>
                    </div>
                  )}

                </div>

                {/* User Avatar */}
                {!isBot && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-white shrink-0 mt-1 shadow-sm">
                    <User className="w-4 h-4" />
                  </div>
                )}

              </div>
            </div>
          );
        })}

        {/* Clean Loading Spinner */}
        {isLoading && (
          <div className="flex items-center space-x-3 text-slate-500 animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-100 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-600">
              Đang tìm kiếm căn hộ phù hợp...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Preset Questions Bar */}
      <div className="mt-3 flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-semibold text-slate-400 shrink-0">💡 Gợi ý câu hỏi:</span>
        <button
          onClick={() => handlePresetClick("Tìm giúp tôi phòng trọ khu Cầu Giấy dưới 8 triệu")}
          className="text-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xs transition-colors shrink-0 font-medium"
        >
          🏡 Tìm phòng trọ Cầu Giấy &lt; 8 triệu
        </button>
        <button
          onClick={() => handlePresetClick("Đặt cho tôi lịch xem nhà căn hộ AP-102 chiều mai 3h")}
          className="text-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xs transition-colors shrink-0 font-medium"
        >
          📅 Đặt lịch xem căn AP-102
        </button>
      </div>

      {/* Input Form Bar */}
      <form onSubmit={handleSubmit} className="mt-2 relative">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Nhập yêu cầu (Ví dụ: Tìm giúp tôi phòng trọ khu Cầu Giấy dưới 8 triệu)..."
          className="w-full pl-4 pr-12 py-3.5 bg-white border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-2xl text-sm outline-none transition-all shadow-sm"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!inputQuery.trim() || isLoading}
          className="absolute right-2 top-2 bottom-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl transition-all flex items-center justify-center shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}
