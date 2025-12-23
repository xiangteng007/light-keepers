import { useParams, useNavigate } from 'react-router-dom';
import { Card, Badge, Button } from '../design-system';

// 手冊分類
const MANUAL_CATEGORIES: Record<string, { name: string; icon: string; color: string }> = {
    earthquake: { name: '地震', icon: '🌍', color: '#5BA3C0' },
    typhoon: { name: '颱風', icon: '🌀', color: '#7B6FA6' },
    flood: { name: '水災', icon: '🌊', color: '#4DA6E8' },
    fire: { name: '火災', icon: '🔥', color: '#E85A5A' },
    firstaid: { name: '急救', icon: '❤️', color: '#E53935' },
    shelter: { name: '避難', icon: '🏠', color: '#4CAF50' },
};

// 手冊詳細內容
const MANUAL_CONTENTS: Record<string, {
    categoryId: string;
    title: string;
    summary: string;
    tags: string[];
    content: string;
    steps?: { title: string; content: string }[];
    tips?: string[];
    warning?: string;
}> = {
    'eq-1': {
        categoryId: 'earthquake',
        title: '地震發生時的「趴下、掩護、穩住」',
        summary: '地震來臨時的基本自保動作',
        tags: ['基礎', '室內'],
        content: '地震發生時，正確的應變動作可以大幅降低受傷風險。記住三個關鍵動作：趴下(DROP)、掩護(COVER)、穩住(HOLD ON)。',
        steps: [
            {
                title: '1. 趴下 (DROP)',
                content: '立即趴下，雙手雙膝著地，降低重心避免被搖晃摔倒。',
            },
            {
                title: '2. 掩護 (COVER)',
                content: '移動到堅固的桌子下方，用手臂保護頭部和頸部。如果附近沒有桌子，靠著內牆蹲下，雙手護住頭頸。',
            },
            {
                title: '3. 穩住 (HOLD ON)',
                content: '緊握桌腳，準備隨著桌子移動。保持姿勢直到搖晃停止。',
            },
        ],
        tips: [
            '遠離窗戶、吊燈、書架等可能掉落的物品',
            '不要試圖跑出建築物，樓梯是最危險的地方',
            '如果在床上，留在原地並用枕頭保護頭部',
        ],
        warning: '切勿躲在「黃金三角」！這是錯誤的觀念，已被多國地震專家否定。',
    },
    'eq-2': {
        categoryId: 'earthquake',
        title: '地震後的安全確認步驟',
        summary: '震後應立即確認的安全事項',
        tags: ['震後', '安全確認'],
        content: '地震停止後，不要急著離開，先進行安全確認，確保沒有立即的危險。',
        steps: [
            {
                title: '1. 確認自身安全',
                content: '檢查自己是否受傷，如有傷口先進行簡單處理。',
            },
            {
                title: '2. 確認周圍環境',
                content: '觀察是否有建築結構損壞、瓦斯外洩的氣味、電線走火等危險。',
            },
            {
                title: '3. 關閉瓦斯總開關',
                content: '如果安全的話，關閉瓦斯總開關以防止火災。',
            },
            {
                title: '4. 穿上鞋子',
                content: '地上可能有碎玻璃或尖銳物品，穿上堅固的鞋子再移動。',
            },
        ],
        tips: [
            '使用手電筒而非蠟燭，避免因瓦斯洩漏引發火災',
            '收聽電台或電視的官方災情報導',
            '準備迎接餘震，可能比主震更強',
        ],
    },
    'fa-1': {
        categoryId: 'firstaid',
        title: 'CPR 心肺復甦術操作步驟',
        summary: '成人急救 CPR 的完整流程',
        tags: ['CPR', '急救'],
        content: '心肺復甦術(CPR)是在心臟停止跳動時維持血液循環的緊急措施。及時正確的 CPR 可以挽救生命。',
        steps: [
            {
                title: '1. 確認環境安全',
                content: '確保現場對你和傷患都是安全的。',
            },
            {
                title: '2. 檢查意識',
                content: '輕拍傷患肩膀並大聲呼喚：「你還好嗎？」',
            },
            {
                title: '3. 呼叫求救',
                content: '撥打 119 並請人取得最近的 AED。開啟擴音等待指示。',
            },
            {
                title: '4. 胸部按壓',
                content: '雙手交疊，掌根置於兩乳頭連線中點。手臂打直，身體垂直向下按壓 5-6 公分，速率每分鐘 100-120 下。',
            },
            {
                title: '5. 人工呼吸 (可選)',
                content: '壓額抬下巴，捏住鼻子，嘴對嘴吹氣 1 秒，觀察胸部起伏。30 次按壓後給予 2 次人工呼吸。',
            },
        ],
        tips: [
            '用力壓、快快壓、胸回彈、莫中斷',
            '如不願或不會人工呼吸，持續胸部按壓也有效',
            'AED 到達後立即使用，按照語音指示操作',
        ],
        warning: '不要因為擔心壓斷肋骨而不敢用力，救命比骨折重要！',
    },
    'fa-2': {
        categoryId: 'firstaid',
        title: 'AED 自動體外心臟電擊器使用指南',
        summary: '如何正確使用 AED 進行急救',
        tags: ['AED', '心臟'],
        content: 'AED（自動體外心臟電擊器）是為心室顫動患者提供電擊除顫的緊急設備。現代 AED 設計為任何人都可以使用。',
        steps: [
            {
                title: '1. 開啟電源',
                content: '打開 AED 蓋子或按下電源按鈕，機器會開始語音指導。',
            },
            {
                title: '2. 貼上電極片',
                content: '露出傷患胸部，依照電極片上的圖示貼在正確位置：一片在右鎖骨下方，一片在左側腋下。',
            },
            {
                title: '3. 分析心律',
                content: 'AED 會自動分析心律，此時請大家離開傷患身體，不要觸碰。',
            },
            {
                title: '4. 電擊 (如需要)',
                content: '如果 AED 指示需要電擊，確認沒有人接觸傷患後，按下電擊按鈕。',
            },
            {
                title: '5. 繼續 CPR',
                content: '電擊後或 AED 指示不需電擊時，立即繼續進行 CPR。',
            },
        ],
        tips: [
            'AED 有兒童模式，如為 8 歲以下或 25 公斤以下兒童需切換',
            '電極片不可重疊，要確實黏貼在皮膚上',
            '胸部有水分要先擦乾，有藥物貼片要先移除',
        ],
    },
    'sh-1': {
        categoryId: 'shelter',
        title: '緊急避難包準備清單',
        summary: '避難包應包含的基本物資',
        tags: ['避難包', '準備'],
        content: '緊急避難包應事先準備好，放在容易取得的地方。建議每人準備一個，內容物需定期檢查更換。',
        steps: [
            {
                title: '飲水與食物',
                content: '礦泉水每人每日 3 公升，可存放 3 天份。餅乾、能量棒等不需烹煮的食物。',
            },
            {
                title: '重要文件影本',
                content: '身分證、健保卡、存摺、房契等重要文件的影本，裝入防水袋。',
            },
            {
                title: '醫療用品',
                content: '個人藥物、急救包、口罩、手套、消毒酒精。',
            },
            {
                title: '照明通訊',
                content: '手電筒、備用電池、行動電源、收音機。',
            },
            {
                title: '保暖衣物',
                content: '輕便雨衣、薄毯、保暖內衣褲。',
            },
            {
                title: '其他必需品',
                content: '現金（小額紙鈔和硬幣）、哨子、瑞士刀、衛生紙。',
            },
        ],
        tips: [
            '每半年檢查一次避難包，更換過期物品',
            '依照季節調整衣物內容',
            '如有嬰幼兒或老人，需額外準備專用物品',
        ],
    },
};

