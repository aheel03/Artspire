import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import FeedPage from './pages/FeedPage';
import PortfolioPage from './pages/PortfolioPage';
import CommissionsPage from './pages/CommissionsPage';
import ArtCollectionPage from './pages/ArtCollectionPage';
import UserProfilePage from './pages/UserProfilePage';
import UserSearchPage from './pages/UserSearchPage';
import MessengerPage from './pages/MessengerPage';
import NotificationDemo from './components/NotificationDemo';
import './App.css';
import ArtworkDetailPage from './ArtworkDetailPage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserProfile(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async (token) => {
    try {
      console.log('Fetching user profile with token:', token ? token.substring(0, 10) + '...' : 'null');
      const response = await fetch('http://localhost:8000/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log('User profile fetched successfully:', userData.username);
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        console.warn('Failed to fetch user profile:', response.status, response.statusText);
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('access_token');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        {isAuthenticated && <Navbar user={user} onLogout={handleLogout} />}
        
        <Routes>
          <Route 
            path="/login" 
            element={
              isAuthenticated ? 
              <Navigate to="/" replace /> : 
              <LoginPage onLogin={handleLogin} />
            } 
          />
          <Route 
            path="/register" 
            element={
              isAuthenticated ? 
              <Navigate to="/" replace /> : 
              <RegisterPage />
            } 
          />
          
          {/* Protected Routes */}
          <Route 
            path="/" 
            element={
              isAuthenticated ? 
              <HomePage user={user} /> : 
              <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/feed" 
            element={
              isAuthenticated ? 
              <FeedPage currentUser={user} /> : 
              <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/profile" 
            element={
              isAuthenticated ? 
              <ProfilePage user={user} /> : 
              <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/portfolio" 
            element={
              isAuthenticated ? 
              <PortfolioPage user={user} /> : 
              <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/commissions" 
            element={
              isAuthenticated ? 
              <CommissionsPage user={user} /> : 
              <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/art-collection" 
            element={
              isAuthenticated ? 
              <ArtCollectionPage user={user} /> : 
              <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/user/:userId" 
            element={
              isAuthenticated ? 
              <UserProfilePage currentUser={user} /> : 
              <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/search" 
            element={
              isAuthenticated ? 
              <UserSearchPage /> : 
              <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/messages" 
            element={
              isAuthenticated ? 
              <MessengerPage /> : 
              <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/messages/:userId" 
            element={
              isAuthenticated ? 
              <MessengerPage /> : 
              <Navigate to="/login" replace />
            } 
          />
          <Route path="/artwork/:id" element={<ArtworkDetailPage />} />
          <Route path="/notification-demo" element={<NotificationDemo />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
