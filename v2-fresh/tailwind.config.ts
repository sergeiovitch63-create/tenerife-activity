import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
        // Brand — derived from the logo (turquoise waves + gold sun).
        // turquoise-500 = light wave, turquoise-800 = dark wave,
        // gold-500 = sun, gold-300 = halo/rays.
        'brand-turquoise': {
          50:  '#ECF9FA',
          100: '#D1F1F3',
          200: '#A6E3E7',
          300: '#6FCDD4',
          400: '#46BCC4',
          500: '#3DB8BE',
          600: '#2A9BA2',
          700: '#1F7A83',
          800: '#1B5A66',
          900: '#14424A',
          950: '#0B2D34',
        },
        'brand-gold': {
          50:  '#FEFAEB',
          100: '#FDF2C8',
          200: '#FBE28A',
          300: '#F8CD52',
          400: '#F5C84A',
          500: '#F4BE3D',
          600: '#D9A41E',
          700: '#A87D15',
          800: '#7C5D12',
          900: '#604812',
          950: '#382B0A',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 12px -2px rgb(15 23 42 / 0.06), 0 1px 3px -1px rgb(15 23 42 / 0.04)',
        glow: '0 0 0 1px rgb(255 255 255 / 0.1), 0 8px 40px -8px rgb(61 184 190 / 0.35)',
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 8px 24px -12px rgb(15 23 42 / 0.12)',
      },
      backgroundImage: {
        // Brand hero: turquoise depth + gold warm accent on dark slate
        'hero-gradient':
          'radial-gradient(80% 60% at 20% 10%, rgba(61,184,190,0.28), transparent 60%), radial-gradient(70% 70% at 90% 20%, rgba(244,190,61,0.20), transparent 60%), linear-gradient(180deg, #0B1220 0%, #0F172A 100%)',
        'shine':
          'linear-gradient(130deg, transparent 0%, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%, transparent 100%)',
      },
      keyframes: {
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'blink': {
          '0%, 92%, 100%': { transform: 'scaleY(1)' },
          '95%': { transform: 'scaleY(0.1)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.6' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'shine-sweep': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'float-slow': 'float-slow 4s ease-in-out infinite',
        'blink': 'blink 4s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shine-sweep': 'shine-sweep 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
