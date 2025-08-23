import React, { useState, useEffect, useRef } from 'react';
import NotificationService from '../services/NotificationService';
import NotificationList from './NotificationList';
import './NotificationBell.css';

const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showList, setShowList] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const bellRef = useRef(null);
  const notificationService = new NotificationService();

  const fetchUnread = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      const prevCount = unreadCount;
      setUnreadCount(count);
      
      // Animate bell when new notifications arrive
      if (count > prevCount) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 600);
      }
    } catch {
      setUnreadCount(0);
    }
  };

  const handleBellClick = async () => {
    setShowList(!showList);
    
    // Mark all notifications as read when opening the dropdown
    if (!showList && unreadCount > 0) {
      try {
        await notificationService.markAllAsRead();
        setUnreadCount(0);
      } catch (error) {
        console.error('Failed to mark notifications as read:', error);
      }
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setShowList(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="notification-bell-container" ref={bellRef}>
      <div 
        className={`notification-bell ${isAnimating ? 'animate' : ''} ${showList ? 'active' : ''}`}
        onClick={handleBellClick}
        role="button"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleBellClick();
          }
        }}
      >
        <svg className="bell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
      
      <div className={`notification-dropdown ${showList ? 'show' : ''}`}>
        <div className="notification-dropdown-header">
          <h3>Notifications</h3>
          {unreadCount > 0 && (
            <button 
              className="mark-all-read-btn"
              onClick={async () => {
                try {
                  await notificationService.markAllAsRead();
                  setUnreadCount(0);
                } catch (error) {
                  console.error('Failed to mark all as read:', error);
                }
              }}
            >
              Mark all as read
            </button>
          )}
        </div>
        <NotificationList />
      </div>
    </div>
  );
};

export default NotificationBell;
