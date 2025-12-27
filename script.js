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

function renderUI(hadith, thaiText) {
    const displayArea = document.getElementById('displayArea');
    
    // สร้าง URL สำหรับ Google Translate โดยเฉพาะ
    // ใช้เนื้อหาภาษาอังกฤษเป็นต้นฉบับในการแปล
    const googleTranslateUrl = `https://translate.google.com/?sl=en&tl=th&text=${encodeURIComponent(hadith.hadithEnglish)}&op=translate`;

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
            
            <div class="arabic-box" style="font-size: 1.0rem;">${hadith.hadithArabic}</div>
            
            <div class="english-box" style="background:#fdfdfd; padding:15px; border-radius:8px; border:1px solid #eee; margin-top:20px;">
                <strong style="color:#666; font-size:0.75rem; letter-spacing:1px;">ENGLISH VERSION</strong><br>
                <p style="margin-top:10px; line-height:1.6;">${hadith.hadithEnglish}</p>
            </div>

            <div class="thai-box" style="border-left:4px solid var(--primary); background:#f0f7f2; margin-top:20px;">
                <span class="translate-badge" style="background:var(--primary);">คำแปลไทยเบื้องต้น</span>
                <p style="margin-top:10px; line-height:1.7;">${thaiText}</p>
                
                <div class="action-buttons">
                    <a href="${googleTranslateUrl}" target="_blank" class="btn-secondary">
                        <img src="https://www.gstatic.com/images/branding/product/1x/translate_24dp.png" alt="G">
                        เปิดคำแปลใน Google Translate
                    </a>
                </div>
            </div>

            <div style="margin-top: 20px; font-size: 0.8rem; color: #888; border-top:1px solid #eee; padding-top:15px;">
                <strong>Narrated by:</strong> ${hadith.englishNarrator}
            </div>
        </div>
    `;
}

