import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme, CssBaseline, Box, Button, GlobalStyles } from '@mui/material';
import { useState, useEffect } from 'react';
import { VMList } from './components/VMList';
import api from './api/client';
import { AuthContext } from './context/auth';

const queryClient = new QueryClient();

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#181818',
      paper: '#232323',
    },
    text: {
      primary: '#fff',
      secondary: '#aaa',
    },
  },
  typography: {
    fontFamily: 'Inter, Roboto, Arial, sans-serif',
    fontSize: 15,
  },
});

const AuthForm = ({ onAuth }: { onAuth: (username: string, password: string) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) onAuth(username, password);
  };
  return (
    <Box sx={{
      width: '100vw',
      height: '100vh',
      minHeight: '100vh',
      minWidth: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      bgcolor: 'background.default',
      m: 0,
      p: 0
    }}>
      <Box component="form" onSubmit={handleSubmit} sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        p: 4,
        borderRadius: 3,
        bgcolor: 'background.paper',
        minWidth: 320,
        maxWidth: '90vw',
      }}>
        <h2 style={{marginBottom: 16, fontWeight: 700}}>VMware API Login</h2>
        <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={{marginBottom: 12, padding: 8, width: '100%', borderRadius: 4, border: '1px solid #333', background: '#181818', color: '#fff'}} autoFocus />
        <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} style={{marginBottom: 16, padding: 8, width: '100%', borderRadius: 4, border: '1px solid #333', background: '#181818', color: '#fff'}} />
        <Button variant="contained" type="submit" disabled={!username || !password} sx={{width: '100%'}}>Login</Button>
      </Box>
    </Box>
  );
};

function App() {
  const [auth, setAuth] = useState<{username: string; password: string} | null>(null);
  useEffect(() => {
    const saved = localStorage.getItem('vmrest-auth');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.username && parsed.password) {
          setAuth(parsed);
        }
      } catch { /* ignore */ }
    }
  }, []);
  const handleAuth = (username: string, password: string) => {
    setAuth({ username, password });
    localStorage.setItem('vmrest-auth', JSON.stringify({ username, password }));
  };
  if (auth) {
    api.defaults.auth = { username: auth.username, password: auth.password };
  }
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles styles={{ body: { margin: 0, padding: 0, overflowX: 'hidden' } }} />
        <AuthContext.Provider value={auth}>
          {!auth ? (
            <AuthForm onAuth={handleAuth} />
          ) : (
            <Box sx={{ minHeight: '100vh', width: '100%', bgcolor: 'background.default', p: 0, m: 0 }}>
              <Box sx={{ maxWidth: 900, mx: 'auto', mt: 2, p: { xs: 1, sm: 2 } }}>
                <VMList />
              </Box>
            </Box>
          )}
        </AuthContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
