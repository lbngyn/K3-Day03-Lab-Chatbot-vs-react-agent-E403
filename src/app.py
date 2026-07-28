"""
🚀 CORE AGENT & FASTAPI APP (Dành cho Role 4: Core Agent Developer)
File chính kết nối ReAct Agent, Tools, Prompts, Test Cases & FastAPI Web Server.
"""

import json
import logging
import os
import sys
import re
from datetime import datetime

from typing import Optional, List, Dict, Any, Tuple
from dotenv import load_dotenv

# Đảm bảo import các module cùng thư mục src/ hoạt động mượt mà
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Đảm bảo in ra Tiếng Việt và Emojis không bị lỗi trên Windows Console
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Cấu hình Logger cho Core Agent FastAPI Server
logger = logging.getLogger("ReActAgentApp")
logger.setLevel(logging.INFO)

if not logger.handlers:
    console_handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [SERVER] %(message)s",
        datefmt="%H:%M:%S"
    )
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# Import các thành phần từ file của Role 2, Role 3 & Multi-Provider Adapter
from tools import AVAILABLE_TOOLS, execute_tool, crawl_web, find_houses, rerank_houses, contact_sales
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

# In-memory store quản lý Bộ Nhớ Ngữ Cảnh (Conversation Memory) theo session_id
MEMORY_STORE: Dict[str, List[Dict[str, str]]] = {}


# Pydantic Schemas cho API Requests
class ChatRequest(BaseModel):
    query: str = Field(..., example="Tìm phòng trọ ở Cầu Giấy dưới 8 triệu")
    provider_name: Optional[str] = Field(None, example="mock", description="gemini, openai, anthropic, openrouter, hoặc mock")
    session_id: Optional[str] = Field("default_session", description="Mã phiên hội thoại để lưu nhớ context")
    history: Optional[List[Dict[str, str]]] = Field(None, description="Danh sách lịch sử tin nhắn [{'role': 'user'|'assistant', 'content': '...'}]")


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


def parse_action_call(action_str: str) -> Tuple[Optional[str], Dict[str, Any]]:
    """
    Tách tên tool và dict tham số từ chuỗi Action dạng ReAct.
    Tự động làm sạch escaped quotes (\") và outer quotes nếu LLM sinh raAction: find_houses("...")
    """
    action_str = action_str.strip()
    match = re.search(r'([a-zA-Z0-9_]+)\s*[\[\(](.*?)[\]\)]', action_str, re.DOTALL)
    if not match:
        return None, {}
    
    tool_name = match.group(1).strip()
    raw_args = match.group(2).strip()
    
    # 1. Làm sạch escaped quotes (\") và (')
    raw_args = raw_args.replace('\\"', '"').replace("\\'", "'").strip()
    
    # 2. Tách bọc quotes ngoài nếu LLM truyền dạng find_houses("...")
    if (raw_args.startswith('"') and raw_args.endswith('"')) or (raw_args.startswith("'") and raw_args.endswith("'")):
        raw_args = raw_args[1:-1].strip()
    
    kwargs = {}
    if not raw_args:
        return tool_name, kwargs

    # Match key=value pairs
    kv_pairs = re.findall(r'([a-zA-Z0-9_]+)\s*=\s*(?:["\'](.*?)["\']|([^\s,]+))', raw_args)
    if kv_pairs:
        for k, v1, v2 in kv_pairs:
            val = v1 if v1 != '' else v2
            val_str = str(val).strip().lower()
            if val_str in ['null', 'none', 'undefined', '']:
                continue
            if str(val).isdigit():
                val = int(val)
            elif val_str == 'true':
                val = True
            elif val_str == 'false':
                val = False
            kwargs[k] = val
        return tool_name, kwargs

    # Match positional string arguments
    pos_args = re.findall(r'[\'"](.*?)[\'"]', raw_args)
    if pos_args:
        if tool_name == "crawl_web":
            kwargs["url"] = pos_args[0]
            if len(pos_args) > 1:
                kwargs["query"] = pos_args[1]
        elif tool_name == "get_weather":
            kwargs["location"] = pos_args[0]
        elif tool_name == "search_flights" and len(pos_args) >= 2:
            kwargs["origin"] = pos_args[0]
            kwargs["destination"] = pos_args[1]
        elif tool_name == "find_houses":
            kwargs["transaction_type"] = pos_args[0]
            if len(pos_args) > 1:
                kwargs["region"] = pos_args[1]
            if len(pos_args) > 2:
                kwargs["area"] = pos_args[2]
        elif tool_name in ["rerank", "rerank_houses"]:
            kwargs["listings_json"] = pos_args[0]
            if len(pos_args) > 1:
                kwargs["preferences"] = pos_args[1]
        elif tool_name == "contact_sales":
            if len(pos_args) >= 1:
                kwargs["property_id"] = pos_args[0]
            if len(pos_args) >= 2:
                kwargs["customer_name"] = pos_args[1]
            if len(pos_args) >= 3:
                kwargs["customer_phone"] = pos_args[2]
            if len(pos_args) >= 4:
                kwargs["appointment_date"] = pos_args[3]
        return tool_name, kwargs

    return tool_name, kwargs


