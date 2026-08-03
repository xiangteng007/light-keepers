import { useState, useMemo, type FC } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, ArrowLeft, ArrowRight, Inbox } from 'lucide-react';
import Fuse from 'fuse.js';
import { Card, Tag } from '../design-system';
import {
    AedIcon,
    ShelterIcon,
    LocationIcon,
    RadioIcon,
} from '../design-system/icons';
import {
    EarthquakePictogram,
    TyphoonPictogram,
    FirePictogram,
    AirRaidPictogram,
    CbrnPictogram,
    InfrastructurePictogram,
    type PictogramProps,
} from '../design-system/icons/pictograms';
import EmptyState from '../components/shared/EmptyState';

// 手冊分類（10 大類別；R5/T5c：icon 為 B3c 教範圖例/災型象形，不再使用 emoji）
const MANUAL_CATEGORIES: {
    id: string;
    name: string;
    Icon: FC<PictogramProps>;
    color: string;
    description: string;
    manualCount: number;
}[] = [
    {
        id: 'earthquake',
        name: '地震',
        Icon: EarthquakePictogram,
        color: '#5BA3C0',
        description: '地震發生時的應變措施與避難要點',
        manualCount: 3,
    },
    {
        id: 'typhoon',
        name: '颱風水災',
        Icon: TyphoonPictogram,
        color: '#7B6FA6',
        description: '颱風、水災、土石流的預防與應變',
        manualCount: 3,
    },
    {
        id: 'fire',
        name: '火災',
        Icon: FirePictogram,
        color: '#E85A5A',
        description: '火災逃生與滅火器使用方法',
        manualCount: 3,
    },
    {
        id: 'firstaid',
        name: '急救',
        Icon: AedIcon,
        color: '#E53935',
        description: 'CPR、AED 使用與緊急傷患處理',
        manualCount: 3,
    },
    {
        id: 'shelter',
        name: '避難',
        Icon: ShelterIcon,
        color: '#4CAF50',
        description: '避難所使用規則與生存物資準備',
        manualCount: 2,
    },
    {
        id: 'war',
        name: '戰爭',
        Icon: AirRaidPictogram,
        color: '#607D8B',
        description: '空襲警報、防空避難與戰時應變',
        manualCount: 3,
    },
    {
        id: 'nuclear',
        name: '核化災害',
        Icon: CbrnPictogram,
        color: '#FF9800',
        description: '核災與化學災害的防護與應變',
        manualCount: 2,
    },
    {
        id: 'infrastructure',
        name: '設施故障',
        Icon: InfrastructurePictogram,
        color: '#795548',
        description: '停電、瓦斯外洩等日常緊急狀況',
        manualCount: 2,
    },
    {
        id: 'outdoor',
        name: '戶外活動',
        Icon: LocationIcon,
        color: '#2E7D32',
        description: '野營、露營、登山越野的安全須知',
        manualCount: 3,
    },
    {
        id: 'radio',
        name: '無線電通訊',
        Icon: RadioIcon,
        color: '#1565C0',
        description: '無線電操作、通聯禮儀、台灣法規與緊急通訊',
        manualCount: 4,
    },
];

