import React from 'react';
import NotificationBell from './NotificationBell';
import './NotificationDemo.css';

const NotificationDemo = () => {
  return (
    <div className="notification-demo">
      <div className="demo-header">
        <h1>🔔 Notification System Demo</h1>
        <p>Test the notification bell functionality</p>
        <div className="demo-bell-container">
          <span>Notification Bell: </span>
          <NotificationBell />
        </div>
      </div>
      
      <div className="demo-content">
        <div className="demo-card">
          <h2>Notification Bell Demo</h2>
          <p>
            The notification bell above demonstrates the complete notification system:
          </p>
          <ul>
            <li>🔔 Shows a red badge with unread notification count</li>
            <li>📱 Clicking the bell opens a dropdown with recent notifications</li>
            <li>✅ Automatically marks notifications as read when opened</li>
            <li>🎯 Displays different icons for different notification types</li>
            <li>⏰ Shows relative timestamps (e.g., "5m ago", "2h ago")</li>
            <li>🎨 Features smooth animations and modern design</li>
          </ul>
          
          <div className="demo-features">
            <h3>Features:</h3>
            <div className="feature-grid">
              <div className="feature-item">
                <span className="feature-icon">👤</span>
                <div>
                  <strong>Follow Notifications</strong>
                  <p>Get notified when someone follows you</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">❤️</span>
                <div>
                  <strong>Reaction Notifications</strong>
                  <p>See when users react to your posts</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🎨</span>
                <div>
                  <strong>Real-time Updates</strong>
                  <p>Auto-refresh every 10 seconds</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📱</span>
                <div>
                  <strong>Responsive Design</strong>
                  <p>Works on all device sizes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationDemo;
