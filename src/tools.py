"""
🛠️ TOOL REGISTRY & SCHEMAS (Dành cho Role 2: Tool & Spec Engineer)
Nơi khai báo tất cả các món đồ nghề mà ReAct Agent có thể gọi.
"""

import asyncio
import json
import logging
import re
import sys
import time
import requests
from typing import Any, Dict, Optional, Tuple
from urllib.parse import urlparse, parse_qs, quote

# Đảm bảo in ra Tiếng Việt và Emojis không bị lỗi trên Windows Console
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Cấu hình Logger chuyên dụng cho Tool System
logger = logging.getLogger("ToolEngine")
logger.setLevel(logging.INFO)

if not logger.handlers:
    console_handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [TOOLS] %(message)s",
        datefmt="%H:%M:%S"
    )
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)


def resolve_location_and_transaction(transaction_type: str, region: str = None, area: str = None) -> Tuple[str, int, Optional[str]]:
    """
    Chuẩn hóa nhu cầu giao dịch (Thuê vs Bán) và tự động nhận diện Mã Tỉnh/Thành phố cùng Quận/Huyện trên toàn quốc.
    """
    # 1. Map transaction_type to st ('u' = Rent/Cho thuê, 's' = Sale/Mua bán)
    t_clean = str(transaction_type).lower().replace('_', ' ').replace('-', ' ').strip()
    st_val = "u" if any(w in t_clean for w in ["thue", "rent", "cho thue", "cho thuê", "thuê"]) else "s"

    # 2. Danh sách chuẩn hóa các Quận/Huyện trọng điểm
    hanoi_districts = [
        "thanh xuân", "cầu giấy", "đống đa", "ba đình", "hoàn kiếm", "hai bà trưng",
        "hoàng mai", "nam từ liêm", "bắc từ liêm", "hà đông", "tây hồ", "long biên",
        "thanh trì", "gia lâm", "hoài đức", "đông anh", "sóc sơn"
    ]
    hcm_districts = [
        "quận 1", "quận 3", "quận 4", "quận 5", "quận 6", "quận 7", "quận 8", "quận 9", "quận 10", "quận 11", "quận 12",
        "q1", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10", "q11", "q12",
        "bình thạnh", "gò vấp", "tân bình", "phú nhuận", "thủ đức", "bình tân", "tân phú", "bình chánh", "nhà bè", "hóc môn", "củ chi"
    ]
    danang_districts = [
        "hải châu", "thanh khê", "sơn trà", "ngũ hành sơn", "liên chiểu", "cẩm lệ", "hòa vàng"
    ]

    input_text = f"{region or ''} {area or ''}".lower().strip()
    
    region_code = None
    detected_area = area.strip() if area else None

    # Check Hà Nội (region_v2 = 12000)
    matched_hn = [d for d in hanoi_districts if d in input_text]
    if matched_hn or any(k in input_text for k in ["hà nội", "ha noi", "hn"]):
        region_code = 12000
        if not detected_area and matched_hn:
            detected_area = matched_hn[0]
            
    # Check Hồ Chí Minh (region_v2 = 13000)
    if not region_code:
        matched_hcm = [d for d in hcm_districts if d in input_text]
        if matched_hcm or any(k in input_text for k in ["hồ chí minh", "ho chi minh", "hcm", "sài gòn", "tphcm"]):
            region_code = 13000
            if not detected_area and matched_hcm:
                detected_area = matched_hcm[0]

    # Check Đà Nẵng (region_v2 = 3000)
    if not region_code:
        matched_dn = [d for d in danang_districts if d in input_text]
        if matched_dn or any(k in input_text for k in ["đà nẵng", "da nang"]):
            region_code = 3000
            if not detected_area and matched_dn:
                detected_area = matched_dn[0]

    # Default fallback to HCM (13000)
    if not region_code:
        region_code = 13000

    return st_val, region_code, detected_area


