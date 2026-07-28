export const REGISTERED_TOOLS = [
  {
    name: "find_houses",
    description: "Tìm kiếm danh sách căn hộ / nhà trọ cho thuê dựa theo vị trí và ngân sách.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "Khu vực hoặc quận/thành phố (Ví dụ: 'Cầu Giấy', 'Đống Đa', 'Bình Thạnh')"
        },
        max_price: {
          type: "number",
          description: "Mức giá tối đa (triệu VNĐ/tháng)"
        }
      },
      required: ["location"]
    },
    status: "Active",
    icon: "Home"
  },
  {
    name: "rerank",
    description: "Sắp xếp và phân loại danh sách căn hộ theo điểm phù hợp (Agentic Fit / Tiện ích / Giá).",
    parameters: {
      type: "object",
      properties: {
        properties: {
          type: "array",
          description: "Danh sách căn hộ cần xếp hạng"
        }
      },
      required: ["properties"]
    },
    status: "Active",
    icon: "Sliders"
  },
  {
    name: "contact_sales",
    description: "Gửi thông tin đặt lịch hẹn xem nhà cho nhân viên tư vấn bán hàng / chủ nhà.",
    parameters: {
      type: "object",
      properties: {
        property_id: {
          type: "string",
          description: "Mã định danh căn hộ (Ví dụ: 'AP-102')"
        },
        preferred_time: {
          type: "string",
          description: "Thời gian xem nhà (Ví dụ: '15:00 29/07/2026')"
        },
        customer_phone: {
          type: "string",
          description: "Số điện thoại liên hệ của khách hàng"
        }
      },
      required: ["property_id", "preferred_time"]
    },
    status: "Active",
    icon: "Calendar"
  }
];
