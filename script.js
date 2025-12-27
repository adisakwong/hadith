// เปลี่ยน API_KEY เป็นคีย์ที่คุณได้จาก hadithapi.com
const HADITH_API_KEY = '$2y$10$Ig3V5LgHATTXyMo2s50kEg2lHABR3VGi6k0PT8DbWEoSYbAvL6'; 

document.getElementById('searchBtn').addEventListener('click', async () => {
    const book = document.getElementById('bookSlug').value;
    const number = document.getElementById('hadithNumber').value;
    const displayArea = document.getElementById('displayArea');

    if (!number) return alert("โปรดใส่หมายเลขฮาดีส");

    displayArea.innerHTML = '<div style="text-align:center; padding:20px;">กำลังดึงข้อมูลฮาดีสและแปลภาษา...</div>';

    try {
        // 1. ดึงข้อมูลฮาดีสจาก HadithAPI
        const hRes = await fetch(`https://hadithapi.com/api/hadiths?apiKey=${HADITH_API_KEY}&book=${book}&hadithNumber=${number}`);
        const hData = await hRes.json();

        if (hData.status === 200 && hData.hadiths.data.length > 0) {
            const hadith = hData.hadiths.data[0];
            const enText = hadith.hadithEnglish;

            // 2. เรียกใช้ฟังก์ชันแปลภาษาใหม่ (MyMemory API)
            const translatedThai = await translateToThai(enText);

            renderUI(hadith, translatedThai);
        } else {
            displayArea.innerHTML = '<div class="error">ขออภัย! ไม่พบข้อมูลหมายเลขนี้</div>';
        }
    } catch (err) {
        displayArea.innerHTML = '<div class="error">เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message + '</div>';
    }
});

