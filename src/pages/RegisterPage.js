import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../logo.png';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    bio: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [focusedInput, setFocusedInput] = useState('');
  const [buttonHover, setButtonHover] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleInputFocus = (inputName) => {
    setFocusedInput(inputName);
  };

  const handleInputBlur = () => {
    setFocusedInput('');
  };

  const getInputStyle = (inputName) => ({
    ...styles.input,
    ...(focusedInput === inputName ? styles.inputFocused : {}),
  });

  const getTextareaStyle = (inputName) => ({
    ...styles.textarea,
    ...(focusedInput === inputName ? styles.textareaFocused : {}),
  });

  const getButtonStyle = () => ({
    ...styles.button,
    ...(buttonHover ? styles.buttonHover : {}),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('username', formData.username);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('bio', formData.bio);

      const response = await fetch('http://localhost:8000/register', {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successMessage}>
            <h2 style={{margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '700'}}>
              ✅ Registration Successful!
            </h2>
            <p style={{margin: '0', fontSize: '1rem', opacity: '0.9'}}>
              Your account has been created. Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.brand}><img src={logo} alt="Artspire" style={{width: '60px', height: '60px', marginRight: '10px', verticalAlign: 'middle'}} />Artspire</h1>
          <h2 style={styles.title}>Create Account</h2>
          <p style={styles.subtitle}>Join our creative community</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}
          
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="username">Username</label>
            <input
              style={getInputStyle('username')}
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              onFocus={() => handleInputFocus('username')}
              onBlur={handleInputBlur}
              required
              placeholder="Choose a username"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="email">Email</label>
            <input
              style={getInputStyle('email')}
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onFocus={() => handleInputFocus('email')}
              onBlur={handleInputBlur}
              required
              placeholder="Enter your email"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="bio">Bio (Optional)</label>
            <textarea
              style={getTextareaStyle('bio')}
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              onFocus={() => handleInputFocus('bio')}
              onBlur={handleInputBlur}
              placeholder="Tell us about yourself..."
              rows="3"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="password">Password</label>
            <input
              style={getInputStyle('password')}
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              onFocus={() => handleInputFocus('password')}
              onBlur={handleInputBlur}
              required
              placeholder="Create a password"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="confirmPassword">Confirm Password</label>
            <input
              style={getInputStyle('confirmPassword')}
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              onFocus={() => handleInputFocus('confirmPassword')}
              onBlur={handleInputBlur}
              required
              placeholder="Confirm your password"
            />
          </div>

          <button 
            type="submit" 
            style={getButtonStyle()} 
            disabled={loading}
            onMouseEnter={() => setButtonHover(true)}
            onMouseLeave={() => setButtonHover(false)}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Already have an account?{' '}
            <Link to="/login" style={styles.link}>
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '3rem',
    borderRadius: '24px',
    boxShadow: '0 32px 64px rgba(0,0,0,0.12)',
    width: '100%',
    maxWidth: '480px',
    textAlign: 'center',
    border: '1px solid #e2e8f0',
    position: 'relative',
  },
  header: {
    marginBottom: '2.5rem',
  },
  brandContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.5rem',
  },
  logo: {
    width: '64px',
    height: '64px',
    marginRight: '12px',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  brand: {
    fontSize: '2.2rem',
    margin: '0',
    background: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontWeight: 'bold',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '1.8rem',
    color: 'off-white',
    margin: '0 0 0.5rem 0',
    fontWeight: '700',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    color: 'off-white',
    margin: '0',
    fontSize: '1rem',
    fontWeight: '400',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  formGroup: {
    textAlign: 'left',
  },
  label: {
    display: 'block',
    marginBottom: '0.75rem',
    color: 'off-white',
    fontWeight: '600',
    fontSize: '0.95rem',
    letterSpacing: '0.01em',
  },
  input: {
    width: '100%',
    padding: '1rem 1.25rem',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    fontWeight: '400',
  },
  inputFocused: {
    borderColor: '#667eea',
    backgroundColor: '#ffffff',
    boxShadow: '0 0 0 3px rgba(102,126,234,0.1)',
  },
  select: {
    width: '100%',
    padding: '1rem 1.25rem',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    fontWeight: '400',
  },
  textarea: {
    width: '100%',
    padding: '1rem 1.25rem',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'inherit',
    backgroundColor: '#ffffff',
    fontWeight: '400',
  },
  textareaFocused: {
    borderColor: '#667eea',
    backgroundColor: '#ffffff',
    boxShadow: '0 0 0 3px rgba(102,126,234,0.1)',
  },
  button: {
    padding: '1rem 2rem',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    color: 'white',
    fontSize: '1.05rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontWeight: '600',
    marginTop: '1rem',
    boxShadow: '0 8px 24px rgba(102,126,234,0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  buttonHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 12px 32px rgba(102,126,234,0.4)',
  },
  error: {
    color: '#e53e3e',
    backgroundColor: '#fed7d7',
    padding: '1rem',
    borderRadius: '12px',
    fontSize: '0.95rem',
    border: '1px solid #feb2b2',
    fontWeight: '500',
  },
  successMessage: {
    color: '#22543d',
    backgroundColor: '#c6f6d5',
    padding: '2.5rem',
    borderRadius: '16px',
    border: '1px solid #9ae6b4',
    fontSize: '1.1rem',
    fontWeight: '500',
  },
  footer: {
    marginTop: '2.5rem',
    paddingTop: '2rem',
    borderTop: '1px solid #e2e8f0',
  },
  footerText: {
    color: '#718096',
    margin: '0',
    fontSize: '0.95rem',
    fontWeight: '400',
  },
  link: {
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: '600',
    transition: 'color 0.2s ease',
  },
};

export default RegisterPage;
