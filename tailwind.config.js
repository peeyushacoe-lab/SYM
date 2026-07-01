/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        primaryDark: '#1E40AF',
        primaryLight: '#EFF6FF',
        primaryBorder: '#BFDBFE',
        accent: '#10B981',
        accentLight: '#ECFDF5',
        accentBorder: '#A7F3D0',
        danger: '#DC2626',
        dangerLight: '#FEF2F2',
        dangerBorder: '#FECACA',
        warning: '#D97706',
        warningLight: '#FFFBEB',
        warningBorder: '#FDE68A',
        bg: '#F1F5F9',
        surface: '#F8FAFC',
        navBg: '#0F172A',
        navActive: '#1E293B',
        border: '#E2E8F0',
        text: '#0F172A',
        textSecondary: '#64748B',
        textLight: '#94A3B8',
      },
    },
  },
  plugins: [],
};
