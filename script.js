// เปลี่ยน API_KEY เป็นคีย์ที่คุณได้จาก hadithapi.com
const HADITH_API_KEY = '$2y$10$Ig3V5LgHATTXyMo2s50kEg2lHABR3VGi6k0PT8DbWEoSYbAvL6';

document.getElementById('searchBtn').addEventListener('click', async () => {
    const source = document.getElementById('apiSource').value;
    const book = document.getElementById('bookSlug').value;
    const number = document.getElementById('hadithNumber').value;
    const displayArea = document.getElementById('displayArea');

    if (!number) return alert("โปรดใส่หมายเลขฮาดีส");

    displayArea.innerHTML = '<div style="text-align:center; padding:20px;">กำลังดึงข้อมูลฮาดีสและแปลภาษา...</div>';

    try {
        let hadithData = null;

        if (source === 'hadithapi-pages') {
            // 1. Logic for HadithAPI.pages.dev
            const mapping = {
                'sahih-bukhari': 'bukhari',
                'sahih-muslim': 'muslim',
                'al-tirmidhi': 'tirmidhi',
                'abu-dawood': 'abudawud',
                'ibn-e-majah': 'ibnmajah'
            };
            const mappedBook = mapping[book];

            if (!mappedBook) {
                displayArea.innerHTML = '<div class="error" style="color:red; text-align:center;">ขออภัย! แหล่งข้อมูล HadithAPI.pages.dev รองรับเฉพาะ<br> Bukhari, Muslim, Tirmidhi, Abu Dawood, และ Ibn Majah เท่านั้น<br>โปรดเลือกแหล่งข้อมูลเป็น HadithAPI.com สำหรับตำราชุดนี้</div>';
                return;
            }

            const targetUrl = `https://hadithapi.pages.dev/api/${mappedBook}/${number}`;
            let data = null;
            let errorMsg = "";

            // Helper function to try fetching
            const tryFetch = async (url) => {
                const r = await fetch(url);
                if (!r.ok) throw new Error(r.status);
                return await r.json();
            };

            // Strategy: Direct -> Proxy 1 -> Proxy 2 -> Proxy 3
            try {
                // 1. Direct (เผื่อ browser รองรับหรือเป็น same origin)
                data = await tryFetch(targetUrl);
            } catch (e1) {
                console.warn("Direct fetch failed/CORS:", e1);
                try {
                    // 2. CORSProxy.io
                    data = await tryFetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
                } catch (e2) {
                    console.warn("Proxy 1 failed:", e2);
                    try {
                        // 3. AllOrigins
                        data = await tryFetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`);
                    } catch (e3) {
                        console.warn("Proxy 2 failed:", e3);
                        try {
                            // 4. CodeTabs
                            data = await tryFetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`);
                        } catch (e4) {
                            console.error("All proxies failed");
                            errorMsg = e4.message; // Capture last error
                        }
                    }
                }
            }

            if (!data) {
                if (errorMsg === "404") {
                    displayArea.innerHTML = '<div class="error">ขออภัย! ไม่พบข้อมูลหมายเลขนี้ในแหล่งข้อมูลใหม่</div>';
                } else {
                    displayArea.innerHTML = `<div class="error">ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้ (Error: ${errorMsg || "Connection Failed"})<br>โปรดลองเปลี่ยนแหล่งข้อมูลเป็น HadithAPI.com</div>`;
                }
                return;
            }

            if (data && data.hadith_english) {
                // Normalize data
                hadithData = {
                    book: { bookName: data.book || book },
                    hadithNumber: data.id,
                    status: 'Sahih',
                    hadithEnglish: data.hadith_english,
                    hadithArabic: data.hadith_arabic || data.hadith_english // Fallback to English
                };
            }

        } else if (source === 'fawazahmed') {
            // 3. Logic for FawazAhmed API (Github)
            const mapping = {
                'sahih-bukhari': 'bukhari',
                'sahih-muslim': 'muslim',
                'al-tirmidhi': 'tirmidhi',
                'abu-dawood': 'abudawud',
                'ibn-e-majah': 'ibnmajah',
                'sunan-nasai': 'nasai'
            };
            const mappedBook = mapping[book];

            if (!mappedBook) {
                displayArea.innerHTML = '<div class="error" style="color:red; text-align:center;">ขออภัย! แหล่งข้อมูล FawazAhmed รองรับเฉพาะ<br> Bukhari, Muslim, Tirmidhi, Abu Dawood, Ibn Majah และ Nasai เท่านั้น</div>';
                return;
            }

            const engUrl = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-${mappedBook}/${number}.json`;
            const araUrl = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-${mappedBook}/${number}.json`;

            // Helper to safe fetch
            const safeFetch = async (url) => {
                try {
                    const r = await fetch(url);
                    if (r.ok) return await r.json();
                } catch (e) { console.warn("Fetch failed:", url, e); }
                return null;
            };

            const [engData, araData] = await Promise.all([safeFetch(engUrl), safeFetch(araUrl)]);

            if (!engData && !araData) {
                displayArea.innerHTML = '<div class="error">ขออภัย! ไม่พบข้อมูลหมายเลขนี้ ในแหล่งข้อมูลนี้</div>';
                return;
            }

            const primary = engData || araData;

            if (primary && primary.hadiths && primary.hadiths[0]) {
                hadithData = {
                    book: { bookName: primary.metadata.name },
                    hadithNumber: primary.hadiths[0].hadithnumber,
                    status: 'Sahih', // Most are graded but simplistic view here
                    hadithEnglish: engData?.hadiths[0]?.text || "(ไม่พบคำแปลภาษาอังกฤษ)",
                    hadithArabic: araData?.hadiths[0]?.text || "ไม่พบข้อมูลภาษาอาหรับ"
                };
            }

        } else {
            // 2. Logic for HadithAPI.com (Original)
            const hRes = await fetch(`https://hadithapi.com/api/hadiths?apiKey=${HADITH_API_KEY}&book=${book}&hadithNumber=${number}`);
            const hData = await hRes.json();

            if (hData.status === 200 && hData.hadiths.data.length > 0) {
                hadithData = hData.hadiths.data[0];
            }
        }

        if (hadithData) {
            const enText = hadithData.hadithEnglish;
            // เรียกใช้ฟังก์ชันแปลภาษา
            const translatedThai = await translateToThai(enText);
            renderUI(hadithData, translatedThai);
        } else {
            displayArea.innerHTML = '<div class="error">ขออภัย! ไม่พบข้อมูลหมายเลขนี้</div>';
        }

    } catch (err) {
        console.error(err);
        displayArea.innerHTML = '<div class="error">เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message + '</div>';
    }
});

