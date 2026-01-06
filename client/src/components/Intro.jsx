import React, { useEffect, useState } from 'react';

const Intro = ({ onComplete, isLoading }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [canProceed, setCanProceed] = useState(false);

  useEffect(() => {
    // Minimum display time for intro animation
    const minTimer = setTimeout(() => {
      setCanProceed(true);
    }, 2500);

    return () => clearTimeout(minTimer);
  }, []);

  // When loading is done AND minimum time passed, proceed
  useEffect(() => {
    if (canProceed && !isLoading) {
      setIsVisible(false);
      setTimeout(onComplete, 800);
    }
  }, [canProceed, isLoading, onComplete]);

  return (
    <div className={`intro-overlay ${!isVisible ? 'fade-out' : ''}`}>
      <div className="intro-content">
        <div className="icon-container bounce-in">
          <span className="intro-icon">📖</span>
        </div>
        <h1 className="slide-up">المُقيم القرآني</h1>
        <p className="fade-in-delay">حسّن تلاوتك.. وأتقن مخارج حروفك</p>

        {isLoading && (
          <div className="loading-indicator">
            <div className="loading-dots">
              <span></span><span></span><span></span>
            </div>
            <p>جاري تحضير الأسئلة...</p>
          </div>
        )}

        {!isLoading && canProceed && (
          <div className="ready-indicator fade-in-delay">
            ✅ جاهز للبدء!
          </div>
        )}
      </div>

      <style>{`
        .loading-indicator {
          margin-top: 2rem;
          text-align: center;
        }
        .loading-dots {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .loading-dots span {
          width: 10px;
          height: 10px;
          background: var(--primary-color);
          border-radius: 50%;
          animation: bounce 0.6s ease-in-out infinite;
        }
        .loading-dots span:nth-child(2) { animation-delay: 0.1s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.2s; }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .loading-indicator p {
          font-size: 0.9rem;
          opacity: 0.7;
        }
        .ready-indicator {
          margin-top: 2rem;
          font-size: 1.2rem;
          color: #4ade80;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

export default Intro;
