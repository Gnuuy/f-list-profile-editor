import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    colors: {
      default: {
        bg: '#1b446f',
        sidebarBg: '#0b345f',
        bodyBg: '#08192d',
        navBarBg: 'linear-gradient(to bottom, #1c4a72 #194064)',
        navButtonBg: 'linear-gradient(to bottom, #1c4a72 #194064)',
        headerBg: '#001122',
        footerBg: 'linear-gradient(to bottom, #2468af #134478)',
        editorBorder: '#0b345f',
      },
      dark: {
        bg: '#2e2828',
        sidebarBg: '#2e2828',
        bodyBg: '#000000',
        navBarBg: 'linear-gradient(to bottom, #2e2828 #1e1a1a)',
        navButtonBg: 'linear-gradient(to bottom, #2e2828 #1e1a1a)',
        headerBg: '#5c5656',
        footerBg: '#4c4646',
        editorBorder: '#0b345f',

      }, 
      light: {
        bg: '#ffffff',
        sidebarBg: '#eeeeff',
        bodyBg: '#dddddd',
        navBarBg: 'linear-gradient(to bottom, #3d3d3d, #222222)',
        navButtonBag: 'linear-gradient(to bottom, #3d3d3d, #222222)',
        headerBg: '#778888',
        footerBg: '#eeffff',
        editorBorder: '#ccffcc',
      }
    },
    extend: {
      boxShadow: {'custom-black': '0 0 8px rgba(0, 0, 0, 1)', },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
} satisfies Config;
