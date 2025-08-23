import React, { useRef, useState, useEffect } from 'react';
import { Folder, MessageCircle, BarChart, Settings } from 'lucide-react';
import './ProfilePage.css';

const ProfilePage = ({ user, onProfileUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [projectsCount, setProjectsCount] = useState(0);
  const [profileViews, setProfileViews] = useState(0);
  const [totalUpvotes, setTotalUpvotes] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editUsername, setEditUsername] = useState(user?.username || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editAvatar, setEditAvatar] = useState(null);
  const [editSkills, setEditSkills] = useState([]);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editPassword, setEditPassword] = useState("");
  const fileInputRef = useRef();

  useEffect(() => {
    if (user && user.id) {
      fetchFollowStats();
      fetchAvailableSkills();
      fetchActivityStats();
    }
    // eslint-disable-next-line
  }, [user]);

  // Add an effect to refresh stats when the component becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && user.id) {
        fetchFollowStats();
        fetchActivityStats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  useEffect(() => {
    setEditUsername(user?.username || '');
    setEditBio(user?.bio || '');
    setEditSkills(parseSkills(user?.skills || []));
  }, [user]);

  const fetchFollowStats = async () => {
    try {
      const response = await fetch(`http://localhost:8000/users/${user.id}/follow_stats`);
      if (response.ok) {
        const data = await response.json();
        setFollowersCount(data.followers_count || 0);
        setFollowingCount(data.following_count || 0);
      }
    } catch (error) {
      // ignore
    }
  };

  const fetchAvailableSkills = async () => {
    try {
      const response = await fetch('http://localhost:8000/skill-tags');
      if (response.ok) {
        const data = await response.json();
        setAvailableSkills(data.tags || []);
      }
    } catch (error) {
      console.error('Error fetching available skills:', error);
    }
  };

  const fetchActivityStats = async () => {
    try {
      console.log('Fetching activity stats for user:', user.id);
      
      // Fetch posts count
      try {
        const postsResponse = await fetch(`http://localhost:8000/users/${user.id}/posts`);
        console.log('Posts response status:', postsResponse.status);
        if (postsResponse.ok) {
          const postsData = await postsResponse.json();
          console.log('Posts data:', postsData);
          const postsLength = Array.isArray(postsData) ? postsData.length : 0;
          console.log('Setting posts count to:', postsLength);
          setPostsCount(postsLength);
        } else {
          console.log('Posts response not ok:', await postsResponse.text());
          setPostsCount(0);
        }
      } catch (error) {
        console.error('Error fetching posts count:', error);
        setPostsCount(0);
      }

      // Fetch portfolio/projects count
      try {
        const portfolioResponse = await fetch(`http://localhost:8000/users/${user.id}/portfolio`);
        console.log('Portfolio response status:', portfolioResponse.status);
        if (portfolioResponse.ok) {
          const portfolioData = await portfolioResponse.json();
          console.log('Portfolio data:', portfolioData);
          const portfolioLength = Array.isArray(portfolioData) ? portfolioData.length : 0;
          console.log('Setting projects count to:', portfolioLength);
          setProjectsCount(portfolioLength);
        } else {
          console.log('Portfolio response not ok:', await portfolioResponse.text());
          setProjectsCount(0);
        }
      } catch (error) {
        console.error('Error fetching portfolio count:', error);
        setProjectsCount(0);
      }

      // For now, set placeholder values for profile views and upvotes
      // These would require additional backend endpoints to track properly
      setProfileViews(0); // Placeholder - would need backend tracking
      setTotalUpvotes(0); // Placeholder - would need backend aggregation
      
    } catch (error) {
      console.error('Error fetching activity stats:', error);
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

  const toggleSkill = (skill) => {
    setEditSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
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
        setAvatarUrl(data.avatar_url);
        if (onProfileUpdate) onProfileUpdate({ ...user, avatar_url: data.avatar_url });
      }
    } catch (err) {
      alert('Failed to upload avatar.');
    } finally {
      setUploading(false);
    }
  };

  const handleEditAvatarChange = (e) => {
    setEditAvatar(e.target.files[0]);
  };

  const handleEditProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      let avatar_url = avatarUrl;
      let updatedFields = {};
      if (editAvatar) {
        const formData = new FormData();
        formData.append('file', editAvatar);
        const response = await fetch('http://localhost:8000/profile/avatar', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
        if (response.ok) {
          const data = await response.json();
          avatar_url = data.avatar_url;
          setAvatarUrl(avatar_url);
          updatedFields.avatar_url = avatar_url;
        } else {
          alert('Failed to upload avatar.');
        }
      }
      if (editUsername !== user.username) updatedFields.username = editUsername;
      if (editBio !== user.bio) updatedFields.bio = editBio;
      
      // Handle skills update
      const currentSkills = parseSkills(user.skills || []);
      const skillsChanged = JSON.stringify(currentSkills.sort()) !== JSON.stringify(editSkills.sort());
      if (skillsChanged) {
        updatedFields.skills = editSkills;
      }
      
      if (Object.keys(updatedFields).length === 0) {
        setEditMode(false);
        setSaving(false);
        return;
      }
      const response = await fetch('http://localhost:8000/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedFields)
      });
      if (response.ok) {
        // If username changed, re-login to get a new token
        if (updatedFields.username && editPassword) {
          const loginForm = new FormData();
          loginForm.append('username', updatedFields.username);
          loginForm.append('password', editPassword);
          const loginRes = await fetch('http://localhost:8000/login', {
            method: 'POST',
            body: loginForm
          });
          if (loginRes.ok) {
            const loginData = await loginRes.json();
            localStorage.setItem('token', loginData.access_token);
            if (onProfileUpdate) onProfileUpdate({ ...user, ...updatedFields });
            setEditMode(false);
            setEditPassword("");
          } else {
            alert('Profile updated, but failed to re-login. Please log in manually.');
          }
        } else {
          if (onProfileUpdate) onProfileUpdate({ ...user, ...updatedFields });
          setEditMode(false);
        }
      } else {
        const errorText = await response.text();
        alert('Failed to update profile.');
        console.error('Profile update error:', errorText);
      }
    } catch (err) {
      alert('Failed to update profile.');
      console.error('Profile update exception:', err);
    } finally {
      setSaving(false);
    }
  };

  const getAvatarUrl = (avatar_url) => {
    if (!avatar_url) return null;
    if (avatar_url.startsWith('/')) {
      return `http://localhost:8000${avatar_url}`;
    }
    return avatar_url;
  };

  return (
    <div className="profile-container">
      <div className="profile-wrapper">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-header-content">
              <div className="profile-header-top">
                <div className="profile-avatar-section">
                  <div className="profile-avatar">
                    {avatarUrl ? (
                      <img src={getAvatarUrl(avatarUrl)} alt={user.username} />
                    ) : (
                      <div className="profile-avatar-placeholder">
                        {user?.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="profile-info">
                    <h1>{user?.username}</h1>
                    <p>{user?.email}</p>
                    {user?.bio && <p className="profile-bio">{user.bio}</p>}
                  </div>
                </div>
                {!editMode && (
                  <button className="edit-profile-btn" onClick={() => setEditMode(true)}>
                    ✏️ Edit Profile
                  </button>
                )}
              </div>
              <div className="follow-stats">
                <div className="follow-stat">
                  <div className="follow-stat-number">{followersCount}</div>
                  <div className="follow-stat-label">Followers</div>
                </div>
                <div className="follow-stat">
                  <div className="follow-stat-number">{followingCount}</div>
                  <div className="follow-stat-label">Following</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="profile-content">
            {editMode ? (
              <div className="edit-profile-form">
                <form onSubmit={handleEditProfile}>
                  <div className="edit-form-section">
                    <h3 className="edit-form-title">Profile Picture</h3>
                    <label className="edit-form-label">
                      Upload New Avatar
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleEditAvatarChange} 
                        className="edit-form-file-input"
                      />
                    </label>
                  </div>
                  
                  <div className="edit-form-section">
                    <h3 className="edit-form-title">Basic Information</h3>
                    <label className="edit-form-label">
                      Username
                      <input 
                        type="text" 
                        value={editUsername} 
                        onChange={e => setEditUsername(e.target.value)} 
                        className="edit-form-input"
                      />
                    </label>
                    <label className="edit-form-label">
                      Bio
                      <textarea 
                        value={editBio} 
                        onChange={e => setEditBio(e.target.value)} 
                        className="edit-form-textarea"
                        placeholder="Tell us about yourself..."
                      />
                    </label>
                  </div>
                  
                  <div className="edit-form-section">
                    <h3 className="edit-form-title">Skills & Expertise</h3>
                    <div className="skills-selection">
                      {availableSkills.map(skill => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className={`skill-toggle-btn ${editSkills.includes(skill) ? 'selected' : ''}`}
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="edit-form-section">
                    <h3 className="edit-form-title">Security</h3>
                    <label className="edit-form-label">
                      Password (required to change username)
                      <input 
                        type="password" 
                        value={editPassword} 
                        onChange={e => setEditPassword(e.target.value)} 
                        className="edit-form-input"
                        required={editUsername !== user.username}
                        placeholder="Enter your password"
                      />
                    </label>
                  </div>
                  
                  <div className="edit-form-actions">
                    <button 
                      type="button" 
                      className="edit-form-cancel-btn" 
                      onClick={() => setEditMode(false)} 
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="edit-form-save-btn" 
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <>
                <div className="profile-section">
                  <h2 className="profile-section-title">About</h2>
                  <p className="profile-bio">
                    {user?.bio || 'No bio available. Click "Edit Profile" to add a description about yourself.'}
                  </p>
                </div>

                {user?.skills && parseSkills(user.skills).length > 0 && (
                  <div className="profile-section">
                    <h2 className="profile-section-title">Skills & Expertise</h2>
                    <div className="skills-grid">
                      {parseSkills(user.skills).map((skill, index) => (
                        <span key={index} className="skill-tag">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        {!editMode && (
          <div className="profile-stats-card">
            <h3 className="stats-title">Your Activity</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-number">{followersCount}</div>
                <div className="stat-label">Followers</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{followingCount}</div>
                <div className="stat-label">Following</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{postsCount}</div>
                <div className="stat-label">Posts Created</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{projectsCount}</div>
                <div className="stat-label">Projects</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{profileViews}</div>
                <div className="stat-label">Profile Views</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{totalUpvotes}</div>
                <div className="stat-label">Total Upvotes</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
