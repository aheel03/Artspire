from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum, Float, UniqueConstraint, CheckConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()

class UserRole(enum.Enum):
    ARTIST = "artist"
    BUYER = "buyer"
    GRAPHIC_DESIGNER = "graphic_designer"
    ADMIN = "admin"

class CommissionStatus(enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class NotificationType(enum.Enum):
    follow = "follow"
    post_reaction = "post_reaction"
    comment = "comment"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    bio = Column(Text)
    avatar_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    portfolio_items = relationship("PortfolioItem", back_populates="artist")
    posts = relationship("Post", back_populates="author")
    comments = relationship("Comment", back_populates="author")
    user_tags = relationship("UserTag", back_populates="user")

    # split the two directions of ArtRequest
    art_requests_sent = relationship(
        "ArtRequest",
        foreign_keys="[ArtRequest.requester_id]",
        back_populates="requester",
    )

    received_reviews = relationship(
        "Review",
        foreign_keys="[Review.artist_id]",
        back_populates="artist"
    )
    given_reviews = relationship(
        "Review",
        foreign_keys="[Review.reviewer_id]",
        back_populates="reviewer"
    )
    sent_messages = relationship(
        "Message",
        foreign_keys="[Message.sender_id]",
        back_populates="sender"
    )
    received_messages = relationship(
        "Message",
        foreign_keys="[Message.receiver_id]",
        back_populates="receiver"
    )
    
    # Follow relationships
    following = relationship(
        "Follow",
        foreign_keys="[Follow.follower_id]",
        back_populates="follower"
    )
    followers = relationship(
        "Follow",
        foreign_keys="[Follow.following_id]",
        back_populates="following"
    )
    
    # Notification relationships
    notifications = relationship(
        "Notification",
        foreign_keys="[Notification.user_id]",
        back_populates="user"
    )
    
    # Upvote relationships
    user_upvotes = relationship("Upvote", back_populates="user")

class PortfolioItem(Base):
    __tablename__ = "portfolio_items"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    image_url = Column(String, nullable=False)
    price = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    artist_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    artist = relationship("User", back_populates="portfolio_items")

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    image_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    author = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post")
    post_tags = relationship("PostTag", back_populates="post")
    upvotes = relationship("Upvote", back_populates="post")

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    post = relationship("Post", back_populates="comments")
    author = relationship("User", back_populates="comments")

class UserTag(Base):
    __tablename__ = "user_tags"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    tag = Column(String, primary_key=True)
    
    # Relationships
    user = relationship("User", back_populates="user_tags")

class PostTag(Base):
    __tablename__ = "post_tags"

    post_id = Column(Integer, ForeignKey("posts.id"), primary_key=True)
    tag = Column(String, primary_key=True)
    
    # Relationships
    post = relationship("Post", back_populates="post_tags")

class Upvote(Base):
    __tablename__ = "upvotes"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id"), primary_key=True)
    
    # Relationships
    user = relationship("User", back_populates="user_upvotes")
    post = relationship("Post", back_populates="upvotes")

class ArtRequest(Base):
    __tablename__ = "art_requests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    budget = Column(Float)
    status = Column(Enum(CommissionStatus), default=CommissionStatus.OPEN)
    created_at = Column(DateTime, default=datetime.utcnow)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # explicit relationships
    requester = relationship(
        "User",
        foreign_keys=[requester_id],
        back_populates="art_requests_sent",
    )

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    rating = Column(Integer, nullable=False)  # 1-5 stars
    comment = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    artist_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    artist = relationship("User", foreign_keys=[artist_id], back_populates="received_reviews")
    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="given_reviews")
    
    # Table constraints
    __table_args__ = (
        CheckConstraint('rating >= 1 AND rating <= 5', name='rating_range_check'),
    )

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_read = Column(Boolean, default=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_messages")

class Follow(Base):
    __tablename__ = "follows"

    follower_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    following_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    
    # Relationships
    follower = relationship("User", foreign_keys=[follower_id], back_populates="following")
    following = relationship("User", foreign_keys=[following_id], back_populates="followers")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum(NotificationType), nullable=False)
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    actor = relationship("User", foreign_keys=[actor_id])
