import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Palette } from 'lucide-react';
import './ArtCollectionPage.css';

const ArtCollectionPage = ({ user }) => {
  const navigate = useNavigate();
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAllArtworks();
  }, []);

  const fetchAllArtworks = async () => {
    try {
      const response = await fetch('http://localhost:8000/portfolio/all');
      if (response.ok) {
        const data = await response.json();
        setArtworks(data.artworks || []);
      } else {
        setError('Failed to load artworks');
      }
    } catch (error) {
      console.error('Error fetching artworks:', error);
      setError('Failed to load artworks');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('/')) {
      return `http://localhost:8000${imageUrl}`;
    }
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    return `http://localhost:8000/${imageUrl}`;
  };

  const getAvatarUrl = (avatar_url) => {
    if (!avatar_url) return '/default-avatar.svg';
    if (avatar_url.startsWith('/')) {
      return `http://localhost:8000${avatar_url}`;
    }
    if (avatar_url.startsWith('http')) {
      return avatar_url;
    }
    return `http://localhost:8000/${avatar_url}`;
  };

  const handleArtworkClick = (artwork) => {
    // Navigate to the user's profile page
    //navigate(`/user/${artwork.user.id}`);
    navigate(`/artwork/${artwork.id}`);
  };

  const handleUserClick = (e, userId) => {
    e.stopPropagation();
    navigate(`/user/${userId}`);
  };

  if (loading) {
    return (
      <div className="art-collection-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading artworks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="art-collection-page">
        <div className="error-container">
          <p>{error}</p>
          <button onClick={fetchAllArtworks} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="art-collection-page">
      {/* Modern floating decorative elements */}
      <div className="floating-elements">
        <div className="floating-shape"></div>
        <div className="floating-shape"></div>
        <div className="floating-shape"></div>
      </div>

      <div className="collection-header">
        <h1>Discover Amazing Art</h1>
        <p>Explore a curated collection of incredible artworks from talented artists around the world</p>
      </div>

      {artworks.length === 0 ? (
        <div className="no-artworks">
          <p><Sparkles size={16} /> No artworks found. Be the first to share your creativity! <Sparkles size={16} /></p>
        </div>
      ) : (
        <div className="artworks-grid">
          {artworks.map((artwork, index) => (
            <div
              key={artwork.id}
              //className={`artwork-card ${index % 4 === 0 ? 'static-info' : ''}`}
              className="artwork-card"
              onClick={() => handleArtworkClick(artwork)}
              style={{
                animationDelay: `${index * 0.02}s`
              }}
            >
              <div className="artwork-image-container">
                <img
                  src={getImageUrl(artwork.image_url)}
                  alt={artwork.title}
                  className="artwork-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="image-placeholder" style={{ display: 'none' }}>
                  <span><Palette size={20} /> Artwork unavailable</span>
                </div>
              </div>
              
              <div className="artwork-overlay">
                <div className="artwork-info">
                  <h3 className="artwork-title">{artwork.title}</h3>
                  {artwork.description && (
                    <p className="artwork-description">{artwork.description}</p>
                  )}
                </div>
                
                <div className="artist-info">
                  <div
                    className="artist-avatar"
                    onClick={(e) => handleUserClick(e, artwork.user.id)}
                  >
                    <img
                      src={getAvatarUrl(artwork.user.avatar_url)}
                      alt={artwork.user.username}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="avatar-fallback" style={{ display: 'none' }}>
                      {artwork.user.username.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="artist-details">
                    <span 
                      className="artist-name"
                      onClick={(e) => handleUserClick(e, artwork.user.id)}
                    >
                      {artwork.user.username}
                    </span>
                    {artwork.user.bio && (
                      <span className="artist-bio">{artwork.user.bio}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArtCollectionPage;
