# 🎨 Artspire Platform

A full-stack art commission platform that combines features of platforms like Fiverr and Pinterest to facilitate commission-based artwork sharing, selling, and collaboration. Built as a comprehensive database management system project with modern web technologies.

## 🌟 Features

### Core Functionality
- **User Authentication**: JWT-based secure login and registration with role-based access control
- **Portfolio Management**: Artists can showcase their work with organized albums and pricing
- **Community Feed**: Share posts, get feedback, upvote content, and engage with the community
- **Commission System**: Post and browse commission opportunities with detailed workflow tracking
- **Messaging System**: Real-time communication between artists and clients
- **Notification System**: In-app notifications for follows, comments, upvotes, and commission updates

### Advanced Features
- **User Profiles**: Comprehensive public and private profile management with bio, skills, and statistics
- **Tag System**: Normalized tag implementation for users and posts to enhance discoverability
- **Follow System**: Build networks and follow favorite artists
- **Upvote System**: Democratic content ranking through community engagement
- **Search & Discovery**: Find artists, artworks, and commission opportunities

## 🛠️ Tech Stack

### Frontend
- **React.js** 19.1.0 - Modern UI framework with functional components and hooks
- **React Router DOM** 6.30.1 - Client-side routing and navigation
- **Axios** - HTTP client for API communication
- **CSS3** - Custom styling with modern design principles
- **Icon Libraries**: Heroicons, Lucide React, and Phosphor React

### Backend
- **FastAPI** - High-performance Python web framework with automatic API documentation
- **SQLAlchemy ORM** - Database operations with relationship mapping
- **PostgreSQL** - Robust relational database with ACID compliance
- **Alembic** - Database migration management
- **JWT Authentication** - Secure token-based authentication with bcrypt password hashing
- **Pydantic** - Data validation and serialization

### Database Design
- **Normalized Schema**: All tables normalized to Third Normal Form (3NF)
- **Referential Integrity**: Comprehensive foreign key constraints
- **12 Interconnected Tables**: Users, Posts, Comments, Portfolio, Commissions, Messages, etc.
- **Advanced Relationships**: Many-to-many, one-to-many, and composite key implementations

## 📁 Project Structure

```
artspire/
├── backend/                    # FastAPI Backend Application
│   ├── main.py                # Main FastAPI application
│   ├── models.py              # SQLAlchemy database models
│   ├── schemas.py             # Pydantic request/response schemas
│   ├── auth.py                # JWT authentication logic
│   ├── database.py            # Database configuration and connection
│   ├── comment_helpers.py     # Comment-related utility functions
│   ├── notification_service.py # Real-time notification handling
│   ├── requirements.txt       # Python dependencies
│   ├── alembic.ini            # Alembic configuration
│   ├── alembic/               # Database migration files
│   │   ├── env.py            # Alembic environment configuration
│   │   └── versions/         # Migration version files
│   ├── avatars/               # User avatar storage
│   └── .env                   # Environment variables (not in repo)
├── src/                       # React Frontend Application
│   ├── components/            # Reusable React components
│   │   ├── Navbar.js         # Navigation bar with authentication status
│   │   ├── NotificationBell.js # Notification dropdown and management
│   │   ├── NotificationList.js # Notification display component
│   │   └── NotificationDemo.js # Notification demo component
│   ├── pages/                 # Page-level React components
│   │   ├── HomePage.js       # Landing page
│   │   ├── LoginPage.js      # User authentication
│   │   ├── RegisterPage.js   # User registration
│   │   ├── FeedPage.js       # Main content feed
│   │   ├── ProfilePage.js    # User profile management
│   │   ├── UserProfilePage.js # View other user profiles
│   │   ├── PortfolioPage.js  # Portfolio management
│   │   ├── ArtCollectionPage.js # Browse art collections
│   │   ├── CommissionsPage.js # Commission management
│   │   ├── MessengerPage.js  # Messaging interface
│   │   └── UserSearchPage.js # User discovery
│   ├── services/              # API service modules
│   │   └── NotificationService.js # Notification API client
│   ├── App.js                # Main application component
│   ├── App.css               # Global application styles
│   └── index.js              # Application entry point
├── public/                    # Static public assets
│   ├── index.html            # Main HTML template
│   ├── favicon.ico           # Application favicon
│   └── manifest.json         # PWA manifest
├── package.json              # Frontend dependencies and scripts
└── README.md                 # This file
```

## 🚀 Quick Start

### Prerequisites

