"""
🛠️ TOOL REGISTRY & SCHEMAS (Dành cho Role 2: Tool & Spec Engineer)
Nơi khai báo tất cả các "món đồ nghề" mà ReAct Agent có thể gọi.
"""

from typing import Any


def find_houses(
    location: str, **kwargs: Any): 
    pass

def rerank(
    properties: list[dict[str, Any]],
):
    pass


def contact_sales(
    property_id: str,
    **kwargs: Any
):
    pass

# Danh sách các tool được đăng ký để Agent sử dụng
AVAILABLE_TOOLS = {
    "find_houses": find_houses,
    "rerank": rerank,
    "contact_sales": contact_sales,
}
