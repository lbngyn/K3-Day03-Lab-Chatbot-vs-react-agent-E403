# 🏫 BÀI LAB 3: CHATBOT VS REACT AGENT - TỪ Ý TƯỞNG ĐẾN THỰC THI

---

### 💡 1. LỜI NÓI ĐẦU & NỀN TẢNG LÝ THUYẾT (4 CẤP ĐỘ AI HỘI THOẠI)

Bài Lab giúp bạn hiểu rõ sự tiến hóa qua 4 cấp độ của hệ thống AI:

| Cấp độ | Loại hệ thống | Đặc điểm chính | Sự xuất hiện trong Bài Lab |
| :---: | :--- | :--- | :--- |
| **Cấp 1** | **Rule-Based Bot** | Khớp từ khóa if/else cố định, không có LLM | *Minh họa lịch sử* |
| **Cấp 2** | **LLM Chatbot** | Dùng LLM sinh text mượt, nhưng không gọi được Tool | **Chatbot Baseline** (Phần thực hành 1) |
| **Cấp 3** | **Reactive Agent** | Suy luận `Thought -> Action -> Observation` & gọi Tool | **ReAct Agent Loop** (Trọng tâm Bài Lab) |
| **Cấp 4** | **Autonomous Agent** | Tự rã mục tiêu (Planning), tự đánh giá & có Memory | 🎁 **Phần Bonus Nâng cao (+10%)** |

* 🤖 **Chatbot thông thường (Cấp 2)**: Giống như một **chuyên gia lý thuyết** — chỉ trả lời dựa trên kiến thức tĩnh có sẵn trong LLM, không thể tra cứu số liệu thực tế hay tự thực hiện thao tác.
* 🧠 **ReAct Agent (Cấp 3)**: Giống như một **trợ lý thực hành** — vừa biết suy nghĩ (**Thought**), vừa biết chủ động dùng công cụ (**Action**) như phần mềm tra cứu/tính toán, và quan sát kết quả (**Observation**) để giải quyết các bài toán thực tế.

---

### 📂 2. CẤU TRÚC THƯ MỤC DỰ ÁN

```text
📁 Day-3-Lab-Chatbot-vs-react-agent-E402/
├── 📄 README.md                 <-- 📘 Tổng quan bài Lab & Thang điểm
├── 📄 .env.example              <-- 🔑 File mẫu API Key
├── 📄 requirements.txt          <-- 📦 Thư viện cần cài đặt
│
├── 📁 config/                   <-- 🛠️ CẤU HÌNH & DỮ LIỆU
│   └── 📄 test_cases.json       <-- 🟢 [Role 1] Bộ đề 20 Test Cases thử thách AI
│
├── 📁 src/                      <-- 💻 MÃ NGUỒN PYTHON (BOILERPLATE)
│   ├── 📄 tools.py              <-- 🛠️ [Role 2] Khai báo các công cụ (Tools)
│   ├── 📄 prompts.py            <-- 🧠 [Role 3] ReAct System Prompt & Guardrails
│   └── 📄 app.py                <-- 🚀 [Role 4] Core App ghép nối & chạy ReAct Loop
│
└── 📁 docs/                     <-- 📚 TÀI LIỆU HƯỚNG DẪN & BÁO CÁO
    ├── 📄 CODELAB.md            <-- 🎓 [LMS Format] Hướng dẫn thực hành từng bước Codelab
    ├── 📄 PHAN_CONG_CONG_VIEC.md <-- 📋 [BẮT ĐẦU TẠI ĐÂY] Sổ tay thực hành & Checklist 5 Roles
    ├── 📄 DANH_SACH_DE_TAI.md    <-- 💡 Danh sách 10 chủ đề gợi ý
    └── 📄 trace_eval.md          <-- 📊 [Role 5] Báo cáo Log Trace & Đánh giá Agentic Fit
```

---

### ⏱️ 3. LỘ TRÌNH THỰC HÀNH (4 MỐC / 150 PHÚT)

```mermaid
timeline
    title ⏱️ KỊCH BẢN THỰC HÀNH LAB 3 (Tổng thời lượng: 150 phút)
    Mốc 1 (20 phút) : Định hình & Đánh giá Agentic Fit : Chọn bài toán & Lập bảng chấm điểm Scoring Matrix
    Mốc 2 (30 phút) : Baseline Chatbot & Khai báo Tool : Dựng Chatbot gốc & Viết Tool Specs + 20 Test Cases
    Mốc 3 (60 phút) : ReAct Loop & Safeguards : Viết Prompt, lắp Agent, cài Phanh Guardrails & Chạy Test
    Mốc 4 (40 phút) : Tương tác liên nhóm & Hybrid Pattern : Cross-Audit (Tấn công/Phòng thủ) & Vẽ Flowchart
```

---

### 💯 4. CƠ CHẾ CHẤM ĐIỂM  (SCORING RUBRIC)

