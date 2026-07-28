/**
 * Simulator function for ReAct Agent Execution & Rental House Search Engine
 */

export const MOCK_PROPERTIES = [
  {
    id: "AP-102",
    title: "Chung cư mini Studio Luxury Cầu Giấy",
    address: "123 Cầu Giấy, Quan Hoa, Cầu Giấy, Hà Nội",
    price: 7.5, // triệu/tháng
    area: "35m²",
    bedrooms: 1,
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80",
    amenities: ["Ban công riêng", "Thang máy", "Điều hòa Inverter", "Khóa vân tay"],
    salesName: "Nguyễn Văn Anh",
    salesPhone: "0988.123.456"
  },
  {
    id: "AP-205",
    title: "Căn hộ 1PN Full đồ Đống Đa - Ban công thoáng",
    address: "45 Chùa Bộc, Trung Tự, Đống Đa, Hà Nội",
    price: 6.8,
    area: "40m²",
    bedrooms: 1,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80",
    amenities: ["Máy giặt riêng", "Bãi xe máy rộng", "Bảo vệ 24/7", "Nóng lạnh"],
    salesName: "Trần Thị Mai",
    salesPhone: "0977.654.321"
  },
  {
    id: "AP-309",
    title: "Căn hộ Dịch vụ Bình Thạnh gần LandMark 81",
    address: "88 Điện Biên Phủ, Phường 15, Bình Thạnh, TP.HCM",
    price: 8.2,
    area: "45m²",
    bedrooms: 2,
    rating: 4.95,
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80",
    amenities: ["Hồ bơi tầng thượng", "Dọn phòng 2 lần/tuần", "Gym miễn phí"],
    salesName: "Lê Hoàng Nam",
    salesPhone: "0912.888.999"
  }
];

export function executeTool(toolName, args) {
  if (toolName === "find_houses") {
    const loc = (args.location || "").toLowerCase();
    const maxPrice = args.max_price || 99;

    const filtered = MOCK_PROPERTIES.filter(p => {
      const matchLoc = loc.length === 0 || p.address.toLowerCase().includes(loc) || p.title.toLowerCase().includes(loc);
      const matchPrice = p.price <= maxPrice;
      return matchLoc && matchPrice;
    });

    if (filtered.length > 0) {
      return {
        status: "SUCCESS",
        count: filtered.length,
        properties: filtered
      };
    } else {
      return {
        status: "EMPTY",
        count: 0,
        message: `Không tìm thấy căn hộ phù hợp tại khu vực '${args.location}' với mức giá dưới ${args.max_price || 'bất kỳ'} triệu.`
      };
    }
  }

  if (toolName === "rerank") {
    const props = args.properties || MOCK_PROPERTIES;
    const sorted = [...props].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return {
      status: "SUCCESS",
      reranked_count: sorted.length,
      top_matches: sorted
    };
  }

  if (toolName === "contact_sales") {
    const propId = args.property_id || "AP-102";
    const prop = MOCK_PROPERTIES.find(p => p.id === propId) || MOCK_PROPERTIES[0];
    
    return {
      status: "BOOKED",
      booking_id: `BK-${Math.floor(100000 + Math.random() * 900000)}`,
      property: prop,
      scheduled_time: args.preferred_time || "15:00 29/07/2026",
      sales_contact: `${prop.salesName} (${prop.salesPhone})`,
      message: `Đã ghi nhận yêu cầu đặt lịch hẹn xem nhà cho căn hộ ${prop.title} thành công!`
    };
  }

  if (toolName === "get_weather") {
    return "Thời tiết Hà Nội: 28°C, Nắng nhẹ, Độ ẩm 65%.";
  }

  return `Không thể thực hiện tác vụ kỹ thuật '${toolName}'.`;
}

