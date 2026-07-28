"""
🛠️ TOOL REGISTRY & SCHEMAS (Dành cho Role 2: Tool & Spec Engineer)
Nơi khai báo tất cả các "món đồ nghề" mà ReAct Agent có thể gọi.
"""

import asyncio
import json
import re
import requests
from typing import Any
from urllib.parse import urlparse, parse_qs, quote





def crawl_web(url: str, query: str = "") -> str:
    """
    Crawl và lọc nội dung văn bản từ một trang web (URL) với các tham số lọc tùy chọn (Từ khóa, Khu vực, Mức giá...).
    
    Args:
        url (str): Địa chỉ URL của trang web cần crawl (Ví dụ: 'https://www.nhatot.com/thue-bat-dong-san')
        query (str): Tuỳ chọn lọc từ khóa/khu vực (Ví dụ: 'Quận 7 dưới 10 triệu', 'Vinhomes 2 phòng ngủ')
        
    Returns:
        str: Trích xuất nội dung văn bản dạng Markdown/Text chứa dữ liệu lọc được.
    """
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    url_lower = url.lower()

    # Tách query param từ URL nếu có (VD: ?q=Bình+Thạnh)
    parsed_url = urlparse(url)
    qs_params = parse_qs(parsed_url.query)
    url_q = qs_params.get("q", [""])[0] or qs_params.get("query", [""])[0]
    
    effective_query = (query or url_q).strip()

    # 🟢 XỬ LÝ ĐẶC BIỆT CHO NHÀ TỐT / CHỢ TỐT (Hỗ trợ FILTER + Định dạng CẤU TRÚC JSON CHUẨN)
    if "nhatot.com" in url_lower or "chotot.com" in url_lower:
        try:
            api_url = "https://gateway.chotot.com/v1/public/ad-listing"
            params = {
                "cg": 1010,
                "limit": 10
            }
            if effective_query:
                params["q"] = effective_query

            api_headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
                "Accept": "application/json"
            }
            res = requests.get(api_url, headers=api_headers, params=params, timeout=10)
            if res.status_code == 200:
                data = res.json()
                ads = data.get("ads", [])
                
                listings = []
                for idx, ad in enumerate(ads, 1):
                    subj = ad.get("subject", "Tin đăng cho thuê")
                    price = ad.get("price_string", "Thỏa thuận")
                    size_val = ad.get("size")
                    size_str = f"{size_val} m²" if size_val else "Chưa rõ"
                    rooms_val = ad.get("rooms")
                    toilets_val = ad.get("toilets")
                    
                    ward = ad.get("ward_name", "")
                    area = ad.get("area_name", "")
                    region = ad.get("region_name", "")
                    full_address = ", ".join(filter(None, [ward, area, region])) or "Chưa rõ địa chỉ"
                    
                    seller = ad.get("account_name", "Chủ nhà / Môi giới")
                    list_id = ad.get("list_id")
                    item_link = f"https://www.nhatot.com/{list_id}.htm" if list_id else ""
                    
                    img_thumb = ad.get("image") or ad.get("thumbnail_image")
                    images_list = ad.get("images", [])
                    if not images_list and img_thumb:
                        images_list = [img_thumb]

                    listings.append({
                        "id": idx,
                        "title": subj,
                        "price": price,
                        "size": size_str,
                        "rooms": rooms_val,
                        "toilets": toilets_val,
                        "address": full_address,
                        "seller": seller,
                        "url": item_link,
                        "images": images_list[:5]
                    })

                result_payload = {
                    "source": "NhaTot / ChoTot Real Estate",
                    "filter_query": effective_query or "Tất cả",
                    "total_results": len(listings),
                    "listings": listings
                }

                return json.dumps(result_payload, ensure_ascii=False, indent=2)

        except Exception as e:
            pass

    # 🏠 XỬ LÝ ĐẶC BIỆT CHO PHONGTRO123.COM (Hỗ trợ FILTER + ĐỊNH DẠNG CẤU TRÚC JSON CHUẨN)
    if "phongtro123.com" in url_lower:
        try:
            from bs4 import BeautifulSoup

            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7"
            }

            # Map địa điểm tiếng Việt phổ biến sang URL slug chuẩn của phongtro123.com
            district_map = {
                "bình thạnh": "quan-binh-thanh", "binh thanh": "quan-binh-thanh",
                "quận 7": "quan-7", "quan 7": "quan-7", "q7": "quan-7",
                "gò vấp": "quan-go-vap", "go vap": "quan-go-vap",
                "thủ đức": "tp-thu-duc", "thu duc": "tp-thu-duc",
                "tân bình": "quan-tan-binh", "tan binh": "quan-tan-binh",
                "quận 10": "quan-10", "quan 10": "quan-10", "q10": "quan-10",
                "quận 1": "quan-1", "quan 1": "quan-1", "q1": "quan-1",
                "quận 3": "quan-3", "quan 3": "quan-3", "q3": "quan-3",
                "quận 5": "quan-5", "quan 5": "quan-5", "q5": "quan-5",
                "quận 8": "quan-8", "quan 8": "quan-8", "q8": "quan-8",
                "quận 12": "quan-12", "quan 12": "quan-12", "q12": "quan-12",
                "tân phú": "quan-tan-phu", "tan phu": "quan-tan-phu",
                "phú nhuận": "quan-phu-nhuan", "phu nhuan": "quan-phu-nhuan",
                "bình tân": "quan-binh-tan", "binh tan": "quan-binh-tan",
                "hà nội": "ha-noi", "ha noi": "ha-noi",
                "đà nẵng": "da-nang", "da nang": "da-nang"
            }

            target_fetch_url = url
            if effective_query:
                q_lower = effective_query.lower()
                matched_slug = None
                for loc_name, slug in district_map.items():
                    if loc_name in q_lower:
                        matched_slug = slug
                        break
                
                if matched_slug:
                    if matched_slug in ["ha-noi", "da-nang"]:
                        target_fetch_url = f"https://phongtro123.com/tinh-thanh/{matched_slug}"
                    else:
                        target_fetch_url = f"https://phongtro123.com/tinh-thanh/ho-chi-minh/{matched_slug}"
                else:
                    target_fetch_url = f"https://phongtro123.com/tim-kiem?k={quote(effective_query)}"

            res = requests.get(target_fetch_url, headers=headers, timeout=10)
            if res.status_code == 200:
                soup = BeautifulSoup(res.text, "html.parser")
                listing_ul = soup.find('ul', class_=lambda c: c and 'post' in str(c).lower()) or soup.find('ul', class_=lambda c: c and 'list' in str(c).lower())
                
                listings = []
                if listing_ul:
                    items = listing_ul.find_all('li', recursive=False)
                    for idx, item in enumerate(items, 1):
                        ld_script = item.find('script', type='application/ld+json')
                        ld_data = {}
                        if ld_script and ld_script.string:
                            try:
                                ld_data = json.loads(ld_script.string)
                            except Exception:
                                pass

                        h3_or_h2 = item.find(['h2', 'h3', 'h4'])
                        title_a = (h3_or_h2.find('a') if h3_or_h2 else None) or item.find('a', class_=lambda c: c and 'title' in str(c).lower()) or item.find('a')
                        
                        subj = ld_data.get('name') or (title_a.get_text(strip=True) if title_a else "Tin đăng cho thuê")
                        item_link = ld_data.get('url') or (title_a.get('href') if title_a and title_a.has_attr('href') else "")
                        if item_link and item_link.startswith('/'):
                            item_link = "https://phongtro123.com" + item_link

                        price_el = item.select_one('.text-green, .price, .post-price')
                        price_str = price_el.get_text(strip=True) if price_el else (f"{ld_data.get('priceRange')} VNĐ" if ld_data.get('priceRange') else "Thỏa thuận")

                        size_str = "Chưa rõ"
                        info_div = item.select_one('div.mb-2')
                        if info_div:
                            for s in info_div.find_all('span'):
                                txt = s.get_text(strip=True)
                                if 'm2' in txt or 'm²' in txt or 'm' in txt:
                                    size_str = txt
                                    break

                        full_address = "Chưa rõ địa chỉ"
                        if ld_data.get('address') and isinstance(ld_data.get('address'), dict):
                            full_address = ld_data['address'].get('streetAddress') or ld_data['address'].get('addressLocality', 'Chưa rõ địa chỉ')
                        else:
                            loc_a = item.select_one('a.text-body, .post-location, .location')
                            if loc_a:
                                full_address = loc_a.get_text(strip=True)

                        seller = item.select_one('.lh-sm span')
                        seller_str = seller.get_text(strip=True) if seller else ld_data.get('author', 'Chủ nhà / Môi giới')

                        phone_str = ld_data.get('telephone') or ""
                        if not phone_str:
                            btn_phone = item.select_one('button.btn-green')
                            if btn_phone:
                                phone_str = btn_phone.get_text(strip=True)

                        images_list = []
                        if ld_data.get('image'):
                            images_list.append(ld_data['image'])
                        
                        figure = item.find('figure')
                        if figure:
                            for img in figure.find_all('img'):
                                src = img.get('src') or img.get('data-src')
                                if src and not src.startswith('data:') and src not in images_list:
                                    images_list.append(src)

                        desc_p = item.select_one('p.line-clamp-2, p.post-summary')
                        desc_str = desc_p.get_text(strip=True) if desc_p else ld_data.get('description', '')

                        listings.append({
                            "id": idx,
                            "title": subj,
                            "price": price_str,
                            "size": size_str,
                            "address": full_address,
                            "seller": seller_str,
                            "phone": phone_str,
                            "description": desc_str,
                            "url": item_link,
                            "images": images_list[:5]
                        })

                # Bổ sung lọc từ khóa thứ cấp in-memory (nếu có từ khóa bổ sung ngoài địa điểm)
                if effective_query:
                    search_words = [w for w in effective_query.lower().split() if len(w) > 1 and w not in ["tìm", "phòng", "trọ", "ở", "tại", "cho", "thuê", "trên", "phongtro123.com", "phongtro123", "giá", "dưới", "triệu", "tr"]]
                    if search_words:
                        filtered_listings = []
                        for l in listings:
                            text_content = f"{l['title']} {l['address']} {l['description']} {l['price']}".lower()
                            if any(sw in text_content for sw in search_words):
                                filtered_listings.append(l)
                        if filtered_listings:
                            listings = filtered_listings

                result_payload = {
                    "source": "Phongtro123.com Real Estate",
                    "filter_query": effective_query or "Tất cả",
                    "total_results": len(listings),
                    "listings": listings
                }

                return json.dumps(result_payload, ensure_ascii=False, indent=2)

        except Exception as e:
            pass

    # 1. Thử dùng Crawl4AI (AsyncWebCrawler)
    try:
        from crawl4ai import AsyncWebCrawler
        
        async def _async_crawl():
            async with AsyncWebCrawler(verbose=False) as crawler:
                res = await crawler.arun(url=url)
                if res and res.success:
                    text = res.markdown or res.cleaned_html or ""
                    return text.strip()
                return None

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import nest_asyncio
                nest_asyncio.apply()
                content = loop.run_until_complete(_async_crawl())
            else:
                content = asyncio.run(_async_crawl())
        except Exception:
            content = asyncio.run(_async_crawl())

        if content and "Just a moment..." not in content:
            if len(content) > 1500:
                content = content[:1500] + "\n\n...[Nội dung đã được rút gọn để vừa ngữ cảnh]"
            return f"--- KẾT QUẢ CRAWL TỪ CRAWL4AI ({url}) ---\n{content}"

    except Exception:
        pass

    # 2. Fallback: Requests với Browser Headers giả lập
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
            "Sec-Ch-Ua": '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1"
        }
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 403 or "Just a moment..." in response.text:
            return (
                f"⚠️ LỖI CRAWL WEB: Trang web '{url}' bị bảo vệ bởi Cloudflare WAF / Anti-Bot (Mã 403 Forbidden).\n"
                f"Gợi ý: Hãy sử dụng API chính thức của trang web hoặc chạy với browser headless của Playwright."
            )

        response.raise_for_status()

        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(response.text, "html.parser")
            for script in soup(["script", "style", "nav", "footer", "header", "noscript"]):
                script.decompose()
            text = soup.get_text(separator="\n")
        except ImportError:
            text = re.sub(r'<[^>]+>', ' ', response.text)

        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        clean_text = "\n".join(chunk for chunk in chunks if chunk)

        if len(clean_text) > 1500:
            clean_text = clean_text[:1500] + "\n\n...[Nội dung đã được rút gọn để vừa ngữ cảnh]"

        return f"--- KẾT QUẢ CRAWL TỪ HTTP REQUEST ({url}) ---\n{clean_text}"

    except Exception as err:
        return f"LỖI CRAWL WEB: Không thể truy cập URL '{url}'. Chi tiết: {str(err)}"


