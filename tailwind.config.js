/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0E1A',
        card: '#111827',
        agentA: '#3B82F6',
        agentB: '#10B981',
        baseline: '#6B7280',
        surge: '#F59E0B',
        closure: '#EF4444',
      },
    },
  },
  plugins: [],
};