// 手冊列表（28 本手冊）
const MANUALS = [
    // ===== 地震 (3) =====
    {
        id: 'eq-1',
        categoryId: 'earthquake',
        title: '地震發生時的「趴下、掩護、穩住」',
        summary: '地震來臨時的基本自保動作',
        tags: ['基礎', '室內'],
        order: 1,
    },
    {
        id: 'eq-2',
        categoryId: 'earthquake',
        title: '地震後的安全確認步驟',
        summary: '震後應立即確認的安全事項',
        tags: ['震後', '安全確認'],
        order: 2,
    },
    {
        id: 'eq-3',
        categoryId: 'earthquake',
        title: '室外遭遇地震的應變方法',
        summary: '在戶外時地震的正確應對',
        tags: ['戶外', '避難'],
        order: 3,
    },
    // ===== 颱風水災 (3) =====
    {
        id: 'ty-1',
        categoryId: 'typhoon',
        title: '颱風來臨前的防災準備',
        summary: '颱風警報發布後應準備的物資與措施',
        tags: ['準備', '物資'],
        order: 1,
    },
    {
        id: 'ty-2',
        categoryId: 'typhoon',
        title: '淹水時的緊急應變措施',
        summary: '住家開始淹水時的處理步驟',
        tags: ['淹水', '應變'],
        order: 2,
    },
    {
        id: 'ty-3',
        categoryId: 'typhoon',
        title: '土石流警戒與避難時機',
        summary: '如何判斷土石流危險並及時撤離',
        tags: ['土石流', '撤離'],
        order: 3,
    },
    // ===== 火災 (3) =====
    {
        id: 'fr-1',
        categoryId: 'fire',
        title: '火災逃生的基本原則',
        summary: '遭遇火災時的逃生要點',
        tags: ['逃生', '基礎'],
        order: 1,
    },
    {
        id: 'fr-2',
        categoryId: 'fire',
        title: '滅火器的正確使用方法',
        summary: '各類滅火器的操作步驟',
        tags: ['滅火器', '操作'],
        order: 2,
    },
    {
        id: 'fr-3',
        categoryId: 'fire',
        title: '住宅防火安全檢查',
        summary: '居家環境的火災預防要點',
        tags: ['預防', '居家'],
        order: 3,
    },
    // ===== 急救 (3) =====
    {
        id: 'fa-1',
        categoryId: 'firstaid',
        title: 'CPR 心肺復甦術操作步驟',
        summary: '成人急救 CPR 的完整流程',
        tags: ['CPR', '急救'],
        order: 1,
    },
    {
        id: 'fa-2',
        categoryId: 'firstaid',
        title: 'AED 自動體外心臟電擊器使用指南',
        summary: '如何正確使用 AED 進行急救',
        tags: ['AED', '心臟'],
        order: 2,
    },
    {
        id: 'fa-3',
        categoryId: 'firstaid',
        title: '止血與傷口處理',
        summary: '外傷出血的緊急處理方法',
        tags: ['止血', '外傷'],
        order: 3,
    },
    // ===== 避難 (2) =====
    {
        id: 'sh-1',
        categoryId: 'shelter',
        title: '緊急避難包準備清單',
        summary: '避難包應包含的基本物資',
        tags: ['避難包', '準備'],
        order: 1,
    },
    {
        id: 'sh-2',
        categoryId: 'shelter',
        title: '避難收容所生活須知',
        summary: '入住避難所的規則與注意事項',
        tags: ['避難所', '生活'],
        order: 2,
    },
    // ===== 戰爭 (3) =====
    {
        id: 'wa-1',
        categoryId: 'war',
        title: '空襲警報辨識與應變',
        summary: '認識防空警報類型與正確反應',
        tags: ['空襲', '警報'],
        order: 1,
    },
    {
        id: 'wa-2',
        categoryId: 'war',
        title: '防空避難所使用指南',
        summary: '如何找到並正確使用防空避難設施',
        tags: ['防空', '避難所'],
        order: 2,
    },
    {
        id: 'wa-3',
        categoryId: 'war',
        title: '戰時物資儲備與生存準備',
        summary: '戰爭期間的長期生存物資規劃',
        tags: ['物資', '儲備'],
        order: 3,
    },
    // ===== 核化災害 (2) =====
    {
        id: 'nu-1',
        categoryId: 'nuclear',
        title: '核災事故應變與防護',
        summary: '核電廠事故發生時的自我保護措施',
        tags: ['核災', '輻射'],
        order: 1,
    },
    {
        id: 'nu-2',
        categoryId: 'nuclear',
        title: '化學災害防護與應變',
        summary: '化學物質洩漏時的緊急處置',
        tags: ['化學', '毒氣'],
        order: 2,
    },
    // ===== 設施故障 (2) =====
    {
        id: 'in-1',
        categoryId: 'infrastructure',
        title: '停電應變與備援措施',
        summary: '大規模停電時的生活應變方法',
        tags: ['停電', '備援'],
        order: 1,
    },
    {
        id: 'in-2',
        categoryId: 'infrastructure',
        title: '瓦斯外洩緊急處理',
        summary: '發現瓦斯外洩時的正確處置步驟',
        tags: ['瓦斯', '外洩'],
        order: 2,
    },
    // ===== 戶外活動 (3) =====
    {
        id: 'od-1',
        categoryId: 'outdoor',
        title: '露營安全與緊急應變',
        summary: '營地選址、用火管理、暴雨撤離、失溫處置完整指南',
        tags: ['露營', '野營', '安全'],
        order: 1,
    },
    {
        id: 'od-2',
        categoryId: 'outdoor',
        title: '野外求生基本技能',
        summary: '迷途處置、保暖庳護、取水淨水、求援訊號完整指南',
        tags: ['求生', '迷路', '求援'],
        order: 2,
    },
    {
        id: 'od-3',
        categoryId: 'outdoor',
        title: '露營食安與飲水',
        summary: '食材保存、交叉污染預防、腹瀉處置、淨水流程完整指南',
        tags: ['食安', '淨水', '衛生'],
        order: 3,
    },
    // ===== 無線電通訊 (4) =====
    {
        id: 'ra-1',
        categoryId: 'radio',
        title: '無線電基本概念與法規',
        summary: '頻率/頻道概念、執照規定、台灣 NCC 法規說明',
        tags: ['無線電', '法規', '執照'],
        order: 1,
    },
    {
        id: 'ra-2',
        categoryId: 'radio',
        title: '無線電操作 SOP 與通聯禮儀',
        summary: '開機設定、呼叫格式、標準用語、通話紀錄',
        tags: ['操作', 'SOP', '禮儀'],
        order: 2,
    },
    {
        id: 'ra-3',
        categoryId: 'radio',
        title: '無線電故障排除與設備維護',
        summary: '常見問題診斷、天線檢查、電池管理、設備選購',
        tags: ['故障排除', '天線', '電池'],
        order: 3,
    },
    {
        id: 'ra-4',
        categoryId: 'radio',
        title: '戶外/救災情境通聯指南',
        summary: '隊伍分工、集合點規劃、LACES 回報、失聯處理、電量管理完整 SOP',
        tags: ['戶外', '救災', '通訊', 'SOP'],
        order: 4,
    },
];