| Tiêu chí                                |  Trọng số  | Mô tả chi tiết                                                                                                             | Bằng chứng kiểm tra (Artifacts)                                        |
| :---------------------------------------- | :-----------: | :---------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------ |
| **1. Agentic Fit & Test Design**    | **20%** | Phân tích đúng 4 tiêu chí Agentic Fit cho chủ đề tự chọn. Bộ test cases đủ góc cạnh (đơn giản, multi-step, edge cases). | Bảng chấm điểm (`docs/trace_eval.md`) + `config/test_cases.json`. |
| **2. ReAct Implementation & Tools** | **30%** | Tool description rõ ràng. Vòng lặp ReAct chạy đúng chuẩn `Thought -> Action -> Observation`.                         | Code trong `src/tools.py` + `src/app.py`.                              |
| **3. Guardrails & Observability**   | **20%** | Bắt được lỗi loop, có max iterations (Guardrail). Trích xuất được ít nhất 1 Trace log hoàn chỉnh.                     | File `src/prompts.py` + Log trong `docs/trace_eval.md`.                |
| **4. Inter-group Attack & Defense** | **20%** | Phản biện tốt khi gọi ngẫu nhiên hoặc cử 1 bạn đi chấm chéo (+10đ). Agent chống đỡ tốt / fallback chuẩn (+10đ).        | Biên bản Cross-Audit / Trả lời phản biện.                             |
| **5. Hybrid Decision Flowchart**    | **10%** | Sơ đồ thể hiện rõ khi nào đi Chatbot path, khi nào đi ReAct Agent path.                                             | Sơ đồ Flowchart (`docs/hybrid_flowchart.mermaid`).                   |
| 🎁 **BONUS: Autonomous Agent**     | **+10%**| Thử nghiệm tính năng Planning (tự chia nhỏ mục tiêu) hoặc Memory cho Agent (Cấp 4).                                  | Demo code trong `src/app.py` hoặc giải trình trong report.           |

---

> 🚀 **BẮT ĐẦU LÀM BÀI**:
> Vui lòng mở sổ tay thực hành 👉 **[PHAN_CONG_CONG_VIEC.md](file:///c:/Users/Admin/Documents/VinUni/LabCoachVin/LabKeyCoach/Day-3-Lab-Chatbot-vs-react-agent-E402/docs/PHAN_CONG_CONG_VIEC.md)** để xem phân vai và checklist công việc cụ thể cho từng thành viên!

---

## 5. KIẾN TRÚC IMPLEMENTATION HIỆN TẠI

Đề tài nhóm lựa chọn là **Trợ Lý Tìm & Đặt Lịch Xem Nhà Trọ / Căn Hộ Cho Thuê**.

```text
config/test_cases.json (20 test case)
              |
              v
        src/app.py
          /     \
         v       v
Baseline Chatbot  ReAct Agent Loop
  (0 tool call)   Thought -> Action -> Observation
                         |
                         v
               AVAILABLE_TOOLS (src/tools.py)
               - crawl_web
               - find_houses
               - rerank_houses / rerank
               - contact_sales
                         |
                         v
                 logs/agent_chat.jsonl
```

### Luồng Baseline

Baseline gọi LLM đúng một lần với `CHATBOT_BASELINE_PROMPT`. Luồng này không đi qua `execute_tool()`, không có dữ liệu listing thời gian thực và không được tuyên bố đã hoàn tất liên hệ/đặt lịch.

### Luồng ReAct Agent

`execute_react_loop()` thực hiện tối đa `MAX_ITERATIONS = 4` bước:

1. LLM sinh `Thought` và `Action`.
2. `parse_action_call()` phân tích tên tool và tham số.
3. `execute_tool()` kiểm tra tool trong `AVAILABLE_TOOLS` và thực thi.
4. Kết quả thật được chèn vào prompt dưới dạng `Observation`.
5. Agent tiếp tục suy luận hoặc trả `Final Answer`.

Agent có conversation memory theo `session_id`; mỗi session giữ lịch sử user/assistant trong `MEMORY_STORE`.

---

## 6. CÁCH CÀI ĐẶT VÀ CHẠY

### Backend và CLI test runner

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python src/app.py
```

`python src/app.py` chạy toàn bộ 20 test case trên cả Baseline và ReAct, sau đó append trace vào:

```text
logs/agent_chat.jsonl
```

### FastAPI

```powershell
uvicorn src.app:app --reload --port 8000
```

API documentation: `http://localhost:8000/docs`

Các endpoint chính:

- `POST /api/chat/baseline`
- `POST /api/chat/react`
- `GET /api/chat/memory/{session_id}`
- `DELETE /api/chat/memory/{session_id}`
- `POST /api/crawl`
- `POST /api/search-houses`

### Frontend

```powershell
cd ui
npm install
npm run dev
```

Frontend: `http://localhost:5173`

Provider được chọn bằng `LLM_PROVIDER`. Các API key phải đặt trong `.env` và không được commit vào repository.

---

## 7. TRẠNG THÁI ARTIFACT DELIVERY

| Artifact | Trạng thái | Bằng chứng |
| :--- | :---: | :--- |
| `README.md` | Hoàn thành | Có kiến trúc, rubric, cách chạy và endpoint. |
| `docs/PHAN_CONG_CONG_VIEC.md` | Hoàn thành | Có 5 Roles, tên thành viên và checklist 4 mốc. |
| `docs/DANH_SACH_DE_TAI.md` | Hoàn thành | Có đủ 10 đề tài và đánh dấu đề tài nhóm chọn. |
| `docs/trace_eval.md` | Hoàn thành | Có Scoring Matrix, Baseline evaluation, ReAct trace, failed trace và guardrails. |
| `config/test_cases.json` | Hoàn thành | Có 20 test case từ search đến edge case. |
| `src/tools.py` | Hoàn thành theo scope hiện tại | Có docstring, error handling, logging và Tool Registry. |
| `src/prompts.py` | Hoàn thành | Có Baseline prompt, ReAct format và `MAX_ITERATIONS`. |
| `src/app.py` | Hoàn thành | Có parser, executor loop, API, memory, CLI runner và JSONL trace. |

Giới hạn đã biết được giữ minh bạch trong `docs/trace_eval.md`: một số test booking/email kiểm tra capability chưa có trong Tool Registry và được dùng làm failed trace/root-cause analysis.
