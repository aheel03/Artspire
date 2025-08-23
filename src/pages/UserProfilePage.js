import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { Palette, MessageCircle, Heart, HeartOff, Bell } from 'lucide-react';
import './UserProfilePage.css';

const UserProfilePage = ({ currentUser }) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('portfolio');
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ total_reviews: 0, average_rating: 0 });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewFormData, setReviewFormData] = useState({
    rating: 5,
    comment: ''
  });

  useEffect(() => {
    fetchUserProfile();
    fetchUserPortfolio();
    fetchFollowStats();
    fetchNotifications();
    fetchReviews();
    fetchReviewStats();
    // Check if current user is following this user
    if (currentUser && currentUser.id !== parseInt(userId)) {
      checkIsFollowing();
    }
    // Hide notifications dropdown on outside click
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
    // eslint-disable-next-line
  }, [userId, currentUser]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`http://localhost:8000/users/${userId}`);
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchUserPortfolio = async () => {
    try {
      const response = await fetch(`http://localhost:8000/users/${userId}/portfolio`);
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

  // Fetch follower/following counts
  const fetchFollowStats = async () => {
    try {
      const response = await fetch(`http://localhost:8000/users/${userId}/follow_stats`);
      if (response.ok) {
        const data = await response.json();
        setFollowersCount(data.followers_count || 0);
        setFollowingCount(data.following_count || 0);
      }
    } catch (error) {
      // ignore
    }
  };

  // Check if current user is following this user
  const checkIsFollowing = async () => {
    try {
      const response = await fetch(`http://localhost:8000/users/${userId}/is_following`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.is_following);
      }
    } catch (error) {
      // ignore
    }
  };

  // Follow/unfollow user
  const handleFollow = async () => {
    console.log(`[FRONTEND DEBUG] Attempting to ${isFollowing ? 'unfollow' : 'follow'} user: ${userId}`);
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const token = localStorage.getItem('token');
      console.log(`[FRONTEND DEBUG] Using method: ${method}, token: ${token ? 'present' : 'missing'}`);
      
      const response = await fetch(`http://localhost:8000/users/${userId}/follow`, {
        method,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log(`[FRONTEND DEBUG] ${isFollowing ? 'Unfollow' : 'Follow'} response status: ${response.status}`);
      
      if (response.ok) {
        console.log(`[FRONTEND DEBUG] ${isFollowing ? 'Unfollow' : 'Follow'} successful`);
        setIsFollowing(!isFollowing);
        // Fetch updated stats from server to ensure accuracy
        fetchFollowStats();
      } else {
        const errorData = await response.json();
        console.log(`[FRONTEND DEBUG] ${isFollowing ? 'Unfollow' : 'Follow'} error: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.error(`[FRONTEND DEBUG] Error ${isFollowing ? 'unfollowing' : 'following'} user:`, error);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const response = await fetch(`http://localhost:8000/users/${currentUser.id}/notifications`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      // ignore
    }
  };

  // Fetch reviews
  const fetchReviews = async () => {
    try {
      const response = await fetch(`http://localhost:8000/users/${userId}/reviews`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      }
    } catch (error) {
      // ignore
    }
  };

  // Fetch review stats
  const fetchReviewStats = async () => {
    try {
      const response = await fetch(`http://localhost:8000/users/${userId}/reviews/stats`);
      if (response.ok) {
        const data = await response.json();
        setReviewStats(data);
      }
    } catch (error) {
      // ignore
    }
  };

  // Submit review
  const submitReview = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    
    console.log('Submitting review with data:', reviewFormData);
    
    try {
      const response = await fetch(`http://localhost:8000/users/${userId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          rating: reviewFormData.rating,
          comment: reviewFormData.comment
        })
      });
      
      if (response.ok) {
        setShowReviewForm(false);
        setReviewFormData({ rating: 5, comment: '' });
        fetchReviews();
        fetchReviewStats();
      } else {
        const errorData = await response.json();
        alert(errorData.detail || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const parseSkills = (skillsString) => {
    if (!skillsString) return [];
    if (Array.isArray(skillsString)) return skillsString;
    if (typeof skillsString === 'object') return [];
    try {
      const arr = JSON.parse(skillsString);
      if (Array.isArray(arr)) return arr;
    } catch {
      if (typeof skillsString === 'string' && skillsString.length > 0) {
        return String(skillsString).split(',').map(skill => skill.trim()).filter(skill => skill);
      }
    }
    return [];
  };



  const formatPrice = (price) => {
    return price ? `$${parseFloat(price).toFixed(2)}` : 'Price on request';
  };

  const getAvatarUrl = (avatar_url) => {
    if (!avatar_url) return null;
    if (avatar_url.startsWith('/')) {
      return `http://localhost:8000${avatar_url}`;
    }
    return avatar_url;
  };

  // Star Rating component
  const StarRating = ({ rating, onRatingChange, readonly = false }) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          type="button"
          className={`star ${i <= rating ? 'filled' : ''}`}
          onClick={() => !readonly && onRatingChange && onRatingChange(i)}
          disabled={readonly}
        >
          ★
        </button>
      );
    }
    return <div className="star-rating">{stars}</div>;
  };

  if (loading) {
    return (
      <div className="user-profile-page">
        <div className="profile-container">
          <div className="loading-container">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="user-profile-page">
        <div className="profile-container">
          <div className="error-container">User not found</div>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === parseInt(userId);

  return (
    <div className="user-profile-page">
      <div className="profile-container">
        <div className="profile-header-card">
          <div className="profile-header">
            <div className="profile-main-info">
              <div className="profile-avatar">
                {user.avatar_url ? (
                  <img 
                    src={getAvatarUrl(user.avatar_url)} 
                    alt={user.username} 
                    className="profile-avatar-image" 
                  />
                ) : (
                  <div className="profile-avatar-placeholder">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="profile-info">
                <h1 className="profile-username">{user.username}</h1>
                <p className="profile-member-since">
                  Member since {formatDate(user.created_at)}
                </p>
                <div className="profile-stats">
                  <div className="profile-stat">
                    <span className="profile-stat-number">{followersCount}</span>
                    <span className="profile-stat-label">Followers</span>
                  </div>
                  <div className="profile-stat">
                    <span className="profile-stat-number">{followingCount}</span>
                    <span className="profile-stat-label">Following</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="profile-actions">
              {!isOwnProfile && (
                <>
                  <button 
                    className="profile-action-button secondary"
                    onClick={() => navigate(`/messages/${userId}`)}
                  >
                    <MessageCircle size={16} /> Send Message
                  </button>
                  <button 
                    className={`profile-action-button ${isFollowing ? 'unfollow' : ''}`}
                    onClick={handleFollow}
                  >
                    {isFollowing ? <><HeartOff size={16} /> Unfollow</> : <><Heart size={16} /> Follow</>}
                  </button>
                </>
              )}
              
              {isOwnProfile && (
                <>
                  <button 
                    className="profile-action-button"
                    onClick={() => window.location.href = '/profile'}
                  >
                    ✏️ Edit Profile
                  </button>
                  <div className="notification-container" ref={notificationRef}>
                    <button 
                      className="notification-button"
                      onClick={() => setShowNotifications(!showNotifications)}
                    >
                      <Bell size={20} />
                      {notifications.length > 0 && (
                        <span className="notification-badge">
                          {notifications.length}
                        </span>
                      )}
                    </button>
                    {showNotifications && (
                      <div className="notifications-dropdown">
                        <h4>Notifications</h4>
                        {notifications.length === 0 ? (
                          <p style={{ margin: 0, color: '#666' }}>No new notifications</p>
                        ) : (
                          notifications.map((notification, index) => (
                            <div key={index} className="notification-item">
                              <span>{notification.message || 'New notification'}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="profile-content">
          <div className="profile-section">
            <h3 className="profile-section-title">About</h3>
            <p className="profile-bio">
              {user.bio || `${user.username} hasn't added a bio yet.`}
            </p>
          </div>

          {user.skills && parseSkills(user.skills).length > 0 && (
            <div className="profile-section">
              <h3 className="profile-section-title">Skills & Expertise</h3>
              <div className="profile-skills">
                {parseSkills(user.skills).map((skill, index) => (
                  <span key={index} className="profile-skill-tag">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="profile-tabs-container">
          <div className="profile-tabs">
            <button 
              className={`profile-tab ${activeTab === 'portfolio' ? 'active' : ''}`}
              onClick={() => setActiveTab('portfolio')}
            >
              Portfolio ({portfolioItems.length})
            </button>
            <button 
              className={`profile-tab ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              Reviews ({reviewStats.total_reviews || 0})
            </button>
          </div>

          <div className="profile-tab-content">
            {activeTab === 'portfolio' && (
              <div className="portfolio-grid">
                {portfolioItems.length === 0 ? (
                  <div className="empty-state">
                    <h3>No portfolio items yet</h3>
                    <p>{user.username} hasn't added any artwork to their portfolio.</p>
                  </div>
                ) : (
                  portfolioItems.map((item) => (
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
                      <div className="portfolio-card-content">
                        <h3 className="portfolio-title">{item.title}</h3>
                        {item.description && (
                          <p className="portfolio-description">{item.description}</p>
                        )}
                        <div className="portfolio-footer">
                          <div className="portfolio-price">{formatPrice(item.price)}</div>
                          <div className="portfolio-date">Added {formatDate(item.created_at)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="reviews-section">
                {reviews.length === 0 ? (
                  <div className="empty-state">
                    <h3>No reviews yet</h3>
                    <p>This user hasn't received any reviews yet.</p>
                  </div>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="review-card">
                      <div className="review-header">
                        <div className="review-author">
                          {review.reviewer.avatar_url ? (
                            <img 
                              src={getAvatarUrl(review.reviewer.avatar_url)} 
                              alt={review.reviewer.username} 
                              className="review-author-avatar" 
                            />
                          ) : (
                            <div className="review-author-placeholder">
                              {review.reviewer.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="review-author-info">
                            <span className="review-author-name">{review.reviewer.username}</span>
                            <span className="review-date">{formatDate(review.created_at)}</span>
                          </div>
                        </div>
                        <div className="review-rating">
                          {Array.from({ length: 5 }, (_, index) => (
                            <span key={index} className={`star ${index < review.rating ? 'filled' : ''}`}>
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="review-content">
                        <p>{review.comment}</p>
                      </div>
                    </div>
                  ))
                )}

                {currentUser && !isOwnProfile && (
                  <div className="add-review">
                    <h3>Write a Review for {user.username}</h3>
                    {!showReviewForm ? (
                      <button 
                        className="write-review-button"
                        onClick={() => setShowReviewForm(true)}
                      >
                        Write a Review
                      </button>
                    ) : (
                      <form onSubmit={submitReview} className="review-form">
                        <div className="review-rating-input">
                          <label htmlFor="rating">Rating:</label>
                          <StarRating 
                            rating={reviewFormData.rating} 
                            onRatingChange={rating => setReviewFormData({ ...reviewFormData, rating })}
                            readonly={false}
                          />
                        </div>
                        <div className="review-comment">
                          <label htmlFor="comment">Comment:</label>
                          <textarea 
                            id="comment" 
                            value={reviewFormData.comment} 
                            onChange={e => setReviewFormData({ ...reviewFormData, comment: e.target.value })}
                            rows="4"
                            required
                          />
                        </div>
                        <div className="review-form-buttons">
                          <button type="submit" className="submit-review-button">
                            Submit Review
                          </button>
                          <button 
                            type="button" 
                            className="cancel-review-button"
                            onClick={() => {
                              setShowReviewForm(false);
                              setReviewFormData({ rating: 5, comment: '' });
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
