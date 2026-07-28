import requests
import json
from typing import Any


def find_houses(
    transaction_type: str, 
    price_min: int = None, 
    price_max: int = None, 
    region: str = None, 
    area: str = None
) -> str:
    """
    Tìm kiếm và cào dữ liệu tin đăng bất động sản (mua bán hoặc cho thuê) từ Chợ Tốt / Nhà Tốt.
    
    Args:
        transaction_type (str): Nhu cầu giao dịch, nhận vào 'mua' (hoặc 'sale', 'ban') hoặc 'thue' (hoặc 'rent').
        price_min (int, optional): Giá tối thiểu bằng VND. Mặc định là None.
        price_max (int, optional): Giá tối đa bằng VND. Mặc định là None.
        region (str, optional): Tỉnh/Thành phố (ví dụ: "Hồ Chí Minh", "Hà Nội", "Đà Nẵng"). Mặc định là None.
        area (str, optional): Quận/Huyện/Khu vực cụ thể để lọc chi tiết (ví dụ: "Quận 3", "Cầu Giấy"). Mặc định là None.
    """
    url = "https://gateway.chotot.com/v1/public/ad-listing"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        "Referer": "https://www.chotot.com/"
    }
    
    # 1. Map transaction_type to st
    st_val = "s"
    t_type = str(transaction_type).lower().strip()
    if t_type in ["thue", "rent", "cho thue", "cho thuê", "thuê"]:
        st_val = "u"
    
    # 2. Map region name to region_v2 code
    region_map = {
        "hồ chí minh": 13000,
        "ho chi minh": 13000,
        "tphcm": 13000,
        "hcm": 13000,
        "sài gòn": 13000,
        "sai gon": 13000,
        "hà nội": 12000,
        "ha noi": 12000,
        "hn": 12000,
        "đà nẵng": 3000,
        "da nang": 3000,
        "cần thơ": 5027,
        "can tho": 5027,
        "bình dương": 1000,
        "binh duong": 1000,
        "đồng nai": 2000,
        "dong nai": 2000
    }
    
    region_code = None
    if region:
        reg_clean = str(region).lower().strip()
        region_code = region_map.get(reg_clean)
        
    # 3. Build query parameters
    params = {
        "cg": 1000, # Category 1000 is Real Estate (Bất động sản)
        "st": st_val,
        "limit": 30 # Fetch a reasonable batch size for post-filtering
    }
    
    if region_code:
        params["region_v2"] = region_code
        
    # Build price range param: price=min-max
    price_min_val = ""
    price_max_val = ""
    if price_min is not None:
        try:
            price_min_val = int(price_min)
        except ValueError:
            pass
            
    if price_max is not None:
        try:
            price_max_val = int(price_max)
        except ValueError:
            pass
            
    if price_min_val or price_max_val:
        params["price"] = f"{price_min_val}-{price_max_val}"
        
    try:
        response = requests.get(url, params=params, headers=headers, timeout=12)
        if response.status_code != 200:
            return f"LỖI: Không thể lấy dữ liệu từ Chợ Tốt (HTTP {response.status_code})"
            
        data = response.json()
        ads = data.get("ads", [])
        if not ads:
            return "Không tìm thấy bất động sản nào khớp với yêu cầu của bạn trên Chợ Tốt."
            
        # 4. Filter by area (district/ward name) on client side if provided
        filtered_ads = []
        area_clean = str(area).lower().strip() if area else None
        
        for ad in ads:
            ad_price = ad.get("price")
            if ad_price is not None:
                if price_min_val and ad_price < price_min_val:
                    continue
                if price_max_val and ad_price > price_max_val:
                    continue
            
            # Filter by area name
            if area_clean:
                area_name = str(ad.get("area_name", "")).lower()
                ward_name = str(ad.get("ward_name", "")).lower()
                subject = str(ad.get("subject", "")).lower()
                body = str(ad.get("body", "")).lower()
                if (area_clean not in area_name and 
                    area_clean not in ward_name and 
                    area_clean not in subject and 
                    area_clean not in body):
                    continue
                    
            filtered_ads.append(ad)
            
        if not filtered_ads:
            return f"Tìm thấy tin đăng chung nhưng không có tin nào khớp cụ thể với khu vực '{area}'."
            
        # 5. Format results (limit to top 8)
        results = []
        for idx, ad in enumerate(filtered_ads[:8]):
            ad_id = ad.get("ad_id")
            subject = ad.get("subject", "Không có tiêu đề")
            price_str = ad.get("price_string", "Thỏa thuận")
            area_n = ad.get("area_name", "N/A")
            ward_n = ad.get("ward_name", "N/A")
            region_n = ad.get("region_name", "N/A")
            category_n = ad.get("category_name", "N/A")
            
            # Format location string
            loc_parts = [p for p in [ward_n, area_n, region_n] if p and p != "N/A"]
            location_str = ", ".join(loc_parts)
            
            # Build detail url
            detail_url = f"https://www.nhatot.com/{ad_id}.htm"
            
            results.append({
                "STT": idx + 1,
                "Tiêu đề": subject,
                "Giá": price_str,
                "Danh mục": category_n,
                "Địa chỉ": location_str,
                "Link chi tiết": detail_url
            })
            
        return json.dumps(results, ensure_ascii=False, indent=2)
        
    except Exception as e:
        return f"LỖI: Gặp lỗi khi truy vấn dữ liệu bất động sản: {str(e)}"

def rerank_houses(listings_json: str, preferences: str) -> str:
    """
    Sắp xếp lại danh sách bất động sản dựa trên mức độ phù hợp với sở thích của người dùng.
    
    Args:
        listings_json (str): Chuỗi JSON danh sách bất động sản lấy từ find_houses.
        preferences (str): Các tiêu chí chi tiết của người dùng (ví dụ: 'gần trường', 'máy giặt', 'ban công').
    """
    try:
        ads = json.loads(listings_json)
    except Exception:
        return listings_json # Trả về danh sách cũ nếu không parse được JSON
        
    if not isinstance(ads, list):
        return listings_json
        
    pref_keywords = [k.strip().lower() for k in preferences.split(",") if k.strip()]
    if not pref_keywords:
        pref_keywords = [preferences.lower()]
        
    scored_ads = []
    for ad in ads:
        score = 0
        title = ad.get("Tiêu đề", "").lower()
        address = ad.get("Địa chỉ", "").lower()
        category = ad.get("Danh mục", "").lower()
        
        # Tính điểm tương thích dựa trên từ khóa ưu tiên
        for kw in pref_keywords:
            if kw in title:
                score += 15
            if kw in address:
                score += 10
            if kw in category:
                score += 5
                
        ad["score"] = score
        scored_ads.append(ad)
        
    # Sắp xếp giảm dần theo điểm score
    sorted_ads = sorted(scored_ads, key=lambda x: x["score"], reverse=True)
    
    # Cập nhật lại STT sau khi sắp xếp
    for idx, ad in enumerate(sorted_ads):
        ad["STT"] = idx + 1
        ad.pop("score", None) # Xóa trường score phụ trước khi trả về
        
    return json.dumps(sorted_ads, ensure_ascii=False, indent=2)

def contact_sales(
    property_id: str,
    **kwargs: Any
):
    pass

# Register all tools
AVAILABLE_TOOLS = {
    "find_houses": find_houses,
    "rerank": rerank_houses,
    "contact_sales": contact_sales,
}
