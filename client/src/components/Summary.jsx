import { useState } from 'react';

function Summary({ data, onContinue }) {
    if (!data) return null;

    const scorePercentage = Math.round((data.correctCount / data.totalQuestions) * 100);

    return (
        <div className="summary-container">
            <div className="summary-card">
                <h1 className="summary-title">📊 ملخص الجولة</h1>

                <div className="score-circle">
                    <svg viewBox="0 0 100 100">
                        <circle
                            cx="50" cy="50" r="45"
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="8"
                        />
                        <circle
                            cx="50" cy="50" r="45"
                            fill="none"
                            stroke={scorePercentage >= 70 ? '#4ade80' : scorePercentage >= 40 ? '#fbbf24' : '#f87171'}
                            strokeWidth="8"
                            strokeDasharray={`${scorePercentage * 2.83} 283`}
                            strokeLinecap="round"
                            transform="rotate(-90 50 50)"
                        />
                    </svg>
                    <div className="score-text">
                        {scorePercentage}%
                    </div>
                </div>

                <div className="stats-row">
                    <div className="stat-item correct">
                        <span className="stat-number">{data.correctCount}</span>
                        <span className="stat-label">صحيح ✅</span>
                    </div>
                    <div className="stat-item wrong">
                        <span className="stat-number">{data.wrongCount}</span>
                        <span className="stat-label">خطأ ❌</span>
                    </div>
                </div>

                {data.wrongAnswers && data.wrongAnswers.length > 0 && (
                    <div className="mistakes-section">
                        <h3>🧐 مراجعة الأخطاء:</h3>
                        <div className="mistakes-grid">
                            {data.wrongAnswers.map((mistake, idx) => (
                                <div key={idx} className="mistake-card">
                                    <div className="mistake-verse">"..{mistake.question}.."</div>
                                    <div className="comparison-row">
                                        <div className="comp-box wrong">
                                            <span className="comp-label">أنت قلت:</span>
                                            <span className="comp-val">{mistake.userSaid}</span>
                                        </div>
                                        <div className="arrow-icon">⬅️</div>
                                        <div className="comp-box correct">
                                            <span className="comp-label">الصحيح:</span>
                                            <span className="comp-val">{mistake.correct}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="analysis-section">
                    <h3>💡 نصائح معلمك الخاص:</h3>
                    <p className="analysis-text">{data.analysis}</p>
                </div>

                <div className="total-score">
                    🏆 نقاطك: <strong>{data.overallScore}</strong>
                </div>

                <button className="continue-btn" onClick={onContinue}>
                    استكمال التحدي 🚀
                </button>
            </div>

            <style>{`
                .summary-container {
                    flex: 1;
                    display: flex;
                    justify-content: center; /* Center horizontally */
                    align-items: center;    /* Center vertically */
                    padding: 1rem;
                    overflow-y: auto;       /* Allow scrolling if content is tall */
                    min-height: 100%;       /* Full height */
                }
                .summary-card {
                    background: #1e1e24;
                    border-radius: 20px;
                    padding: 2rem;
                    width: 100%;
                    max-width: 500px;       /* Good for desktop */
                    box-shadow: 0 10px 40px rgba(0,0,0,0.6);
                    border: 1px solid #333;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    margin: auto;           /* Extra centering safety */
                }
                .summary-title {
                    text-align: center;
                    font-size: 1.5rem;
                    margin: 0;
                    color: white;
                }
                .score-circle {
                    width: 120px;
                    height: 120px;
                    margin: 0 auto;
                    position: relative;
                }
                .score-circle svg { width: 100%; height: 100%; }
                .score-text {
                    position: absolute; top: 50%; left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 1.8rem; font-weight: bold; color: white;
                }
                
                /* Stats Row */
                .stats-row {
                    display: flex;
                    justify-content: center;
                    gap: 2rem;
                    background: #2a2a35;
                    padding: 1rem;
                    border-radius: 15px;
                }
                .stat-item { display: flex; flex-direction: column; align-items: center; }
                .stat-number { font-size: 1.8rem; font-weight: bold; line-height: 1; }
                .stat-label { font-size: 0.8rem; color: #aaa; margin-top: 0.3rem; }
                
                /* Mistakes Section */
                .mistakes-section h3 {
                    font-size: 1rem; color: #aaa; margin-bottom: 0.8rem;
                }
                .mistakes-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 0.8rem;
                    max-height: 300px;
                    overflow-y: auto;
                    padding-right: 5px; /* space for scrollbar */
                }
                .mistake-card {
                    background: #2a2a35;
                    border-radius: 12px;
                    padding: 1rem;
                    border-left: 4px solid #f87171;
                }
                .mistake-verse {
                    color: #fff;
                    font-family: 'Amiri', serif;
                    font-size: 1rem;
                    margin-bottom: 0.8rem;
                    opacity: 0.9;
                }
                .comparison-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.5rem;
                    background: rgba(0,0,0,0.2);
                    padding: 0.5rem;
                    border-radius: 8px;
                }
                .comp-box {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .comp-label { font-size: 0.7rem; color: #888; margin-bottom: 2px; }
                .comp-val { font-weight: bold; font-size: 0.95rem; }
                .comp-box.wrong .comp-val { color: #f87171; }
                .comp-box.correct .comp-val { color: #4ade80; }
                .arrow-icon { font-size: 1rem; opacity: 0.5; }

                /* Analysis */
                .analysis-section {
                    background: rgba(102,126,234,0.1);
                    border: 1px solid rgba(102,126,234,0.3);
                    border-radius: 12px;
                    padding: 1rem;
                }
                .analysis-section h3 { color: #667eea; font-size: 0.9rem; margin-bottom: 0.5rem; }
                .analysis-text { font-size: 0.9rem; line-height: 1.5; color: #ddd; }

                /* Total & Button */
                .total-score {
                    text-align: center;
                    background: #ffd7001a;
                    color: #ffd700;
                    padding: 0.8rem;
                    border-radius: 10px;
                    font-size: 1rem;
                }
                .continue-btn {
                    width: 100%;
                    padding: 1.2rem;
                    background: linear-gradient(90deg, #667eea, #764ba2);
                    border: none;
                    color: white;
                    font-size: 1.1rem;
                    font-weight: bold;
                    border-radius: 50px;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(118, 75, 162, 0.4);
                    transition: transform 0.2s;
                }
                .continue-btn:active { transform: scale(0.98); }

                /* Mobile Responsiveness */
                @media (max-width: 480px) {
                    .summary-container { padding: 0.5rem; align-items: flex-start; } /* Top align on mobile to avoid cut off */
                    .summary-card {
                        padding: 1.2rem;
                        border-radius: 15px;
                        margin-top: 1rem;
                        margin-bottom: 1rem;
                    }
                    .score-circle { width: 100px; height: 100px; }
                    .stats-row { gap: 1rem; padding: 0.8rem; }
                    .stat-number { font-size: 1.4rem; }
                    .comparison-row { flex-direction: column; text-align: center; }
                    .arrow-icon { transform: rotate(90deg); margin: 0.2rem 0; }
                    .mistake-verse { text-align: center; font-size: 0.9rem; }
                    .continue-btn { padding: 1rem; font-size: 1rem; }
                }

                /* Scrollbar polish */
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
            `}</style>
        </div>
    );
}

export default Summary;