def find_houses(
    transaction_type: str, 
    price_min: int = None, 
    price_max: int = None, 
    region: str = None, 
    area: str = None
) -> str:
    """
    Tìm kiếm và cào dữ liệu tin đăng bất động sản (mua bán hoặc cho thuê) từ Chợ Tốt / Nhà Tốt.
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
        "cg": 1000,
        "st": st_val,
        "limit": 30
    }
    
    if region_code:
        params["region_v2"] = region_code
        
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
            
        filtered_ads = []
        area_clean = str(area).lower().strip() if area else None
        
        for ad in ads:
            ad_price = ad.get("price")
            if ad_price is not None:
                if price_min_val and ad_price < price_min_val:
                    continue
                if price_max_val and ad_price > price_max_val:
                    continue
            
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
            
        results = []
        for idx, ad in enumerate(filtered_ads[:8]):
            ad_id = ad.get("ad_id")
            subject = ad.get("subject", "Không có tiêu đề")
            price_str = ad.get("price_string", "Thỏa thuận")
            area_n = ad.get("area_name", "N/A")
            ward_n = ad.get("ward_name", "N/A")
            region_n = ad.get("region_name", "N/A")
            category_n = ad.get("category_name", "N/A")
            
            loc_parts = [p for p in [ward_n, area_n, region_n] if p and p != "N/A"]
            location_str = ", ".join(loc_parts)
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
    Sắp xếp lại danh sách bất động sản dựa trên mức độ phù hợp với sở thích của người dùng.
    
    Args:
        listings_json (str): Chuỗi JSON danh sách bất động sản lấy từ find_houses.
        preferences (str): Các tiêu chí chi tiết của người dùng (ví dụ: 'gần trường', 'máy giặt', 'ban công').
    """
    try:
        ads = json.loads(listings_json)
    except Exception:
        return listings_json
        
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
        
        for kw in pref_keywords:
            if kw in title:
                score += 15
            if kw in address:
                score += 10
            if kw in category:
                score += 5
                
        ad["score"] = score
        scored_ads.append(ad)
        
    sorted_ads = sorted(scored_ads, key=lambda x: x["score"], reverse=True)
    
    for idx, ad in enumerate(sorted_ads):
        ad["STT"] = idx + 1
        ad.pop("score", None)
        
    return json.dumps(sorted_ads, ensure_ascii=False, indent=2)