def crawl_web(url: str, query: str = "") -> str:
    """
    Crawl và lọc nội dung văn bản từ một trang web (URL) với các tham số lọc tùy chọn (Từ khóa, Khu vực, Mức giá...).
    """
    logger.info(f"🛠️ [TOOL CALL: crawl_web] Input URL='{url}', Query='{query}'")

    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    url_lower = url.lower()

    parsed_url = urlparse(url)
    qs_params = parse_qs(parsed_url.query)
    url_q = qs_params.get("q", [""])[0] or qs_params.get("query", [""])[0]
    
    effective_query = (query or url_q).strip()

    # 🟢 XỬ LÝ ĐẶC BIỆT CHO NHÀ TỐT / CHỢ TỐT
    if "nhatot.com" in url_lower or "chotot.com" in url_lower:
        logger.info(f"🌐 [crawl_web -> ChoTot API] Query filter: '{effective_query}'")
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
                    ad_id = ad.get("ad_id") or ad.get("list_id")
                    item_link = f"https://www.nhatot.com/{ad_id}.htm" if ad_id else ""
                    
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
                logger.info(f"✅ [ChoTot API Success] Formatted {len(listings)} listings.")
                return json.dumps(result_payload, ensure_ascii=False, indent=2)

        except Exception as e:
            logger.error(f"❌ [ChoTot API Exception]: {e}", exc_info=True)

    # 🏠 XỬ LÝ ĐẶC BIỆT CHO PHONGTRO123.COM
    if "phongtro123.com" in url_lower:
        logger.info(f"🏠 [crawl_web -> PhongTro123] Query: '{effective_query}'")
        try:
            from bs4 import BeautifulSoup

            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7"
            }

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
                "thanh xuân": "quan-thanh-xuan", "thanh xuan": "quan-thanh-xuan",
                "cầu giấy": "quan-cau-giay", "cau giay": "quan-cau-giay",
                "đống đa": "quan-dong-da", "dong da": "quan-dong-da",
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
                    elif matched_slug in ["quan-thanh-xuan", "quan-cau-giay", "quan-dong-da"]:
                        target_fetch_url = f"https://phongtro123.com/tinh-thanh/ha-noi/{matched_slug}"
                    else:
                        target_fetch_url = f"https://phongtro123.com/tinh-thanh/ho-chi-minh/{matched_slug}"
                else:
                    target_fetch_url = f"https://phongtro123.com/tim-kiem?k={quote(effective_query)}"

            logger.info(f"📡 [PhongTro123 Request] GET {target_fetch_url}")
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
                logger.info(f"✅ [PhongTro123 Success] Extracted {len(listings)} listings.")
                return json.dumps(result_payload, ensure_ascii=False, indent=2)

        except Exception as e:
            logger.error(f"❌ [PhongTro123 Exception]: {e}", exc_info=True)

    # 1. Crawl4AI Engine
    logger.info(f"🔄 [crawl_web -> Crawl4AI] Attempting AsyncWebCrawler on '{url}'")
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
            logger.info(f"✅ [Crawl4AI Success] Extracted {len(content)} characters.")
            if len(content) > 1500:
                content = content[:1500] + "\n\n...[Nội dung đã được rút gọn để vừa ngữ cảnh]"
            return f"--- KẾT QUẢ CRAWL TỪ CRAWL4AI ({url}) ---\n{content}"

    except Exception as e:
        logger.warning(f"⚠️ [Crawl4AI Skipped]: {e}")

    # 2. Requests Fallback
    logger.info(f"🔄 [crawl_web -> HTTP Fallback] GET '{url}'")
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7"
        }
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 403 or "Just a moment..." in response.text:
            logger.warning(f"⚠️ [HTTP Fallback WAF] Page '{url}' is Cloudflare protected (HTTP 403).")
            return f"⚠️ LỖI CRAWL WEB: Trang web '{url}' bị bảo vệ bởi Cloudflare WAF (Mã 403 Forbidden)."

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

        logger.info(f"✅ [HTTP Fallback Success] Extracted {len(clean_text)} characters.")
        return f"--- KẾT QUẢ CRAWL TỪ HTTP REQUEST ({url}) ---\n{clean_text}"

    except Exception as err:
        logger.error(f"❌ [HTTP Fallback Exception]: {err}", exc_info=True)
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
    """
    st_val, region_code, detected_area = resolve_location_and_transaction(transaction_type, region, area)
    
    logger.info(f"🛠️ [TOOL CALL: find_houses] st='{st_val}' ({'RENT' if st_val=='u' else 'SALE'}), region_code={region_code}, area='{detected_area}', price_range={price_min}-{price_max}")

    url = "https://gateway.chotot.com/v1/public/ad-listing"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        "Referer": "https://www.chotot.com/"
    }
    
    params = {
        "cg": 1000,
        "st": st_val,
        "limit": 30,
        "region_v2": region_code
    }
    
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

    logger.info(f"📡 [find_houses Request] GET {url} | Params: {params}")
        
    try:
        response = requests.get(url, params=params, headers=headers, timeout=12)
        logger.info(f"📥 [find_houses Response] HTTP Status: {response.status_code}")
        
        if response.status_code != 200:
            logger.error(f"❌ [find_houses Error] HTTP {response.status_code} from Chotot API")
            return f"LỖI: Không thể lấy dữ liệu từ Chợ Tốt (HTTP {response.status_code})"
            
        data = response.json()
        ads = data.get("ads", [])
        logger.info(f"📊 [find_houses] Received {len(ads)} raw ads from Chotot API. Applying client-side filters...")
        
        if not ads:
            logger.warning("⚠️ [find_houses] No ads returned from Chotot API.")
            return "Không tìm thấy bất động sản nào khớp với yêu cầu của bạn trên Chợ Tốt."
            
        filtered_ads = []
        area_clean = str(detected_area).lower().strip() if detected_area else None
        
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
                
                matched = False
                for target_str in [area_name, ward_name, subject, body]:
                    if area_clean in target_str:
                        matched = True
                        break
                if not matched:
                    continue
                    
            filtered_ads.append(ad)
            
        logger.info(f"✅ [find_houses Success] Matched {len(filtered_ads)} ads for area='{detected_area}'.")
        
        # Fallback nếu lọc quá chặt làm mất kết quả -> Trả về danh sách raw ads hàng đầu
        if not filtered_ads:
            logger.warning(f"⚠️ [find_houses Fallback] No exact match for area '{detected_area}'. Returning top general listings in region.")
            filtered_ads = ads
            
        results = []
        for idx, ad in enumerate(filtered_ads[:8]):
            ad_id = ad.get("ad_id") or ad.get("list_id")
            prop_code = f"AP-{ad_id}" if ad_id else f"AP-{idx+101}"
            subject = ad.get("subject", "Không có tiêu đề")
            price_str = ad.get("price_string", "Thỏa thuận")
            area_n = ad.get("area_name", "N/A")
            ward_n = ad.get("ward_name", "N/A")
            region_n = ad.get("region_name", "N/A")
            category_n = ad.get("category_name", "N/A")
            
            loc_parts = [p for p in [ward_n, area_n, region_n] if p and p != "N/A"]
            location_str = ", ".join(loc_parts)
            
            detail_url = f"https://www.nhatot.com/{ad_id}.htm" if ad_id else "https://www.nhatot.com"
            img_thumb = ad.get("image") or ad.get("thumbnail_image") or ad.get("webp_image")
            images_list = ad.get("images", [])
            if not images_list and img_thumb:
                images_list = [img_thumb]
            
            results.append({
                "STT": idx + 1,
                "Mã BĐS": prop_code,
                "ad_id": str(ad_id) if ad_id else "",
                "Tiêu đề": subject,
                "Giá": price_str,
                "Danh mục": category_n,
                "Địa chỉ": location_str,
                "Link chi tiết": detail_url,
                "url": detail_url,
                "images": images_list[:3]
            })
            
        return json.dumps(results, ensure_ascii=False, indent=2)
        
    except Exception as e:
        logger.error(f"❌ [find_houses Exception]: {e}", exc_info=True)
        return f"LỖI: Gặp lỗi khi truy vấn dữ liệu bất động sản: {str(e)}"


def rerank_houses(listings_json: str, preferences: str) -> str:
    """
    Sắp xếp lại danh sách bất động sản dựa trên mức độ phù hợp với sở thích của người dùng.
    """
    logger.info(f"🛠️ [TOOL CALL: rerank_houses] Preferences='{preferences}'")
    try:
        ads = json.loads(listings_json)
    except Exception as e:
        logger.error(f"❌ [rerank_houses Error] Input is not valid JSON: {e}")
        return listings_json
        
    if not isinstance(ads, list):
        logger.warning("⚠️ [rerank_houses Warning] Parsed JSON is not a list.")
        return listings_json
        
    pref_keywords = [k.strip().lower() for k in preferences.split(",") if k.strip()]
    if not pref_keywords:
        pref_keywords = [preferences.lower()]
        
    scored_ads = []
    for ad in ads:
        score = 0
        title = str(ad.get("Tiêu đề", ad.get("title", ""))).lower()
        address = str(ad.get("Địa chỉ", ad.get("address", ""))).lower()
        category = str(ad.get("Danh mục", ad.get("description", ""))).lower()
        
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
        
    logger.info(f"✅ [rerank_houses Success] Reranked {len(sorted_ads)} items using criteria: {pref_keywords}")
    return json.dumps(sorted_ads, ensure_ascii=False, indent=2)


def contact_sales(
    property_id: str = "Bất động sản đã chọn",
    customer_name: str = "Khách hàng",
    customer_phone: str = "Chưa cung cấp",
    appointment_date: str = "Thời gian thỏa thuận",
    **kwargs
) -> str:
    """
    Đặt lịch hẹn xem nhà cho khách hàng và trả về thông báo xác nhận đặt lịch thành công.
    Yêu cầu thông tin khách hàng: Tên (customer_name) và Số điện thoại (customer_phone).
    """
    name = kwargs.get("name") or customer_name
    phone = kwargs.get("phone") or customer_phone
    date = kwargs.get("preferred_time") or kwargs.get("date") or appointment_date
    prop = kwargs.get("house_title") or property_id

    booking_id = f"BK-{int(time.time()) % 899999 + 100000}"
    
    logger.info(f"🛠️ [TOOL CALL: contact_sales] BookingID='{booking_id}', Name='{name}', Phone='{phone}', Date='{date}', Property='{prop}'")
    
    result_data = {
        "status": "SUCCESS",
        "message": f"✅ XÁC NHẬN ĐẶT LỊCH XEM NHÀ THÀNH CÔNG cho khách hàng {name} ({phone})!",
        "booking_id": booking_id,
        "customer_name": name,
        "customer_phone": phone,
        "property_id": prop,
        "appointment_date": date,
        "sales_contact": "Chuyên viên tư vấn bất động sản",
        "note": "Thông tin đặt lịch đã được ghi nhận vào hệ thống. Tư vấn viên sẽ gọi xác nhận với bạn trước giờ hẹn."
    }
    
    logger.info(f"✅ [contact_sales Success] Appointment booked for customer '{name}' ({phone}).")
    return json.dumps(result_data, ensure_ascii=False, indent=2)


def execute_tool(tool_name: str, **kwargs) -> str:
    """
    Hàm điều phối thực thi tool an toàn với logging chi tiết từng bước và đo thời gian thực thi.
    """
    logger.info(f"⚡ [EXECUTE TOOL START] Tool Name: '{tool_name}' | Arguments: {kwargs}")
    
    if tool_name not in AVAILABLE_TOOLS:
        logger.error(f"❌ [EXECUTE TOOL ERROR] Tool '{tool_name}' is not registered! Available tools: {list(AVAILABLE_TOOLS.keys())}")
        return f"LỖI: Công cụ '{tool_name}' không tồn tại trong hệ thống. Các công cụ khả dụng: {list(AVAILABLE_TOOLS.keys())}"
    
    func = AVAILABLE_TOOLS[tool_name]
    start_time = time.time()
    try:
        result = func(**kwargs)
        elapsed = (time.time() - start_time) * 1000
        result_str = str(result)
        logger.info(f"🏁 [EXECUTE TOOL SUCCESS] Tool '{tool_name}' completed in {elapsed:.2f}ms. Output length: {len(result_str)} chars.")
        return result_str
    except Exception as e:
        elapsed = (time.time() - start_time) * 1000
        logger.error(f"❌ [EXECUTE TOOL EXCEPTION] Tool '{tool_name}' failed after {elapsed:.2f}ms: {e}", exc_info=True)
        return f"⚠️ LỖI KHI GỌI TOOL '{tool_name}': {str(e)}"


# Danh sách các tool được đăng ký để Agent sử dụng
AVAILABLE_TOOLS = {
    "crawl_web": crawl_web,
    "find_houses": find_houses,
    "rerank_houses": rerank_houses,
    "rerank": rerank_houses,
    "contact_sales": contact_sales,
}
