"""
🚀 CORE AGENT & FASTAPI APP (Dành cho Role 4: Core Agent Developer)
File chính kết nối ReAct Agent, Tools, Prompts, Test Cases & FastAPI Web Server.
"""

import json
import os
import sys
from datetime import datetime
from dotenv import load_dotenv

# Đảm bảo import các module cùng thư mục src/ hoạt động mượt mà
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Đảm bảo in ra Tiếng Việt và Emojis không bị lỗi trên Windows Console
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# Import các thành phần từ file của Role 2, Role 3 & Multi-Provider Adapter
from tools import AVAILABLE_TOOLS, find_houses, rerank_houses, contact_sales
from prompts import CHATBOT_BASELINE_PROMPT, REACT_SYSTEM_PROMPT, MAX_ITERATIONS
from providers import get_llm_provider

load_dotenv()

# Khởi tạo FastAPI App
app = FastAPI(
    title="VinUni ReAct Agent & Web Crawler API",
    description="API Server cho Chatbot Baseline, ReAct Agent, Real-Estate Search và Web Crawling Tool (Crawl4AI)",
    version="1.0.0"
)

# Cấu hình CORS để cho phép Frontend/Client kết nối
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic Schemas cho API Requests
class ChatRequest(BaseModel):
    query: str = Field(..., example="Thời tiết ở Hà Nội hôm nay thế nào?")
    provider_name: Optional[str] = Field(None, example="mock", description="gemini, openai, anthropic, openrouter, hoặc mock")


class CrawlRequest(BaseModel):
    url: str = Field(..., example="https://www.nhatot.com/thue-bat-dong-san", description="URL của trang web cần crawl")
    query: Optional[str] = Field(None, example="Quận 7 dưới 10 triệu", description="Bộ lọc tìm kiếm từ khóa, khu vực, mức giá...")


class SearchHousesRequest(BaseModel):
    transaction_type: str = Field("thue", example="thue", description="mua hoặc thue")
    price_min: Optional[int] = Field(None, example=2000000)
    price_max: Optional[int] = Field(None, example=10000000)
    region: Optional[str] = Field(None, example="Hồ Chí Minh")
    area: Optional[str] = Field(None, example="Quận 3")