// ฟังก์ชันแปลภาษาใหม่โดยใช้ MyMemory API (เสถียรกว่าและฟรี)
// ฟังก์ชันแปลภาษาใหม่โดยใช้ Google Apps Script (ฟรีและไม่จำกัด)
async function translateToThai(text) {
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbzIAXuuLtnDl4-TqssXiqEbNzlR6q5Ff07Pwfr7TttxY0SG0nmSQKRJ5vSHzsORDWBv/exec';

    try {
        // ใช้โหมด POST เพื่อรองรับข้อความยาวๆ
        // ส่งเป็น text/plain เพื่อลดปัญหา CORS Preflight ในบางเบราว์เซอร์ แต่ข้างในเป็น JSON string
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                q: text,
                source: "en",
                target: "th"
            })
        });

        const data = await response.json();

        if (data.status === "success") {
            return data.translation;
        } else {
            console.error("Translation Error Details:", data);
            return "ไม่สามารถแปลได้: " + (data.message || "Unknown error");
        }
    } catch (e) {
        console.error("Translation Fetch Error:", e);
        return "เกิดข้อผิดพลาดในการแปล: " + e.message;
    }
}

//
// ... (ส่วนการค้นหาและแปลภาษา MyMemory เหมือนเดิม)
// ฟังก์ชันสำหรับคัดลอก (เพิ่ม Fallback สำหรับ Android/HTTP)
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        // ใช้ Clipboard API ปกติ
        navigator.clipboard.writeText(text).then(() => {
            showToast("คัดลอกสำเร็จ!");
        }).catch(err => {
            fallbackCopy(text);
        });
    } else {
        // ใช้วิธีสร้าง Element ชั่วคราว (Fallback สำหรับ HTTP/Android รุ่นเก่า)
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    // ป้องกันการ Scroll และซ่อนตัว
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        showToast("คัดลอกสำเร็จ! (Fallback)");
    } catch (err) {
        alert("ไม่สามารถคัดลอกได้ โปรดคัดลอกด้วยตนเอง");
    }
    document.body.removeChild(textArea);
}
//

function openGoogleTranslate(text) {
    // การใช้ /m จะเป็นการบังคับใช้ Mobile Web Interface 
    // ซึ่งมักจะเลี่ยงการเปิดแอปได้ดีกว่าใน Android 15
    const cleanText = text.trim().substring(0, 1500); // จำกัดความยาว
    const url = `https://translate.google.com/m?sl=en&tl=th&q=${encodeURIComponent(cleanText)}`;

    window.open(url, '_blank');
}


