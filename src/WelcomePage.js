import React from 'react';
import { PartyPopper } from 'lucide-react';

function WelcomePage({ onLogout, onGoToProfile }) {
  const handleLogout = () => {
    localStorage.removeItem("token");
    onLogout();
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1>Welcome, Ahil! <PartyPopper size={24} /></h1>
        <p>You have successfully logged in.</p>
        <div style={styles.buttonGroup}>
          <button onClick={onGoToProfile} style={styles.profileButton}>View Profile</button>
          <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
  },
  card: {
    backgroundColor: 'white',
    padding: '2rem 3rem',
    borderRadius: '12px',
    boxShadow: '0 0 12px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  buttonGroup: {
    marginTop: '1.5rem',
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
  },
  profileButton: {
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    borderRadius: '8px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
  },
  logoutButton: {
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    borderRadius: '8px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
  },
};

export default WelcomePage;
