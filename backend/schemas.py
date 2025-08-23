from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List, Union
from models import CommissionStatus, NotificationType

# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    skills: Optional[Union[str, List[str]]] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    skills: Optional[Union[str, List[str]]] = None

class UserInDB(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class User(UserInDB):
    pass

# Portfolio schemas
class PortfolioItemBase(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: str
    price: Optional[float] = None

class PortfolioItemCreate(PortfolioItemBase):
    pass

class PortfolioItem(PortfolioItemBase):
    id: int
    created_at: datetime
    artist_id: int
    
    class Config:
        from_attributes = True

# Post schemas
class PostBase(BaseModel):
    content: str
    image_url: Optional[str] = None

class PostCreate(PostBase):
    pass

class PostUpdate(BaseModel):
    content: str

class Post(PostBase):
    id: int
    upvotes: int
    created_at: datetime
    author_id: int
    author: User
    
    class Config:
        from_attributes = True

# Comment schemas
class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    pass

class CommentUpdate(BaseModel):
    content: str

class Comment(CommentBase):
    id: int
    created_at: datetime
    post_id: int
    author_id: int
    author: User
    
    class Config:
        from_attributes = True

# Art Request schemas
class ArtRequestBase(BaseModel):
    title: str
    description: str
    budget: Optional[float] = None

class ArtRequestCreate(ArtRequestBase):
    pass

class ArtRequest(ArtRequestBase):
    id: int
    status: CommissionStatus
    created_at: datetime
    requester_id: int
    
    class Config:
        from_attributes = True

# Review schemas
class ReviewBase(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Rating must be between 1 and 5 stars")
    comment: Optional[str] = None

class ReviewCreate(ReviewBase):
    pass

class Review(ReviewBase):
    id: int
    created_at: datetime
    artist_id: int
    reviewer_id: int
    
    class Config:
        from_attributes = True

# Message schemas
class MessageBase(BaseModel):
    content: str

class MessageCreate(MessageBase):
    receiver_id: int

class Message(MessageBase):
    id: int
    created_at: datetime
    is_read: bool
    sender_id: int
    receiver_id: int
    sender: User
    receiver: User
    
    class Config:
        from_attributes = True

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Notification schemas
class NotificationEvent(BaseModel):
    """Event object for notification triggers"""
    type: str  # "follow" or "reaction"
    fromUser: str  # username of the user who triggered the event
    toUser: str  # username of the user receiving the notification

class NotificationBase(BaseModel):
    type: NotificationType
    message: str
    is_read: bool = False

class NotificationCreate(NotificationBase):
    user_id: int
    actor_id: int

class Notification(NotificationBase):
    id: int
    created_at: datetime
    user_id: int
    actor_id: int
    
    class Config:
        from_attributes = True

class NotificationWithDetails(BaseModel):
    """Notification with actor details"""
    id: int
    type: str
    message: str
    timestamp: datetime
    is_read: bool
    actor: Optional[dict] = None
