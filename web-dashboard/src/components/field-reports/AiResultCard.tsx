import type { ReportSummaryOutput } from '../../services/aiQueueApi';
import './AiResultCard.css';

interface AiResultCardProps {
    result: ReportSummaryOutput;
    isFallback: boolean;
    onAccept: () => void;
    onReject: () => void;
    onDismiss: () => void;
    isLoading?: boolean;
}

const SEVERITY_LABELS = ['低', '中', '高', '危急', '嚴重'];
const SEVERITY_COLORS = ['#4ade80', '#facc15', '#fb923c', '#ef4444', '#dc2626'];

const CATEGORY_LABELS: Record<string, string> = {
    flood: '水災',
    fire: '火災',
    earthquake: '地震',
    traffic: '交通事故',
    medical: '醫療',
    infrastructure: '基礎設施',
    other: '其他',
};

/**
 * Component for displaying AI analysis results
 */
export function AiResultCard({
    result,
    isFallback,
    onAccept,
    onReject,
    onDismiss,
    isLoading = false,
}: AiResultCardProps) {
    const severityIndex = Math.min(Math.max(result.suggestedSeverity, 0), 4);
    const confidencePercent = Math.round(result.confidence);

    return (
        <div className={`ai-result-card ${isFallback ? 'fallback' : ''}`}>
            {/* Header */}
            <div className="ai-result-header">
                <div className="ai-result-title">
                    <span className="ai-icon">🤖</span>
                    <span>AI 分析結果</span>
                    {isFallback && <span className="fallback-badge">備用</span>}
                </div>
                <button className="dismiss-btn" onClick={onDismiss} aria-label="關閉">
                    ✕
                </button>
            </div>

            {/* Summary */}
            <div className="ai-result-summary">
                <p>{result.summary}</p>
            </div>

            {/* Confidence */}
            <div className="ai-result-confidence">
                <span className="confidence-label">信心度</span>
                <div className="confidence-bar">
                    <div
                        className="confidence-fill"
                        style={{
                            width: `${confidencePercent}%`,
                            backgroundColor: confidencePercent >= 80 ? '#4ade80' :
                                confidencePercent >= 50 ? '#facc15' : '#ef4444'
                        }}
                    />
                </div>
                <span className="confidence-value">{confidencePercent}%</span>
            </div>

            {/* Suggested Classification */}
            <div className="ai-result-classification">
                <div className="classification-item">
                    <span className="label">建議分類</span>
                    <span className="value category-badge">
                        {CATEGORY_LABELS[result.suggestedCategory] || result.suggestedCategory}
                    </span>
                </div>
                <div className="classification-item">
                    <span className="label">建議嚴重度</span>
                    <span
                        className="value severity-badge"
                        style={{ backgroundColor: SEVERITY_COLORS[severityIndex] }}
                    >
                        {SEVERITY_LABELS[severityIndex]}
                    </span>
                </div>
            </div>

            {/* Identified Needs */}
            {result.identifiedNeeds.length > 0 && (
                <div className="ai-result-section">
                    <h4>🔧 需要的資源</h4>
                    <ul className="needs-list">
                        {result.identifiedNeeds.map((need, idx) => (
                            <li key={idx}>{need}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Questions to Ask */}
            {result.questionsToAsk.length > 0 && (
                <div className="ai-result-section">
                    <h4>❓ 建議詢問</h4>
                    <ul className="questions-list">
                        {result.questionsToAsk.map((q, idx) => (
                            <li key={idx}>{q}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Actions */}
            <div className="ai-result-actions">
                <button
                    className="btn-accept"
                    onClick={onAccept}
                    disabled={isLoading}
                >
                    ✓ 套用建議
                </button>
                <button
                    className="btn-reject"
                    onClick={onReject}
                    disabled={isLoading}
                >
                    ✗ 拒絕
                </button>
            </div>
        </div>
    );
}

export default AiResultCard;
