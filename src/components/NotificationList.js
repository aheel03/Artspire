import React, { useEffect, useState, useCallback } from 'react';
import NotificationService from '../services/NotificationService';
import './NotificationList.css';

const ICONS = {
  follow: '👤',
  reaction: '❤️',
  post_reaction: '❤️', // for backend compatibility
};

function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;
  
  // Less than 1 minute
  if (diff < 60000) {
    return 'Just now';
  }
  
  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }
  
  // Less than 1 day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }
  
  // Less than 1 week
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days}d ago`;
  }
  
  // Fallback to formatted date
  return date.toLocaleDateString();
}

const NotificationList = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const notificationService = new NotificationService();
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // auto-update every 10s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  if (loading) {
    return (
      <div className="notification-list">
        <div className="loading">
          <div className="loading-spinner"></div>
          Loading notifications...
        </div>
      </div>
    );
  }

  return (
    <div className="notification-list">
      {notifications.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🔔</div>
          <div>No notifications yet</div>
        </div>
      ) : (
        notifications.map((notification, index) => (
          <div
            className={`notification-item notification-${notification.type} ${!notification.is_read ? 'unread' : ''}`} 
            key={index}
          >
            <div className="notification-icon">
              {ICONS[notification.type] || '🔔'}
            </div>
            <div className="notification-content">
              <div className="notification-message">
                {notification.message}
              </div>
              <div className="notification-timestamp">
                {formatTime(notification.timestamp)}
              </div>
            </div>
            {!notification.is_read && <div className="notification-unread-indicator"></div>}
          </div>
        ))
      )}
    </div>
  );
};

export default NotificationList;