// Fuse.js 搜尋設定
const fuseOptions = {
    keys: [
        { name: 'title', weight: 0.5 },
        { name: 'summary', weight: 0.3 },
        { name: 'tags', weight: 0.2 },
    ],
    threshold: 0.4, // 模糊匹配閾值 (0 = 精確, 1 = 全匹配)
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 2,
};

// 建立 Fuse 搜尋實例
const fuse = new Fuse(MANUALS, fuseOptions);

export default function ManualsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // 使用 Fuse.js 模糊搜尋
    const filteredManuals = useMemo(() => {
        let result = MANUALS;

        // 先按分類篩選
        if (selectedCategory) {
            result = result.filter(m => m.categoryId === selectedCategory);
        }

        // 使用 Fuse.js 進行模糊搜尋
        if (searchQuery.trim()) {
            const searchResults = selectedCategory
                ? new Fuse(result, fuseOptions).search(searchQuery)
                : fuse.search(searchQuery);

            return searchResults.map(r => r.item);
        }

        return result.sort((a, b) => a.order - b.order);
    }, [searchQuery, selectedCategory]);

    const selectedCategoryInfo = selectedCategory
        ? MANUAL_CATEGORIES.find(c => c.id === selectedCategory)
        : null;

    return (
        <div className="page manuals-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h1>實務手冊</h1>
                    <p className="page-subtitle">災難應變知識庫，支援離線存取</p>
                </div>
            </div>

            {/* 搜尋欄 */}
            <div className="manuals-search">
                <Search size={18} className="manuals-search__icon" aria-hidden="true" />
                <input
                    type="text"
                    placeholder="搜尋手冊標題、內容或標籤..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="manuals-search__input"
                    aria-label="搜尋手冊"
                />
                {searchQuery && (
                    <button
                        className="manuals-search__clear"
                        onClick={() => setSearchQuery('')}
                        aria-label="清除搜尋"
                        type="button"
                    >
                        <X size={14} aria-hidden="true" />
                    </button>
                )}
            </div>

            {/* 分類卡片 */}
            {!selectedCategory && (
                <div className="category-grid">
                    {MANUAL_CATEGORIES.map((category) => (
                        <Card
                            key={category.id}
                            className="category-card"
                            padding="md"
                            onClick={() => setSelectedCategory(category.id)}
                        >
                            <div
                                className="category-card__icon"
                                style={{ backgroundColor: `${category.color}20` }}
                            >
                                <category.Icon size={32} aria-hidden="true" />
                            </div>
                            <div className="category-card__content">
                                <h3 className="category-card__title">{category.name}</h3>
                                <p className="category-card__desc">{category.description}</p>
                                <Tag size="sm">{category.manualCount} 篇手冊</Tag>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* 手冊列表 */}
            {selectedCategory && (
                <div className="manuals-list-section">
                    <div className="manuals-list-header">
                        <button
                            className="manuals-back-btn"
                            onClick={() => setSelectedCategory(null)}
                            type="button"
                        >
                            <ArrowLeft size={16} aria-hidden="true" /> 返回分類
                        </button>
                        <div className="manuals-list-title">
                            <span aria-hidden="true" className="manuals-list-title__icon">
                                {selectedCategoryInfo && <selectedCategoryInfo.Icon size={24} />}
                            </span>
                            <h2>{selectedCategoryInfo?.name}</h2>
                        </div>
                    </div>

                    <div className="manuals-list">
                        {filteredManuals.length > 0 ? (
                            filteredManuals.map((manual) => (
                                <Link
                                    key={manual.id}
                                    to={`/manuals/${manual.id}`}
                                    className="manual-item"
                                >
                                    <div className="manual-item__content">
                                        <h3 className="manual-item__title">{manual.title}</h3>
                                        <p className="manual-item__summary">{manual.summary}</p>
                                        <div className="manual-item__tags">
                                            {manual.tags.map((tag) => (
                                                <Tag key={tag} size="sm">{tag}</Tag>
                                            ))}
                                        </div>
                                    </div>
                                    <ArrowRight size={20} className="manual-item__arrow" aria-hidden="true" />
                                </Link>
                            ))
                        ) : (
                            <EmptyState
                                icon={Inbox}
                                title="找不到符合條件的手冊"
                                description="試試其他分類或搜尋關鍵字"
                            />
                        )}
                    </div>
                </div>
            )}

            {/* 搜尋結果 (全域搜尋) */}
            {!selectedCategory && searchQuery && (
                <div className="manuals-search-results">
                    <h2>搜尋結果 ({filteredManuals.length})</h2>
                    <div className="manuals-list">
                        {filteredManuals.length > 0 ? (
                            filteredManuals.map((manual) => {
                                const category = MANUAL_CATEGORIES.find(c => c.id === manual.categoryId);
                                return (
                                    <Link
                                        key={manual.id}
                                        to={`/manuals/${manual.id}`}
                                        className="manual-item"
                                    >
                                        <div className="manual-item__category" aria-hidden="true">
                                            <span>{category && <category.Icon size={24} />}</span>
                                        </div>
                                        <div className="manual-item__content">
                                            <h3 className="manual-item__title">{manual.title}</h3>
                                            <p className="manual-item__summary">{manual.summary}</p>
                                        </div>
                                        <ArrowRight size={20} className="manual-item__arrow" aria-hidden="true" />
                                    </Link>
                                );
                            })
                        ) : (
                            <EmptyState
                                variant="search"
                                title={`找不到「${searchQuery}」相關的手冊`}
                                description="換個關鍵字試試看"
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
