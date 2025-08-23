import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, Frown } from 'lucide-react';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const UserSearchPage = () => {
  const query = useQuery();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const q = query.get('q') || '';

  // Avatar URL helper function
  const getAvatarUrl = (avatar_url) => {
    if (!avatar_url) return null;
    if (avatar_url.startsWith('/')) {
      return `http://localhost:8000${avatar_url}`;
    }
    return avatar_url;
  };

  useEffect(() => {
    setLoading(true);
    setError('');
    
    const searchUrl = q 
      ? `http://localhost:8000/users/search?q=${encodeURIComponent(q)}`
      : 'http://localhost:8000/users/search'; // Show all users when no query
    
    fetch(searchUrl)
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch users');
        }
        return res.json();
      })
      .then(data => setUsers(data.users || []))
      .catch((err) => {
        setError(err.message || 'Failed to fetch users');
        setUsers([]);
      })
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '2rem auto', 
      padding: '2rem', 
      background: 'white', 
      borderRadius: '16px', 
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      minHeight: 'calc(100vh - 200px)'
    }}>
      <h2 style={{ 
        marginBottom: '2rem', 
        color: '#333',
        fontSize: '1.8rem',
        fontWeight: '600'
      }}>
        {q ? `Search Results for "${q}"` : 'Discover Users'}
      </h2>
      
      {loading ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem', 
          fontSize: '1.1rem', 
          color: '#666' 
        }}>
          <div style={{ 
            display: 'inline-block',
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '1rem'
          }}></div>
          <div>Searching users...</div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : null}
      
      {error && (
        <div style={{ 
          color: '#dc3545', 
          background: '#f8d7da', 
          padding: '1rem', 
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}
      
      {!loading && users.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem', 
          color: '#666',
          fontSize: '1.1rem'
        }}>
          {q ? (
            <>
              <div style={{ marginBottom: '1rem' }}>
                No users found matching "{q}".
              </div>
              <div style={{ fontSize: '0.9rem', color: '#888' }}>
                Try searching for usernames, skills, or bio keywords.
              </div>
            </>
          ) : (
            <div>
              No users found. This is strange! <Frown size={16} />
            </div>
          )}
        </div>
      )}
      
      {users.length > 0 && (
        <div style={{ 
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          color: '#666',
          borderBottom: '1px solid #f0f0f0',
          paddingBottom: '1rem'
        }}>
          Found {users.length} user{users.length !== 1 ? 's' : ''}
          {q && ` matching "${q}"`}
        </div>
      )}
      
      {users.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          {users.map(user => (
            <div key={user.id} style={{ 
              marginBottom: '1.5rem', 
              padding: '1.5rem',
              border: '1px solid #f0f0f0',
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Link 
                to={`/user/${user.id}`} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  textDecoration: 'none', 
                  color: '#333',
                  gap: '1rem',
                  flex: 1
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.parentElement.style.boxShadow = '0 4px 15px rgba(237, 239, 247, 0.15)';
                  e.currentTarget.parentElement.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.parentElement.style.boxShadow = 'none';
                  e.currentTarget.parentElement.style.transform = 'translateY(0)';
                }}
              >                {user.avatar_url ? (
                  <img 
                    src={getAvatarUrl(user.avatar_url)} 
                    alt={user.username} 
                    style={{ 
                      width: '60px', 
                      height: '60px', 
                      borderRadius: '50%', 
                      objectFit: 'cover', 
                      border: '3px solid #e0e7ff',
                      flexShrink: 0
                    }} 
                  />
                ) : (
                  <div style={{ 
                    width: '60px', 
                    height: '60px', 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #ff9a56, #ff6b6b)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '1.5rem', 
                    color: 'white',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
              <div>
                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{user.username}</div>
                {user.bio && (
                  <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.25rem' }}>
                    {user.bio.length > 80 ? `${user.bio.substring(0, 80)}...` : user.bio}
                  </div>
                )}
                {user.skills && user.skills.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    {user.skills.slice(0, 3).map((skill, index) => (
                      <span key={index} style={{
                        display: 'inline-block',
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        color: 'white',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        marginRight: '0.5rem',
                        marginBottom: '0.25rem'
                      }}>
                        {skill}
                      </span>
                    ))}
                    {user.skills.length > 3 && (
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>
                        +{user.skills.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
              </Link>
              
              {/* Send Message button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/messages/${user.id}`);
                }}
                style={{
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  marginLeft: '1rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                }}
              >
                <MessageCircle size={16} /> Message
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserSearchPage;