def load_test_cases():
    """Đọc bộ test cases từ config/test_cases.json của Role 1"""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    config_path = os.path.join(base_dir, "config", "test_cases.json")
    
    if not os.path.exists(config_path):
        config_path = "test_cases.json"
        
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_chat_log(user_query: str, agent_response: str, provider_name: str) -> str:
    """Lưu một lượt hội thoại vào file JSONL để sử dụng lâu dài."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    log_dir = os.path.join(base_dir, "logs")
    log_path = os.path.join(log_dir, "agent_chat.jsonl")
    os.makedirs(log_dir, exist_ok=True)

    log_entry = {
        "timestamp": datetime.now().astimezone().isoformat(timespec="seconds"),
        "provider": provider_name,
        "user_query": user_query,
        "agent_response": agent_response,
    }
    with open(log_path, "a", encoding="utf-8") as log_file:
        log_file.write(json.dumps(log_entry, ensure_ascii=False) + "\n")

    return log_path


def run_baseline_chatbot(user_query: str, provider):
    """
    Chatbot tư vấn bất động sản cơ bản, không sử dụng công cụ.
    """
    print(f"\n💬 [CHATBOT BASELINE] Câu hỏi: {user_query}")

    system_prompt = CHATBOT_BASELINE_PROMPT

    response = provider.generate(user_query, system_prompt=system_prompt)
    print(f"🤖 Chatbot trả lời:\n{response}")
    return response

    # Logic điều hướng ReAct Agent
    query_lower = user_query.lower()

    while step < MAX_ITERATIONS:
        step += 1
        current_step_info = {"step": step}

        if "crawl" in query_lower or "http" in query_lower or "trang web" in query_lower:
            # Tìm URL trong query
            urls = re.findall(r'https?://[^\s]+', user_query)
            target_url = urls[0] if urls else "https://example.com"

            if step == 1:
                thought = f"Người dùng muốn thông tin từ trang web {target_url}. Tôi sẽ gọi tool crawl_web."
                action = f"crawl_web['{target_url}']"
                obs = crawl_web(target_url)

                current_step_info.update({"thought": thought, "action": action, "observation": obs})
                steps.append(current_step_info)

            elif step == 2:
                thought = "Tôi đã thu thập được nội dung từ trang web. Tôi sẽ tóm tắt kết quả cho người dùng."
                prev_obs = steps[-1].get("observation", "")
                final_answer = f"Dưới đây là tóm tắt nội dung từ {target_url}:\n\n{prev_obs[:500]}..."

                current_step_info.update({"thought": thought, "final_answer": final_answer})
                steps.append(current_step_info)
                break

        elif "tìm nhà" in query_lower or "bất động sản" in query_lower or "mua nhà" in query_lower or "phongtro123" in query_lower or "phongtro" in query_lower or "phòng trọ" in query_lower or "nhà tốt" in query_lower or "nhatot" in query_lower:
            urls = re.findall(r'https?://[^\s]+', user_query)
            target_url = urls[0] if urls else ("https://phongtro123.com" if "phongtro" in query_lower or "phòng trọ" in query_lower else "https://www.nhatot.com/thue-bat-dong-san")

            if step == 1:
                if "chợ tốt" in query_lower or "chotot" in query_lower or "dưới" in query_lower or "từ" in query_lower:
                    thought = f"Người dùng muốn tìm kiếm bất động sản thời gian thực. Tôi sẽ sử dụng công cụ find_houses."
                    action = f"find_houses[transaction_type='thue', region='Hồ Chí Minh', area='Quận 3']"
                    obs = find_houses("thue", region="Hồ Chí Minh", area="Quận 3" if "quận 3" in query_lower else None)
                else:
                    thought = f"Người dùng muốn tìm kiếm phòng trọ/bất động sản từ {target_url}. Tôi sẽ gọi tool crawl_web với từ khóa tìm kiếm."
                    action = f"crawl_web['{target_url}', query='{user_query}']"
                    obs = crawl_web(target_url, query=user_query)

                current_step_info.update({"thought": thought, "action": action, "observation": obs})
                steps.append(current_step_info)

            elif step == 2:
                if "ưu tiên" in query_lower or "sắp xếp" in query_lower or "gần" in query_lower:
                    prev_obs = steps[-1].get("observation", "")
                    thought = "Tôi sẽ sắp xếp (rerank) lại danh sách bất động sản dựa trên ưu tiên người dùng."
                    action = f"rerank_houses[listings, preferences='gần trung tâm, máy lạnh']"
                    obs = rerank_houses(prev_obs, "gần trung tâm, máy lạnh")
                    current_step_info.update({"thought": thought, "action": action, "observation": obs})
                    steps.append(current_step_info)
                else:
                    thought = "Tôi đã thu thập được danh sách phòng trọ/bất động sản. Tôi sẽ tổng hợp kết quả gửi tới người dùng."
                    prev_obs = steps[-1].get("observation", "")
                    final_answer = f"Dưới đây là danh sách kết quả tìm kiếm phòng trọ/bất động sản:\n\n{prev_obs}"
                    current_step_info.update({"thought": thought, "final_answer": final_answer})
                    steps.append(current_step_info)
                    break

            elif step == 3:
                thought = "Tôi đã sắp xếp xong danh sách bất động sản. Tôi gửi kết quả cuối cùng cho người dùng."
                prev_obs = steps[-1].get("observation", "")
                final_answer = f"Dưới đây là danh sách bất động sản đã được sắp xếp theo tiêu chí ưu tiên:\n\n{prev_obs}"
                current_step_info.update({"thought": thought, "final_answer": final_answer})
                steps.append(current_step_info)
                break



        else:
            # Trường hợp hỏi đáp chung qua LLM Provider
            llm_prompt = f"{REACT_SYSTEM_PROMPT}\n\nUser Query: {user_query}"
            llm_res = provider.generate(llm_prompt)
            final_answer = llm_res
            steps.append({
                "step": step,
                "thought": "Xử lý câu hỏi trực tiếp qua LLM Provider.",
                "final_answer": final_answer
            })
            break

    if step >= MAX_ITERATIONS and not final_answer:
        guardrail_triggered = True
        final_answer = f"🛡️ GUARDRAIL TRIGGERED: Đã đạt giới hạn tối đa {MAX_ITERATIONS} bước ReAct lặp an toàn."

    return {
        "user_query": user_query,
        "provider": provider.__class__.__name__,
        "steps_count": step,
        "guardrail_triggered": guardrail_triggered,
        "steps": steps,
        "final_answer": final_answer
    }


# =====================================================================
# 🌐 FASTAPI ENDPOINTS
# =====================================================================

@app.get("/")
def read_root():
    """Trang chủ API & Thông tin hệ thống"""
    return {
        "status": "success",
        "message": "🏫 ĐẠI HỌC VINUNI - REACT AGENT & FASTAPI SERVER IS RUNNING!",
        "available_tools": list(AVAILABLE_TOOLS.keys()),
        "documentation": "/docs",
        "endpoints": {
            "get_tools": "GET /api/tools",
            "get_test_cases": "GET /api/test-cases",
            "chat_baseline": "POST /api/chat/baseline",
            "chat_react": "POST /api/chat/react",
            "crawl_web": "POST /api/crawl",
            "search_houses": "POST /api/search-houses"
        }
    }


@app.get("/api/tools")
def get_tools_list():
    """Lấy danh sách tất cả các Tools được đăng ký"""
    tools_info = {}
    for name, func in AVAILABLE_TOOLS.items():
        tools_info[name] = {
            "name": name,
            "description": func.__doc__.strip() if func.__doc__ else "No description"
        }
    return {"tools_count": len(tools_info), "tools": tools_info}


@app.get("/api/test-cases")
def get_test_cases_api():
    """Lấy bộ test cases từ config/test_cases.json"""
    try:
        cases = load_test_cases()
        return {"test_cases_count": len(cases), "test_cases": cases}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/baseline")
def chat_baseline_endpoint(req: ChatRequest):
    """Gọi Chatbot Baseline không dùng Tools"""
    try:
        provider = get_llm_provider(req.provider_name)
        response = provider.generate(req.query, system_prompt=CHATBOT_BASELINE_PROMPT)
        return {
            "mode": "baseline_chatbot",
            "user_query": req.query,
            "provider": provider.__class__.__name__,
            "response": response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/react")
def chat_react_endpoint(req: ChatRequest):
    """Gọi ReAct Agent với chuỗi suy luận Thought -> Action -> Observation"""
    try:
        provider = get_llm_provider(req.provider_name)
        result = execute_react_loop(req.query, provider)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/crawl")
def crawl_web_endpoint(req: CrawlRequest):
    """Gọi trực tiếp công cụ Crawl Web với bộ lọc tùy chọn (Crawl4AI / Requests)"""
    try:
        result = crawl_web(req.url, query=req.query or "")
        return {
            "url": req.url,
            "filter_query": req.query,
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/search-houses")
def search_houses_endpoint(req: SearchHousesRequest):
    """Gọi trực tiếp công cụ Tìm kiếm Bất động sản Chợ Tốt / Nhà Tốt (find_houses)"""
    try:
        result = find_houses(
            transaction_type=req.transaction_type,
            price_min=req.price_min,
            price_max=req.price_max,
            region=req.region,
            area=req.area
        )
        return {
            "status": "success",
            "params": req.dict(),
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================================
# 🚀 CLI MAIN RUNNER
# =====================================================================

if __name__ == "__main__":
    print("==================================================")
    print("🏫 ĐẠI HỌC VINUNI - BÀI LAB 3: REACT AGENT & FASTAPI")
    print("==================================================")
    
    # Khởi tạo Multi-Provider LLM Adapter (Đọc từ biến môi trường LLM_PROVIDER)
    provider = get_llm_provider()
    model_name = getattr(provider, "model_name", "Offline Mock Mode")
    print(f"🔌 LLM Provider đang hoạt động: {provider.__class__.__name__} (Model: {model_name})")
    
    tests = load_test_cases()
    print(f"✅ Đã tải thành công {len(tests)} Test Cases từ config/test_cases.json\n")
    
    # Chạy thử câu test số 3
    sample_query = tests[2]["question"]
    
    print("--- DEMO 1: CHẠY TRÊN CHATBOT BASELINE ---")
    agent_response = run_baseline_chatbot(sample_query, provider)
    log_path = save_chat_log(
        user_query=sample_query,
        agent_response=agent_response,
        provider_name=provider.__class__.__name__,
    )
    print(f"💾 Đã lưu kết quả vào: {log_path}")
    
    print("\n--- DEMO 2: CHẠY TRÊN REACT AGENT ---")
    # run_react_agent(sample_query, provider)

