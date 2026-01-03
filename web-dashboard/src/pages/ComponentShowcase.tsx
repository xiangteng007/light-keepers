import React, { useState } from 'react';
import { ManualButton } from '../components/manual/ManualButton';
import { ManualCard } from '../components/manual/ManualCard';
import { ManualTag } from '../components/manual/ManualTag';
import { RiskBadge } from '../components/manual/RiskBadge';
import { ManualSearchInput } from '../components/manual/ManualSearchInput';
import '../styles/manual-design-system.css';
import './ComponentShowcase.css';

export const ComponentShowcase: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>(['急救']);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    return (
        <div className="showcase">
            <div className="showcase-header">
                <h1>災防手冊組件展示</h1>
                <p>所有新組件的互動效果預覽</p>
            </div>

            <div className="showcase-content">

                {/* 1. ManualButton */}
                <section className="showcase-section">
                    <h2>ManualButton - 半透明實心按鈕</h2>
                    <p className="showcase-desc">50% 透明度，Hover 70%，Active 65%</p>
                    <div className="showcase-demo">
                        <ManualButton onClick={() => alert('按鈕點擊！')}>
                            預設按鈕
                        </ManualButton>
                        <ManualButton fullWidth onClick={() => alert('全寬按鈕！')}>
                            全寬按鈕
                        </ManualButton>
                        <ManualButton disabled>
                            停用按鈕
                        </ManualButton>
                    </div>
                    <div className="showcase-code">
                        <pre>{`<ManualButton onClick={...}>預設按鈕</ManualButton>
<ManualButton fullWidth>全寬按鈕</ManualButton>
<ManualButton disabled>停用按鈕</ManualButton>`}</pre>
                    </div>
                </section>

                {/* 2. ManualCard - Task Flow */}
                <section className="showcase-section">
                    <h2>ManualCard - 任務流程卡片</h2>
                    <p className="showcase-desc">280px × 180px，包含圖示、標題、描述、標籤、風險標籤</p>
                    <div className="showcase-demo">
                        <ManualCard
                            variant="task-flow"
                            title="出勤前準備"
                            description="裝備檢查、風險評估、任務簡報"
                            icon="🎒"
                            tags={['裝備', '檢查']}
                            riskLevel="low"
                            onClick={() => alert('卡片點擊！')}
                        />
                        <ManualCard
                            variant="task-flow"
                            title="現場執行"
                            description="執行救援、管理現場、持續通報"
                            icon="🔧"
                            tags={['救援', '執行']}
                            riskLevel="high"
                            onClick={() => alert('卡片點擊！')}
                        />
                    </div>
                </section>

                {/* 3. ManualCard - Manual List */}
                <section className="showcase-section">
                    <h2>ManualCard - 手冊列表卡片</h2>
                    <p className="showcase-desc">橫向佈局，適合列表顯示</p>
                    <div className="showcase-demo showcase-demo--column">
                        <ManualCard
                            variant="manual-list"
                            title="志工出勤基本裝備清單"
                            description="完整的個人裝備準備指南"
                            icon="🎒"
                            riskLevel="low"
                            onClick={() => alert('卡片點擊！')}
                        />
                        <ManualCard
                            variant="manual-list"
                            title="無線電通聯標準流程"
                            description="基本通訊協定與緊急呼叫"
                            icon="📻"
                            riskLevel="medium"
                            onClick={() => alert('卡片點擊！')}
                        />
                    </div>
                </section>

                {/* 4. ManualCard - Field Entry */}
                <section className="showcase-section">
                    <h2>ManualCard - 場域入口卡片</h2>
                    <p className="showcase-desc">圖標置中，顯示文章數量</p>
                    <div className="showcase-demo">
                        <ManualCard
                            variant="field-entry"
                            title="都會環境"
                            icon="🏙️"
                            articleCount={15}
                            onClick={() => alert('卡片點擊！')}
                        />
                        <ManualCard
                            variant="field-entry"
                            title="山域/戶外"
                            icon="⛰️"
                            articleCount={12}
                            onClick={() => alert('卡片點擊！')}
                        />
                        <ManualCard
                            variant="field-entry"
                            title="水域"
                            icon="🌊"
                            articleCount={8}
                            onClick={() => alert('卡片點擊！')}
                        />
                    </div>
                </section>

                {/* 5. ManualCard - Featured */}
                <section className="showcase-section">
                    <h2>ManualCard - 推薦卡片</h2>
                    <p className="showcase-desc">大圖標區域，適合特別推薦</p>
                    <div className="showcase-demo">
                        <ManualCard
                            variant="featured"
                            title="CPR 與 AED 操作指南"
                            description="緊急情況下的心肺復甦術完整流程"
                            icon="❤️"
                            onClick={() => alert('卡片點擊！')}
                        />
                    </div>
                </section>

                {/* 6. ManualTag */}
                <section className="showcase-section">
                    <h2>ManualTag - 邊框標籤</h2>
                    <p className="showcase-desc">透明背景、深藍邊框、可選中狀態</p>
                    <div className="showcase-demo">
                        {['急救', '通訊', '避難', '搜救', '安全'].map(tag => (
                            <ManualTag
                                key={tag}
                                selected={selectedTags.includes(tag)}
                                onClick={() => toggleTag(tag)}
                            >
                                {tag}與醫護
                            </ManualTag>
                        ))}
                    </div>
                    <div className="showcase-code">
                        <pre>{`<ManualTag selected onClick={...}>急救與醫護</ManualTag>
<ManualTag>通訊作業</ManualTag>`}</pre>
                    </div>
                </section>

                {/* 7. RiskBadge */}
                <section className="showcase-section">
                    <h2>RiskBadge - 風險標籤</h2>
                    <p className="showcase-desc">完整標籤（色塊 + 圖示 + 文字）</p>
                    <div className="showcase-demo">
                        <RiskBadge level="low" />
                        <RiskBadge level="medium" />
                        <RiskBadge level="high" />
                        <RiskBadge level="critical" />
                    </div>
                    <div className="showcase-demo">
                        <RiskBadge level="low" showIcon={false} />
                        <RiskBadge level="medium" showText={false} />
                    </div>
                    <div className="showcase-code">
                        <pre>{`<RiskBadge level="low" />
<RiskBadge level="medium" showIcon={false} />
<RiskBadge level="high" showText={false} />`}</pre>
                    </div>
                </section>

                {/* 8. ManualSearchInput */}
                <section className="showcase-section">
                    <h2>ManualSearchInput - 搜索框</h2>
                    <p className="showcase-desc">極簡內嵌樣式，透明背景、細邊框</p>
                    <div className="showcase-demo">
                        <ManualSearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="搜尋手冊、情境..."
                        />
                    </div>
                    <div className="showcase-code">
                        <pre>{`<ManualSearchInput
  value={searchQuery}
  onChange={setSearchQuery}
  placeholder="搜尋手冊、情境..."
/>`}</pre>
                    </div>
                </section>

                {/* 互動狀態說明 */}
                <section className="showcase-section">
                    <h2>互動狀態</h2>
                    <div className="showcase-states">
                        <div className="state-card">
                            <h3>Hover 狀態</h3>
                            <ul>
                                <li>按鈕：50% → 70% 透明度</li>
                                <li>卡片：上提 2px + 邊框變金色</li>
                                <li>標籤：邊框變金色 + 淺背景</li>
                            </ul>
                        </div>
                        <div className="state-card">
                            <h3>Active 狀態</h3>
                            <ul>
                                <li>按鈕：縮小至 98%</li>
                                <li>卡片：回到原位</li>
                                <li>轉換時間：100ms ease-in</li>
                            </ul>
                        </div>
                        <div className="state-card">
                            <h3>Focus 狀態</h3>
                            <ul>
                                <li>金色 2px 外框</li>
                                <li>3px 偏移距離</li>
                                <li>支援鍵盤 Tab 導航</li>
                            </ul>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
};
