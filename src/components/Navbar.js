import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Palette, MessageCircle, User, Search, Menu, X, LogOut, Settings, DoorOpen } from 'lucide-react';
import logo from '../logo.png';
import './Navbar.css';
import NotificationBell from './NotificationBell';

const Navbar = ({ user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const userMenuRef = useRef(null);

  
  useEffect(() => {
    if (user && user.id) {
      fetchUnreadMessagesCount();
      
      // Poll for unread messages every 30 seconds
      const interval = setInterval(fetchUnreadMessagesCount, 30000);
      return () => clearInterval(interval);
    }
    
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
    // eslint-disable-next-line
  }, [user]);

  
  const fetchUnreadMessagesCount = async () => {
    try {
      const response = await fetch('http://localhost:8000/unread-messages-count', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUnreadMessagesCount(data.unread_count || 0);
      }
    } catch (error) {
      // ignore
    }
  };

  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  
  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/search?q=${encodeURIComponent(search.trim())}`);
    }
  };

  
  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Brand */}
        <Link to="/" className="navbar-brand">
          <img src={logo} alt="Artspire" className="brand-logo" />
          Artspire
        </Link>
        
        {/* Main Navigation */}
        <div className="navbar-menu">
          <Link 
            to="/feed" 
            className={`navbar-item ${location.pathname === '/feed' ? 'active' : ''}`}
          >
            Feed
          </Link>
          <Link 
            to="/art-collection" 
            className={`navbar-item ${location.pathname === '/art-collection' ? 'active' : ''}`}
          >
            Collection
          </Link>
          <Link 
            to="/commissions" 
            className={`navbar-item ${location.pathname === '/commissions' ? 'active' : ''}`}
          >
            Commissions
          </Link>
        </div>

        {/* Search */}
        <form className="navbar-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
        </form>

        {/* Right Side Actions */}
        <div className="navbar-actions">
          {/* Messages */}
          <Link to="/messages" className="action-button messages-button">
            <MessageCircle size={20} />
            {unreadMessagesCount > 0 && (
              <span className="notification-badge">
                {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
              </span>
            )}
          </Link>

          {/* Notifications */}
          {user && <NotificationBell />}

          {/* User Menu */}
          <div className="user-menu-wrapper" ref={userMenuRef}>
            <button 
              className="user-profile-button"
              onClick={() => setShowUserMenu(v => !v)}
            >
              <div className="user-avatar">
                {user?.avatar_url ? (
                  <img 
                    src={user.avatar_url.startsWith('/') ? `http://localhost:8000${user.avatar_url}` : user.avatar_url} 
                    alt={user.username} 
                  />
                ) : (
                  <div className="avatar-placeholder">
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="username">{user?.username}</span>
              <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">▼
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {showUserMenu && (
              <div className="user-dropdown">
                <Link to={`/user/${user?.id}`} className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                  <User size={16} /> My Profile
                </Link>
                <Link to="/portfolio" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                  <Palette size={16} /> Portfolio
                </Link>
                <Link to="/profile" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                  <Settings size={16} /> Settings
                </Link>
                <hr className="dropdown-divider" />
                <button className="dropdown-item logout-item" onClick={onLogout}>
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
