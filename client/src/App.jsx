import { useState, useEffect, useRef } from 'react';
import Intro from './components/Intro';
import Game from './components/Game';
import Summary from './components/Summary';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [gameSession, setGameSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  const initializedRef = useRef(false);

  // Start loading questions immediately when app mounts (during intro)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initializeGame();
  }, []);

  // 1. Start Game Session
  const initializeGame = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/game/start`, { method: 'POST' });
      const data = await res.json();
      console.log('Game session started:', data);
      setGameSession(data);
    } catch (err) {
      console.error("Start Game Error", err);
      alert("تعذر الاتصال بالخادم. تأكد من تشغيل السيرفر.");
    } finally {
      setLoading(false);
    }
  };

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  // 2. Handle Audio Answer
  const handleAnswer = async (audioBlob) => {
    if (!gameSession) return;

    const formData = new FormData();
    const ext = audioBlob.type.split('/')[1] || 'webm';
    formData.append('audio', audioBlob, `recording.${ext}`);
    formData.append('sessionId', gameSession.sessionId);

    try {
      const res = await fetch(`${API_URL}/game/answer`, {
        method: 'POST',
        body: formData
      });
      const result = await res.json();

      // Check if we should show summary (after 10 correct answers in a batch)
      if (result.showSummary) {
        // Fetch summary data
        try {
          const summaryRes = await fetch(`${API_URL}/game/summary/${gameSession.sessionId}`);
          const summary = await summaryRes.json();
          setSummaryData(summary);
          setTimeout(() => setShowSummary(true), 3000); // Show after correct feedback
        } catch (e) {
          console.error('Failed to fetch summary', e);
        }
      }

      // Update local state AFTER delay if correct
      if (result.isCorrect) {
        setTimeout(() => {
          setGameSession(prev => ({
            ...prev,
            currentIndex: result.currentIndex || prev.currentIndex + 1,
            totalAnswered: result.totalAnswered
          }));
        }, 3000);
      }

      return result;
    } catch (err) {
      console.error("Submit Answer Error", err);
      return { isCorrect: false, userText: "Error", feedbackAudio: null };
    }
  };

  const handleContinueFromSummary = async () => {
    // Sync with server to get new questions (prefetching happened in background)
    if (gameSession?.sessionId) {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/game/session/${gameSession.sessionId}`);
        const updatedSession = await res.json();

        if (updatedSession && updatedSession.questions) {
          setGameSession(updatedSession);
        }
      } catch (err) {
        console.error("Sync Error:", err);
      } finally {
        setLoading(false);
      }
    }

    setShowSummary(false);
    setSummaryData(null);
  };

  return (
    <div className="app-root">
      {showIntro && <Intro onComplete={handleIntroComplete} isLoading={loading} />}

      {!showIntro && (
        <main className="main-content">
          <header className="app-header">
            <div className="logo">🎤 المُقيم القرآني</div>
            {gameSession && (
              <div className="score-display">
                النقاط: {gameSession.totalAnswered || 0}
              </div>
            )}
          </header>

          {loading && !gameSession && (
            <div className="loading-screen">
              <div className="spinner"></div>
              <p>جاري تحضير الأسئلة...</p>
            </div>
          )}

          {showSummary && summaryData ? (
            <Summary data={summaryData} onContinue={handleContinueFromSummary} />
          ) : (
            gameSession && <Game session={gameSession} onAnswer={handleAnswer} />
          )}
        </main>
      )}

      <style>{`
        .app-root { height: 100vh; display: flex; flex-direction: column; }
        .app-header {
            padding: 1rem 2rem;
            background: rgba(0,0,0,0.2);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .logo { font-size: 1.5rem; color: var(--secondary-color); font-weight: bold; }
        .score-display {
            background: linear-gradient(135deg, #667eea, #764ba2);
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-weight: bold;
        }
        .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            max-width: 800px;
            width: 100%;
            margin: 0 auto;
        }
        .loading-screen {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: #ccc;
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255,255,255,0.1);
            border-left-color: var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 1rem;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default App;
