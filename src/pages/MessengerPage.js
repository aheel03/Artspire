import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import './MessengerPage.css';

const MessengerPage = () => {
  const { userId } = useParams(); // Optional: direct message to specific user
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get current user profile
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch('http://localhost:8000/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch('http://localhost:8000/conversations', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setConversations(data);
          
          // If userId is provided in URL, select that conversation or start a new one
          if (userId) {
            const targetConversation = data.find(conv => conv.user.id === parseInt(userId));
            if (targetConversation) {
              setSelectedConversation(targetConversation.user);
            } else {
              // No existing conversation, fetch user details to start a new one
              fetchUserForNewConversation(parseInt(userId));
            }
          }
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
    
    // Refresh conversations every 10 seconds
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  // Fetch user details for starting a new conversation
  const fetchUserForNewConversation = async (targetUserId) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:8000/users/${targetUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const userData = await response.json();
        setSelectedConversation(userData);
        setMessages([]); // Start with empty messages for new conversation
      }
    } catch (error) {
      console.error('Error fetching user for new conversation:', error);
    }
  };

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      
      // Refresh messages every 5 seconds when a conversation is selected
      const interval = setInterval(() => fetchMessages(selectedConversation.id), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  const fetchMessages = async (otherUserId) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:8000/messages/${otherUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

    setSendingMessage(true);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch('http://localhost:8000/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: newMessage,
          receiver_id: selectedConversation.id
        })
      });

      if (response.ok) {
        const sentMessage = await response.json();
        setMessages(prev => [...prev, sentMessage]);
        setNewMessage('');
        
        // Update conversations list - check if this conversation already exists
        const existingConvIndex = conversations.findIndex(conv => conv.user.id === selectedConversation.id);
        
        if (existingConvIndex !== -1) {
          // Update existing conversation
          setConversations(prev => 
            prev.map((conv, index) => 
              index === existingConvIndex 
                ? {
                    ...conv,
                    last_message: newMessage,
                    last_message_time: new Date().toISOString(),
                    last_sender_id: currentUser?.id
                  }
                : conv
            )
          );
        } else {
          // Add new conversation to the list
          const newConversation = {
            user: selectedConversation,
            last_message: newMessage,
            last_message_time: new Date().toISOString(),
            last_sender_id: currentUser?.id,
            unread_count: 0
          };
          setConversations(prev => [newConversation, ...prev]);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getAvatarUrl = (avatar_url) => {
    if (!avatar_url) return '/default-avatar.svg';
    
    // Handle local backend avatars
    if (avatar_url.startsWith('/avatars/')) {
      return `http://localhost:8000${avatar_url}`;
    }
    
    // Handle full URLs (Supabase, etc.)
    if (avatar_url.startsWith('http')) {
      return avatar_url;
    }
    
    // Handle relative paths
    if (avatar_url.startsWith('/')) {
      return `http://localhost:8000${avatar_url}`;
    }
    
    return avatar_url;
  };

  const renderAvatar = (user, size = '48px') => {
    const avatarUrl = getAvatarUrl(user.avatar_url);
    console.log(`Rendering avatar for ${user.username}, avatar_url: ${user.avatar_url}, resolved: ${avatarUrl}`);
    
    if (avatarUrl && avatarUrl !== '/default-avatar.svg') {
      return (
        <img
          src={avatarUrl}
          alt={user.username}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid #e1e5e9',
            backgroundColor: '#f0f0f0'
          }}
          onError={(e) => {
            console.log(`Avatar failed to load for ${user.username}: ${avatarUrl}`);
            // Create fallback div
            const fallback = document.createElement('div');
            fallback.style.cssText = `
              width: ${size};
              height: ${size};
              border-radius: 50%;
              background: linear-gradient(135deg, #667eea, #764ba2);
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: ${size === '48px' ? '1.2rem' : size === '40px' ? '1rem' : '0.9rem'};
              font-weight: bold;
              text-transform: uppercase;
              border: 2px solid #e1e5e9;
            `;
            fallback.textContent = user.username.charAt(0).toUpperCase();
            e.target.parentNode.replaceChild(fallback, e.target);
          }}
        />
      );
    } else {
      return (
        <div style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size === '48px' ? '1.2rem' : size === '40px' ? '1rem' : '0.9rem',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          border: '2px solid #e1e5e9'
        }}>
          {user.username.charAt(0).toUpperCase()}
        </div>
      );
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 24 * 60 * 60 * 1000) { // Less than 24 hours
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 7 * 24 * 60 * 60 * 1000) { // Less than a week
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="messenger-page">
        <div className="loading">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="messenger-page">
      {/* Page Header */}
      <div className="messenger-header">
        <h1 className="messenger-title">Messages</h1>
        <p className="messenger-subtitle">Connect with artists and clients through private conversations</p>
      </div>
      
      <div className="messenger-container">
        {/* Conversations sidebar */}
        <div className="conversations-sidebar">
          <div className="conversations-list">
            {conversations.length === 0 ? (
              <div className="no-conversations">
                <p>No conversations yet</p>
                <p>Start a conversation by visiting someone's profile and clicking "Send Message"</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.user.id}
                  className={`conversation-item ${selectedConversation?.id === conversation.user.id ? 'active' : ''}`}
                  onClick={() => setSelectedConversation(conversation.user)}
                >
                  <div className="conversation-avatar">
                    {renderAvatar(conversation.user, '48px')}
                    {conversation.unread_count > 0 && (
                      <span className="unread-badge">{conversation.unread_count}</span>
                    )}
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-username">{conversation.user.username}</div>
                    <div className="conversation-preview">
                      {conversation.last_sender_id === currentUser?.id ? 'You: ' : ''}
                      {conversation.last_message}
                    </div>
                    <div className="conversation-time">
                      {formatTime(conversation.last_message_time)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="chat-area">
          {selectedConversation ? (
            <>
              {/* Chat header */}
              <div className="chat-header">
                <div className="chat-user-info">
                  {renderAvatar(selectedConversation, '40px')}
                  <div className="chat-username">{selectedConversation.username}</div>
                </div>
              </div>

              {/* Messages */}
              <div className="messages-container">
                {messages.length === 0 ? (
                  <div className="no-messages">
                    <p>Start your conversation with {selectedConversation.username}</p>
                    <p style={{ fontSize: '0.9rem', color: '#999', marginTop: '0.5rem' }}>
                      Send a message to begin chatting
                    </p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isOwn = message.sender_id === currentUser?.id;
                    const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id;
                    
                    return (
                      <div
                        key={message.id}
                        className={`message ${isOwn ? 'own' : 'other'} ${showAvatar ? 'show-avatar' : ''}`}
                      >
                        {!isOwn && showAvatar && (
                          <div className="message-avatar">
                            {renderAvatar(selectedConversation, '30px')}
                          </div>
                        )}
                        <div className="message-content">
                          <div className="message-bubble">
                            {message.content}
                          </div>
                          <div className="message-time">
                            {formatTime(message.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              <div className="message-input-container">
                <div className="message-input-wrapper">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={`Message ${selectedConversation.username}...`}
                    className="message-input"
                    rows="1"
                    disabled={sendingMessage}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    className="send-button"
                  >
                    {sendingMessage ? '...' : 'Send'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="no-conversation-selected">
              <div className="welcome-message">
                <h3>Welcome to Messages</h3>
                <p>Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessengerPage;