export async function processQuery(query, mode = "react", maxIterations = 3) {
  const startTime = performance.now();
  const qLower = query.toLowerCase();

  // Baseline Chatbot Mode (User-facing clean text)
  if (mode === "baseline") {
    await new Promise(res => setTimeout(res, 400));
    let responseText = "";

    if (qLower.includes("phòng trọ") || qLower.includes("căn hộ") || qLower.includes("tìm nhà")) {
      responseText = "Dưới đây là một số thông tin tham khảo chung về phòng trọ. Để tìm kiếm căn hộ theo thời gian thực và đặt lịch xem nhà trực tiếp, bạn vui lòng chuyển sang chế độ ReAct Agent!";
    } else {
      responseText = `Xin chào! Tôi có thể hỗ trợ bạn tìm kiếm thông tin phòng trọ và căn hộ cho thuê.`;
    }

    const endTime = performance.now();
    return {
      mode: "baseline",
      query,
      steps: [],
      finalAnswer: responseText,
      propertiesResult: null,
      guardrailTriggered: false,
      iterations: 0,
      executionTimeMs: Math.round(endTime - startTime)
    };
  }

  // ReAct Agent Mode (Clean user-facing response)
  const steps = [];
  let propertiesResult = null;
  let bookingResult = null;
  let iterations = 0;
  let guardrailTriggered = false;
  let finalAnswer = "";

  if (qLower.includes("phòng trọ") || qLower.includes("căn hộ") || qLower.includes("tìm nhà") || qLower.includes("cầu giấy") || qLower.includes("đống đa")) {
    iterations = 2;
    await new Promise(res => setTimeout(res, 300));

    const location = qLower.includes("đống đa") ? "Đống Đa" : "Cầu Giấy";
    const findRes = executeTool("find_houses", { location, max_price: 8.0 });

    steps.push({
      stepNumber: 1,
      thought: `Khách hàng tìm nhà trọ tại khu vực ${location} với ngân sách dưới 8 triệu. Gọi find_houses.`,
      action: "find_houses",
      actionArgs: { location, max_price: 8.0 },
      observation: `Tìm thấy ${findRes.count || 0} căn hộ tại ${location}.`
    });

    await new Promise(res => setTimeout(res, 350));

    const rerankRes = executeTool("rerank", { properties: findRes.properties });
    steps.push({
      stepNumber: 2,
      thought: "Sắp xếp danh sách căn hộ theo điểm đánh giá cao nhất.",
      action: "rerank",
      actionArgs: { properties: findRes.properties },
      observation: `Đã xếp hạng top ${rerankRes.top_matches.length} căn hộ tốt nhất.`
    });

    propertiesResult = rerankRes.top_matches;
    finalAnswer = `Dưới đây là các căn hộ tốt nhất tại khu vực **${location}** phù hợp với yêu cầu của bạn. Bạn có thể bấm nút **[📅 Đặt Lịch Xem Nhà]** trực tiếp trên từng căn hộ bên dưới:`;

  } else if (qLower.includes("đặt lịch") || qLower.includes("xem nhà")) {
    iterations = 1;
    await new Promise(res => setTimeout(res, 400));
    
    bookingResult = executeTool("contact_sales", {
      property_id: "AP-102",
      preferred_time: "15:00 29/07/2026",
      customer_phone: "0988.123.456"
    });

    steps.push({
      stepNumber: 1,
      thought: "Ghi nhận thông tin đặt lịch hẹn xem nhà cho khách hàng.",
      action: "contact_sales",
      actionArgs: { property_id: "AP-102", preferred_time: "15:00 29/07/2026" },
      observation: bookingResult.message
    });

    finalAnswer = `✅ **XÁC NHẬN ĐẶT LỊCH XEM NHÀ THÀNH CÔNG!**\n- **Mã đặt lịch**: ${bookingResult.booking_id}\n- **Căn hộ**: ${bookingResult.property.title}\n- **Thời gian**: ${bookingResult.scheduled_time}\n- **Nhân viên hỗ trợ**: ${bookingResult.sales_contact}\n\nLịch hẹn đã được tự động lưu vào **Sổ Tay Lịch Hẹn** của bạn!`;
  } else {
    iterations = 1;
    await new Promise(res => setTimeout(res, 300));
    steps.push({
      stepNumber: 1,
      thought: "Trả lời chào mừng người dùng.",
      action: null,
      actionArgs: null,
      observation: null
    });
    finalAnswer = `Chào bạn! Tôi có thể giúp bạn tìm căn hộ cho thuê và đặt lịch xem nhà trực tiếp. Hãy thử nhắn: *"Tìm giúp tôi phòng trọ khu Cầu Giấy dưới 8 triệu"*`;
  }

  const endTime = performance.now();

  return {
    mode: "react",
    query,
    steps,
    finalAnswer,
    propertiesResult,
    bookingResult,
    guardrailTriggered,
    iterations,
    executionTimeMs: Math.round(endTime - startTime)
  };
}
