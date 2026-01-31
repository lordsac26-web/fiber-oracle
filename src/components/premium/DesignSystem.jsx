/**
 * FIBER ORACLE PREMIUM DESIGN SYSTEM
 * 
 * A cohesive visual language for the Photon AI assistant and the wider app.
 * Built with: Tailwind CSS, shadcn/ui, Framer Motion, ECharts, ReactFlow
 * 
 * COLOR PALETTE:
 * Primary: Blue (Photon/Light) - #0ea5e9 (cyan-500)
 * Secondary: Purple (AI/Energy) - #a855f7 (purple-600)
 * Accent: Emerald (Success/Active) - #10b981 (emerald-500)
 * Neutral: Slate (Background/Text) - #1e293b to #f1f5f9
 * 
 * TYPOGRAPHY:
 * Display: Text-4xl to Text-6xl (Headlines)
 * Body: Text-sm to Text-base (Content)
 * Caption: Text-xs (Meta information)
 * 
 * SPACING:
 * Base unit: 4px (1 rem = 16px in Tailwind)
 * Component padding: 16px (p-4)
 * Section margin: 32px (my-8)
 * 
 * SHADOWS:
 * Light: shadow-sm
 * Medium: shadow-md (default)
 * Heavy: shadow-lg (interactive hover)
 * Glow: shadow-lg shadow-blue-500/50 (premium interactive)
 * 
 * ANIMATIONS:
 * Spring: { type: 'spring', stiffness: 400, damping: 17 }
 * Transition: duration-300 (smooth state changes)
 * Entrance: opacity 0→1, scale 0.9→1 (stagger on lists)
 * 
 * BORDER RADIUS:
 * Small: rounded-md (buttons, inputs)
 * Medium: rounded-lg (cards, containers)
 * Large: rounded-xl (hero sections)
 * 
 * COMPONENT NAMING:
 * Premium* = Enhanced version of shadcn/ui component with animations
 * Enhanced* = Data visualization or specialized component
 * AI* = Photon/Agent-specific components
 */

export const DESIGN_TOKENS = {
  colors: {
    primary: 'from-cyan-400 to-blue-600',
    secondary: 'from-purple-600 to-indigo-700',
    accent: 'from-emerald-500 to-teal-600',
    danger: 'from-red-500 to-rose-600',
    warning: 'from-amber-500 to-orange-600',
    success: 'from-emerald-500 to-green-600',
  },
  shadows: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    glow: 'shadow-lg shadow-blue-500/50 dark:shadow-blue-400/30',
    glowPurple: 'shadow-lg shadow-purple-500/30 dark:shadow-purple-400/20',
  },
  animations: {
    spring: { type: 'spring', stiffness: 400, damping: 17 },
    smooth: { duration: 0.3 },
    slow: { duration: 0.5 },
  },
  spacing: {
    base: '16px',
    section: '32px',
  },
};

export const COMPONENT_STYLES = {
  buttonGlass:
    'backdrop-blur-md bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors',
  cardGlass:
    'backdrop-blur-md bg-slate-900/50 border border-slate-700/50 rounded-xl',
  inputGlass:
    'bg-slate-800/50 border border-slate-700/50 text-white placeholder:text-slate-400 focus:border-blue-500/50 focus:ring-blue-500/20',
};

export default DESIGN_TOKENS;