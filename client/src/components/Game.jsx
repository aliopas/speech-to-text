import React, { useState, useRef, useEffect } from 'react';

const Game = ({ session, onAnswer }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [feedback, setFeedback] = useState(null); // { isCorrect: bool, userText: '', target: '', feedbackAudio: 'base64' }
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const audioChunksRef = useRef([]);

    const currentQuestion = session.questions[session.currentIndex] || {};

    // Clean feedback when question changes
    useEffect(() => {
        setFeedback(null);
    }, [session.currentIndex]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const startRecording = async () => {
        if (isSubmitting) return;

        try {
            // Request high-quality audio for better STT accuracy
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1 // Mono is enough for speech
                }
            });

            // Use plain webm without codec specification (Groq compatible)
            const mimeType = MediaRecorder.isTypeSupported('audio/webm')
                ? 'audio/webm'
                : 'audio/mp4';

            console.log('Recording with format:', mimeType);

            const recorder = new MediaRecorder(stream, { mimeType });

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                if (audioChunksRef.current.length === 0) return;
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                audioChunksRef.current = []; // reset

                // Stop all audio tracks
                stream.getTracks().forEach(track => track.stop());

                handleAudioSubmit(audioBlob);
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (err) {
            console.error("Mic Error:", err);
            alert("يرجى السماح باستخدام الميكروفون.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            setIsRecording(false);
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const handleAudioSubmit = async (blob) => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        // Send to parent to handle API
        const result = await onAnswer(blob);
        console.log('Answer result:', result);
        setFeedback(result);
        setIsSubmitting(false);

        // Play feedback audio if available
        if (result.feedbackAudio) {
            const audio = new Audio(`data:audio/mpeg;base64,${result.feedbackAudio}`);
            audio.play();
        }

        // If correct, auto-advance after 3 seconds (always, with or without audio)
        if (result.isCorrect) {
            setTimeout(() => {
                setFeedback(null);
            }, 3000);
        }
    };

    if (!currentQuestion) return <div className="game-container"><h1>اكتملت الأسئلة! أحسنت.</h1></div>;

    return (
        <div className="game-container">
            <div className="status-bar">
                <span>السورة: {currentQuestion.surahName || session.surahName}</span>
                <span>السؤال: {session.currentIndex + 1} / {session.questions.length}</span>
            </div>

            <div className="question-card">
                <h2 className="instruction-text">أكمل الآية التالية (انطق الكلمة الناقصة):</h2>

                <div className="verse-display">
                    <p className="quran-text">
                        {currentQuestion.clozeText || "..."}
                    </p>
                </div>

                <div className="options-container">
                    {currentQuestion.options && currentQuestion.options.map((opt, idx) => (
                        <span key={idx} className="option-badge">{opt}</span>
                    ))}
                </div>
            </div>

            <div className="controls-area">
                {!feedback && (
                    <button
                        className={`record-btn ${isRecording ? 'recording' : ''} ${isSubmitting ? 'disabled' : ''}`}
                        onClick={toggleRecording}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'جاري التحليل...' : (isRecording ? 'اضغط لإيقاف التسجيل 🔴' : 'اضغط للتسجيل 🎙️')}
                    </button>
                )}

                {feedback && (
                    <div className={`feedback-result ${feedback.isCorrect ? 'correct' : 'wrong'}`}>
                        {feedback.isCorrect ? (
                            <div className="success-msg">
                                <h3>ممتاز! ✨</h3>
                                <p>نطق صحيح.</p>
                            </div>
                        ) : (
                            <div className="error-msg">
                                <h3>حاول مرة أخرى 😔</h3>
                                <p>أنت قلت: "{feedback.userText}"</p>
                                <p>استمع للتصحيح 🔊</p>
                            </div>
                        )}

                        {/* Next Button */}
                        {feedback.isCorrect && (
                            <button className="next-btn" onClick={() => setFeedback(null)}>السؤال التالي ⬅️</button>
                        )}
                        {!feedback.isCorrect && (
                            <button className="retry-btn" onClick={() => setFeedback(null)}>محاولة جديدة 🔄</button>
                        )}
                    </div>
                )}
            </div>

            <style>{`
            .game-container {
                display: flex;
                flex-direction: column;
                height: 100%;
                padding: 1rem;
                text-align: center;
                gap: 2rem;
            }
            .status-bar {
                display: flex;
                justify-content: space-between;
                color: #aaa;
                font-size: 0.9rem;
            }
            .question-card {
                background: #1e1e1e;
                padding: 2rem;
                border-radius: 1rem;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                border: 1px solid #333;
            }
            .instruction-text {
                color: #aaa;
                font-size: 1rem;
                margin-bottom: 1rem;
            }
            .verse-display .quran-text {
                font-size: 2.2rem;
                color: white;
                line-height: 1.8;
                margin-bottom: 1.5rem;
            }
            .highlight-word {
                color: var(--secondary-color);
                font-weight: bold;
                font-size: 1.4rem;
            }
            .record-btn {
                background: var(--primary-color);
                color: white;
                border: none;
                padding: 1.5rem 3rem;
                font-size: 1.2rem;
                border-radius: 50px;
                cursor: pointer;
                transition: transform 0.1s;
                font-family: inherit;
                box-shadow: 0 4px 10px rgba(46, 125, 50, 0.4);
            }
            .record-btn:active {
                transform: scale(0.95);
            }
            .record-btn.recording {
                background: #e53935;
                animation: pulse-red 1.5s infinite;
            }
            @keyframes pulse-red {
                0% { box-shadow: 0 0 0 0 rgba(229, 57, 53, 0.7); }
                70% { box-shadow: 0 0 0 20px rgba(229, 57, 53, 0); }
                100% { box-shadow: 0 0 0 0 rgba(229, 57, 53, 0); }
            }
            .feedback-result {
                padding: 1.5rem;
                border-radius: 1rem;
                margin-top: 1rem;
                animation: slideUp 0.3s ease-out;
            }
            .feedback-result.correct {
                background: rgba(76, 175, 80, 0.2);
                border: 1px solid var(--success-color);
            }
            .feedback-result.wrong {
                background: rgba(244, 67, 54, 0.2);
                border: 1px solid var(--error-color);
            }
            .options-container {
                display: flex;
                gap: 1rem;
                justify-content: center;
                margin-top: 1rem;
                flex-wrap: wrap;
            }
            .option-badge {
                background: #333;
                color: #ddd;
                padding: 0.5rem 1.5rem;
                border-radius: 20px;
                border: 1px solid #444;
                font-family: inherit;
                font-size: 1.1rem;
            }
            .next-btn, .retry-btn {
                margin-top: 1rem;
                padding: 0.8rem 2rem;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1rem;
                font-family: inherit;
            }
            .next-btn { background: var(--secondary-color); color: black; font-weight: bold; }
            .retry-btn { background: #555; color: white; }
        `}</style>
        </div>
    );
};

export default Game;
