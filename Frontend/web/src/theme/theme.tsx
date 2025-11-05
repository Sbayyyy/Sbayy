import { createTheme } from '@mui/material/styles';
import { red } from '@mui/material/colors';

// Create a theme instance
const theme = createTheme({
  direction: 'rtl', // For RTL support
  palette: {
    primary: {
      main: '#2563eb', // Current primary-600 color
      light: '#60a5fa',
      dark: '#1d4ed8',
    },
    secondary: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    error: {
      main: red.A400,
    },
  },
  typography: {
    fontFamily: ['Cairo', 'Tajawal', 'Roboto', 'sans-serif'].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 8,
        },
      },
    },
  },
});

export default theme;
