# 📊 BÁO CÁO GIÁM SÁT & ĐÁNH GIÁ (OBSERVABILITY TRACE LOGS)
*Dành cho Role 5: Observability & Reviewer (Đề tài 10: Trợ Lý Tìm & Đặt Lịch Xem Nhà Trọ / Căn Hộ Cho Thuê)*

---

## 🎯 1. BẢNG CHẤM ĐIỂM AGENTIC FIT (SCORING MATRIX)

| Tiêu chí | Điểm (1-5) | Lý do đánh giá |
| :--- | :---: | :--- |
| 🧠 **Multi-step Reasoning** | `5/5` | Phân tích đa điều kiện (vị trí, ngân sách, tiện ích) -> Chọn phòng phù hợp -> Khớp lịch rảnh chủ nhà. |
| 🛠️ **Tool Interaction** | `5/5` | Cần tương tác API tìm kiếm danh sách phòng (`search_apartments`) và API đặt lịch (`book_viewing_slot`). |
| 🔀 **Dynamic Decision** | `5/5` | Nếu phòng bận lịch hoặc không thỏa mãn giá, Agent phải tự động chuyển sang chọn phương án/phòng khác. |
| ⏳ **Long Horizon** | `4/5` | Quy trình gồm 3-4 bước liên hoàn: Tìm phòng -> Kiểm tra lịch -> Chốt khung giờ -> Tạo mã hẹn. |
| **TỔNG ĐIỂM FIT** | **19/20** | **KẾT LUẬN: BÀI TOÁN RẤT NÊN DÙNG REACT AGENT!** |

---

## 🔍 2. SO SÁNH PHẢN HỒI (TEST CASE #3 - ĐẶT LỊCH XEM PHÒNG)

**Câu hỏi**: *"Tìm cho tôi phòng trọ gần Đại học Quốc Gia Hà Nội, giá dưới 4.5 triệu có điều hòa và đặt lịch xem vào chiều thứ 7 này."*

### 🤖 Chatbot Baseline:
* **Phản hồi**: *"Tôi là mô hình ngôn ngữ nên không có dữ liệu phòng trọ thực tế và cũng không thể tự đặt lịch xem nhà cho bạn được. Bạn hãy tra cứu trên các trang web bất động sản nhé!"*
* **Nhận xét**: An toàn nhưng bất lực trước các tác vụ đòi hỏi truy vấn dữ liệu động và thực thi hành động (action).

### 🧠 ReAct Agent:
* **Thought 1**: Người dùng muốn tìm phòng trọ gần ĐH Quốc Gia Hà Nội (Cầu Giấy), giá <= 4.5 triệu, có điều hòa và đặt lịch xem chiều T7. Cần tìm phòng trước.
* **Action 1**: `search_apartments(location="Cầu Giấy", max_price=4500000, amenities=["điều hòa"])`
* **Observation 1**: `Tìm thấy 2 kết quả: P101 (3.8M, Phố Trần Quốc Vượng, chủ nhà rảnh chiều T7 từ 14h-17h); P302 (4.2M, Đường Xuân Thủy, chủ nhà bận chiều T7).`
* **Thought 2**: Phòng P101 phù hợp tiêu chí và chủ nhà rảnh chiều T7. Cần gọi tool đặt lịch xem phòng P101 lúc 14:30 chiều T7.
* **Action 2**: `book_viewing_slot(apartment_id="P101", datetime="2026-08-01 14:30")`
* **Observation 2**: `Đặt lịch thành công cho phòng P101 vào 14:30 ngày 01/08/2026. Mã đặt lịch: RENT-8821.`
* **Thought 3**: Đã tìm được phòng và đặt lịch thành công, tổng hợp câu trả lời cho người dùng.
* **Final Answer**: *"Tôi đã tìm thấy phòng P101 tại phố Trần Quốc Vượng (gần ĐH Quốc Gia) giá 3.8 triệu/tháng có điều hòa. Tôi cũng đã đặt lịch xem phòng thành công vào lúc 14:30 chiều Thứ 7 này (Mã hẹn: RENT-8821)."*
* **Nhận xét**: Agent hoàn thành trọn vẹn quy trình nhờ suy luận đa bước kết hợp gọi công cụ tìm kiếm và đặt lịch.