- **Python** 3.8 or higher
- **Node.js** 14 or higher  
- **PostgreSQL** 12 or higher

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/artspire-platform.git
   cd artspire-platform
   ```

2. **Backend Setup**
   ```bash
   cd backend
   
   # Create virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install dependencies
   pip install -r requirements.txt
   ```

3. **Database Configuration**
   ```bash
   # Create PostgreSQL database
   createdb artspire_db
   
   # Create .env file
   cp .env.example .env
   ```
   
   Edit `.env` file with your database credentials:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/artspire_db
   SECRET_KEY=your-super-secret-jwt-key
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ```

4. **Database Migration**
   ```bash
   # Run database migrations
   alembic upgrade head
   ```

5. **Start Backend Server**
   ```bash
   uvicorn main:app --reload --port 8000
   ```

6. **Frontend Setup** (in new terminal)
   ```bash
   # Return to project root
   cd ..
   
   # Install dependencies
   npm install
   
   # Start development server
   npm start
   ```

### 🌐 Access Points
- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:8000  
- **Interactive API Documentation**: http://localhost:8000/docs
- **Alternative API Docs**: http://localhost:8000/redoc

##  API Endpoints

### 🔐 Authentication
- `POST /auth/register` - User registration with email verification
- `POST /auth/login` - User login with JWT token generation
- `GET /auth/me` - Get current authenticated user profile
- `POST /auth/logout` - User logout (optional token blacklisting)

### 👤 User Management  
- `GET /users/search` - Search users by username, skills, or bio
- `GET /users/{user_id}` - Get public user profile and statistics
- `PUT /users/{user_id}` - Update user profile (own profile only)
- `GET /users/{user_id}/followers` - Get user's followers list
- `GET /users/{user_id}/following` - Get users that user follows
- `POST /users/{user_id}/follow` - Follow or unfollow a user
- `GET /users/{user_id}/posts` - Get all posts by specific user

### 📝 Feed & Posts
- `GET /feed` - Get community feed with pagination and filtering
- `POST /posts` - Create new post with optional image upload
- `GET /posts/{post_id}` - Get specific post with comments
- `PUT /posts/{post_id}` - Update post (author only)
- `DELETE /posts/{post_id}` - Delete post (author only)
- `POST /posts/{post_id}/upvote` - Upvote or remove upvote from post
- `GET /posts/{post_id}/upvotes` - Get post upvote statistics
- `POST /posts/{post_id}/comment` - Add comment to post
- `GET /posts/{post_id}/comments` - Get all comments for post

### 🎨 Portfolio Management
- `GET /portfolio/{user_id}` - Get user's complete portfolio
- `POST /portfolio` - Add new portfolio item with pricing
- `PUT /portfolio/{item_id}` - Update portfolio item details
- `DELETE /portfolio/{item_id}` - Remove portfolio item
- `GET /portfolio/{item_id}` - Get specific portfolio item details
- `POST /portfolio/{item_id}/purchase` - Purchase artwork (future feature)

### 💼 Commission System
- `GET /art-requests` - Get all available commission requests
- `POST /art-requests` - Create new commission request
- `GET /art-requests/{request_id}` - Get specific commission details
- `PUT /art-requests/{request_id}` - Update commission status or details
- `DELETE /art-requests/{request_id}` - Cancel commission request
- `POST /art-requests/{request_id}/respond` - Respond to commission request
- `GET /art-requests/my-requests` - Get current user's commission requests

### 💬 Messaging System
- `GET /messages` - Get all conversations for current user
- `GET /messages/{user_id}` - Get conversation with specific user
- `POST /messages` - Send new message to user
- `PUT /messages/{message_id}/read` - Mark message as read
- `GET /messages/unread-count` - Get count of unread messages

### 🔔 Notification System
- `GET /notifications` - Get all notifications for current user
- `GET /notifications/unread` - Get only unread notifications
- `PUT /notifications/{notification_id}/read` - Mark notification as read
- `POST /notifications/mark-all-read` - Mark all notifications as read
- `DELETE /notifications/{notification_id}` - Delete notification

### 🏷️ Tags & Categories
- `GET /tags` - Get all available tags
- `GET /tags/popular` - Get most popular tags
- `POST /posts/{post_id}/tags` - Add tags to post
- `DELETE /posts/{post_id}/tags/{tag_id}` - Remove tag from post

## ⚙️ Environment Variables

Create a `.env` file in the `/backend` directory:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/artspire_db