// ฟังก์ชันแปลภาษาใหม่โดยใช้ MyMemory API (เสถียรกว่าและฟรี)
async function translateToThai(text) {
    try {
        // จำกัดความยาวข้อความเพื่อความเสถียร (MyMemory รับได้ประมาณ 500-1000 ตัวอักษรต่อครั้ง)
        const cleanText = text.substring(0, 1000); 
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=en|th`);
        const data = await res.json();
        
        if(data.responseData && data.responseData.translatedText) {
            return data.responseData.translatedText;
        } else {
            return "ไม่สามารถแปลได้ในขณะนี้: " + data.responseDetails;
        }
    } catch (e) {
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

function openGoogleTranslate(text) {
    // 1. จัดการข้อความ: ตัดส่วนเกินและ Encode ให้ปลอดภัยที่สุด
    const cleanText = text.trim();
    
    // 2. ใช้ URL รูปแบบใหม่ที่ Mobile Browser รองรับได้เสถียรกว่า
    const baseUrl = "https://translate.google.com/";
    const params = `?sl=en&tl=th&text=${encodeURIComponent(cleanText)}&op=translate`;
    const finalUrl = baseUrl + params;

    // 3. บน Android บางครั้ง window.open แบบปกติจะถูก Popup Blocker บล็อก
    // เราจะใช้การสร้าง Anchor Element ชั่วคราวแล้วจำลองการคลิกแทน
    const a = document.createElement('a');
    a.href = finalUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
// ... (ส่วนการค้นหาและแปลภาษาเหมือนเดิม)

// ฟังก์ชันดึงข้อมูลและจัดการ UI (แก้ไขการส่งตัวแปร)
function renderUI(hadith, thaiText) {
    const displayArea = document.getElementById('displayArea');
    
    // ล้างข้อความพิเศษเพื่อไม่ให้ JavaScript Error
    const cleanEn = hadith.hadithEnglish.replace(/'/g, "\\'").replace(/"/g, '\\"');
    const cleanAr = hadith.hadithArabic.replace(/'/g, "\\'").replace(/"/g, '\\"');
    const cleanTh = thaiText.replace(/'/g, "\\'").replace(/"/g, '\\"');

    const googleTranslateUrl = `https://translate.google.com/?sl=en&tl=th&text=${encodeURIComponent(hadith.hadithEnglish)}&op=translate`;

    // สร้างเนื้อหาที่จะแชร์
    const fullContent = `[Hadith] ${hadith.book.bookName} No. ${hadith.hadithNumber}\n\nArabic: ${hadith.hadithArabic}\n\nEnglish: ${hadith.hadithEnglish}\n\nแปลไทย: ${thaiText}`;

    displayArea.innerHTML = `
        <div class="hadith-card">
            <div style="margin-bottom:15px; display:flex; justify-content:space-between;">
                <span class="badge" style="background:#eee; padding:3px 8px; border-radius:4px; font-size:0.8rem; font-weight:bold;">
                    ${hadith.book.bookName} No. ${hadith.hadithNumber}
                </span>
            </div>
            
            <div class="arabic-box" style="font-size:1.0rem;">${hadith.hadithArabic}</div>
            
            <div class="english-box" style="background:#f9f9f9; padding:15px; border-radius:8px; margin-top:15px;">
                <p>${hadith.hadithEnglish}</p>
            </div>

            <div class="thai-box" style="border-left:4px solid #1a4d2e; background:#f0f7f2; margin-top:15px; padding:15px; border-radius:8px;">
                <span style="font-size:0.7rem; background:#1a4d2e; color:white; padding:2px 5px; border-radius:3px;">แปลไทยอัตโนมัติ</span>
                <p style="margin-top:10px;">${thaiText}</p>
                
                <div class="action-buttons" style="margin-top:10px;">
                    <button id="gtBtn" class="btn-secondary" style="width:100%; cursor:pointer;">
                        🌐 เปิดใน Google Translate
                    </button>
                
                    // <button onclick="window.open('${googleTranslateUrl}', '_blank')" class="btn-secondary" style="cursor:pointer; width:100%; justify-content:center;">
                    //     🌐 เปิดใน Google Translate
                    // </button>
                    
                </div>
            </div>

            <div class="share-bar">
                <button class="btn-share btn-copy" id="copyBtn">📋 คัดลอกข้อความ</button>
                <button class="btn-share btn-line" id="lineBtn">LINE</button>
            </div>
        </div>
    `;

    // ผูก Event สำหรับ Android โดยเฉพาะ
    document.getElementById('gtBtn').onclick = function() {
        // ส่งข้อความภาษาอังกฤษไปแปล
        openGoogleTranslate(hadith.hadithEnglish);
    };
    // ผูก Event แบบปลอดภัย
    document.getElementById('copyBtn').onclick = () => copyToClipboard(fullContent);
    document.getElementById('lineBtn').onclick = () => {
        window.open(`https://social-plugins.line.me/lineit/share?text=${encodeURIComponent(fullContent)}`, '_blank');
    };
}



// function renderUI(hadith, thaiText) {
//     const displayArea = document.getElementById('displayArea');
//     const googleTranslateUrl = `https://translate.google.com/?sl=en&tl=th&text=${encodeURIComponent(hadith.hadithEnglish)}&op=translate`;

//     // เตรียมข้อความสำหรับแชร์
//     const shareContent = `[Hadith] ${hadith.book.bookName} No. ${hadith.hadithNumber}\n\nArabic: ${hadith.hadithArabic}\n\nEnglish: ${hadith.hadithEnglish}\n\nแปลไทย: ${thaiText}`;

//     displayArea.innerHTML = `
//         <div class="hadith-card">
//             <div style="margin-bottom:15px; display:flex; justify-content:space-between;">
//                 <span class="badge" style="background:#eee; padding:3px 8px; border-radius:4px; font-size:0.8rem;">
//                     ${hadith.book.bookName} No. ${hadith.hadithNumber}
//                 </span>
//                 <span style="font-size:0.8rem; color:#27ae60; font-weight:bold;">● ${hadith.status}</span>
//             </div>
            
//             <div class="arabic-box" style="font-size:1.0rem;">${hadith.hadithArabic}</div>
            
//             <div class="english-box">
//                 <p>${hadith.hadithEnglish}</p>
//             </div>

//             <div class="thai-box">
//                 <span class="translate-badge">คำแปลไทยเบื้องต้น</span>
//                 <p>${thaiText}</p>
                
//                 <div class="action-buttons">
//                     <a href="${googleTranslateUrl}" target="_blank" class="btn-secondary">
//                         <img src="https://www.gstatic.com/images/branding/product/1x/translate_24dp.png" width="16" style="margin-right:5px;">
//                         เปิดคำแปลใน Google Translate
//                     </a>
//                 </div>
//             </div>

//             <div class="share-bar">
//                 <button class="btn-share btn-copy" onclick="copyToClipboard(\`${shareContent.replace(/`/g, '\\`')}\`)">
//                     📋 คัดลอก
//                 </button>
//                 <button class="btn-share btn-line" onclick="shareToLine(\`${shareContent.replace(/`/g, '\\`')}\`)">
//                     LINE
//                 </button>
//                 <button class="btn-share btn-fb" onclick="shareToFB()">
//                     Facebook
//                 </button>
//             </div>

//             <div style="margin-top: 15px; font-size: 0.75rem; color: #aaa;">
//                 Narrated by: ${hadith.englishNarrator}
//             </div>
//         </div>
//     `;
// }

// ฟังก์ชันคัดลอกไปยังคลิปบอร์ด

// function copyToClipboard(text) {
//     navigator.clipboard.writeText(text).then(() => {
//         showToast("คัดลอกลงคลิปบอร์ดแล้ว!");
//     });
// }

// ฟังก์ชันแชร์ไป LINE
function shareToLine(text) {
    const url = `https://social-plugins.line.me/lineit/share?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

// ฟังก์ชันแชร์ไป Facebook
function shareToFB() {
    // การแชร์เนื้อหาข้อความยาวๆ โดยตรงไป FB ผ่าน URL มักทำไม่ได้ (FB จะดึง Metadata จาก URL แทน)
    // ดังนั้นจะใช้การแชร์ URL ของหน้าเว็บปัจจุบัน
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank');
}

// ฟังก์ชันแสดง Notification เล็กๆ
function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}