// ฟังก์ชันดึงข้อมูลและจัดการ UI (แก้ไขการส่งตัวแปร)
function renderUI(hadith, thaiText) {
    const displayArea = document.getElementById('displayArea');

    // ล้างข้อความพิเศษเพื่อไม่ให้ JavaScript Error
    const cleanEn = hadith.hadithEnglish.replace(/'/g, "\\'").replace(/"/g, '\\"');
    const cleanAr = hadith.hadithArabic.replace(/'/g, "\\'").replace(/"/g, '\\"');
    const cleanTh = thaiText.replace(/'/g, "\\'").replace(/"/g, '\\"');

    const googleTranslateUrl = `https://translate.google.com/?sl=en&tl=th&text=${encodeURIComponent(hadith.hadithEnglish)}&op=translate`;

    // สร้างเนื้อหาที่จะแชร์
    //const fullContent = `[Hadith] ${hadith.book.bookName} No. ${hadith.hadithNumber}\n\nArabic: ${hadith.hadithArabic}\n\nEnglish: ${hadith.hadithEnglish}\n\nแปลไทย: ${thaiText}`;
    const fullContent = `[Hadith] ${hadith.book.bookName}\nNo. ${hadith.hadithNumber} ● ${hadith.status}\n\nArabic: ${hadith.hadithArabic}\n\nแปลไทย: ${thaiText}`;

    // ส่วนาแสดงผลภาษาอาหรับ และอังกฤษ 
    // <div class="arabic-box" style="font-size:1.0rem;">${hadith.hadithArabic}</div>
    // <div class="english-box" style="background:#f9f9f9; padding:15px; border-radius:8px; margin-top:15px;">
    //             <p>${hadith.hadithEnglish}</p>
    // </div>

    displayArea.innerHTML = `
        <div class="hadith-card">

            <div style="margin-bottom:15px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span class="badge" style="background:#eee; padding:3px 8px; border-radius:4px; font-size:0.8rem; font-weight:bold;">
                        ${hadith.book.bookName}
                    </span>
                    <span class="badge" style="background:var(--accent); color:white; padding:3px 8px; border-radius:4px; font-size:0.8rem;">
                        No. ${hadith.hadithNumber}
                    </span>
                </div>
                <span style="font-size:0.8rem; color:${hadith.status === 'Sahih' ? '#27ae60' : '#e67e22'}; font-weight:bold;">
                    ● ${hadith.status}
                </span>
            </div>
            
            
            <div class="arabic-box" style="font-size:1.0rem;">${hadith.hadithArabic}</div>

            

            <div class="thai-box" style="border-left:4px solid #1a4d2e; background:#f0f7f2; margin-top:15px; padding:15px; border-radius:8px;">
                <span style="font-size:0.7rem; background:#1a4d2e; color:white; padding:2px 5px; border-radius:3px;">แปลไทยอัตโนมัติ</span>
                <p style="margin-top:10px;">${thaiText}</p>
                
                <div class="action-buttons" style="margin-top:10px;">
                    <button id="gtBtn" class="btn-secondary" style="width:100%; cursor:pointer;">
                        🌐 เปิดคำแปลใน Google Translate
                    </button>
                                    
                </div>
            </div>

            <div class="share-bar">
                <button class="btn-share btn-copy" id="copyBtn">📋 คัดลอกข้อความ</button>
                &nbsp; 
             </div>

              <center>
                <p style="margin-top:15px; color:#666; font-size:0.7rem; text-align:center">ข้อมูลฮาดีส: ${document.getElementById('apiSource').value === 'fawazahmed' ? 'FawazAhmed (Github)' : (document.getElementById('apiSource').value === 'hadithapi-pages' ? 'HadithAPI.pages.dev' : 'HadithAPI.com')} <br> แปลไทย: Google Translate (via Apps Script)</p>
              </center>
        </div>
    `;

    // ผูก Event สำหรับ Android โดยเฉพาะ
    document.getElementById('gtBtn').onclick = function () {
        // ส่งข้อความภาษาอังกฤษไปแปล
        openGoogleTranslate(hadith.hadithEnglish);
    };
    // ผูก Event แบบปลอดภัย
    document.getElementById('copyBtn').onclick = () => copyToClipboard(fullContent);
}


// ฟังก์ชันแสดง Notification เล็กๆ
function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}




















