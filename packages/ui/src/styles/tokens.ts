/**
 * Unified Design Tokens for PPOTAL Apps (jprail, regionevel, p-plan, portal)
 */

export const DESIGN_TOKENS = {
  header: {
    height: 56, // 56px / 3.5rem (h-14)
    heightClass: 'h-14',
    bgLight: 'bg-white/95',
    bgDark: 'dark:bg-slate-900/95',
    borderLight: 'border-slate-200',
    borderDark: 'dark:border-slate-800',
    blur: 'backdrop-blur-md',
    zIndex: 50,
  },
  button: {
    radius: {
      sm: 'rounded-lg',
      md: 'rounded-xl',
      lg: 'rounded-xl',
      full: 'rounded-full',
    },
    sizes: {
      sm: 'h-8 px-3 text-xs font-semibold gap-1.5',
      md: 'h-10 px-4 text-sm font-bold gap-2',
      lg: 'h-12 px-5 text-base font-bold gap-2.5',
      'icon-sm': 'size-8 rounded-lg flex items-center justify-center p-0',
      'icon-md': 'size-10 rounded-xl flex items-center justify-center p-0',
      'icon-lg': 'size-12 rounded-xl flex items-center justify-center p-0',
    },
    variants: {
      primary: 'bg-primary hover:bg-primary/90 text-white shadow-sm active:scale-[0.98]',
      secondary: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200',
      outline: 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200',
      ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300',
      danger: 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm active:scale-[0.98]',
    },
  },
  modal: {
    radius: 'rounded-2xl',
    headerHeight: 'h-14',
    padding: 'px-6 py-4',
    bgLight: 'bg-white',
    bgDark: 'dark:bg-slate-900',
    backdrop: 'bg-black/40 backdrop-blur-sm',
    shadow: 'shadow-2xl',
  },
  zIndex: {
    base: 0,
    card: 10,
    sidebar: 40,
    header: 50,
    overlay: 60,
    sheet: 70,
    modal: 80,
    tooltip: 90,
  }
} as const;
