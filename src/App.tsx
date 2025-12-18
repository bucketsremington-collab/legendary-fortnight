import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Team from './pages/Team';
import Teams from './pages/Teams';
import Stats from './pages/Stats';
import Games from './pages/Games';
import FreeAgents from './pages/FreeAgents';
import StatsAdmin from './pages/StatsAdmin';
import AuthCallback from './pages/AuthCallback';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Landing page for non-authenticated users */}
      <Route path="/" element={isAuthenticated ? <Layout><Home /></Layout> : <Landing />} />
      
      {/* Auth callback for OAuth */}
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* Public routes with layout */}
      <Route path="/home" element={<Layout><Home /></Layout>} />
      <Route path="/profile/:username" element={<Layout><Profile /></Layout>} />
      <Route path="/teams" element={<Layout><Teams /></Layout>} />
      <Route path="/team/:teamId" element={<Layout><Team /></Layout>} />
      <Route path="/stats" element={<Layout><Stats /></Layout>} />
      <Route path="/games" element={<Layout><Games /></Layout>} />
      <Route path="/free-agents" element={<Layout><FreeAgents /></Layout>} />
      <Route path="/admin/stats" element={<Layout><StatsAdmin /></Layout>} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
