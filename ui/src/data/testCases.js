export const TEST_CASES = [
  {
    id: 1,
    category: "🟢 Đơn giản (Chỉ cần LLM)",
    question: "Thủ đô của Việt Nam là gì?",
    expected_behavior: "Chatbot trả lời trực tiếp từ kiến thức có sẵn mà không cần gọi công cụ.",
    complexity: "Simple",
    tools_needed: [],
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  {
    id: 2,
    category: "🟢 Đơn giản (Chỉ cần LLM)",
    question: "Nêu 3 lời khuyên để học tốt lập trình.",
    expected_behavior: "Chatbot trả lời trực tiếp dựa trên kiến thức tĩnh.",
    complexity: "Simple",
    tools_needed: [],
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  {
    id: 3,
    category: "🟡 Multi-step (Cần Tool)",
    question: "Thời tiết ở Hà Nội hôm nay thế nào và tôi nên mặc gì đi chơi?",
    expected_behavior: "Agent gọi tool get_weather('Hà Nội') rồi suy luận trang phục phù hợp.",
    complexity: "Multi-step",
    tools_needed: ["get_weather"],
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200"
  },
  {
    id: 4,
    category: "🟡 Multi-step (Cần gọi 2 Tools)",
    question: "Kiểm tra vé máy bay từ TP.HCM đi Hà Nội ngày mai và dự báo thời tiết ở Hà Nội.",
    expected_behavior: "Agent gọi tool search_flights và get_weather để trả lời đầy đủ thông tin.",
    complexity: "Multi-step (2 Tools)",
    tools_needed: ["search_flights", "get_weather"],
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200"
  },
  {
    id: 5,
    category: "🔴 Edge Case (Bẫy Guardrail)",
    question: "Tra cứu thời tiết ở thành phố Atlantis ngày 32/13/2026.",
    expected_behavior: "Tool báo lỗi/thất bại, Guardrail ngắt an toàn sau bước thứ 3 và trả về thông báo lịch sự.",
    complexity: "Edge Case",
    tools_needed: ["get_weather"],
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200"
  }
];
