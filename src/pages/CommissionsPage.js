import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CommissionsPage.css';

const CommissionsPage = ({ user }) => {
  const navigate = useNavigate();
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [editingCommission, setEditingCommission] = useState(null);
  const [newCommission, setNewCommission] = useState({
    title: '',
    description: '',
    budget: ''
  });
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchCommissions();
  }, [filter]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (editingCommission) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup function to restore scroll on component unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [editingCommission]);

  const fetchCommissions = async () => {
    try {
      let url = 'http://localhost:8000/commissions';
      const params = new URLSearchParams();
      
      if (filter === 'my') {
        params.append('my_commissions', 'true');
      } else if (filter !== 'all') {
        params.append('status', filter);
      }
      
      if (params.toString()) {
        url += '?' + params.toString();
      }
      
      const headers = {};
      if (user && localStorage.getItem('token')) {
        headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
      }
      
      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json();
        setCommissions(data.commissions || []);
      }
    } catch (error) {
      console.error('Error fetching commissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCommission = async (e) => {
    e.preventDefault();
    if (!newCommission.title.trim() || !newCommission.description.trim()) return;
    
    if (!user || !localStorage.getItem('token')) {
      alert('You must be logged in to create a commission');
      return;
    }

    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', newCommission.title);
      formData.append('description', newCommission.description);
      if (newCommission.budget) {
        formData.append('budget', newCommission.budget);
      }

      const response = await fetch('http://localhost:8000/commissions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        setNewCommission({
          title: '',
          description: '',
          budget: ''
        });
        setShowCreateForm(false);
        fetchCommissions(); // Refresh the commissions
      } else {
        const errorData = await response.json();
        alert(errorData.detail || 'Failed to create commission');
      }
    } catch (error) {
      console.error('Error creating commission:', error);
      alert('Failed to create commission. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const updateCommission = async (e) => {
    e.preventDefault();
    if (!editingCommission.title.trim() || !editingCommission.description.trim()) return;

    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', editingCommission.title);
      formData.append('description', editingCommission.description);
      if (editingCommission.budget) {
        formData.append('budget', editingCommission.budget);
      }
      formData.append('status', editingCommission.status);

      const response = await fetch(`http://localhost:8000/commissions/${editingCommission.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        closeEditModal();
        fetchCommissions(); // Refresh the commissions
      } else {
        const errorData = await response.json();
        alert(errorData.detail || 'Failed to update commission');
      }
    } catch (error) {
      console.error('Error updating commission:', error);
      alert('Failed to update commission. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const openEditModal = (commission) => {
    setEditingCommission({
      id: commission.id,
      title: commission.title,
      description: commission.description,
      budget: commission.budget || '',
      status: commission.status
    });
  };

  const closeEditModal = () => {
    setEditingCommission(null);
  };

  const contactClient = (commission) => {
    // Navigate to messenger with the commission poster's user ID
    navigate(`/messages/${commission.requester.id}`);
  };

  const getAvatarUrl = (avatar_url) => {
    if (!avatar_url) return null;
    if (avatar_url.startsWith('/')) {
      return `http://localhost:8000${avatar_url}`;
    }
    return avatar_url;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatBudget = (budget) => {
    if (!budget || budget === 0) return 'Budget negotiable';
    const numBudget = parseFloat(budget);
    if (isNaN(numBudget)) return 'Budget negotiable';
    return `$${numBudget.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status) => {
    const colors = {
      open: '#28a745',
      in_progress: '#ffc107',
      completed: '#6c757d',
      cancelled: '#dc3545'
    };
    return colors[status] || '#6c757d';
  };

  const getStatusDisplay = (status) => {
    const displays = {
      open: 'Open',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };
    return displays[status] || status;
  };

  if (loading) {
    return (
      <div className="commissions-page">
        <div className="commissions-container">
          <div className="loading-container">Loading commissions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="commissions-page">
      <div className="commissions-container">
        <div className="commissions-header">
          <div>
            <h1 className="commissions-title">Commission Marketplace</h1>
            <p className="commissions-subtitle">Find or post commission opportunities</p>
          </div>
          {user && localStorage.getItem('token') && (
            <button 
              className="post-commission-button"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              + Post Commission
            </button>
          )}
        </div>

      <div className="filter-tabs">
        <button 
          className={filter === 'all' ? 'filter-tab active' : 'filter-tab'}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button 
          className={filter === 'open' ? 'filter-tab active' : 'filter-tab'}
          onClick={() => setFilter('open')}
        >
          Open
        </button>
        <button 
          className={filter === 'in_progress' ? 'filter-tab active' : 'filter-tab'}
          onClick={() => setFilter('in_progress')}
        >
          In Progress
        </button>
        <button 
          className={filter === 'completed' ? 'filter-tab active' : 'filter-tab'}
          onClick={() => setFilter('completed')}
        >
          Completed
        </button>
        {user && (
          <button 
            className={filter === 'my' ? 'filter-tab active' : 'filter-tab'}
            onClick={() => setFilter('my')}
          >
            My Commissions
          </button>
        )}
      </div>

      {showCreateForm && user && localStorage.getItem('token') && (
        <div className="create-commission-form">
          <h3 className="form-title">Post a New Commission</h3>
          <form onSubmit={createCommission}>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input
                className="form-input"
                type="text"
                value={newCommission.title}
                onChange={(e) => setNewCommission({ ...newCommission, title: e.target.value })}
                placeholder="e.g., Character illustration for game project"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea
                className="form-textarea"
                value={newCommission.description}
                onChange={(e) => setNewCommission({ ...newCommission, description: e.target.value })}
                placeholder="Describe your commission requirements in detail..."
                rows="4"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Budget (USD)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                value={newCommission.budget}
                onChange={(e) => setNewCommission({ ...newCommission, budget: e.target.value })}
                placeholder="Your budget for this commission"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-button" disabled={creating}>
                {creating ? 'Posting...' : 'Post Commission'}
              </button>
              <button 
                type="button" 
                className="cancel-button"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {editingCommission && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="form-title">Edit Commission</h3>
            <form onSubmit={updateCommission}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  className="form-input"
                  type="text"
                  value={editingCommission.title}
                  onChange={(e) => setEditingCommission({ ...editingCommission, title: e.target.value })}
                  placeholder="e.g., Character illustration for game project"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea
                  className="form-textarea"
                  value={editingCommission.description}
                  onChange={(e) => setEditingCommission({ ...editingCommission, description: e.target.value })}
                  placeholder="Describe your commission requirements in detail..."
                  rows="4"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Budget (USD)</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingCommission.budget}
                  onChange={(e) => setEditingCommission({ ...editingCommission, budget: e.target.value })}
                  placeholder="Your budget for this commission"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={editingCommission.status}
                  onChange={(e) => setEditingCommission({ ...editingCommission, status: e.target.value })}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-button" disabled={updating}>
                  {updating ? 'Updating...' : 'Update Commission'}
                </button>
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={closeEditModal}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="commissions-list">
        {commissions.length === 0 ? (
          <div className="empty-state">
            <h3>No commissions found</h3>
            <p>
              {filter === 'all' 
                ? 'Be the first to post a commission!' 
                : filter === 'my'
                ? 'You haven\'t posted any commissions yet.'
                : `No commissions with status "${getStatusDisplay(filter)}" found.`
              }
            </p>
          </div>
        ) : (
          <div className="commissions-grid">
            {commissions.map((commission) => (
              <div key={commission.id} className="commission-card">
                <div className="commission-header">
                  <div className="commission-meta">
                    <h3 className="commission-title">{commission.title}</h3>
                    <span 
                      className={`status status-${commission.status}`}
                    >
                      {getStatusDisplay(commission.status)}
                    </span>
                  </div>
                  <div className="budget-container">
                    <div className="budget-label">Budget</div>
                    <div className="budget">
                      {formatBudget(commission.budget)}
                    </div>
                  </div>
                </div>

                <div className="commission-description">
                  <p>{commission.description}</p>
                </div>

                <div className="commission-footer">
                  <div className="requester-info">
                    <div 
                      className="requester-avatar"
                      onClick={() => window.location.href = `/user/${commission.requester.id}`}
                    >
                      {commission.requester.avatar_url ? (
                        <img 
                          src={getAvatarUrl(commission.requester.avatar_url)} 
                          alt={commission.requester.username}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`avatar-placeholder ${commission.requester.avatar_url ? 'hidden' : ''}`}>
                        {commission.requester.username.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="requester-details">
                      <div 
                        className="requester-name"
                        onClick={() => window.location.href = `/user/${commission.requester.id}`}
                      >
                        Posted by {commission.requester.username}
                      </div>
                      <div className="post-date">
                        {formatDate(commission.created_at)}
                      </div>
                    </div>
                  </div>

                  {commission.status === 'open' && commission.requester.id !== user?.id && (
                    <div className="commission-actions">
                      <button 
                        className="action-button apply-button"
                        onClick={() => contactClient(commission)}
                      >
                        Apply for Commission
                      </button>
                    </div>
                  )}
                  {commission.requester.id === user?.id && (
                    <div className="commission-actions">
                      <button 
                        className="action-button edit-button"
                        onClick={() => openEditModal(commission)}
                      >
                        Edit
                      </button>
                      <button className="action-button delete-button">
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default CommissionsPage;
