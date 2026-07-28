/**
 * API Service for connecting React Frontend with FastAPI Backend (http://localhost:8000)
 */

import { MOCK_PROPERTIES, processQuery as processMockQuery } from '../utils/reactAgentSimulator';
import { TEST_CASES as LOCAL_TEST_CASES } from '../data/testCases';

export const API_BASE_URL = 'http://localhost:8000';

/**
 * Check if the FastAPI backend is running and healthy
 */
export async function checkBackendStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000)
    });
    if (response.ok) {
      const data = await response.json();
      return {
        online: true,
        message: data.message || 'FastAPI Server Connected',
        availableTools: data.available_tools || []
      };
    }
  } catch (err) {
    console.warn('Backend API connection check failed, using fallback:', err.message);
  }
  return {
    online: false,
    message: 'Backend Disconnected (Fallback Mock Mode)',
    availableTools: []
  };
}

/**
 * Send query to Baseline Chatbot Endpoint (/api/chat/baseline)
 */
export async function sendBaselineChat(query, providerName = null, history = null, sessionId = 'default_session') {
  const startTime = performance.now();
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/baseline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, provider_name: providerName, session_id: sessionId, history: history }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const data = await response.json();
    const endTime = performance.now();

    return {
      mode: 'baseline',
      query: data.user_query || query,
      provider: data.provider || providerName,
      steps: [],
      finalAnswer: data.response || 'Không nhận được phản hồi từ Chatbot.',
      propertiesResult: null,
      bookingResult: null,
      guardrailTriggered: false,
      iterations: 0,
      executionTimeMs: Math.round(endTime - startTime)
    };
  } catch (err) {
    console.warn('Fallback to mock for baseline chat:', err.message);
    return await processMockQuery(query, 'baseline');
  }
}

/**
 * Send query to ReAct Agent Endpoint (/api/chat/react)
 */
