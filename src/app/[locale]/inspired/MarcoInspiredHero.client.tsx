'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type Question = {
  text: string
  choices: string[]
}

const QUESTIONS: Question[] = [
  {
    text: "Hola ! 👋 Je suis Marco, votre guide Tenerife Activity ! Vous voyagez comment ?",
    choices: ['👨‍👩‍👧‍👦 En famille', '💑 En couple', '👫 Entre amis', '🧍 Solo'],
  },
  {
    text: 'Super ! Quelle ambiance vous fait rêver à Ténérife ?',
    choices: ['🌊 Mer & plage', '🏔️ Montagne & nature', '🎭 Aventure & sport', '🌅 Tout découvrir'],
  },
  {
    text: 'J’adore ! Côté durée, vous préférez ?',
    choices: ['⚡ Demi-journée', '🌅 Journée complète', '🌙 Plusieurs jours'],
  },
  {
    text: 'Parfait ! Quel budget par personne ?',
    choices: ['💚 Moins de 50€', '💛 50–100€', '🧡 100–200€', '❤️ Pas de limite !'],
  },
  {
    text: 'Dernière question ! Des besoins particuliers ?',
    choices: ['✅ Rien de particulier', '👶 Enfants en bas âge', '♿ Mobilité réduite', '🎯 Autres'],
  },
]

const TOTAL_QUESTIONS = QUESTIONS.length

type StarConfig = {
  left: number
  top: number
  delay: number
  duration: number
}

type MarcoInspiredHeroProps = {
  autoOpen?: boolean
}

