import React from 'react';
import { Link } from 'react-router-dom';
import { Palette, Star, Sparkles, Briefcase, Folder, Lightbulb, Drama, Zap } from 'lucide-react';
import './HomePage.css';

const HomePage = ({ user }) => {
  return (
    <div className="home-page">
      {/* Modern floating decorative elements */}
      <div className="floating-decorations">
        <div className="floating-shape shape-1"><Sparkles size={24} /></div>
        <div className="floating-shape shape-2"><Palette size={24} /></div>
        <div className="floating-shape shape-3"><Star size={24} /></div>
        <div className="floating-shape shape-4"><Zap size={24} /></div>
        <div className="floating-shape shape-5"><Drama size={24} /></div>
      </div>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Welcome to <span className="brand-highlight">Artspire</span>
            {user ? `, ${user.username}` : ''}! 
          </h1>
          <p className="hero-subtitle">
            Discover incredible artworks, connect with talented artists, and bring your creative visions to life
          </p>
          
          <div className="hero-actions">
            <Link to="/art-collection" className="btn-primary">
              <Palette size={20} /> Explore Collection
            </Link>
            <Link to="/commissions" className="btn-secondary">
              <Briefcase size={20} /> Browse Commissions
            </Link>
          </div>

          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">1,200+</span>
              <span className="stat-label">Artworks</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">500+</span>
              <span className="stat-label">Artists</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">300+</span>
              <span className="stat-label">Commissions</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-content">
          <h2 className="features-title">Everything You Need to Create & Connect</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon"><Palette size={50} /></div>
              <h3 className="feature-title">Art Collection</h3>
              <p className="feature-description">
                Discover and explore amazing artworks from talented artists worldwide
              </p>
              <Link to="/art-collection" className="feature-link">
                Browse Collection →
              </Link>
            </div>

            <div className="feature-card">
              <div className="feature-icon"><Briefcase size={50} /></div>
              <h3 className="feature-title">Commissions</h3>
              <p className="feature-description">
                Connect with artists for custom artwork and creative projects
              </p>
              <Link to="/commissions" className="feature-link">
                Find Artists →
              </Link>
            </div>

            <div className="feature-card">
              <div className="feature-icon"><Star size={50} /></div>
              <h3 className="feature-title">Community Feed</h3>
              <p className="feature-description">
                Join a vibrant community of creators, share your work, and get inspired
              </p>
              <Link to="/feed" className="feature-link">
                Join Community →
              </Link>
            </div>

            {user && (user.role === 'artist' || user.role === 'graphic_designer') && (
              <div className="feature-card">
                <div className="feature-icon"><Folder size={50} /></div>
                <h3 className="feature-title">Portfolio</h3>
                <p className="feature-description">
                  Showcase your best work and attract potential clients
                </p>
                <Link to="/portfolio" className="feature-link">
                  Manage Portfolio →
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="cta-section">
        <div className="cta-content">
          <div className="cta-text">
            <h2 className="cta-title">Ready to Create Something Amazing?</h2>
            <p className="cta-subtitle">
              Whether you're an artist looking to showcase your work or someone seeking custom art, 
              we've got you covered!
            </p>
            <div className="cta-actions">
              <Link to="/portfolio" className="btn-primary">
                <Palette size={20} /> Share Your Art
              </Link>
              <Link to="/commissions" className="btn-outline">
                <Lightbulb size={20} /> Find an Artist
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
