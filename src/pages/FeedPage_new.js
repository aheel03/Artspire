import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Camera, MessageCircle, ThumbsUp, Tag } from 'lucide-react';
import './FeedPage.css';

const FeedPage = ({ currentUser }) => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState({ content: '', image: null, tags: [] });
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedFilterTags, setSelectedFilterTags] = useState([]);
  const [imagePreview, setImagePreview] = useState({ isOpen: false, imageUrl: '', alt: '' });

  useEffect(() => {
    fetchPosts();
    fetchAvailableTags();
  }, [selectedFilterTags]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape' && imagePreview.isOpen) {
        closeImagePreview();
      }
    };

    if (imagePreview.isOpen) {
      document.addEventListener('keydown', handleKeyPress);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.body.style.overflow = 'unset';
    };
  }, [imagePreview.isOpen]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      let url = 'http://localhost:8000/feed';
      if (selectedFilterTags.length > 0) {
        url += `?tags=${selectedFilterTags.join(',')}`;
      }
      
      const token = localStorage.getItem('token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTags = async () => {
    try {
      const response = await fetch('http://localhost:8000/post-tags');
      if (response.ok) {
        const data = await response.json();
        setAvailableTags(data.tags || []);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const createPost = async (e) => {
    e.preventDefault();
    if (!newPost.content.trim()) return;

    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to create a post');
        setCreating(false);
        return;
      }

      const formData = new FormData();
      formData.append('content', newPost.content);
      
      // Add tags as JSON string
      if (newPost.tags.length > 0) {
        formData.append('tags', JSON.stringify(newPost.tags));
      }
      
      // Add image file if selected
      if (newPost.image) {
        formData.append('file', newPost.image);
      }

      console.log('Creating post with data:', {
        content: newPost.content,
        tags: newPost.tags,
        hasImage: !!newPost.image
      });

      const response = await fetch('http://localhost:8000/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('Post creation response status:', response.status);
      const responseData = await response.json();
      console.log('Post creation response data:', responseData);

      if (response.ok) {
        setNewPost({ content: '', image: null, tags: [] });
        setShowCreatePost(false);
        fetchPosts(); // Refresh the feed
        console.log('Post created successfully');
      } else {
        console.error('Failed to create post:', responseData);
        alert(`Failed to create post: ${responseData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Error creating post. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const upvotePost = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/posts/${postId}/upvote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Update the post's upvote count in the state
        setPosts(posts.map(post => 
          post.id === postId 
            ? { ...post, upvotes: post.upvotes + 1 }
            : post
        ));
      } else {
        const errorData = await response.json();
        alert(`Failed to upvote post: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error upvoting post:', error);
      alert('Error upvoting post. Please try again.');
    }
  };

  const toggleComments = async (postId) => {
    if (expandedComments[postId]) {
      // If comments are expanded, collapse them
      setExpandedComments({ ...expandedComments, [postId]: false });
    } else {
      // If comments are collapsed, expand them and fetch comments
      setExpandedComments({ ...expandedComments, [postId]: true });
      await fetchComments(postId);
    }
  };

  const fetchComments = async (postId) => {
    try {
      setLoadingComments({ ...loadingComments, [postId]: true });
      const response = await fetch(`http://localhost:8000/posts/${postId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments({ ...comments, [postId]: data.comments || [] });
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments({ ...loadingComments, [postId]: false });
    }
  };

  const createComment = async (postId) => {
    const content = newComment[postId];
    if (!content || !content.trim()) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to comment');
        return;
      }

      const response = await fetch(`http://localhost:8000/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (response.ok) {
        // Clear the comment input
        setNewComment({ ...newComment, [postId]: '' });
        // Refresh comments
        await fetchComments(postId);
        // Update comment count in posts
        setPosts(posts.map(post => 
          post.id === postId 
            ? { ...post, comment_count: (post.comment_count || 0) + 1 }
            : post
        ));
      } else {
        const errorData = await response.json();
        alert(`Failed to create comment: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating comment:', error);
      alert('Error creating comment. Please try again.');
    }
  };

  const toggleTag = (tag) => {
    if (newPost.tags.includes(tag)) {
      setNewPost({ ...newPost, tags: newPost.tags.filter(t => t !== tag) });
    } else {
      setNewPost({ ...newPost, tags: [...newPost.tags, tag] });
    }
  };

  const toggleFilterTag = (tag) => {
    if (selectedFilterTags.includes(tag)) {
      setSelectedFilterTags(selectedFilterTags.filter(t => t !== tag));
    } else {
      setSelectedFilterTags([...selectedFilterTags, tag]);
    }
  };

  const clearAllFilters = () => {
    setSelectedFilterTags([]);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAvatarUrl = (avatarUrl) => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('http')) return avatarUrl;
    return `http://localhost:8000${avatarUrl}`;
  };

  const navigateToUserProfile = (userId) => {
    navigate(`/user/${userId}`);
  };

  const parseTags = (tagsString) => {
    if (!tagsString) return [];
    try {
      return JSON.parse(tagsString);
    } catch {
      return [];
    }
  };

  const openImagePreview = (imageUrl, alt) => {
    setImagePreview({ isOpen: true, imageUrl, alt });
  };

  const closeImagePreview = () => {
    setImagePreview({ isOpen: false, imageUrl: '', alt: '' });
  };

  const followUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/users/${userId}/follow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Update the posts state to reflect the follow status
        setPosts(posts.map(post => 
          post.author.id === userId 
            ? { ...post, is_following: true }
            : post
        ));
      } else {
        const errorData = await response.json();
        alert(`Failed to follow user: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error following user:', error);
      alert('Error following user. Please try again.');
    }
  };

  const unfollowUser = async (userId) => {
    console.log(`[FRONTEND DEBUG] Attempting to unfollow user: ${userId}`);
    try {
      const token = localStorage.getItem('token');
      console.log(`[FRONTEND DEBUG] Using token: ${token ? 'present' : 'missing'}`);
      
      const response = await fetch(`http://localhost:8000/users/${userId}/follow`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log(`[FRONTEND DEBUG] Unfollow response status: ${response.status}`);
      
      if (response.ok) {
        console.log(`[FRONTEND DEBUG] Unfollow successful`);
        // Update the posts state to reflect the unfollow status
        setPosts(posts.map(post => 
          post.author.id === userId 
            ? { ...post, is_following: false }
            : post
        ));
      } else {
        const errorData = await response.json();
        console.log(`[FRONTEND DEBUG] Unfollow error: ${JSON.stringify(errorData)}`);
        alert(`Failed to unfollow user: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[FRONTEND DEBUG] Error unfollowing user:', error);
      alert('Error unfollowing user. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="feed-page">
        <div className="feed-container">
          <div className="main-feed">
            <div style={{ textAlign: 'center', color: 'rgba(226, 232, 240, 0.9)', fontSize: '1.1rem' }}>
              Loading feed...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-page">
      <div className="feed-container">
        <div className="main-feed">
          <div className="feed-header">
            <h1 className="feed-title">Community Feed</h1>
            <p className="feed-subtitle">Share your art, discover amazing creations, and connect with fellow artists</p>
            <button 
              className="create-post-button"
              onClick={() => setShowCreatePost(!showCreatePost)}
            >
              <Sparkles size={16} /> Create Post
            </button>
          </div>

          {showCreatePost && (
            <div className="create-post-form">
              <h3 className="create-post-title">Share with the community</h3>
              <form onSubmit={createPost}>
                <textarea
                  className="post-textarea"
                  placeholder="What's on your mind? Share your art, thoughts, or ask for feedback..."
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  rows="4"
                  required
                />
                <div className="post-form-actions">
                  <div className="file-upload-section">
                    <label className="file-upload-button">
                      <Camera size={16} /> Add Image
                      <input
                        className="file-upload-input"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setNewPost({ ...newPost, image: e.target.files[0] })}
                      />
                    </label>
                    {newPost.image && (
                      <span className="selected-file">{newPost.image.name}</span>
                    )}
                  </div>
                  <button type="submit" className="form-submit-button" disabled={creating}>
                    {creating ? 'Posting...' : 'Share Post'}
                  </button>
                </div>
                <div className="tags-section">
                  <label className="tags-label">Tags:</label>
                  <div className="tags-container">
                    {availableTags.map(tag => (
                      <div 
                        key={tag} 
                        className={`tag-item ${newPost.tags.includes(tag) ? 'selected' : ''}`}
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>
          )}

          <div className="posts-list">
            {posts.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{ 
                  color: 'rgba(226, 232, 240, 0.9)', 
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: '1.4rem',
                  marginBottom: '12px'
                }}>No posts found</h3>
                <p style={{ 
                  color: 'rgba(148, 163, 184, 0.8)',
                  fontFamily: "'Inter', sans-serif" 
                }}>
                  {selectedFilterTags.length > 0 ? 'No posts match the selected tags.' : 'Be the first to share something with the community!'}
                </p>
              </div>
            ) : (
              posts.map((post) => (
            <div key={post.id} className="post-card">
              <div className="post-header">
                <div className="post-author-info">
                  <div 
                    className="author-avatar" 
                    onClick={() => navigateToUserProfile(post.author.id)}
                  >
                    {post.author.avatar_url ? (
                      <img 
                        src={getAvatarUrl(post.author.avatar_url)} 
                        alt={post.author.username}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : (
                      <div className="avatar-fallback">
                        {post.author.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="avatar-fallback" style={{display: 'none'}}>
                      {post.author.username.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="author-details">
                    <div 
                      className="author-name"
                      onClick={() => navigateToUserProfile(post.author.id)}
                    >
                      {post.author.username}
                    </div>
                    <div className="post-date">{formatDate(post.created_at)}</div>
                  </div>
                </div>
                {!post.is_own_post && (
                  <button
                    className={`follow-button ${post.is_following ? 'following' : ''}`}
                    onClick={() => post.is_following ? unfollowUser(post.author.id) : followUser(post.author.id)}
                  >
                    {post.is_following ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>

              <div className="post-content">
                <p className="post-text">{post.content}</p>
                {post.image_url && (
                  <div className="post-image-container">
                    <img 
                      src={post.image_url} 
                      alt="Post content" 
                      className="post-image"
                      onClick={() => openImagePreview(post.image_url, 'Post content')}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                {post.tags && parseTags(post.tags).length > 0 && (
                  <div className="post-tags">
                    {parseTags(post.tags).map((tag, index) => (
                      <span key={index} className="post-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="post-actions">
                <button 
                  className="action-button upvote-button"
                  onClick={() => upvotePost(post.id)}
                >
                  <ThumbsUp size={16} /> {post.upvotes}
                </button>
                <button 
                  className="action-button comment-button"
                  onClick={() => toggleComments(post.id)}
                >
                  <MessageCircle size={16} /> {post.comment_count || 0} Comments
                </button>
              </div>

              {expandedComments[post.id] && (
                <div className="comments-section">
                  <div className="new-comment-form">
                    <textarea
                      className="comment-textarea"
                      placeholder="Write a comment..."
                      value={newComment[post.id] || ''}
                      onChange={(e) => setNewComment({ ...newComment, [post.id]: e.target.value })}
                      rows="2"
                    />
                    <button 
                      className="comment-submit-button"
                      onClick={() => createComment(post.id)}
                    >
                      Post Comment
                    </button>
                  </div>

                  {loadingComments[post.id] ? (
                    <div className="loading-comments">Loading comments...</div>
                  ) : (
                    comments[post.id]?.length > 0 ? (
                      <div className="comments-list">
                        {comments[post.id].map((comment) => (
                          <div key={comment.id} className="comment-item">
                            <div className="comment-avatar">
                              {comment.author.avatar_url ? (
                                <img 
                                  src={getAvatarUrl(comment.author.avatar_url)} 
                                  alt={comment.author.username}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : (
                                <div className="comment-avatar-fallback">
                                  {comment.author.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="comment-avatar-fallback" style={{display: 'none'}}>
                                {comment.author.username.charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div className="comment-content">
                              <div className="comment-author-name">{comment.author.username}</div>
                              <div className="comment-text">{comment.content}</div>
                              <div className="comment-date">{formatDate(comment.created_at)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-comments">No comments yet. Be the first to comment!</div>
                    )
                  )}
                </div>
              )}
            </div>
          ))
        )}
          </div>
        </div>
        
        {/* Right Sidebar - Tag Filter */}
        <div className="feed-sidebar">
          <div className="sidebar-card">
            <h3 className="sidebar-title"><Tag size={16} /> Filter by Tags</h3>
            {selectedFilterTags.length > 0 && (
              <div className="active-filters">
                <div className="active-filters-header">
                  <span className="active-filters-title">Active Filters:</span>
                  <button className="clear-filters-button" onClick={clearAllFilters}>
                    Clear All
                  </button>
                </div>
                <div className="active-tags-container">
                  {selectedFilterTags.map(tag => (
                    <div 
                      key={tag} 
                      className="active-filter-tag"
                      onClick={() => toggleFilterTag(tag)}
                    >
                      {tag} ×
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="filter-tags-grid">
              {availableTags.map(tag => (
                <div 
                  key={tag} 
                  className={`filter-tag ${selectedFilterTags.includes(tag) ? 'active' : ''}`}
                  onClick={() => toggleFilterTag(tag)}
                >
                  {tag}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {imagePreview.isOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            cursor: 'pointer'
          }}
          onClick={closeImagePreview}
        >
          <div 
            style={{
              position: 'relative',
              maxWidth: '90%',
              maxHeight: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'rgba(0, 0, 0, 0.7)',
                border: 'none',
                color: 'white',
                fontSize: '24px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease'
              }}
              onClick={closeImagePreview}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
              }}
            >
              ×
            </button>
            <img 
              src={imagePreview.imageUrl} 
              alt={imagePreview.alt} 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '12px'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedPage;