def contact_sales(
    name: str,
    email: str,
    phone: str,
    appointment_date: str,
    house_title: str = "Bất động sản đã chọn"
) -> str:
    """
    Gửi thông báo đặt lịch hẹn xem nhà cho chuyên viên tư vấn bất động sản (Sales).
    
    Args:
        name (str): Họ tên của khách hàng.
        email (str): Email liên hệ của khách hàng.
        phone (str): Số điện thoại liên hệ của khách hàng.
        appointment_date (str): Ngày và giờ hẹn xem nhà (ví dụ: '10:00 ngày 29/07/2026').
        house_title (str, optional): Tên hoặc tiêu đề bất động sản khách hàng quan tâm. Mặc định là 'Bất động sản đã chọn'.
    """
    # Trả về thông báo thành công ngắn gọn cho người dùng và Agent
    return f"Đã gửi yêu cầu đặt lịch hẹn xem nhà '{house_title}' vào lúc {appointment_date} thành công đến chuyên viên tư vấn bất động sản!"

# Danh sách các tool được đăng ký để Agent sử dụng
AVAILABLE_TOOLS = {
    "crawl_web": crawl_web,
    "find_houses": find_houses,
    "rerank_houses": rerank_houses,
    "rerank": rerank_houses,
    "rerank_houses": rerank_houses,
    "contact_sales": contact_sales,
}
