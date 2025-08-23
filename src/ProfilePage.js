import React, { useEffect, useState, useRef } from 'react';
import { User } from 'lucide-react';

// Utility for robust skills parsing
function parseSkills(skills) {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills;
  // Defensive: handle objects and other types
  if (typeof skills === 'object') return [];
  if (typeof skills === 'string') {
    try {
      const arr = JSON.parse(skills);
      if (Array.isArray(arr)) return arr;
    } catch {
      // Only split if skills is a primitive string
      if (typeof skills === 'string' && skills.length > 0) {
        return String(skills).split(',').map(s => s.trim()).filter(Boolean);
      }
    }
  }
  // If skills is not a string/array, return []
  return [];
}

function ProfilePage({ onLogout }) {
  const [profile, setProfile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch("http://localhost:8000/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(data => setProfile(data))
      .catch(err => console.error("Error fetching profile:", err));
  }, []);

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
        setProfile(prev => ({ ...prev, avatar_url: data.avatar_url }));
      } else {
        alert('Failed to upload avatar.');
      }
    } catch (err) {
      alert('Failed to upload avatar.');
    } finally {
      setUploading(false);
    }
  };

  if (!profile) return <p>Loading profile...</p>;

  // Use robust parseSkills utility
  let skills = [];
  if (profile && profile.skills) {
    skills = parseSkills(profile.skills);
  } else {
    skills = [];
  }
  console.log('profile.skills:', profile.skills, 'parsed skills:', skills);

  // Fix: prepend backend URL to avatar if needed
  let avatarUrl = profile.avatar_url;
  if (avatarUrl && avatarUrl.startsWith('/avatars/')) {
    avatarUrl = `http://localhost:8000${avatarUrl}`;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ marginBottom: 12 }}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid #eee' }}
              />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#888' }}>
                {profile.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleAvatarChange}
          />
          <button
            style={{ ...styles.button, backgroundColor: uploading ? '#aaa' : '#3b82f6', marginBottom: 8 }}
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Change Photo'}
          </button>
        </div>
        <h2><User size={20} /> {profile.username}'s Profile</h2>
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>Bio:</strong> {profile.bio}</p>
        <p><strong>Skills:</strong> {skills.join(', ')}</p>
        <p><strong>Projects:</strong></p>
        <ul>
          {profile.projects && profile.projects.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
        <button style={styles.button} onClick={() => {
          localStorage.removeItem("token");
          onLogout();
        }}>
          Logout
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f0f4f8',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '10px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
    width: '400px',
  },
  button: {
    marginTop: '1rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  }
};

export default ProfilePage;
