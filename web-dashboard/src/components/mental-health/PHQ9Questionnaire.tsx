/**
 * PHQ9Questionnaire.tsx
 * 
 * Patient Health Questionnaire-9 (PHQ-9) for depression screening
 * Standard 9-question assessment tool
 */
import React, { useState } from 'react';
import './Questionnaire.css';

interface PHQ9QuestionnaireProps {
    onComplete: (score: number, answers: number[]) => void;
}

const PHQ9_QUESTIONS = [
    '做事時提不起勁或沒有樂趣',
    '感到心情低落、沮喪或絕望',
    '入睡困難、睡不安穩或睡眠過多',
    '感覺疲倦或沒有活力',
    '食慾不振或吃太多',
    '覺得自己很糟，或覺得自己很失敗，或讓自己或家人失望',
    '對事物專注有困難，例如閱讀報紙或看電視時',
    '動作或說話速度緩慢到別人已察覺？或正好相反，煩躁或坐立不安',
    '有不如死掉或用某種方式傷害自己的念頭',
];

const FREQUENCY_OPTIONS = [
    { value: 0, label: '完全不會' },
    { value: 1, label: '幾天' },
    { value: 2, label: '超過一半的天數' },
    { value: 3, label: '幾乎每天' },
];

const getResultInterpretation = (score: number) => {
    if (score <= 4) return { level: 'minimal', label: '極輕微', color: '#22c55e', advice: '目前狀態良好，請繼續保持健康的生活方式。' };
    if (score <= 9) return { level: 'mild', label: '輕度', color: '#84cc16', advice: '建議持續關注自己的情緒狀態，可嘗試運動、社交等活動。' };
    if (score <= 14) return { level: 'moderate', label: '中度', color: '#f59e0b', advice: '建議與信任的人談談，或考慮尋求專業諮詢。' };
    if (score <= 19) return { level: 'moderately-severe', label: '中重度', color: '#f97316', advice: '強烈建議尋求專業心理健康服務。' };
    return { level: 'severe', label: '重度', color: '#ef4444', advice: '請儘速聯繫心理健康專業人員或撥打 1925 安心專線。' };
};

export function PHQ9Questionnaire({ onComplete }: PHQ9QuestionnaireProps) {
    const [answers, setAnswers] = useState<(number | null)[]>(new Array(9).fill(null));
    const [showResult, setShowResult] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(0);

    const handleAnswer = (questionIndex: number, value: number) => {
        const newAnswers = [...answers];
        newAnswers[questionIndex] = value;
        setAnswers(newAnswers);

        // Auto-advance to next question
        if (questionIndex < 8) {
            setTimeout(() => setCurrentQuestion(questionIndex + 1), 300);
        }
    };

    const calculateScore = () => {
        return answers.reduce((sum, val) => sum + (val ?? 0), 0);
    };

    const allAnswered = answers.every(a => a !== null);
    const score = calculateScore();
    const result = getResultInterpretation(score);

    const handleSubmit = () => {
        if (!allAnswered) return;
        setShowResult(true);
        onComplete(score, answers as number[]);
    };

    if (showResult) {
        return (
            <div className="questionnaire questionnaire--result">
                <div className="questionnaire__result-header">
                    <h3>PHQ-9 評估結果</h3>
                </div>

                <div className="questionnaire__score" style={{ borderColor: result.color }}>
                    <span className="score-value" style={{ color: result.color }}>{score}</span>
                    <span className="score-max">/ 27 分</span>
                </div>

                <div className="questionnaire__level" style={{ background: result.color }}>
                    {result.label}憂鬱程度
                </div>

                <p className="questionnaire__advice">{result.advice}</p>

                {score >= 10 && (
                    <div className="questionnaire__hotline">
                        <strong>🆘 需要幫助嗎？</strong>
                        <p>安心專線：<a href="tel:1925">1925</a>（24小時免費）</p>
                        <p>生命線：<a href="tel:1995">1995</a></p>
                    </div>
                )}

                <button
                    className="questionnaire__btn"
                    onClick={() => {
                        setShowResult(false);
                        setAnswers(new Array(9).fill(null));
                        setCurrentQuestion(0);
                    }}
                >
                    重新評估
                </button>
            </div>
        );
    }

    return (
        <div className="questionnaire">
            <div className="questionnaire__header">
                <h3>PHQ-9 憂鬱症篩檢問卷</h3>
                <p>過去兩週內，您有多常被以下問題困擾？</p>
                <div className="questionnaire__progress">
                    <div
                        className="progress-bar"
                        style={{ width: `${(answers.filter(a => a !== null).length / 9) * 100}%` }}
                    />
                </div>
                <span className="progress-text">{answers.filter(a => a !== null).length} / 9</span>
            </div>

            <div className="questionnaire__questions">
                {PHQ9_QUESTIONS.map((question, idx) => (
                    <div
                        key={idx}
                        className={`question-item ${currentQuestion === idx ? 'current' : ''} ${answers[idx] !== null ? 'answered' : ''}`}
                    >
                        <div className="question-number">{idx + 1}</div>
                        <div className="question-content">
                            <p className="question-text">
                                {question}
                                {idx === 8 && <span className="warning-badge">⚠️ 重要</span>}
                            </p>
                            <div className="question-options">
                                {FREQUENCY_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        className={`option-btn ${answers[idx] === opt.value ? 'selected' : ''}`}
                                        onClick={() => handleAnswer(idx, opt.value)}
                                    >
                                        <span className="option-value">{opt.value}</span>
                                        <span className="option-label">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button
                className="questionnaire__submit"
                onClick={handleSubmit}
                disabled={!allAnswered}
            >
                {allAnswered ? '查看結果' : `還有 ${9 - answers.filter(a => a !== null).length} 題未作答`}
            </button>
        </div>
    );
}