export default function ManualDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const manual = id ? MANUAL_CONTENTS[id] : null;
    const category = manual ? MANUAL_CATEGORIES[manual.categoryId] : null;

    if (!manual || !category) {
        return (
            <div className="page manual-detail-page">
                <div className="manual-not-found">
                    <span style={{ fontSize: '64px' }}>📭</span>
                    <h2>找不到手冊</h2>
                    <p>這本手冊可能已被移除或連結錯誤</p>
                    <Button onClick={() => navigate('/manuals')}>
                        返回手冊列表
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="page manual-detail-page">
            {/* 頂部導航 */}
            <div className="manual-detail-header">
                <button
                    className="manual-back-btn"
                    onClick={() => navigate('/manuals')}
                >
                    ← 返回手冊列表
                </button>
                <div className="manual-breadcrumb">
                    <span style={{ color: category.color }}>{category.icon} {category.name}</span>
                </div>
            </div>

            {/* 主要內容 */}
            <Card className="manual-detail-card" padding="lg">
                <div className="manual-detail-title-section">
                    <h1 className="manual-detail-title">{manual.title}</h1>
                    <p className="manual-detail-summary">{manual.summary}</p>
                    <div className="manual-detail-tags">
                        {manual.tags.map((tag) => (
                            <Badge key={tag} variant="default" size="sm">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* 警告區塊 */}
                {manual.warning && (
                    <div className="manual-warning">
                        <span className="manual-warning__icon">⚠️</span>
                        <p>{manual.warning}</p>
                    </div>
                )}

                {/* 內容 */}
                <div className="manual-detail-content">
                    <p>{manual.content}</p>
                </div>

                {/* 步驟 */}
                {manual.steps && (
                    <div className="manual-steps">
                        <h2>操作步驟</h2>
                        <div className="manual-steps-list">
                            {manual.steps.map((step, index) => (
                                <div key={index} className="manual-step">
                                    <div
                                        className="manual-step__number"
                                        style={{ backgroundColor: category.color }}
                                    >
                                        {index + 1}
                                    </div>
                                    <div className="manual-step__content">
                                        <h3>{step.title}</h3>
                                        <p>{step.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 小技巧 */}
                {manual.tips && (
                    <div className="manual-tips">
                        <h2>💡 小技巧</h2>
                        <ul>
                            {manual.tips.map((tip, index) => (
                                <li key={index}>{tip}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </Card>

            {/* 離線可用標籤 */}
            <div className="manual-offline-badge">
                <span>📶</span> 此手冊支援離線存取
            </div>
        </div>
    );
}