export function MarcoInspiredHero({ autoOpen = false }: MarcoInspiredHeroProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [choicesVisible, setChoicesVisible] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null)

  const stars = useMemo<StarConfig[]>(() => {
    const result: StarConfig[] = []
    for (let i = 0; i < 40; i++) {
      result.push({
        left: Math.random() * 100,
        top: Math.random() * 70,
        delay: Math.random() * 4,
        duration: 2 + Math.random() * 3,
      })
    }
    return result
  }, [])

  const progressPercent = Math.round(
    (Math.min(step, TOTAL_QUESTIONS) / TOTAL_QUESTIONS) * 100
  )
  const startQuestion = useCallback(
    (index: number) => {
      const question = QUESTIONS[index]
      if (!question) return

      setIsTyping(true)
      setChoicesVisible(false)
      setCurrentQuestion(null)

      const delay = 700 + question.text.length * 11

      window.setTimeout(() => {
        setCurrentQuestion(question.text)
        setIsTyping(false)

        window.setTimeout(() => {
          setChoicesVisible(true)
        }, 180)
      }, delay)
    },
    []
  )

  // Auto-open chat when requested (e.g. arriving from "Inspire-moi" CTA)
  useEffect(() => {
    if (autoOpen && !isOpen && step === 0) {
      setIsOpen(true)
      startQuestion(0)
    }
  }, [autoOpen, isOpen, step, startQuestion])

  const handleOpen = () => {
    if (isOpen) return
    setIsOpen(true)
    if (step === 0) {
      startQuestion(0)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleChoice = (choice: string) => {
    if (isTyping) return

    setStep((prev) => {
      const next = prev + 1

      if (next < TOTAL_QUESTIONS) {
        startQuestion(next)
      } else {
        setChoicesVisible(false)
        setCurrentQuestion(
          'Merci ! Je prépare une sélection d’activités rien que pour vous ✨'
        )
      }

      return next
    })
  }

  const activeChoices =
    step < TOTAL_QUESTIONS ? QUESTIONS[step]?.choices ?? [] : []

  return (
    <div className="marco-page">
      <section className="hero" id="hero">
        <div className="wave-container">
          <div className="wave" />
          <div className="wave" />
          <div className="wave" />
        </div>

        {stars.map((star, index) => (
          <div
            key={index}
            className="star"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
            }}
          />
        ))}

        <div className="hero-content">
          <p className="hero-label">✦ Votre aventure commence ici</p>
          <h1 className="hero-title">
            Voyagez selon
            <br />
            <em>vos envies</em>
          </h1>
          <p className="hero-sub">Des excursions uniques à Ténérife</p>

          <div className="marco-wrap" onClick={handleOpen}>
            <div className="speech-bubble">👋 Bonjour, je suis Marco !</div>
            <img
              className="marco-img"
              src="/marco.png"
              alt="Marco"
            />
            <div className="status-dot" />
          </div>

          <button className="inspire-btn" onClick={handleOpen}>
            <span className="btn-icon">✦</span> Inspire-moi
          </button>
        </div>
      </section>

      <div className={`chat-overlay ${isOpen ? 'open' : ''}`} id="chatOverlay">
        <button className="close-btn" onClick={handleClose}>
          ✕
        </button>

        <div className="progress-wrap">
          <div className="progress-label">Votre excursion idéale</div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="marco-stage">
          <div className={`question-bubble ${currentQuestion ? 'visible' : ''}`}>
            {isTyping && (
              <div className="typing">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            )}
            {!isTyping && currentQuestion && <span>{currentQuestion}</span>}
          </div>

          <div className={`choices ${choicesVisible ? 'visible' : ''}`}>
            {choicesVisible &&
              activeChoices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  className="choice-btn"
                  onClick={() => handleChoice(choice)}
                >
                  {choice}
                </button>
              ))}
          </div>

          <div className="marco-chat-figure">
            <img
              className="marco-chat-img"
              src="/marco.png"
              alt="Marco"
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        .marco-page {
          --sand: #f5efe6;
          --ocean: #1a6b7c;
          --coral: #e8694a;
          --deep: #0d2b35;
          --gold: #d4a843;
          font-family: 'DM Sans', system-ui, -apple-system, BlinkMacSystemFont,
            'Segoe UI', sans-serif;
        }

        .hero {
          width: 100vw;
          height: 100vh;
          background: linear-gradient(
            160deg,
            #0d2b35 0%,
            #1a6b7c 50%,
            #0f3d4a 100%
          );
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .wave-container {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 200px;
          overflow: hidden;
        }

        .wave {
          position: absolute;
          bottom: 0;
          width: 200%;
          height: 160px;
          border-radius: 50% 50% 0 0;
          opacity: 0.08;
          animation: waveMove 8s ease-in-out infinite;
        }

        .wave:nth-child(1) {
          background: var(--gold);
          left: -50%;
        }

        .wave:nth-child(2) {
          background: var(--coral);
          animation-delay: -3s;
          height: 120px;
          opacity: 0.06;
        }

        .wave:nth-child(3) {
          background: white;
          animation-delay: -6s;
          height: 80px;
          opacity: 0.04;
        }

        @keyframes waveMove {
          0%,
          100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(8%);
          }
        }

        .star {
          position: absolute;
          width: 2px;
          height: 2px;
          background: white;
          border-radius: 50%;
          animation: twinkle 3s ease-in-out infinite;
        }

        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.9;
            transform: scale(1.5);
          }
        }

        .hero-content {
          position: relative;
          z-index: 10;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem;
          width: 100%;
        }

        .hero-label {
          font-size: 0.75rem;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 1rem;
          opacity: 0;
          animation: fadeUp 0.8s ease forwards 0.2s;
        }

        .hero-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2rem, 6vw, 4rem);
          font-weight: 700;
          color: var(--sand);
          line-height: 1.1;
          margin-bottom: 0.6rem;
          opacity: 0;
          animation: fadeUp 0.8s ease forwards 0.4s;
        }

        .hero-title em {
          font-style: italic;
          color: var(--coral);
        }

        .hero-sub {
          color: rgba(245, 239, 230, 0.6);
          font-size: 1rem;
          font-weight: 300;
          margin-bottom: 1.5rem;
          opacity: 0;
          animation: fadeUp 0.8s ease forwards 0.6s;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .marco-wrap {
          position: relative;
          width: 220px;
          height: 280px;
          margin-bottom: 1.5rem;
          opacity: 0;
          animation: fadeUp 0.8s ease forwards 0.5s;
          cursor: pointer;
        }

        .marco-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: top center;
          filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.4));
          animation: marcoFloat 3.5s ease-in-out infinite;
        }

        @keyframes marcoFloat {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-8px) rotate(0.4deg);
          }
          66% {
            transform: translateY(-4px) rotate(-0.3deg);
          }
        }

        .speech-bubble {
          position: absolute;
          top: 5px;
          right: -110px;
          background: white;
          border-radius: 16px 16px 16px 4px;
          padding: 8px 14px;
          font-size: 0.8rem;
          color: var(--deep);
          font-weight: 500;
          white-space: nowrap;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
          opacity: 0;
          transform: scale(0);
          animation: bubblePop 0.5s
            cubic-bezier(0.34, 1.56, 0.64, 1) forwards 1.8s;
          z-index: 10;
        }

        .speech-bubble::after {
          content: '';
          position: absolute;
          bottom: -6px;
          left: 10px;
          width: 12px;
          height: 12px;
          background: white;
          clip-path: polygon(0 0, 100% 0, 0 100%);
        }

        @keyframes bubblePop {
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .status-dot {
          position: absolute;
          bottom: 68px;
          right: 28px;
          width: 12px;
          height: 12px;
          background: #4ade80;
          border-radius: 50%;
          border: 2px solid rgba(13, 43, 53, 0.8);
          animation: statusPulse 2s ease-in-out infinite;
        }

        @keyframes statusPulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.5);
          }
          50% {
            box-shadow: 0 0 0 5px rgba(74, 222, 128, 0);
          }
        }

        .inspire-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 2.5rem;
          background: var(--coral);
          color: white;
          font-size: 1rem;
          font-weight: 500;
          border: none;
          border-radius: 60px;
          cursor: pointer;
          transition: all 0.3s;
          opacity: 0;
          animation: fadeUp 0.8s ease forwards 0.8s, pulseRing 2.5s ease 1.8s
              infinite;
        }

        .inspire-btn:hover {
          transform: translateY(-3px) scale(1.04);
        }

        .btn-icon {
          display: inline-block;
          animation: wiggle 4s ease-in-out infinite;
        }

        @keyframes wiggle {
          0%,
          100% {
            transform: rotate(0);
          }
          25% {
            transform: rotate(15deg);
          }
          75% {
            transform: rotate(-15deg);
          }
        }

        @keyframes pulseRing {
          0% {
            box-shadow: 0 8px 40px rgba(232, 105, 74, 0.4),
              0 0 0 0 rgba(232, 105, 74, 0.3);
          }
          70% {
            box-shadow: 0 8px 40px rgba(232, 105, 74, 0.4),
              0 0 0 20px rgba(232, 105, 74, 0);
          }
          100% {
            box-shadow: 0 8px 40px rgba(232, 105, 74, 0.4),
              0 0 0 0 rgba(232, 105, 74, 0);
          }
        }

        .chat-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: rgba(10, 32, 42, 0.9);
          backdrop-filter: blur(18px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.45s ease;
        }

        .chat-overlay.open {
          opacity: 1;
          pointer-events: all;
        }

        .close-btn {
          position: absolute;
          top: 1.4rem;
          right: 1.4rem;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
          z-index: 10;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .progress-wrap {
          position: absolute;
          top: 1.4rem;
          left: 50%;
          transform: translateX(-50%);
          width: 180px;
          z-index: 10;
          text-align: center;
        }

        .progress-label {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.65rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .progress-bar {
          height: 3px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--gold), var(--coral));
          border-radius: 2px;
          transition: width 0.6s ease;
          width: 0%;
        }

        .marco-stage {
          position: relative;
          z-index: 5;
          width: 100%;
          max-width: 440px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 1.5rem 2.5rem;
          transform: translateY(50px);
          transition: transform 0.5s
            cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .chat-overlay.open .marco-stage {
          transform: translateY(0);
        }

        .question-bubble {
          background: white;
          border-radius: 20px 20px 20px 5px;
          padding: 1rem 1.3rem;
          width: 100%;
          max-width: 360px;
          font-size: 1rem;
          color: var(--deep);
          line-height: 1.55;
          font-weight: 500;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
          margin-bottom: 1rem;
          align-self: flex-start;
          opacity: 0;
          transform: translateY(10px) scale(0.96);
          transition: all 0.4s
            cubic-bezier(0.34, 1.56, 0.64, 1);
          min-height: 54px;
          display: flex;
          align-items: center;
        }

        .question-bubble.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .choices {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
          align-self: flex-start;
          opacity: 0;
          transform: translateY(6px);
          transition: all 0.35s ease 0.15s;
        }

        .choices.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .choice-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1.5px solid rgba(255, 255, 255, 0.28);
          color: white;
          padding: 0.55rem 1.1rem;
          border-radius: 24px;
          font-size: 0.88rem;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .choice-btn:hover {
          background: var(--coral);
          border-color: var(--coral);
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(232, 105, 74, 0.4);
        }

        .choice-btn:disabled {
          opacity: 0.4;
          cursor: default;
          transform: none;
        }

        .marco-chat-figure {
          width: 240px;
          flex-shrink: 0;
          filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.45));
          animation: marcoFloat 3.5s ease-in-out infinite;
        }

        .marco-chat-img {
          width: 100%;
          display: block;
        }

        .typing {
          display: flex;
          gap: 5px;
          align-items: center;
        }

        .typing-dot {
          width: 8px;
          height: 8px;
          background: var(--ocean);
          border-radius: 50%;
          opacity: 0.6;
          animation: typingBounce 1s ease-in-out infinite;
        }

        .typing-dot:nth-child(2) {
          animation-delay: 0.15s;
        }

        .typing-dot:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes typingBounce {
          0%,
          100% {
            transform: translateY(0);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-5px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

