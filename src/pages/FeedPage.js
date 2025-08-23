import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Camera, MessageCircle, ThumbsUp, Tag, Users, Edit3, Trash2, Check, X } from 'lucide-react';
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
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [editingComment, setEditingComment] = useState(null); // ID of comment being edited
  const [editCommentContent, setEditCommentContent] = useState(''); // Content of comment being edited
  const [editingPost, setEditingPost] = useState(null); // ID of post being edited
  const [editPostContent, setEditPostContent] = useState(''); // Content of post being edited
  const [hoveredFollowBtn, setHoveredFollowBtn] = useState(null); // ID of user whose follow button is being hovered

  // Debug log to check if currentUser is passed correctly
  console.log('FeedPage currentUser:', currentUser);

  const fetchPosts = useCallback(async () => {
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
  }, [selectedFilterTags]);

  useEffect(() => {
    fetchPosts();
    fetchAvailableTags();
    fetchSuggestedUsers();
  }, [fetchPosts]);

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

  const fetchSuggestedUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('http://localhost:8000/users/suggested', { headers });
      if (response.ok) {
        const data = await response.json();
        setSuggestedUsers(data.suggested_users || []);
      }
    } catch (error) {
      console.error('Error fetching suggested users:', error);
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
      if (!token) {
        alert('You must be logged in to upvote posts');
        return;
      }

      const response = await fetch(`http://localhost:8000/posts/${postId}/upvote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Update the post's upvote count and upvote status in the state
        setPosts(posts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                upvotes: data.upvotes,
                has_upvoted: data.has_upvoted 
              }
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

  const startEditPost = (postId, currentContent) => {
    setEditingPost(postId);
    setEditPostContent(currentContent);
  };

  const cancelEditPost = () => {
    setEditingPost(null);
    setEditPostContent('');
  };

  const saveEditPost = async (postId) => {
    if (!editPostContent.trim()) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to edit posts');
        return;
      }

      const response = await fetch(`http://localhost:8000/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content: editPostContent.trim() }),
      });

      if (response.ok) {
        const updatedPost = await response.json();
        // Update the post in the state
        setPosts(posts.map(post =>
          post.id === postId
            ? { ...post, content: updatedPost.content }
            : post
        ));
        setEditingPost(null);
        setEditPostContent('');
      } else {
        const errorData = await response.json();
        alert(`Failed to update post: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating post:', error);
      alert('Error updating post. Please try again.');
    }
  };

  const deletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post? This will also delete all comments and reactions.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to delete posts');
        return;
      }

      const response = await fetch(`http://localhost:8000/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Remove the post from the state
        setPosts(posts.filter(post => post.id !== postId));
      } else {
        const errorData = await response.json();
        alert(`Failed to delete post: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Error deleting post. Please try again.');
    }
  };

  const startEditComment = (commentId, currentContent) => {
    setEditingComment(commentId);
    setEditCommentContent(currentContent);
  };

  const cancelEditComment = () => {
    setEditingComment(null);
    setEditCommentContent('');
  };

  const saveEditComment = async (commentId, postId) => {
    if (!editCommentContent.trim()) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to edit comments');
        return;
      }

      const response = await fetch(`http://localhost:8000/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content: editCommentContent.trim() }),
      });

      if (response.ok) {
        const updatedComment = await response.json();
        // Update the comment in the state
        setComments(prevComments => ({
          ...prevComments,
          [postId]: prevComments[postId].map(comment =>
            comment.id === commentId
              ? { ...comment, content: updatedComment.content }
              : comment
          )
        }));
        setEditingComment(null);
        setEditCommentContent('');
      } else {
        const errorData = await response.json();
        alert(`Failed to update comment: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('Error updating comment. Please try again.');
    }
  };

  const deleteComment = async (commentId, postId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to delete comments');
        return;
      }

      const response = await fetch(`http://localhost:8000/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Remove the comment from the state
        setComments(prevComments => ({
          ...prevComments,
          [postId]: prevComments[postId].filter(comment => comment.id !== commentId)
        }));
        // Update comment count in posts
        setPosts(posts.map(post => 
          post.id === postId 
            ? { ...post, comment_count: Math.max(0, (post.comment_count || 0) - 1) }
            : post
        ));
      } else {
        const errorData = await response.json();
        alert(`Failed to delete comment: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Error deleting comment. Please try again.');
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

  const openImagePreview = (imageUrl, alt) => {
    setImagePreview({ isOpen: true, imageUrl, alt });
  };

  const closeImagePreview = () => {
    setImagePreview({ isOpen: false, imageUrl: '', alt: '' });
  };

  const followUser = async (userId) => {
    console.log(`[FRONTEND DEBUG] Attempting to follow user: ${userId}`);
    try {
      const token = localStorage.getItem('token');
      console.log(`[FRONTEND DEBUG] Using token: ${token ? 'present' : 'missing'}`);
      
      const response = await fetch(`http://localhost:8000/users/${userId}/follow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log(`[FRONTEND DEBUG] Follow response status: ${response.status}`);
      
      if (response.ok) {
        console.log(`[FRONTEND DEBUG] Follow successful`);
        // Update the posts state to reflect the follow status
        setPosts(posts.map(post => 
          post.author.id === userId 
            ? { ...post, is_following: true }
            : post
        ));
        
        // Update the suggested users list to reflect the follow action
        setSuggestedUsers(prev => 
          prev.map(user => 
            user.id === userId 
              ? { ...user, is_following: true, follower_count: user.follower_count + 1 }
              : user
          )
        );
      } else {
        const errorData = await response.json();
        console.log(`[FRONTEND DEBUG] Follow error: ${JSON.stringify(errorData)}`);
        alert(`Failed to follow user: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[FRONTEND DEBUG] Error following user:', error);
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
        
        // Update the suggested users list to reflect the unfollow action
        setSuggestedUsers(prev => 
          prev.map(user => 
            user.id === userId 
              ? { ...user, is_following: false, follower_count: Math.max(0, user.follower_count - 1) }
              : user
          )
        );
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
                <div className="post-header-actions">
                  {currentUser && currentUser.id === post.author.id && (
                    <div className="post-actions-menu">
                      {editingPost === post.id ? (
                        <>
                          <button
                            className="post-action-btn save-btn"
                            onClick={() => saveEditPost(post.id)}
                            title="Save changes"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            className="post-action-btn cancel-btn"
                            onClick={cancelEditPost}
                            title="Cancel edit"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="post-action-btn edit-btn"
                            onClick={() => startEditPost(post.id, post.content)}
                            title="Edit post"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            className="post-action-btn delete-btn"
                            onClick={() => deletePost(post.id)}
                            title="Delete post"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {!post.is_own_post && (
                    <button
                      className={`follow-button ${post.is_following ? 'following' : ''}`}
                      onClick={() => post.is_following ? unfollowUser(post.author.id) : followUser(post.author.id)}
                    >
                      {post.is_following ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              </div>

              <div className="post-content">
                {editingPost === post.id ? (
                  <textarea
                    className="post-edit-textarea"
                    value={editPostContent}
                    onChange={(e) => setEditPostContent(e.target.value)}
                    rows="4"
                    autoFocus
                  />
                ) : (
                  <p className="post-text">{post.content}</p>
                )}
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
                {post.tags && post.tags.length > 0 && (
                  <div className="post-tags">
                    {post.tags.map((tag, index) => (
                      <span key={index} className="post-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="post-actions">
                <button 
                  className={`action-button upvote-button ${post.has_upvoted ? 'upvoted' : ''}`}
                  onClick={() => upvotePost(post.id)}
                  title={post.has_upvoted ? 'Remove upvote' : 'Upvote post'}
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
                              <div className="comment-header">
                                <div className="comment-author-name">{comment.author.username}</div>
                                {currentUser && currentUser.id === comment.author.id && (
                                  <div className="comment-actions">
                                    {editingComment === comment.id ? (
                                      <>
                                        <button
                                          className="comment-action-btn save-btn"
                                          onClick={() => saveEditComment(comment.id, post.id)}
                                          title="Save changes"
                                        >
                                          <Check size={12} />
                                        </button>
                                        <button
                                          className="comment-action-btn cancel-btn"
                                          onClick={cancelEditComment}
                                          title="Cancel edit"
                                        >
                                          <X size={12} />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          className="comment-action-btn edit-btn"
                                          onClick={() => startEditComment(comment.id, comment.content)}
                                          title="Edit comment"
                                        >
                                          <Edit3 size={12} />
                                        </button>
                                        <button
                                          className="comment-action-btn delete-btn"
                                          onClick={() => deleteComment(comment.id, post.id)}
                                          title="Delete comment"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                              {editingComment === comment.id ? (
                                <textarea
                                  className="comment-edit-textarea"
                                  value={editCommentContent}
                                  onChange={(e) => setEditCommentContent(e.target.value)}
                                  rows="2"
                                  autoFocus
                                />
                              ) : (
                                <div className="comment-text">{comment.content}</div>
                              )}
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
        
        {/* Right Sidebar */}
        <div className="feed-sidebar">
          {/* Who to Follow Section */}
          <div className="sidebar-card">
            <h3 className="sidebar-title"><Users size={16} /> Who to Follow</h3>
            <div className="suggested-users">
              {suggestedUsers.length > 0 ? (
                suggestedUsers.map(user => (
                  <div key={user.id} className="suggested-user">
                    <div className="suggested-user-info">
                      <div 
                        className="suggested-user-avatar"
                        onClick={() => navigate(`/user/${user.id}`)}
                      >
                        {user.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt={user.username}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className="default-avatar" style={user.avatar_url ? {display: 'none'} : {}}>
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="suggested-user-details">
                        <h4 
                          className="suggested-user-name"
                          onClick={() => navigate(`/user/${user.id}`)}
                        >
                          {user.username}
                        </h4>
                        <p className="suggested-user-stats">
                          {user.follower_count} {user.follower_count === 1 ? 'follower' : 'followers'}
                        </p>
                        {user.bio && (
                          <p className="suggested-user-bio">{user.bio.substring(0, 50)}{user.bio.length > 50 ? '...' : ''}</p>
                        )}
                      </div>
                    </div>
                    {currentUser && user.id !== currentUser.id && (
                      <button
                        className={`suggested-user-follow-btn ${user.is_following ? 'following' : ''}`}
                        onClick={() => user.is_following ? unfollowUser(user.id) : followUser(user.id)}
                        onMouseEnter={() => setHoveredFollowBtn(user.id)}
                        onMouseLeave={() => setHoveredFollowBtn(null)}
                      >
                        {user.is_following ? 
                          (hoveredFollowBtn === user.id ? 'Unfollow' : 'Following') : 
                          'Follow'
                        }
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="no-suggestions">
                  <p>No suggestions available</p>
                </div>
              )}
            </div>
          </div>

          {/* Tag Filter Section */}
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
          className="image-preview-modal"
          onClick={closeImagePreview}
        >
          <div 
            className="image-preview-container"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="image-preview-close"
              onClick={closeImagePreview}
            >
              ×
            </button>
            <img 
              src={imagePreview.imageUrl} 
              alt={imagePreview.alt} 
              className="image-preview-img"
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
