import { createTheme, type PaletteMode } from '@mui/material/styles'

declare module '@mui/material/styles' {
  interface Palette {
    neutral: Palette['primary']
  }
  interface PaletteOptions {
    neutral?: PaletteOptions['primary']
  }
}

export function createAppTheme(mode: PaletteMode) {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#1976D2',
        light: '#42A5F5',
        dark: '#1565C0',
      },
      secondary: {
        main: '#26A69A',
        light: '#4DB6AC',
        dark: '#00897B',
      },
      error:   { main: '#EF5350' },
      warning: { main: '#FF8F00' },
      success: { main: '#43A047' },
      neutral: {
        main: '#64748B',
        light: '#94A3B8',
        dark: '#334155',
      },
      background: {
        default: mode === 'dark' ? '#0F172A' : '#F8FAFC',
        paper:   mode === 'dark' ? '#1E293B' : '#FFFFFF',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 500 },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: ({ theme }) => ({
            '& .MuiTableCell-root': {
              fontWeight: 600,
              backgroundColor:
                theme.palette.mode === 'dark'
                  ? theme.palette.grey[800]
                  : '#F1F5F9',
            },
          }),
        },
      },
    },
  })
}

// Convenience export — used as the initial/SSR value before the store loads.
export const theme = createAppTheme('light')