def execute_react_loop(
    user_query: str, 
    provider, 
    history: Optional[List[Dict[str, str]]] = None,
    session_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Thực thi vòng lặp ReAct Agent kết hợp Bộ Nhớ Ngữ Cảnh (Conversation Memory).
    """
    sess_id = session_id or "default_session"
    logger.info(f"🚀 === [REACT LOOP INIT] User Query: '{user_query}' | Session: '{sess_id}' | Provider: {provider.__class__.__name__} ===")
    
    # 1. Thu thập Context lịch sử hội thoại trước đó
    past_context = ""
    combined_history = history
    if combined_history is None:
        combined_history = MEMORY_STORE.get(sess_id, [])

    if combined_history:
        past_context = "=== LỊCH SỬ HỘI THOẠI TRƯỚC ĐÓ ===\n"
        for msg in combined_history[-6:]:
            role_label = "User" if msg.get("role") in ["user", "human"] else "Assistant"
            content = msg.get("content", "")
            past_context += f"{role_label}: {content}\n"
        past_context += "=== KẾT THÚC LỊCH SỬ HỘI THOẠI ===\n\n"

    conversation_history = f"{past_context}CÂU HỎI MỚI NHẤT CỦA NGƯỜI DÙNG:\nUser Query: {user_query}\n"

    steps = []
    step = 0
    final_answer = ""
    guardrail_triggered = False

    while step < MAX_ITERATIONS:
        step += 1
        current_step_info = {"step": step}
        logger.info(f"🔄 --- [REACT STEP {step}/{MAX_ITERATIONS}] ---")

        llm_prompt = f"{REACT_SYSTEM_PROMPT}\n\n{conversation_history}"
        logger.info(f"🤖 [LLM Provider Execution] Invoking provider '{provider.__class__.__name__}'...")
        
        llm_res = provider.generate(llm_prompt)
        logger.info(f"💬 [LLM Raw Response Snippet]: {llm_res[:250]}...")

        # 1. Nếu LLM sinh ra Final Answer
        if "Final Answer:" in llm_res:
            final_answer = llm_res.split("Final Answer:")[-1].strip()
            thought_line = [line for line in llm_res.splitlines() if line.startswith("Thought:")]
            thought = thought_line[0].replace("Thought:", "").strip() if thought_line else "Tôi đã có đủ thông tin để tổng hợp kết quả."
            
            logger.info(f"🧠 [Thought]: {thought}")
            logger.info(f"🎯 [Final Answer]: {final_answer[:200]}...")
            
            current_step_info.update({"thought": thought, "final_answer": final_answer})
            steps.append(current_step_info)
            break

        # 2. Nếu LLM sinh ra Action
        elif "Action:" in llm_res:
            action_line = [line for line in llm_res.splitlines() if line.startswith("Action:")][0]
            action_str = action_line.replace("Action:", "").strip()
            thought_lines = [line for line in llm_res.splitlines() if line.startswith("Thought:")]
            thought = thought_lines[0].replace("Thought:", "").strip() if thought_lines else "LLM yêu cầu gọi công cụ."

            tool_name, kwargs = parse_action_call(action_str)
            logger.info(f"🧠 [Parsed Thought]: {thought}")
            logger.info(f"🎬 [Parsed Action]: Tool='{tool_name}', Kwargs={kwargs}")

            if tool_name and tool_name in AVAILABLE_TOOLS:
                obs = execute_tool(tool_name, **kwargs)
                logger.info(f"👁️ [Observation Result]: Retrieved {len(obs)} characters.")
                
                current_step_info.update({"thought": thought, "action": action_str, "observation": obs})
                steps.append(current_step_info)
                
                conversation_history += f"Thought: {thought}\nAction: {action_str}\nObservation:\n{obs[:2000]}\n"
            else:
                obs = f"Lỗi: Công cụ '{tool_name}' không tồn tại trong hệ thống."
                logger.error(f"❌ [Action Error]: {obs}")
                current_step_info.update({"thought": thought, "action": action_str, "observation": obs})
                steps.append(current_step_info)
                conversation_history += f"Thought: {thought}\nAction: {action_str}\nObservation: {obs}\n"

        else:
            final_answer = llm_res
            current_step_info.update({
                "thought": "Xử lý câu hỏi trực tiếp qua LLM Provider.",
                "final_answer": final_answer
            })
            steps.append(current_step_info)
            break

    if step >= MAX_ITERATIONS and not final_answer:
        guardrail_triggered = True
        logger.warning(f"🛡️ [GUARDRAIL TRIGGERED] Step count reached safe limit ({MAX_ITERATIONS}). Terminating loop.")
        final_answer = f"🛡️ GUARDRAIL TRIGGERED: Đã đạt giới hạn tối đa {MAX_ITERATIONS} bước ReAct lặp an toàn."

    # 2. Lưu câu hỏi & phản hồi vào Memory Store
    if sess_id not in MEMORY_STORE:
        MEMORY_STORE[sess_id] = []
    
    MEMORY_STORE[sess_id].append({"role": "user", "content": user_query})
    MEMORY_STORE[sess_id].append({"role": "assistant", "content": final_answer})

    logger.info(f"🏁 === [REACT LOOP COMPLETE] Total steps: {step} | Memory count for '{sess_id}': {len(MEMORY_STORE[sess_id])} msgs ===")
    
    return {
        "user_query": user_query,
        "session_id": sess_id,
        "provider": provider.__class__.__name__,
        "steps_count": step,
        "guardrail_triggered": guardrail_triggered,
        "steps": steps,
        "final_answer": final_answer,
        "history": MEMORY_STORE[sess_id]
    }


# =====================================================================
# 🌐 FASTAPI ENDPOINTS
# =====================================================================

@app.get("/")
def read_root():
    """Trang chủ API & Thông tin hệ thống"""
    logger.info("📡 [HTTP GET /] Root endpoint accessed.")
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
            "get_memory": "GET /api/chat/memory/{session_id}",
            "clear_memory": "DELETE /api/chat/memory/{session_id}",
            "crawl_web": "POST /api/crawl",
            "search_houses": "POST /api/search-houses"
        }
    }


@app.get("/api/tools")
def get_tools_list():
    """Lấy danh sách tất cả các Tools được đăng ký"""
    logger.info("📡 [HTTP GET /api/tools] Querying registered tools list.")
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
    logger.info("📡 [HTTP GET /api/test-cases] Reading test cases config.")
    try:
        cases = load_test_cases()
        return {"test_cases_count": len(cases), "test_cases": cases}
    except Exception as e:
        logger.error(f"❌ [HTTP GET /api/test-cases Error]: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/baseline")
def chat_baseline_endpoint(req: ChatRequest):
    """Gọi Chatbot Baseline không dùng Tools"""
    logger.info(f"📡 [HTTP POST /api/chat/baseline] Query: '{req.query}' | Provider: '{req.provider_name}'")
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
        logger.error(f"❌ [HTTP POST /api/chat/baseline Error]: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/react")
def chat_react_endpoint(req: ChatRequest):
    """Gọi ReAct Agent với chuỗi suy luận Thought -> Action -> Observation có lưu nhớ Context"""
    logger.info(f"📡 [HTTP POST /api/chat/react] Query: '{req.query}' | Session: '{req.session_id}' | Provider: '{req.provider_name}'")
    try:
        provider = get_llm_provider(req.provider_name)
        result = execute_react_loop(
            user_query=req.query,
            provider=provider,
            history=req.history,
            session_id=req.session_id
        )
        return result
    except Exception as e:
        logger.error(f"❌ [HTTP POST /api/chat/react Error]: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chat/memory/{session_id}")
def get_session_memory(session_id: str):
    """Lấy lịch sử hội thoại của 1 session"""
    history = MEMORY_STORE.get(session_id, [])
    return {"session_id": session_id, "messages_count": len(history), "history": history}


@app.delete("/api/chat/memory/{session_id}")
def clear_session_memory(session_id: str):
    """Xóa lịch sử bộ nhớ hội thoại của 1 session"""
    if session_id in MEMORY_STORE:
        del MEMORY_STORE[session_id]
    return {"status": "success", "message": f"Đã xóa bộ nhớ session '{session_id}'"}


@app.post("/api/crawl")
def crawl_web_endpoint(req: CrawlRequest):
    """Gọi trực tiếp công cụ Crawl Web với bộ lọc tùy chọn (Crawl4AI / Requests)"""
    logger.info(f"📡 [HTTP POST /api/crawl] URL: '{req.url}' | Filter query: '{req.query}'")
    try:
        result = execute_tool("crawl_web", url=req.url, query=req.query or "")
        return {
            "url": req.url,
            "filter_query": req.query,
            "result": result
        }
    except Exception as e:
        logger.error(f"❌ [HTTP POST /api/crawl Error]: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/search-houses")
def search_houses_endpoint(req: SearchHousesRequest):
    """Gọi trực tiếp công cụ Tìm kiếm Bất động sản Chợ Tốt / Nhà Tốt (find_houses)"""
    logger.info(f"📡 [HTTP POST /api/search-houses] Params: {req.dict()}")
    try:
        result = execute_tool(
            "find_houses",
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
        logger.error(f"❌ [HTTP POST /api/search-houses Error]: {e}", exc_info=True)
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

