/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Terminal palette
        app:       '#000000',
        secondary: '#020202',
        card:      '#000000',
        hover:     '#001100',
        // Terminal border shades
        border:    '#003300',
        'term-border': '#003300',
        'term-glow':   '#00ff41',
        // Semantic
        bull:      '#00ff41',   // phosphor green
        bear:      '#ff0055',   // crimson alert
        neutral:   '#00aaff',   // blue terminal info
        warning:   '#ffaa00',   // amber alert
        primary:   '#00ff41',   // same as bull for this theme
        breaking:  '#ff0055',
        // Text
        'text-primary':   '#00ff41',
        'text-secondary': '#007722',
        'text-muted':     '#005522',
        'text-dim':       '#003311',
        'text-bright':    '#ccffcc',
      },
      fontFamily: {
        sans:  ['Share Tech Mono', 'Courier Prime', 'monospace'],
        mono:  ['Share Tech Mono', 'Courier Prime', 'monospace'],
        vt323: ['VT323', 'monospace'],
        term:  ['VT323', 'monospace'],
      },
      fontSize: {
        'term-xs': ['11px', { lineHeight: '1.4', letterSpacing: '0.05em' }],
        'term-sm': ['13px', { lineHeight: '1.4', letterSpacing: '0.04em' }],
        'term-md': ['15px', { lineHeight: '1.3', letterSpacing: '0.03em' }],
        'term-lg': ['20px', { lineHeight: '1.2', letterSpacing: '0.06em' }],
        'term-xl': ['28px', { lineHeight: '1.1', letterSpacing: '0.08em' }],
      },
      borderRadius: {
        sm: '0px',   // Hard edges for terminal look
        md: '0px',
        lg: '0px',
      },
      boxShadow: {
        card:   '0 0 8px #00330055, inset 0 0 2px #001100',
        modal:  '0 0 24px #00ff4133, inset 0 0 4px #002200',
        glow:   '0 0 12px #00ff4188',
        alert:  '0 0 12px #ff005588',
        warn:   '0 0 12px #ffaa0088',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        'slide-in-right': {
          '0%':   { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
        'slide-in-top': {
          '0%':   { transform: 'translateY(-4px)', opacity: '0', filter: 'brightness(2)' },
          '100%': { transform: 'translateY(0)',    opacity: '1', filter: 'brightness(1)' },
        },
        pulse_border: {
          '0%, 100%': { borderColor: 'rgba(0,255,65,0.3)' },
          '50%':      { borderColor: 'rgba(0,255,65,0.9)' },
        },
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        phosphorGlow: {
          '0%, 100%': { textShadow: '0 0 4px #00ff41, 0 0 8px #00ff4155' },
          '50%':      { textShadow: '0 0 8px #00ff41, 0 0 20px #00ff4177' },
        },
        scanIn: {
          '0%':   { transform: 'translateY(-4px)', opacity: '0', filter: 'brightness(3)' },
          '100%': { transform: 'translateY(0)',    opacity: '1', filter: 'brightness(1)' },
        },
      },
      animation: {
        shimmer:         'shimmer 1.5s infinite linear',
        'slide-in-right':'slide-in-right 200ms ease-out',
        'slide-in-top':  'slide-in-top 150ms ease-out',
        'pulse-border':  'pulse_border 2s ease-in-out infinite',
        blink:           'blink 1s step-end infinite',
        'phosphor-glow': 'phosphorGlow 2s ease-in-out infinite',
        'scan-in':       'scanIn 150ms ease-out',
      },
    },
  },
  plugins: [],
};