# JWT Configuration  
SECRET_KEY=your-super-secret-jwt-key-make-it-long-and-random
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# File Upload Configuration (Optional)
UPLOAD_DIR=./avatars
MAX_FILE_SIZE=5242880  # 5MB in bytes
ALLOWED_EXTENSIONS=jpg,jpeg,png,gif,webp

# CORS Configuration (Optional)
CORS_ORIGINS=["http://localhost:3000", "http://127.0.0.1:3000"]

# Email Configuration (Future feature)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Development/Production Flag
ENVIRONMENT=development
DEBUG=True
```

## 🏗️ Database Schema

The application uses a fully normalized database schema with the following key tables:

### Core Tables
- **users** - User accounts, authentication, and profile information
- **posts** - Community posts with content and metadata  
- **comments** - Nested comments on posts with threading support
- **portfolio_items** - Artist portfolio entries with pricing and details
- **art_requests** - Commission requests and workflow tracking
- **messages** - Direct messaging between users
- **notifications** - Real-time notification system

### Relationship Tables
- **follows** - User follow relationships (many-to-many)
- **upvotes** - Post upvote tracking (many-to-many)
- **user_tags** - User skill tags (many-to-many)
- **post_tags** - Post categorization tags (many-to-many)

### Key Features of Schema Design
- ✅ **Third Normal Form (3NF)** compliance
- ✅ **Referential integrity** with foreign key constraints  
- ✅ **Check constraints** for data validation
- ✅ **Composite keys** for many-to-many relationships
- ✅ **Indexed columns** for performance optimization
- ✅ **Audit trails** with created_at/updated_at timestamps

## 🧪 Testing

### Backend API Testing
```bash
cd backend

# Run all tests
python -m pytest tests/ -v

# Run specific test file
python -m pytest tests/test_auth.py -v

# Run with coverage
python -m pytest --cov=. tests/
```

### Frontend Testing
```bash
# Run React tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run end-to-end tests (if configured)
npm run test:e2e
```

### Manual API Testing
Use the interactive API documentation at `http://localhost:8000/docs` to test all endpoints with sample data.

## 🚀 Production Deployment

### Backend Deployment Options

#### Option 1: Heroku
```bash
# Install Heroku CLI and login
heroku login

# Create new app
heroku create artspire-backend

# Set environment variables
heroku config:set SECRET_KEY=your-production-secret
heroku config:set DATABASE_URL=your-production-db-url

# Deploy
git push heroku main
```

#### Option 2: DigitalOcean/AWS/GCP
1. Set up PostgreSQL database instance
2. Configure environment variables for production
3. Use Docker for containerized deployment
4. Set up reverse proxy with Nginx
5. Configure SSL certificates

### Frontend Deployment
```bash
# Build production bundle
npm run build

# Deploy to Netlify, Vercel, or AWS S3
# Update API URLs in build configuration
```

## 🔧 Development Guidelines

### Code Style
- **Python**: Follow PEP 8 standards, use Black formatter
- **JavaScript**: Use ES6+ features, Prettier formatter  
- **SQL**: Use consistent naming conventions and indentation

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature description"

# Push and create pull request
git push origin feature/new-feature
```

### Database Migrations
```bash
# Create new migration
alembic revision --autogenerate -m "description of changes"

# Apply migration
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

## 🔒 Project Status

This is a personal project developed for educational and portfolio purposes. The codebase is available for reference and learning, but contributions are not being accepted at this time.

## 📈 Performance Considerations

- **Database indexing** on frequently queried columns
- **Pagination** for large data sets
- **Image optimization** for uploaded content
- **Caching** strategy for frequently accessed data
- **API rate limiting** for production deployment

## 🛡️ Security Features

- **JWT token authentication** with secure secret keys
- **Password hashing** using bcrypt with salt
- **SQL injection protection** through ORM usage
- **CORS configuration** for cross-origin requests
- **Input validation** using Pydantic schemas
- **File upload restrictions** for security

##  Acknowledgments

- **FastAPI** team for the excellent web framework
- **React** team for the powerful frontend library  
- **SQLAlchemy** for the robust ORM
- **PostgreSQL** for reliable database management
- **Open source community** for amazing tools and libraries

## 📞 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/yourusername/artspire-platform/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/artspire-platform/discussions)
- **Documentation**: [Wiki](https://github.com/yourusername/artspire-platform/wiki)

---

**🎨 Artspire Platform** - Empowering artists and connecting creative communities through technology ✨

Made with ❤️ by the Artspire development team
