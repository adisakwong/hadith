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
                        🌐 เปิดคำแปลใน Google Translate
                    </button>
                                    
                </div>
            </div>

            <div class="share-bar">
                <button class="btn-share btn-copy" id="copyBtn">📋 คัดลอกข้อความ</button>
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
}



// ฟังก์ชันแสดง Notification เล็กๆ
// function showToast(message) {
//     const toast = document.createElement("div");
//     toast.className = "toast";
//     toast.innerText = message;
//     document.body.appendChild(toast);
//     setTimeout(() => toast.remove(), 2500);
// }











