import React, { useState, useEffect, useRef } from 'react';
import { Palette } from 'lucide-react';
import './PortfolioPage.css';

// Utility for robust skills parsing
function parseSkills(skills) {
  if (Array.isArray(skills)) return skills;
  if (typeof skills === 'string') {
    try {
      const arr = JSON.parse(skills);
      if (Array.isArray(arr)) return arr;
    } catch {
      if (skills.split) return skills.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

const PortfolioPage = ({ user }) => {
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    image_url: '',
    price: ''
  });
  const [creating, setCreating] = useState(false);
  const [profile, setProfile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [artworkImageFile, setArtworkImageFile] = useState(null);
  const fileInputRef = useRef();

  useEffect(() => {
    // Token check and fetch profile
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    fetch('http://localhost:8000/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setProfile(data))
      .catch(() => setProfile(null));
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      const response = await fetch(`http://localhost:8000/users/${user.id}/portfolio`);
      if (response.ok) {
        const data = await response.json();
        setPortfolioItems(data.portfolio_items || []);
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArtworkImageChange = (e) => {
    setArtworkImageFile(e.target.files[0]);
  };

  const createPortfolioItem = async (e) => {
    e.preventDefault();
    if (!newItem.title.trim()) return;

    setCreating(true);
    let imageUrl = newItem.image_url;
    try {
      const token = localStorage.getItem('token');
      // If a file is selected, upload it to backend/Supabase
      if (artworkImageFile) {
        const imgForm = new FormData();
        imgForm.append('file', artworkImageFile);
        const imgRes = await fetch('http://localhost:8000/upload-artwork-image', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: imgForm,
        });
        console.log('Image upload response:', imgRes);
        if (!imgRes.ok) {
          const errText = await imgRes.text();
          alert('Image upload failed: ' + errText);
          setCreating(false);
          return;
        }
        const imgData = await imgRes.json();
        console.log('Image upload data:', imgData);
        if (!imgData.url) {
          alert('Image upload failed: No URL returned');
          setCreating(false);
          return;
        }
        imageUrl = imgData.url;
      }
      console.log('Final imageUrl for portfolio item:', imageUrl);
      // Now submit the artwork with the imageUrl
      const formData = new FormData();
      formData.append('title', newItem.title);
      formData.append('description', newItem.description);
      formData.append('image_url', imageUrl);
      if (newItem.price) {
        formData.append('price', newItem.price);
      }
      const response = await fetch('http://localhost:8000/portfolio', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      console.log('Portfolio item creation response:', response);
      if (response.ok) {
        setNewItem({
          title: '',
          description: '',
          image_url: '',
          price: ''
        });
        setArtworkImageFile(null);
        setShowCreateForm(false);
        fetchPortfolio();
      }
    } catch (error) {
      console.error('Error creating portfolio item:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/profile/avatar', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(prev => ({
          ...prev,
          avatar_url: data.avatar_url + '?t=' + new Date().getTime()
        }));
      } else {
        alert('Failed to upload avatar.');
      }
    } catch (err) {
      alert('Failed to upload avatar.');
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatPrice = (price) => {
    return price ? `$${parseFloat(price).toFixed(2)}` : 'Price on request';
  };

  const deletePortfolioItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this artwork?')) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:8000/portfolio/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        setPortfolioItems(items => items.filter(item => item.id !== itemId));
      } else {
        const errText = await response.text();
        alert('Failed to delete artwork: ' + errText);
      }
    } catch (error) {
      alert('Failed to delete artwork.');
    }
  };

  // Fix: prepend backend URL to avatar if needed
  let avatarUrl = profile && profile.avatar_url;
  if (avatarUrl && avatarUrl.startsWith('/avatars/')) {
    avatarUrl = `http://localhost:8000${avatarUrl}`;
  }

  if (loading) {
    return (
      <div className="portfolio-container">
        <div className="portfolio-loading">Loading portfolio...</div>
      </div>
    );
  }

  return (
    <div className="portfolio-container">
      {/* Profile section at the top */}
      {profile && (
        <div className="portfolio-profile-card">
          <div className="portfolio-avatar-section">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                className="portfolio-avatar"
              />
            ) : (
              <div className="portfolio-avatar-placeholder">
                {profile.username.charAt(0).toUpperCase()}
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleAvatarChange}
            />
            <button
              className="portfolio-change-photo-btn"
              onClick={() => fileInputRef.current.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Change Photo'}
            </button>
          </div>
          <div className="portfolio-profile-info">
            <h2>{profile.username}</h2>
            <div className="portfolio-role">{profile.role}</div>
            <div className="portfolio-bio">{profile.bio}</div>
          </div>
        </div>
      )}

      <div className="portfolio-header">
        <div className="portfolio-header-content">
          <h1>My Portfolio</h1>
          <p>Showcase your best work</p>
        </div>
        <button 
          className="portfolio-add-btn"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          + Add Artwork
        </button>
      </div>

      {showCreateForm && (
        <div className="portfolio-create-form">
          <h3 className="portfolio-form-title">Add New Artwork</h3>
          <form onSubmit={createPortfolioItem}>
            <div className="portfolio-form-group">
              <label className="portfolio-form-label">Title *</label>
              <input
                className="portfolio-form-input"
                type="text"
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                placeholder="Enter artwork title"
                required
              />
            </div>

            <div className="portfolio-form-group">
              <label className="portfolio-form-label">Description</label>
              <textarea
                className="portfolio-form-textarea"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Describe your artwork..."
                rows="3"
              />
            </div>

            <div className="portfolio-form-group">
              <label className="portfolio-form-label">Artwork Image</label>
              <input
                className="portfolio-form-input"
                type="file"
                accept="image/*"
                onChange={handleArtworkImageChange}
              />
            </div>
            <div className="portfolio-form-group">
              <label className="portfolio-form-label">Or Image URL</label>
              <input
                className="portfolio-form-input"
                type="url"
                value={newItem.image_url}
                onChange={(e) => setNewItem({ ...newItem, image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="portfolio-form-group">
              <label className="portfolio-form-label">Price (USD)</label>
              <input
                className="portfolio-form-input"
                type="number"
                min="0"
                step="0.01"
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                placeholder="100.00"
              />
            </div>

            <div className="portfolio-form-actions">
              <button type="submit" className="portfolio-submit-btn" disabled={creating}>
                {creating ? 'Adding...' : 'Add Artwork'}
              </button>
              <button 
                type="button" 
                className="portfolio-cancel-btn"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="portfolio-divider" />

      <div className="portfolio-section">
        {portfolioItems.length === 0 ? (
          <div className="portfolio-empty-state">
            <h3>No artwork yet</h3>
            <p>Start building your portfolio by adding your first artwork!</p>
          </div>
        ) : (
          <div className="portfolio-grid">
            {portfolioItems.map((item) => (
              <div key={item.id} className="portfolio-card">
                <div className="portfolio-image-container">
                  <img 
                    src={item.image_url ? item.image_url + (item.image_url.includes('?') ? '&' : '?') + 't=' + new Date().getTime() : ''}
                    alt={item.title}
                    className="portfolio-image"
                    onError={e => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="portfolio-image-placeholder">
                    <Palette size={20} /> Image not available
                  </div>
                </div>

                <div className="portfolio-content">
                  <h3 className="portfolio-title">{item.title}</h3>
                  {item.description && (
                    <p className="portfolio-description">{item.description}</p>
                  )}
                  
                  <div className="portfolio-footer">
                    <div className="portfolio-price">
                      {formatPrice(item.price)}
                    </div>
                    <div className="portfolio-date">
                      Added {formatDate(item.created_at)}
                    </div>
                  </div>
                  <button
                    className="portfolio-delete-btn"
                    onClick={async () => {
                      if (!window.confirm('Are you sure you want to delete this artwork?')) return;
                      const token = localStorage.getItem('token');
                      try {
                        const res = await fetch(`http://localhost:8000/portfolio/${item.id}`, {
                          method: 'DELETE',
                          headers: { 'Authorization': `Bearer ${token}` },
                        });
                        if (res.ok) {
                          setPortfolioItems(items => items.filter(i => i.id !== item.id));
                        } else {
                          alert('Failed to delete artwork.');
                        }
                      } catch (err) {
                        alert('Error deleting artwork.');
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioPage;
