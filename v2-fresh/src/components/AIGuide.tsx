'use client'

import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, Send, X, Wand2 } from 'lucide-react'
import { useI18n } from '@/i18n/context'

type Message = {
  id: string
  role: 'teo' | 'user'
  text: string
}

export default function AIGuide() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [hasBubble, setHasBubble] = useState(true)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'teo', text: t.teo.welcome },
  ])
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  const scriptedReply = (raw: string): Message => {
    const s = raw.toLowerCase()
    const pick = (key: keyof typeof t.teo.replies): Message => ({
      id: crypto.randomUUID(),
      role: 'teo',
      text: t.teo.replies[key],
    })
    if (/famil|kid|child|bamb|niГ±|СЂРµР±С‘РЅ|kind|ragaz/.test(s)) return pick('family')
    if (/sensation|adrenalin|thrill|СЌРјРѕС†|nervenkitzel|emozioni|emocion/.test(s)) return pick('thrill')
    if (/romant|couple|amor|amour|love|СЂРѕРјР°РЅ/.test(s)) return pick('romantic')
    if (/budget|cheap|Г©co|eco|РґРµС€С‘РІ|billig|barato|budget/.test(s)) return pick('budget')
    if (/pluie|rain|lluvia|regen|РґРѕР¶Рґ|piog/.test(s)) return pick('rain')
    if (/first|premier|primer|prim|СЌСЂСЃС‚|erste/.test(s)) return pick('first')
    if (/dive|plong|subma|tauch|Р±СѓС†Рµ|immers/.test(s)) return pick('diving')
    if (/teide|volcan|volcano/.test(s)) return pick('teide')
    if (/hola|hi|hey|bonjour|salut|hallo|ciao|РїСЂРёРІРµС‚|guten/.test(s)) return pick('greet')
    return pick('fallback')
  }

  const send = (text: string) => {
    if (!text.trim()) return
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'user', text }])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      setMessages((m) => [...m, scriptedReply(text)])
      setTyping(false)
    }, 650)
  }

  const quickPromptKeys = Object.keys(t.teo.quickPrompts) as Array<keyof typeof t.teo.quickPrompts>

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            onClick={() => {
              setOpen(true)
              setHasBubble(false)
            }}
            id="teo"
            className="fixed bottom-6 right-6 z-50 group"
            aria-label={t.teo.name}
          >
            <TeoAvatar size={64} />
            <span className="absolute -top-1 -right-1 inline-flex">
              <span className="absolute inset-0 rounded-full bg-brand-gold-400/60 animate-pulse-ring" />
              <span className="relative w-3 h-3 rounded-full bg-brand-gold-500 border-2 border-white" />
            </span>
            {hasBubble && (
              <motion.span
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.5 }}
                className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-2xl rounded-br-sm bg-ink-900 text-white text-sm px-4 py-2 shadow-card"
              >
                {t.teo.triggerBubble}
                <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-ink-900 rotate-45" />
              </motion.span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[94vw] sm:w-[400px] h-[600px] max-h-[80vh] rounded-3xl bg-white shadow-card border border-ink-100 flex flex-col overflow-hidden"
          >
            <div className="relative px-5 py-4 bg-gradient-to-br from-ink-900 via-ink-800 to-brand-turquoise-900 text-white">
              <div className="flex items-center gap-3">
                <TeoAvatar size={44} />
                <div>
                  <div className="font-display font-bold text-sm flex items-center gap-1.5">
                    {t.teo.name} <Sparkles className="w-3.5 h-3.5 text-brand-gold-300" />
                  </div>
                  <div className="text-xs text-ink-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {t.teo.subtitle}
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="ml-auto p-1.5 rounded-lg hover:bg-white/10"
                  aria-label={t.nav.close}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-ink-50/50">
              {messages.map((m) => (
                <div key={m.id} className={m.role === 'teo' ? 'flex gap-2' : 'flex gap-2 justify-end'}>
                  {m.role === 'teo' && <TeoAvatar size={28} />}
                  <div
                    className={
                      m.role === 'teo'
                        ? 'max-w-[85%] rounded-2xl rounded-tl-sm bg-white border border-ink-100 px-3.5 py-2.5 text-sm text-ink-800 shadow-soft'
                        : 'max-w-[85%] rounded-2xl rounded-tr-sm bg-ink-900 text-white px-3.5 py-2.5 text-sm'
                    }
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex gap-2 items-end">
                  <TeoAvatar size={28} />
                  <div className="rounded-2xl rounded-tl-sm bg-white border border-ink-100 px-3.5 py-3 shadow-soft">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: '120ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: '240ms' }} />
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 py-2 border-t border-ink-100 flex flex-wrap gap-1.5">
              {quickPromptKeys.map((k) => (
                <button
                  key={k}
                  onClick={() => send(t.teo.quickPrompts[k])}
                  className="text-xs px-2.5 py-1 rounded-full bg-ink-100 text-ink-700 hover:bg-brand-turquoise-100 hover:text-brand-turquoise-800"
                >
                  {t.teo.quickPrompts[k]}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                send(input)
              }}
              className="p-3 border-t border-ink-100 bg-white flex items-center gap-2"
            >
              <Wand2 className="w-4 h-4 text-ink-400 ml-1" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.teo.inputPlaceholder}
                className="flex-1 outline-none text-sm placeholder:text-ink-400"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-ink-900 text-white hover:bg-ink-800 disabled:opacity-40"
                disabled={!input.trim()}
                aria-label={t.teo.send}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function TeoAvatar({ size = 56 }: { size?: number }) {
  return (
    <div
      className="relative rounded-full shadow-glow animate-float-slow"
      style={{
        width: size,
        height: size,
        background:
          'radial-gradient(circle at 30% 25%, #D1F1F3 0%, #3DB8BE 35%, #1B5A66 75%, #0F172A 100%)',
      }}
    >
      <div
        className="absolute teo-eye rounded-full animate-blink origin-center"
        style={{ width: size * 0.18, height: size * 0.18, left: size * 0.28, top: size * 0.4 }}
      />
      <div
        className="absolute teo-eye rounded-full animate-blink origin-center"
        style={{ width: size * 0.18, height: size * 0.18, right: size * 0.28, top: size * 0.4 }}
      />
      <div
        className="absolute rounded-full border-b-2 border-white/80"
        style={{
          width: size * 0.3,
          height: size * 0.15,
          left: '50%',
          transform: 'translateX(-50%)',
          top: size * 0.6,
        }}
      />
      <div
        className="absolute rounded-full bg-white/40 blur-sm"
        style={{ width: size * 0.2, height: size * 0.1, top: size * 0.15, left: size * 0.2 }}
      />
    </div>
  )
}
