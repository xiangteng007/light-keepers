import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, 'src/i18n/locales');
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

const sidebarTranslations = {
    'ja.json': {
        sidebar: {
            groups: { emergency: "緊急", ops: "指揮センター", geo: "情報地図", rescue: "救助活動", logistics: "物流", workforce: "人員", insights: "分析", admin: "管理" },
            items: { sos: "SOS発信", quickReport: "速報", evacuation: "避難警報", hotline: "緊急ダイヤル", commandCenter: "状況ダッシュボード", incidents: "事件一覧", tasks: "タスク一覧", icsForms: "ICSフォーム", notifications: "通知", icDashboard: "IC ダッシュボード", offline: "オフライン", unifiedMap: "統合マップ", alerts: "アラートセンター", weather: "天気", shelterMap: "避難所マップ", shelters: "避難所管理", triage: "トリアージ", reunification: "家族再会", searchRescue: "捜索救助", medicalTransport: "医療輸送", fieldComms: "現場通信", inventory: "在庫", equipment: "設備", donations: "寄付", unifiedResources: "リソースハブ", approvals: "承認", people: "人員", shifts: "シフト", mobilization: "動員", performance: "パフォーマンス", communityHub: "コミュニティ", mentalHealth: "メンタルヘルス", analytics: "分析ダッシュボード", reports: "レポート", unifiedReporting: "統合レポート", simulationEngine: "シミュレーション", aiTasks: "AIタスク", aiChat: "AIアシスタント", training: "研修", manuals: "マニュアル", iam: "アクセス制御", audit: "監査ログ", security: "セキュリティ", interoperability: "相互運用", webhooks: "Webhook", biometric: "生体認証", settings: "設定" },
            status: { onDuty: "勤務中" }
        },
        breadcrumb: { home: "ホーム", commandCenter: "指揮センター" }
    },
    'ko.json': {
        sidebar: {
            groups: { emergency: "긴급", ops: "지휘 센터", geo: "정보 지도", rescue: "구조 활동", logistics: "물류", workforce: "인력", insights: "분석", admin: "관리" },
            items: { sos: "SOS 전송", quickReport: "빠른 보고", evacuation: "대피 경보", hotline: "긴급 전화", commandCenter: "상황 대시보드", incidents: "사건 목록", tasks: "작업 보드", icsForms: "ICS 양식", notifications: "알림", icDashboard: "IC 대시보드", offline: "오프라인", unifiedMap: "통합 지도", alerts: "경보 센터", weather: "날씨", shelterMap: "대피소 지도", shelters: "대피소 관리", triage: "환자 분류", reunification: "가족 재결합", searchRescue: "수색 구조", medicalTransport: "의료 이송", fieldComms: "현장 통신", inventory: "재고", equipment: "장비", donations: "기부", unifiedResources: "자원 허브", approvals: "승인", people: "인력 명단", shifts: "근무 일정", mobilization: "동원", performance: "성과", communityHub: "커뮤니티", mentalHealth: "정신 건강", analytics: "분석 대시보드", reports: "보고서", unifiedReporting: "통합 보고", simulationEngine: "시뮬레이션", aiTasks: "AI 작업", aiChat: "AI 어시스턴트", training: "교육", manuals: "매뉴얼", iam: "접근 제어", audit: "감사 로그", security: "보안", interoperability: "상호운용", webhooks: "Webhook", biometric: "생체 인증", settings: "설정" },
            status: { onDuty: "근무 중" }
        },
        breadcrumb: { home: "홈", commandCenter: "지휘 센터" }
    },
    'vi.json': {
        sidebar: {
            groups: { emergency: "Khẩn cấp", ops: "Trung tâm Chỉ huy", geo: "Bản đồ Intel", rescue: "Cứu hộ", logistics: "Hậu cần", workforce: "Nhân lực", insights: "Phân tích", admin: "Quản lý" },
            items: { sos: "Gửi SOS", quickReport: "Báo cáo Nhanh", evacuation: "Cảnh báo Sơ tán", hotline: "Đường dây Khẩn cấp", commandCenter: "Bảng điều khiển", incidents: "Sự cố", tasks: "Công việc", icsForms: "Biểu mẫu ICS", notifications: "Thông báo", icDashboard: "Bảng IC", offline: "Ngoại tuyến", unifiedMap: "Bản đồ Thống nhất", alerts: "Trung tâm Cảnh báo", weather: "Thời tiết", shelterMap: "Bản đồ Nơi trú", shelters: "Quản lý Nơi trú", triage: "Phân loại", reunification: "Đoàn tụ Gia đình", searchRescue: "Tìm kiếm Cứu nạn", medicalTransport: "Vận chuyển Y tế", fieldComms: "Thông tin Hiện trường", inventory: "Kho", equipment: "Thiết bị", donations: "Quyên góp", unifiedResources: "Hub Tài nguyên", approvals: "Phê duyệt", people: "Nhân sự", shifts: "Lịch Ca", mobilization: "Huy động", performance: "Hiệu suất", communityHub: "Cộng đồng", mentalHealth: "Sức khỏe Tâm thần", analytics: "Bảng Phân tích", reports: "Báo cáo", unifiedReporting: "Báo cáo Tổng hợp", simulationEngine: "Mô phỏng", aiTasks: "Tác vụ AI", aiChat: "Trợ lý AI", training: "Đào tạo", manuals: "Hướng dẫn", iam: "Kiểm soát Truy cập", audit: "Nhật ký Kiểm toán", security: "Bảo mật", interoperability: "Tương tác", webhooks: "Webhook", biometric: "Sinh trắc học", settings: "Cài đặt" },
            status: { onDuty: "Đang trực" }
        },
        breadcrumb: { home: "Trang chủ", commandCenter: "Trung tâm Chỉ huy" }
    },
    'th.json': {
        sidebar: {
            groups: { emergency: "ฉุกเฉิน", ops: "ศูนย์บัญชาการ", geo: "แผนที่ข่าวกรอง", rescue: "ปฏิบัติการกู้ภัย", logistics: "โลจิสติกส์", workforce: "กำลังพล", insights: "การวิเคราะห์", admin: "ผู้ดูแลระบบ" },
            items: { sos: "ส่ง SOS", quickReport: "รายงานด่วน", evacuation: "แจ้งเตือนอพยพ", hotline: "สายด่วน", commandCenter: "แดชบอร์ดสถานการณ์", incidents: "เหตุการณ์", tasks: "กระดานงาน", icsForms: "แบบฟอร์ม ICS", notifications: "การแจ้งเตือน", icDashboard: "แดชบอร์ด IC", offline: "ออฟไลน์", unifiedMap: "แผนที่รวม", alerts: "ศูนย์แจ้งเตือน", weather: "สภาพอากาศ", shelterMap: "แผนที่ที่พักพิง", shelters: "จัดการที่พักพิง", triage: "คัดกรอง", reunification: "รวมครอบครัว", searchRescue: "ค้นหากู้ภัย", medicalTransport: "ขนส่งทางการแพทย์", fieldComms: "สื่อสารภาคสนาม", inventory: "คลังสินค้า", equipment: "อุปกรณ์", donations: "บริจาค", unifiedResources: "ศูนย์ทรัพยากร", approvals: "การอนุมัติ", people: "บุคลากร", shifts: "ปฏิทินกะ", mobilization: "ระดมพล", performance: "ผลงาน", communityHub: "ศูนย์ชุมชน", mentalHealth: "สุขภาพจิต", analytics: "แดชบอร์ดวิเคราะห์", reports: "รายงาน", unifiedReporting: "รายงานรวม", simulationEngine: "การจำลอง", aiTasks: "งาน AI", aiChat: "ผู้ช่วย AI", training: "การฝึกอบรม", manuals: "คู่มือ", iam: "ควบคุมการเข้าถึง", audit: "บันทึกการตรวจสอบ", security: "ความปลอดภัย", interoperability: "การทำงานร่วมกัน", webhooks: "Webhook", biometric: "ไบโอเมตริก", settings: "การตั้งค่า" },
            status: { onDuty: "เข้าเวร" }
        },
        breadcrumb: { home: "หน้าหลัก", commandCenter: "ศูนย์บัญชาการ" }
    },
    'id.json': {
        sidebar: {
            groups: { emergency: "Darurat", ops: "Pusat Komando", geo: "Peta Intel", rescue: "Operasi Penyelamatan", logistics: "Logistik", workforce: "Tenaga Kerja", insights: "Analitik", admin: "Admin" },
            items: { sos: "Kirim SOS", quickReport: "Laporan Cepat", evacuation: "Peringatan Evakuasi", hotline: "Hotline Darurat", commandCenter: "Dasbor Situasi", incidents: "Insiden", tasks: "Papan Tugas", icsForms: "Formulir ICS", notifications: "Notifikasi", icDashboard: "Dasbor IC", offline: "Offline", unifiedMap: "Peta Terpadu", alerts: "Pusat Peringatan", weather: "Cuaca", shelterMap: "Peta Tempat Perlindungan", shelters: "Manajemen Tempat Perlindungan", triage: "Triase", reunification: "Reunifikasi Keluarga", searchRescue: "Pencarian & Penyelamatan", medicalTransport: "Transportasi Medis", fieldComms: "Komunikasi Lapangan", inventory: "Inventaris", equipment: "Peralatan", donations: "Donasi", unifiedResources: "Hub Sumber Daya", approvals: "Persetujuan", people: "Personel", shifts: "Kalender Shift", mobilization: "Mobilisasi", performance: "Kinerja", communityHub: "Hub Komunitas", mentalHealth: "Kesehatan Mental", analytics: "Dasbor Analitik", reports: "Laporan", unifiedReporting: "Laporan Terpadu", simulationEngine: "Simulasi", aiTasks: "Tugas AI", aiChat: "Asisten AI", training: "Pelatihan", manuals: "Manual", iam: "Kontrol Akses", audit: "Log Audit", security: "Keamanan", interoperability: "Interoperabilitas", webhooks: "Webhook", biometric: "Biometrik", settings: "Pengaturan" },
            status: { onDuty: "Bertugas" }
        },
        breadcrumb: { home: "Beranda", commandCenter: "Pusat Komando" }
    },
    'ms.json': {
        sidebar: {
            groups: { emergency: "Kecemasan", ops: "Pusat Perintah", geo: "Peta Intel", rescue: "Ops Penyelamatan", logistics: "Logistik", workforce: "Tenaga Kerja", insights: "Analitik", admin: "Admin" },
            items: { sos: "Hantar SOS", quickReport: "Laporan Pantas", evacuation: "Amaran Pemindahan", hotline: "Talian Kecemasan", commandCenter: "Papan Pemuka Situasi", incidents: "Insiden", tasks: "Papan Tugas", icsForms: "Borang ICS", notifications: "Pemberitahuan", icDashboard: "Papan Pemuka IC", offline: "Luar Talian", unifiedMap: "Peta Bersatu", alerts: "Pusat Amaran", weather: "Cuaca", shelterMap: "Peta Tempat Perlindungan", shelters: "Pengurusan Perlindungan", triage: "Triaj", reunification: "Penyatuan Keluarga", searchRescue: "Carian & Penyelamatan", medicalTransport: "Pengangkutan Perubatan", fieldComms: "Komunikasi Lapangan", inventory: "Inventori", equipment: "Peralatan", donations: "Derma", unifiedResources: "Hub Sumber", approvals: "Kelulusan", people: "Kakitangan", shifts: "Kalendar Syif", mobilization: "Mobilisasi", performance: "Prestasi", communityHub: "Hub Komuniti", mentalHealth: "Kesihatan Mental", analytics: "Papan Pemuka Analitik", reports: "Laporan", unifiedReporting: "Laporan Bersepadu", simulationEngine: "Simulasi", aiTasks: "Tugas AI", aiChat: "Pembantu AI", training: "Latihan", manuals: "Manual", iam: "Kawalan Akses", audit: "Log Audit", security: "Keselamatan", interoperability: "Interoperabiliti", webhooks: "Webhook", biometric: "Biometrik", settings: "Tetapan" },
            status: { onDuty: "Bertugas" }
        },
        breadcrumb: { home: "Utama", commandCenter: "Pusat Perintah" }
    },
    'fil.json': {
        sidebar: {
            groups: { emergency: "Emergency", ops: "Command Center", geo: "Intel Map", rescue: "Rescue Ops", logistics: "Logistics", workforce: "Workforce", insights: "Analytics", admin: "Admin" },
            items: { sos: "Magpadala ng SOS", quickReport: "Mabilis na Ulat", evacuation: "Babala sa Paglikas", hotline: "Emergency Hotline", commandCenter: "Dashboard ng Sitwasyon", incidents: "Mga Insidente", tasks: "Task Board", icsForms: "ICS Forms", notifications: "Mga Abiso", icDashboard: "IC Dashboard", offline: "Offline", unifiedMap: "Unified Map", alerts: "Alert Center", weather: "Panahon", shelterMap: "Mapa ng Shelter", shelters: "Shelter Mgmt", triage: "Triage", reunification: "Family Reunification", searchRescue: "Search & Rescue", medicalTransport: "Medical Transport", fieldComms: "Field Comms", inventory: "Inventory", equipment: "Kagamitan", donations: "Mga Donasyon", unifiedResources: "Resource Hub", approvals: "Mga Approval", people: "Personnel", shifts: "Shift Calendar", mobilization: "Mobilization", performance: "Performance", communityHub: "Community Hub", mentalHealth: "Mental Health", analytics: "Analytics Dashboard", reports: "Mga Ulat", unifiedReporting: "Unified Reports", simulationEngine: "Simulation", aiTasks: "AI Tasks", aiChat: "AI Assistant", training: "Pagsasanay", manuals: "Mga Manual", iam: "Access Control", audit: "Audit Logs", security: "Seguridad", interoperability: "Interoperability", webhooks: "Webhooks", biometric: "Biometrics", settings: "Settings" },
            status: { onDuty: "Naka-duty" }
        },
        breadcrumb: { home: "Home", commandCenter: "Command Center" }
    },
    'km.json': {
        sidebar: {
            groups: { emergency: "បន្ទាន់", ops: "មជ្ឈមណ្ឌលបញ្ជា", geo: "ផែនទីព័ត៌មាន", rescue: "ប្រតិបត្តិការសង្គ្រោះ", logistics: "ភស្តុភារ", workforce: "កម្លាំងពលកម្ម", insights: "ការវិភាគ", admin: "អ្នកគ្រប់គ្រង" },
            items: { sos: "ផ្ញើ SOS", quickReport: "រាយការណ៍រហ័ស", evacuation: "ការជូនដំណឹងជម្លៀស", hotline: "ខ្សែទូរសព្ទបន្ទាន់", commandCenter: "ផ្ទាំងសភាពការណ៍", incidents: "ឧប្បត្តិហេតុ", tasks: "បន្ទះភារកិច្ច", icsForms: "ទម្រង់ ICS", notifications: "ការជូនដំណឹង", icDashboard: "ផ្ទាំង IC", offline: "ក្រៅបណ្តាញ", unifiedMap: "ផែនទីរួម", alerts: "មជ្ឈមណ្ឌលប្រកាស", weather: "អាកាសធាតុ", shelterMap: "ផែនទីជម្រក", shelters: "ការគ្រប់គ្រងជម្រក", triage: "ការចាត់ថ្នាក់", reunification: "ការរួបរួមគ្រួសារ", searchRescue: "ស្វែងរក និងសង្គ្រោះ", medicalTransport: "ដឹកជញ្ជូនពេទ្យ", fieldComms: "ការទំនាក់ទំនងវាល", inventory: "សន្និធិ", equipment: "ឧបករណ៍", donations: "ការបរិច្ចាគ", unifiedResources: "មជ្ឈមណ្ឌលធនធាន", approvals: "ការអនុម័ត", people: "បុគ្គលិក", shifts: "កាលវិភាគប្តូរវេន", mobilization: "ការបង្កើតកម្លាំង", performance: "ដំណើរការ", communityHub: "មជ្ឈមណ្ឌលសហគមន៍", mentalHealth: "សុខភាពផ្លូវចិត្ត", analytics: "ផ្ទាំងវិភាគ", reports: "របាយការណ៍", unifiedReporting: "របាយការណ៍រួម", simulationEngine: "ការក្លែងធ្វើ", aiTasks: "ភារកិច្ច AI", aiChat: "ជំនួយការ AI", training: "ការបណ្តុះបណ្តាល", manuals: "សៀវភៅណែនាំ", iam: "ការត្រួតពិនិត្យចូល", audit: "កំណត់ត្រាសវនកម្ម", security: "សុវត្ថិភាព", interoperability: "អន្តរប្រតិបត្តិការ", webhooks: "Webhooks", biometric: "ជីវមាត្រ", settings: "ការកំណត់" },
            status: { onDuty: "កំពុងបំពេញភារកិច្ច" }
        },
        breadcrumb: { home: "ទំព័រដើម", commandCenter: "មជ្ឈមណ្ឌលបញ្ជា" }
    },
    'my.json': {
        sidebar: {
            groups: { emergency: "အရေးပေါ်", ops: "ကွပ်ကဲမှုစင်တာ", geo: "သတင်းမြေပုံ", rescue: "ကယ်ဆယ်ရေး", logistics: "ထောက်ပံ့ပို့ဆောင်ရေး", workforce: "လူအင်အား", insights: "ခွဲခြမ်းစိတ်ဖြာမှု", admin: "စီမံခန့်ခွဲသူ" },
            items: { sos: "SOS ပို့ရန်", quickReport: "အမြန်အစီရင်ခံ", evacuation: "ရွှေ့ပြောင်းရေးသတိပေးချက်", hotline: "အရေးပေါ်ဖုန်းလိုင်း", commandCenter: "အခြေအနေဒက်ရှ်ဘုတ်", incidents: "ဖြစ်ရပ်များ", tasks: "လုပ်ငန်းဘုတ်", icsForms: "ICS ပုံစံများ", notifications: "သတိပေးချက်များ", icDashboard: "IC ဒက်ရှ်ဘုတ်", offline: "အော့ဖ်လိုင်း", unifiedMap: "ပေါင်းစပ်မြေပုံ", alerts: "သတိပေးစင်တာ", weather: "ရာသီဥတု", shelterMap: "ခိုလှုံရာမြေပုံ", shelters: "ခိုလှုံရာစီမံခန့်ခွဲမှု", triage: "အဆင့်ခွဲခြားခြင်း", reunification: "မိသားစုပြန်လည်ပေါင်းစည်းရေး", searchRescue: "ရှာဖွေကယ်ဆယ်ရေး", medicalTransport: "ဆေးဘက်သယ်ယူပို့ဆောင်ရေး", fieldComms: "ကွင်းဆင်းဆက်သွယ်ရေး", inventory: "စာရင်း", equipment: "ပစ္စည်းကိရိယာ", donations: "လှူဒါန်းမှုများ", unifiedResources: "အရင်းအမြစ်ဟပ်", approvals: "ခွင့်ပြုချက်များ", people: "ဝန်ထမ်းများ", shifts: "အဆိုင်းပြက္ခဒိန်", mobilization: "စုဆောင်းရေး", performance: "စွမ်းဆောင်ရည်", communityHub: "အသိုင်းအဝိုင်းဟပ်", mentalHealth: "စိတ်ပိုင်းဆိုင်ရာကျန်းမာရေး", analytics: "ခွဲခြမ်းစိတ်ဖြာဒက်ရှ်ဘုတ်", reports: "အစီရင်ခံစာများ", unifiedReporting: "ပေါင်းစပ်အစီရင်ခံစာ", simulationEngine: "ပုံစံတူပြုလုပ်ခြင်း", aiTasks: "AI လုပ်ငန်းများ", aiChat: "AI လက်ထောက်", training: "လေ့ကျင့်ရေး", manuals: "လက်စွဲစာအုပ်များ", iam: "ဝင်ရောက်ခွင့်ထိန်းချုပ်မှု", audit: "စာရင်းစစ်မှတ်တမ်းများ", security: "လုံခြုံရေး", interoperability: "အပြန်အလှန်လုပ်ဆောင်နိုင်မှု", webhooks: "Webhooks", biometric: "ဇီဝမက်ထရစ်", settings: "ဆက်တင်များ" },
            status: { onDuty: "တာဝန်ထမ်းဆောင်နေသည်" }
        },
        breadcrumb: { home: "ပင်မစာမျက်နှာ", commandCenter: "ကွပ်ကဲမှုစင်တာ" }
    },
    'lo.json': {
        sidebar: {
            groups: { emergency: "ສຸກເສີນ", ops: "ສູນບັນຊາການ", geo: "ແຜນທີ່ຂ່າວກອງ", rescue: "ປະຕິບັດການກູ້ໄພ", logistics: "ການຂົນສົ່ງ", workforce: "ກຳລັງຄົນ", insights: "ການວິເຄາະ", admin: "ຜູ້ຄວບຄຸມ" },
            items: { sos: "ສົ່ງ SOS", quickReport: "ລາຍງານດ່ວນ", evacuation: "ການແຈ້ງເຕືອນການອົບພະຍົບ", hotline: "ສາຍດ່ວນສຸກເສີນ", commandCenter: "ແດດບອດສະຖານະການ", incidents: "ເຫດການ", tasks: "ກະດານວຽກ", icsForms: "ແບບຟອມ ICS", notifications: "ການແຈ້ງເຕືອນ", icDashboard: "ແດດບອດ IC", offline: "ອອບລາຍ", unifiedMap: "ແຜນທີ່ລວມ", alerts: "ສູນແຈ້ງເຕືອນ", weather: "ສະພາບອາກາດ", shelterMap: "ແຜນທີ່ບ່ອນພັກພິງ", shelters: "ການຈັດການບ່ອນພັກພິງ", triage: "ການຈັດລຳດັບ", reunification: "ການລວມຄອບຄົວ", searchRescue: "ຄົ້ນຫາ ແລະ ກູ້ໄພ", medicalTransport: "ການຂົນສົ່ງທາງການແພດ", fieldComms: "ການສື່ສານພາກສະໜາມ", inventory: "ສາງ", equipment: "ອຸປະກອນ", donations: "ການບໍລິຈາກ", unifiedResources: "ສູນຊັບພະຍາກອນ", approvals: "ການອະນຸມັດ", people: "ບຸກຄະລາກອນ", shifts: "ປະຕິທິນກະ", mobilization: "ການລະດົມ", performance: "ປະສິດທິພາບ", communityHub: "ສູນຊຸມຊົນ", mentalHealth: "ສຸຂະພາບຈິດ", analytics: "ແດດບອດວິເຄາະ", reports: "ລາຍງານ", unifiedReporting: "ລາຍງານລວມ", simulationEngine: "ການຈຳລອງ", aiTasks: "ວຽກ AI", aiChat: "ຜູ້ຊ່ວຍ AI", training: "ການຝຶກອົບຮົມ", manuals: "ຄູ່ມື", iam: "ການຄວບຄຸມການເຂົ້າເຖິງ", audit: "ບັນທຶກການກວດສອບ", security: "ຄວາມປອດໄພ", interoperability: "ການເຮັດວຽກຮ່ວມກັນ", webhooks: "Webhooks", biometric: "ລາຍມືຊີວະພາບ", settings: "ການຕັ້ງຄ່າ" },
            status: { onDuty: "ກຳລັງປະຈຳການ" }
        },
        breadcrumb: { home: "ໜ້າຫຼັກ", commandCenter: "ສູນບັນຊາການ" }
    },
    'zh-CN.json': {
        sidebar: {
            groups: { emergency: "紧急快捷", ops: "作战中心", geo: "情资地图", rescue: "救援行动", logistics: "资源后勤", workforce: "人员动员", insights: "分析知识", admin: "系统管理" },
            items: { sos: "SOS 发送", quickReport: "快速通报", evacuation: "撤离警报", hotline: "紧急专线", commandCenter: "战情仪表板", incidents: "事件列表", tasks: "任务看板", icsForms: "ICS 表单", notifications: "通知中心", icDashboard: "IC 仪表板", offline: "离线状态", unifiedMap: "统一地图", alerts: "警报中心", weather: "气象预报", shelterMap: "避难所地图", shelters: "避难所管理", triage: "伤患分类", reunification: "家庭重聚", searchRescue: "搜救任务", medicalTransport: "医疗后送", fieldComms: "现地通信", inventory: "物资库存", equipment: "装备管理", donations: "捐赠追踪", unifiedResources: "资源整合", approvals: "审批中心", people: "人员名册", shifts: "排班日历", mobilization: "志工动员", performance: "绩效中心", communityHub: "社区活动", mentalHealth: "心理支持", analytics: "分析仪表板", reports: "报表中心", unifiedReporting: "综合报表", simulationEngine: "模拟引擎", aiTasks: "AI 任务", aiChat: "AI 助手", training: "训练课程", manuals: "作业手册", iam: "权限管理", audit: "审计日志", security: "安全中心", interoperability: "机构互通", webhooks: "Webhook 管理", biometric: "生物辨识", settings: "系统设定" },
            status: { onDuty: "值班中" }
        },
        breadcrumb: { home: "首页", commandCenter: "指挥中心" }
    }
};

// Update each locale file
for (const [filename, additions] of Object.entries(sidebarTranslations)) {
    const filepath = path.join(localesDir, filename);
    if (fs.existsSync(filepath)) {
        const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
        Object.assign(content, additions);
        fs.writeFileSync(filepath, JSON.stringify(content, null, 4).replace(/\n/g, '\r\n'));
        console.log(`Updated: ${filename}`);
    }
}
console.log('Done!');