export async function sendReActChat(query, providerName = null, history = null, sessionId = 'default_session') {

  const startTime = performance.now();
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, provider_name: providerName, session_id: sessionId, history: history }),
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const data = await response.json();
    const endTime = performance.now();

    // Map backend steps to frontend steps format
    const formattedSteps = (data.steps || []).map((s, idx) => {
      let actionName = s.action || null;
      let actionArgs = null;

      if (s.action && typeof s.action === 'string') {
        const match = s.action.match(/^(\w+)(?:\[(.*)\])?$/);
        if (match) {
          actionName = match[1];
          actionArgs = match[2] || s.action;
        }
      }

      return {
        stepNumber: s.step || idx + 1,
        thought: s.thought || '',
        action: actionName,
        actionArgs: actionArgs,
        observation: s.observation || ''
      };
    });

    // Check if observations contained structured house listings or booking results
    let propertiesResult = null;
    let bookingResult = null;

    // Extract property search results or booking results from backend observations if present
    let extractedProperties = [];

    for (const step of data.steps || []) {
      const obs = step.observation || '';
      
      // 1. Trích xuất kết quả đặt lịch xem nhà từ contact_sales
      if (typeof obs === 'string' && (obs.includes('"booking_id"') || obs.includes('BK-') || obs.includes('XÁC NHẬN ĐẶT LỊCH'))) {
        try {
          const parsedBooking = JSON.parse(obs);
          if (parsedBooking.booking_id || parsedBooking.status === "SUCCESS" || parsedBooking.status === "BOOKED") {
            bookingResult = {
              status: "BOOKED",
              booking_id: parsedBooking.booking_id || `BK-${Math.floor(100000 + Math.random() * 900000)}`,
              customer_name: parsedBooking.customer_name || "Khách hàng",
              customer_phone: parsedBooking.customer_phone || "Chưa cung cấp",
              scheduled_time: parsedBooking.appointment_date || parsedBooking.scheduled_time || "15:00 29/07/2026",
              property: {
                id: parsedBooking.property_id || "AP-102",
                title: parsedBooking.property_id || "Căn hộ đã chọn",
                address: "Địa chỉ theo tin đăng",
                salesName: parsedBooking.sales_contact || "Chuyên viên tư vấn",
                salesPhone: parsedBooking.customer_phone || "0988.123.456"
              },
              message: parsedBooking.message || "Đã đặt lịch hẹn xem nhà thành công!"
            };
          }
        } catch (e) {
          // Ignore raw text observations
        }
      }

      // 2. Trích xuất danh sách bất động sản từ find_houses / crawl_web
      if (typeof obs === 'string' && (obs.includes('"Tiêu đề"') || obs.includes('"listings"') || obs.includes('"title"'))) {
        try {
          const parsed = JSON.parse(obs);
          const rawListings = Array.isArray(parsed) ? parsed : (parsed.listings || []);
          if (rawListings.length > 0) {
            const mapped = rawListings.map((item, i) => {
              const rawPrice = item["Giá"] || item.price || "Thỏa thuận";
              let cleanPrice = String(rawPrice).trim();

              const title = item["Tiêu đề"] || item.title || "Tin đăng bất động sản";
              const address = item["Địa chỉ"] || item.address || "Địa chỉ cập nhật";
              const rawUrl = item["Link chi tiết"] || item.url || item.item_link;
              const numericId = String(item.ad_id || item.list_id || item.id || '').replace(/[^0-9]/g, '');
              const detailUrl = (rawUrl && rawUrl.startsWith('http')) ? rawUrl : (numericId ? `https://www.nhatot.com/${numericId}.htm` : "https://www.nhatot.com");
              const images = item.images || [];

              const propCode = item["Mã BĐS"] || (numericId ? `AP-${numericId}` : `AP-${i+101}`);

              return {
                id: propCode,
                propertyCode: propCode,
                title: title,
                address: address,
                price: cleanPrice,
                area: item["Danh mục"] || item.size || "35m²",
                bedrooms: item.rooms || 1,
                rating: 4.8,
                image: (images && images.length > 0) ? images[0] : MOCK_PROPERTIES[i % MOCK_PROPERTIES.length].image,
                amenities: item.toilets ? [`${item.toilets} WC`, "Ban công", "Máy giặt"] : ["Máy lạnh", "Ban công", "Bãi xe"],
                salesName: item.seller || "Chuyên viên tư vấn",
                salesPhone: item.phone || "0988.123.456",
                url: detailUrl
              };
            });
            extractedProperties = [...extractedProperties, ...mapped];
          }
        } catch (e) {
          // Ignore non-JSON observation strings
        }
      }
    }

    // Deduplicate extracted properties by title
    if (extractedProperties.length > 0) {
      const seenTitles = new Set();
      propertiesResult = extractedProperties.filter(p => {
        if (seenTitles.has(p.title)) return false;
        seenTitles.add(p.title);
        return true;
      });
    }

    return {
      mode: 'react',
      query: data.user_query || query,
      provider: data.provider || providerName,
      steps: formattedSteps,
      finalAnswer: data.final_answer || 'Hoàn thành tác vụ.',
      propertiesResult,
      bookingResult,
      guardrailTriggered: Boolean(data.guardrail_triggered),
      iterations: data.steps_count || formattedSteps.length,
      executionTimeMs: Math.round(endTime - startTime)
    };
  } catch (err) {
    console.warn('Fallback to mock for ReAct agent:', err.message);
    return await processMockQuery(query, 'react');
  }
}

/**
 * Fetch test cases from Backend (/api/test-cases)
 */
export async function fetchTestCases() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/test-cases`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    if (response.ok) {
      const data = await response.json();
      if (data.test_cases && data.test_cases.length > 0) {
        return data.test_cases.map(tc => ({
          ...tc,
          expected_behavior: tc.expected_behavior || 'Xử lý câu hỏi đúng yêu cầu',
          badgeColor: tc.category?.includes('🟢') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      tc.category?.includes('🟡') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-rose-50 text-rose-700 border-rose-200'
        }));
      }
    }
  } catch (err) {
    console.warn('Using local test cases fallback:', err.message);
  }
  return LOCAL_TEST_CASES;
}

/**
 * Fetch registered tools list from Backend (/api/tools)
 */
export async function fetchToolsList() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tools`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000)
    });
    if (response.ok) {
      const data = await response.json();
      return data.tools || {};
    }
  } catch (err) {
    console.warn('Failed to fetch backend tools:', err.message);
  }
  return {};
}
