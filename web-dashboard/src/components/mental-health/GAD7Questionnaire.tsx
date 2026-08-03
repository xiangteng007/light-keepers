/**
 * GAD7Questionnaire.tsx
 * 
 * Generalized Anxiety Disorder 7-item (GAD-7) scale
 */
import React, { useState } from 'react';
import { SosIcon } from '../../design-system/icons';
import './Questionnaire.css';

interface GAD7QuestionnaireProps {
    onComplete: (score: number, answers: number[]) => void;
}

const GAD7_QUESTIONS = [
    '感覺緊張、焦慮或心煩',
    '不能停止或控制擔憂',
    '對各種事情擔憂過多',
    '難以放鬆',
    '焦躁不安，很難靜坐',
    '變得容易煩躁或急躁',
    '感到害怕，好像要有可怕的事情發生',
];

const FREQUENCY_OPTIONS = [
    { value: 0, label: '完全不會' },
    { value: 1, label: '幾天' },
    { value: 2, label: '超過一半的天數' },
    { value: 3, label: '幾乎每天' },
];

const getResultInterpretation = (score: number) => {
    if (score <= 4) return { level: 'minimal', label: '極輕微', color: '#22c55e', advice: '目前焦慮程度在正常範圍，請繼續保持。' };
    if (score <= 9) return { level: 'mild', label: '輕度', color: '#84cc16', advice: '可能有輕微焦慮，建議進行放鬆練習或運動。' };
    if (score <= 14) return { level: 'moderate', label: '中度', color: '#f59e0b', advice: '焦慮程度值得關注，建議考慮尋求專業協助。' };
    return { level: 'severe', label: '重度', color: '#ef4444', advice: '建議儘速尋求心理健康專業人員協助。' };
};

export function GAD7Questionnaire({ onComplete }: GAD7QuestionnaireProps) {
    const [answers, setAnswers] = useState<(number | null)[]>(new Array(7).fill(null));
    const [showResult, setShowResult] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(0);

    const handleAnswer = (questionIndex: number, value: number) => {
        const newAnswers = [...answers];
        newAnswers[questionIndex] = value;
        setAnswers(newAnswers);

        if (questionIndex < 6) {
            setTimeout(() => setCurrentQuestion(questionIndex + 1), 300);
        }
    };

    const calculateScore = (): number => {
        return answers.reduce<number>((sum, val) => sum + (val ?? 0), 0);
    };

    const allAnswered = answers.every(a => a !== null);
    const score: number = answers.reduce<number>((sum, val) => sum + (val ?? 0), 0);
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
                    <h3>GAD-7 評估結果</h3>
                </div>

                <div className="questionnaire__score" style={{ borderColor: result.color }}>
                    <span className="score-value" style={{ color: result.color }}>{score}</span>
                    <span className="score-max">/ 21 分</span>
                </div>

                <div className="questionnaire__level" style={{ background: result.color }}>
                    {result.label}焦慮程度
                </div>

                <p className="questionnaire__advice">{result.advice}</p>

                {score >= 10 && (
                    <div className="questionnaire__hotline">
                        <strong><SosIcon size={16} aria-hidden="true" /> 需要幫助嗎？</strong>
                        <p>安心專線：<a href="tel:1925">1925</a>（24小時免費）</p>
                    </div>
                )}

                <button
                    className="questionnaire__btn"
                    onClick={() => {
                        setShowResult(false);
                        setAnswers(new Array(7).fill(null));
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
                <h3>GAD-7 焦慮症篩檢問卷</h3>
                <p>過去兩週內，您有多常被以下問題困擾？</p>
                <div className="questionnaire__progress">
                    <div
                        className="progress-bar"
                        style={{ width: `${(answers.filter(a => a !== null).length / 7) * 100}%` }}
                    />
                </div>
                <span className="progress-text">{answers.filter(a => a !== null).length} / 7</span>
            </div>

            <div className="questionnaire__questions">
                {GAD7_QUESTIONS.map((question, idx) => (
                    <div
                        key={idx}
                        className={`question-item ${currentQuestion === idx ? 'current' : ''} ${answers[idx] !== null ? 'answered' : ''}`}
                    >
                        <div className="question-number">{idx + 1}</div>
                        <div className="question-content">
                            <p className="question-text">{question}</p>
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
                {allAnswered ? '查看結果' : `還有 ${7 - answers.filter(a => a !== null).length} 題未作答`}
            </button>
        </div>
    );
}
