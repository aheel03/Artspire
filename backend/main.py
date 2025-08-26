from fastapi import FastAPI, Form, Depends, UploadFile, File as FastAPIFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select, func, text, delete

from fastapi import HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from auth import create_access_token, verify_token, SECRET_KEY, ALGORITHM
from datetime import timedelta

from jose import jwt, JWTError

from passlib.context import CryptContext
import json
import os
import time
import re

from models import User, Base, Post, PortfolioItem, ArtRequest, Comment, Review, Follow, Message, Notification, UserTag, PostTag, Upvote, CommissionStatus
from database import engine, SessionLocal
from schemas import UserCreate, UserInDB, PostCreate, PostUpdate, PortfolioItemCreate, ArtRequestCreate, CommentCreate, CommentUpdate, ReviewCreate, UserUpdate, MessageCreate, Message as MessageSchema, Notification as NotificationSchema, NotificationEvent, NotificationWithDetails
from supabase import create_client, Client
from notification_service import NotificationService
from comment_helpers import create_comment_with_notification, get_comment_with_notifications

from typing import List

app = FastAPI()

print("[INFO] Adding CORS middleware...")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
print("[INFO] CORS middleware added.")

# --- Supabase config (using environment variables) ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "artwork")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None



# Hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

@app.post("/login")
def login(username: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not user or not verify_password(password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(data={"sub": user.username}, expires_delta=timedelta(minutes=30))
    print("TOKEN SENT:", token)
    return {"access_token": token, "token_type": "bearer"}

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)

@app.get("/protected")
def protected_route(token: str = Depends(oauth2_scheme)):
    username = verify_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    return {"message": f"Hello, {username}!"}

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

@app.get("/profile")
def get_profile(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        
        # Get user from database
        user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        # Get user skills from UserTag table
        user_tags = db.execute(select(UserTag).where(UserTag.user_id == user.id)).scalars().all()
        skills = [tag.tag for tag in user_tags]

        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "bio": user.bio or "No bio available",
            "avatar_url": user.avatar_url,
            "skills": skills,
            "created_at": user.created_at
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.patch("/profile")
def update_profile(
    user_update: UserUpdate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        # Update fields if provided
        if user_update.username is not None:
            user.username = user_update.username
        if user_update.bio is not None:
            user.bio = user_update.bio
        if user_update.avatar_url is not None:
            user.avatar_url = user_update.avatar_url
        if user_update.skills is not None:
            # Delete existing user tags
            db.execute(delete(UserTag).where(UserTag.user_id == user.id))
            # Add new tags
            if isinstance(user_update.skills, list):
                for skill in user_update.skills:
                    if skill.strip():  # Only add non-empty skills
                        new_tag = UserTag(user_id=user.id, tag=skill.strip())
                        db.add(new_tag)
            elif isinstance(user_update.skills, str):
                # Handle comma-separated string
                skills_list = [s.strip() for s in user_update.skills.split(',') if s.strip()]
                for skill in skills_list:
                    new_tag = UserTag(user_id=user.id, tag=skill)
                    db.add(new_tag)
        
        db.commit()
        db.refresh(user)
        
        # Get updated skills
        user_tags = db.execute(select(UserTag).where(UserTag.user_id == user.id)).scalars().all()
        skills = [tag.tag for tag in user_tags]
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "bio": user.bio,
            "avatar_url": user.avatar_url,
            "skills": skills,
            "created_at": user.created_at
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.post("/register")
def register(
    username: str = Form(...),
    email: str = Form(...), 
    password: str = Form(...),
    bio: str = Form(None),
    db: Session = Depends(get_db)
):
    hashed = hash_password(password)
    
    new_user = User(
        username=username,
        email=email,
        password=hashed,
        bio=bio
    )
    db.add(new_user)
    try:
        db.commit()
        return {"success": True, "message": "User registered successfully"}
    except IntegrityError:
        db.rollback()
        return {"success": False, "error": "Username or email already exists"}

# Feed/Posts endpoints
@app.get("/feed")
def get_feed(skip: int = 0, limit: int = 20, tags: str = None, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Get the global feed of posts with optional tag filtering"""
    # Get current user for follow status
    current_user = None
    try:
        username = verify_token(token)
        if username:
            current_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    except:
        pass  # Allow unauthenticated users to view feed
    
    query = select(Post, User).join(User, Post.author_id == User.id)
    
    # Filter by tags if provided
    if tags:
        # Parse the tags parameter (comma-separated)
        tag_list = [tag.strip() for tag in tags.split(',') if tag.strip()]
        if tag_list:
            # Join with PostTag table to filter by tags
            query = query.join(PostTag, Post.id == PostTag.post_id)
            # Filter posts that have any of the specified tags
            from sqlalchemy import or_
            tag_conditions = [PostTag.tag.in_(tag_list)]
            query = query.where(or_(*tag_conditions))
    
    posts_with_users = db.execute(
        query.order_by(Post.created_at.desc())
        .offset(skip)
        .limit(limit)
    ).all()
    
    feed_posts = []
    for post, user in posts_with_users:
        # Get comment count for this post
        comment_count = db.execute(
            select(func.count(Comment.id)).where(Comment.post_id == post.id)
        ).scalar()
        
        # Get upvote count for this post
        upvote_count = db.execute(
            select(func.count(Upvote.user_id)).where(Upvote.post_id == post.id)
        ).scalar()
        
        # Check if current user has upvoted this post
        has_upvoted = False
        if current_user:
            upvote_record = db.execute(
                select(Upvote).where(
                    Upvote.user_id == current_user.id,
                    Upvote.post_id == post.id
                )
            ).scalar_one_or_none()
            has_upvoted = upvote_record is not None
        
        # Check if current user is following this post's author
        is_following = False
        if current_user and current_user.id != user.id:
            follow_record = db.execute(
                select(Follow).where(
                    Follow.follower_id == current_user.id,
                    Follow.following_id == user.id
                )
            ).scalar_one_or_none()
            is_following = follow_record is not None
        
        # Get post tags
        post_tags = db.execute(select(PostTag).where(PostTag.post_id == post.id)).scalars().all()
        tags_list = [tag.tag for tag in post_tags]
        
        feed_posts.append({
            "id": post.id,
            "content": post.content,
            "image_url": post.image_url,
            "tags": tags_list,
            "upvotes": upvote_count or 0,
            "has_upvoted": has_upvoted,
            "created_at": post.created_at,
            "comment_count": comment_count or 0,
            "author": {
                "id": user.id,
                "username": user.username,
                "avatar_url": user.avatar_url
            },
            "is_following": is_following,
            "is_own_post": current_user.id == user.id if current_user else False
        })
    
    return {"posts": feed_posts}

@app.post("/posts")
async def create_post(
    content: str = Form(...),
    image_url: str = Form(None),
    tags: str = Form(None),
    file: UploadFile = FastAPIFile(None),
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Create a new post with optional image upload and tags"""
    try:
        print(f"Creating post with content: '{content[:50]}...', tags: {tags}, has_file: {bool(file and file.filename)}")
        
        username = verify_token(token)
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user
        user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        print(f"User found: {user.username} (ID: {user.id})")
        
        # Handle image upload if file is provided
        final_image_url = image_url
        if file and file.filename:
            try:
                contents = await file.read()
                # Sanitize filename to remove invalid characters
                safe_filename = re.sub(r'[^\w\-_\.]', '_', file.filename)
                if not safe_filename or safe_filename.startswith('.'):
                    safe_filename = f"image_{int(time.time())}.jpg"
                filename = f"post_{int(time.time())}_{safe_filename}"
                print(f"Uploading post image: {filename} to Supabase bucket: {SUPABASE_BUCKET}")
                res = supabase.storage.from_(SUPABASE_BUCKET).upload(filename, contents, {"content-type": file.content_type, "x-upsert": "true"})
                if hasattr(res, "error") and res.error is not None:
                    print("Upload error:", res.error)
                    raise HTTPException(status_code=500, detail=f"Upload failed: {res.error}")
                final_image_url = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{filename}"
                print("Post image uploaded successfully:", final_image_url)
            except Exception as e:
                print(f"Error uploading post image: {e}")
                raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")
        
        new_post = Post(
            content=content,
            image_url=final_image_url,
            author_id=user.id
        )
        
        try:
            db.add(new_post)
            db.commit()
            db.refresh(new_post)
            print(f"Post created successfully with ID: {new_post.id}")
            
            # Add tags if provided
            if tags:
                if isinstance(tags, str):
                    # Handle comma-separated string or JSON string
                    try:
                        import json
                        tags_list = json.loads(tags) if tags.startswith('[') else [t.strip() for t in tags.split(',') if t.strip()]
                    except json.JSONDecodeError:
                        tags_list = [t.strip() for t in tags.split(',') if t.strip()]
                else:
                    tags_list = tags if isinstance(tags, list) else [tags]
                
                for tag in tags_list:
                    if tag.strip():  # Only add non-empty tags
                        post_tag = PostTag(post_id=new_post.id, tag=tag.strip())
                        db.add(post_tag)
                
                db.commit()
            
        except Exception as db_error:
            db.rollback()
            print(f"Database error creating post: {db_error}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(db_error)}")
        
        return {"success": True, "post_id": new_post.id}
    
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        print(f"Unexpected error in create_post: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/posts/{post_id}/upvote")
def upvote_post(
    post_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Toggle upvote for a post"""
    username = verify_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get current user
    current_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not current_user:
        raise HTTPException(status_code=401, detail="User not found")
    
    post = db.execute(select(Post).where(Post.id == post_id)).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if user has already upvoted this post
    existing_upvote = db.execute(
        select(Upvote).where(
            Upvote.user_id == current_user.id,
            Upvote.post_id == post_id
        )
    ).scalar_one_or_none()
    
    if existing_upvote:
        # Remove upvote (unlike)
        db.execute(
            delete(Upvote).where(
                Upvote.user_id == current_user.id,
                Upvote.post_id == post_id
            )
        )
        db.commit()
        
        # Get new upvote count
        upvote_count = db.execute(
            select(func.count(Upvote.user_id)).where(Upvote.post_id == post_id)
        ).scalar()
        
        return {"success": True, "upvotes": upvote_count or 0, "has_upvoted": False}
    else:
        # Add upvote
        new_upvote = Upvote(user_id=current_user.id, post_id=post_id)
        db.add(new_upvote)
        db.commit()
        
        # Create notification for the post author (only if not upvoting own post)
        if post.author_id != current_user.id:
            notification_service = NotificationService(db)
            try:
                notification_service.create_post_reaction_notification(
                    reactor_id=current_user.id,
                    post_id=post_id
                )
            except Exception as e:
                # Log the error but don't fail the upvote operation
                print(f"Failed to create post reaction notification: {e}")
        
        # Get new upvote count
        upvote_count = db.execute(
            select(func.count(Upvote.user_id)).where(Upvote.post_id == post_id)
        ).scalar()
        
        return {"success": True, "upvotes": upvote_count or 0, "has_upvoted": True}

@app.put("/posts/{post_id}")
def update_post(
    post_id: int,
    post_update: PostUpdate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Update a post (only by the post author)"""
    # Get current user from token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        current_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
        
        if not current_user:
            raise HTTPException(status_code=401, detail="User not found")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get the post
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if current user is the author of the post
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own posts")
    
    # Update the post
    post.content = post_update.content
    db.commit()
    db.refresh(post)
    
    # Return updated post data
    return {
        "id": post.id,
        "content": post.content,
        "image_url": post.image_url,
        "created_at": post.created_at,
        "author_id": post.author_id,
        "author": {
            "id": post.author.id,
            "username": post.author.username,
            "avatar_url": post.author.avatar_url
        }
    }

@app.delete("/posts/{post_id}")
def delete_post(
    post_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Delete a post (only by the post author)"""
    # Get current user from token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        current_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
        
        if not current_user:
            raise HTTPException(status_code=401, detail="User not found")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get the post
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if current user is the author of the post
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own posts")
    
    # Delete related records first (due to foreign key constraints)
    # Delete comments
    db.execute(delete(Comment).where(Comment.post_id == post_id))
    # Delete upvotes
    db.execute(delete(Upvote).where(Upvote.post_id == post_id))
    # Delete post tags
    db.execute(delete(PostTag).where(PostTag.post_id == post_id))
    
    # Delete the post
    db.delete(post)
    db.commit()
    
    return {"message": "Post deleted successfully"}
# User stats endpoints
@app.get("/users/{user_id}/posts")
def get_user_posts(user_id: int, db: Session = Depends(get_db)):
    """Get posts created by a specific user"""
    posts = db.execute(
        select(Post).where(Post.author_id == user_id).order_by(Post.created_at.desc())
    ).scalars().all()
    
    return [{
        "id": post.id,
        "content": post.content,
        "image_url": post.image_url,
        "created_at": post.created_at.isoformat(),
        "author_id": post.author_id
    } for post in posts]

# Portfolio endpoints
@app.get("/users/{user_id}/portfolio")
def get_user_portfolio(user_id: int, db: Session = Depends(get_db)):
    """Get user's portfolio items"""
    portfolio_items = db.execute(
        select(PortfolioItem)
        .where(PortfolioItem.artist_id == user_id)
        .order_by(PortfolioItem.created_at.desc())
    ).scalars().all()
    
    items = []
    for item in portfolio_items:
        items.append({
            "id": item.id,
            "title": item.title,
            "description": item.description,
            "image_url": item.image_url,
            "price": item.price,
            "created_at": item.created_at
        })
    
    return {"portfolio_items": items}

@app.post("/portfolio")
def create_portfolio_item(
    title: str = Form(...),
    description: str = Form(None),
    image_url: str = Form(...),
    price: float = Form(None),
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Create a new portfolio item"""
    username = verify_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get user
    user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    print(f"Creating portfolio item for user {user.id} with image_url: {image_url}")
    new_item = PortfolioItem(
        title=title,
        description=description,
        image_url=image_url,
        price=price,
        artist_id=user.id
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    print(f"Portfolio item created with ID: {new_item.id}")
    return {"success": True, "item_id": new_item.id}

from fastapi import Response

@app.delete("/portfolio/{item_id}")
def delete_portfolio_item(
    item_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Delete a portfolio item (only by owner)"""
    username = verify_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    item = db.execute(select(PortfolioItem).where(PortfolioItem.id == item_id)).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Portfolio item not found")
    if item.artist_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this item")
    # Optionally: delete image from Supabase Storage here
    db.delete(item)
    db.commit()
    return {"success": True, "message": "Portfolio item deleted"}

@app.get("/portfolio/all")
def get_all_portfolio_artworks(db: Session = Depends(get_db)):
    """Get all portfolio artworks from all users for the art collection page"""
    portfolio_items = db.execute(
        select(PortfolioItem, User)
        .join(User, PortfolioItem.artist_id == User.id)
        .order_by(PortfolioItem.created_at.desc())
    ).all()
    
    artworks = []
    for item, user in portfolio_items:
        artworks.append({
            "id": item.id,
            "title": item.title,
            "description": item.description,
            "image_url": item.image_url,
            "price": item.price,
            "created_at": item.created_at,
            "user": {
                "id": user.id,
                "username": user.username,
                "bio": user.bio,
                "avatar_url": user.avatar_url
            }
        })
    
    return {"artworks": artworks}

# Commission/Art Request endpoints
@app.get("/commissions")
def get_commissions(
    status: str = None,
    my_commissions: bool = False,
    skip: int = 0,
    limit: int = 20,
    token: str = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db)
):
    """Get art requests/commissions"""
    query = select(ArtRequest, User).join(User, ArtRequest.requester_id == User.id)
    
    if status:
        query = query.where(ArtRequest.status == CommissionStatus(status))
    
    if my_commissions and token:
        username = verify_token(token)
        if username:
            user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
            if user:
                query = query.where(ArtRequest.requester_id == user.id)
    
    commissions_with_users = db.execute(
        query.order_by(ArtRequest.created_at.desc()).offset(skip).limit(limit)
    ).all()
    
    commissions = []
    for commission, user in commissions_with_users:
        commissions.append({
            "id": commission.id,
            "title": commission.title,
            "description": commission.description,
            "budget": commission.budget,
            "status": commission.status.value,
            "created_at": commission.created_at,
            "requester": {
                "id": user.id,
                "username": user.username,
                "avatar_url": user.avatar_url
            }
        })
    
    return {"commissions": commissions}

@app.post("/commissions")
def create_commission(
    title: str = Form(...),
    description: str = Form(...),
    budget: float = Form(None),
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Create a new art request/commission"""
    username = verify_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get user
    user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    new_commission = ArtRequest(
        title=title,
        description=description,
        budget=budget,
        requester_id=user.id,
        status=CommissionStatus.OPEN
    )
    db.add(new_commission)
    
    try:
        db.commit()
        db.refresh(new_commission)
    except Exception as e:
        db.rollback()
        print(f"Error creating commission: {e}")
        # If it's an enum error, try to provide a helpful message
        if "invalid input value for enum" in str(e):
            raise HTTPException(
                status_code=500, 
                detail="Database schema error. Please contact administrator to fix enum types."
            )
        else:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    return {"success": True, "commission_id": new_commission.id}

@app.put("/commissions/{commission_id}")
def update_commission(
    commission_id: int,
    title: str = Form(None),
    description: str = Form(None),
    budget: float = Form(None),
    status: str = Form(None),
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Update a commission (only by the requester)"""
    username = verify_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get user
    user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Get commission
    commission = db.execute(select(ArtRequest).where(ArtRequest.id == commission_id)).scalar_one_or_none()
    if not commission:
        raise HTTPException(status_code=404, detail="Commission not found")
    
    # Check if user owns the commission
    if commission.requester_id != user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own commissions")
    
    # Update fields
    if title is not None:
        commission.title = title
    if description is not None:
        commission.description = description
    if budget is not None:
        commission.budget = budget
    if status is not None:
        try:
            commission.status = CommissionStatus(status)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status")
    
    db.commit()
    db.refresh(commission)
    
    return {"success": True, "commission": {
        "id": commission.id,
        "title": commission.title,
        "description": commission.description,
        "budget": commission.budget,
        "status": commission.status.value
    }}

# User search and discovery
@app.get("/users/search")
def search_users(
    q: str = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Search for users by username, bio, or skills"""
    query = select(User)
    
    if q:
        # Create search conditions for username, bio, and skills
        search_term = f"%{q}%"
        from sqlalchemy import or_
        # Join with UserTag to search in skills/tags
        query = query.outerjoin(UserTag, User.id == UserTag.user_id)
        query = query.where(or_(
            User.username.ilike(search_term),
            User.bio.ilike(search_term),
            UserTag.tag.ilike(search_term)
        ))
    
    users = db.execute(query.offset(skip).limit(limit)).scalars().all()
    
    user_list = []
    for user in users:
        # Get user skills from UserTag table
        user_tags = db.execute(select(UserTag).where(UserTag.user_id == user.id)).scalars().all()
        skills = [tag.tag for tag in user_tags]
        
        user_list.append({
            "id": user.id,
            "username": user.username,
            "bio": user.bio,
            "avatar_url": user.avatar_url,
            "skills": skills,
            "created_at": user.created_at
        })
    
    return {"users": user_list}

@app.get("/users/suggested")
def get_suggested_users(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme_optional)):
    """Get top 3 artists by follower count for suggestions"""
    # Get current user if token is provided
    current_user = None
    if token:
        username = verify_token(token)
        if username:
            current_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    
    # Query to get users with their follower counts, excluding current user
    query = """
        SELECT u.id, u.username, u.bio, u.avatar_url, 
               COALESCE(COUNT(f.follower_id), 0) as follower_count
        FROM users u
        LEFT JOIN follows f ON u.id = f.following_id
        WHERE 1=1
    """
    
    # Exclude current user if logged in
    if current_user:
        query += f" AND u.id != {current_user.id}"
    
    query += """
        GROUP BY u.id, u.username, u.bio, u.avatar_url
        ORDER BY follower_count DESC, u.created_at ASC
        LIMIT 3
    """
    
    result = db.execute(text(query)).fetchall()
    
    suggested_users = []
    for row in result:
        # Get user tags/skills
        user_tags = db.execute(select(UserTag).where(UserTag.user_id == row.id)).scalars().all()
        skills = [tag.tag for tag in user_tags]
        
        # Check if current user is already following this user
        is_following = False
        if current_user:
            follow_record = db.execute(
                select(Follow).where(
                    Follow.follower_id == current_user.id,
                    Follow.following_id == row.id
                )
            ).scalar_one_or_none()
            is_following = follow_record is not None
        
        suggested_users.append({
            "id": row.id,
            "username": row.username,
            "bio": row.bio,
            "avatar_url": row.avatar_url,
            "follower_count": row.follower_count,
            "skills": skills,
            "is_following": is_following
        })
    
    return {"suggested_users": suggested_users}

@app.get("/users/{user_id}")
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    """Get public user profile"""
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user skills from UserTag table
    user_tags = db.execute(select(UserTag).where(UserTag.user_id == user.id)).scalars().all()
    skills = [tag.tag for tag in user_tags]
    
    return {
        "id": user.id,
        "username": user.username,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "skills": skills,
        "created_at": user.created_at
    }

AVATAR_DIR = os.path.join(os.path.dirname(__file__), "avatars")
os.makedirs(AVATAR_DIR, exist_ok=True)
from fastapi.staticfiles import StaticFiles
app.mount("/avatars", StaticFiles(directory=AVATAR_DIR), name="avatars")

@app.post("/profile/avatar")
def upload_profile_avatar(
    file: UploadFile = FastAPIFile(...),
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        # Save file
        ext = os.path.splitext(file.filename)[1]
        filename = f"{user.id}_avatar{ext}"
        file_path = os.path.join(AVATAR_DIR, filename)
        with open(file_path, "wb") as f:
            f.write(file.file.read())
        # Update user avatar_url
        user.avatar_url = f"/avatars/{filename}"
        db.commit()
        return {"avatar_url": user.avatar_url}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.post("/upload-artwork-image")
async def upload_artwork_image(
    file: UploadFile = FastAPIFile(...),
    token: str = Depends(oauth2_scheme)
):
    import traceback
    try:
        contents = await file.read()
        # Sanitize filename to remove invalid characters
        safe_filename = re.sub(r'[^\w\-_\.]', '_', file.filename)
        if not safe_filename or safe_filename.startswith('.'):
            safe_filename = f"image_{int(time.time())}.jpg"
        filename = f"{int(time.time())}_{safe_filename}"
        print(f"Uploading file: {filename} to Supabase bucket: {SUPABASE_BUCKET}")
        res = supabase.storage.from_(SUPABASE_BUCKET).upload(filename, contents, {"content-type": file.content_type, "x-upsert": "true"})
        print("Supabase upload response:", res)
        if hasattr(res, "error") and res.error is not None:
            print("Upload error:", res.error)
            raise HTTPException(status_code=500, detail=f"Upload failed: {res.error}")
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{filename}"
        print("[IMPORTANT] Returning public URL for uploaded image:", public_url)
        # NEXT STEPS:
        # 1. Copy the above URL and open it in your browser. If you see the image, the upload and permissions are correct.
        # 2. If you get 404 or 403, check your Supabase dashboard: Storage > artwork bucket > Settings. Make sure the bucket is public.
        # 3. In your React frontend, use this URL directly as the <img src> for the artwork image.
        return {"url": public_url}
    except Exception as e:
        print("[ERROR] Exception in /upload-artwork-image:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Upload endpoint for post images
@app.post("/upload-post-image")
async def upload_post_image(
    file: UploadFile = FastAPIFile(...),
    token: str = Depends(oauth2_scheme)
):
    import traceback
    try:
        # Verify token
        username = verify_token(token)
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        contents = await file.read()
        # Sanitize filename to remove invalid characters
        safe_filename = re.sub(r'[^\w\-_\.]', '_', file.filename)
        if not safe_filename or safe_filename.startswith('.'):
            safe_filename = f"image_{int(time.time())}.jpg"
        filename = f"post_{int(time.time())}_{safe_filename}"
        print(f"Uploading post image: {filename} to Supabase bucket: {SUPABASE_BUCKET}")
        res = supabase.storage.from_(SUPABASE_BUCKET).upload(filename, contents, {"content-type": file.content_type, "x-upsert": "true"})
        print("Supabase upload response:", res)
        if hasattr(res, "error") and res.error is not None:
            print("Upload error:", res.error)
            raise HTTPException(status_code=500, detail=f"Upload failed: {res.error}")
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{filename}"
        print("[IMPORTANT] Returning public URL for uploaded post image:", public_url)
        return {"url": public_url}
    except Exception as e:
        print("[ERROR] Exception in /upload-post-image:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/cors-test")
def cors_test():
    return {"message": "CORS is working!"}

# Comment endpoints
@app.get("/posts/{post_id}/comments")
def get_post_comments(post_id: int, db: Session = Depends(get_db)):
    """Get comments for a specific post"""
    comments_with_users = db.execute(
        select(Comment, User)
        .join(User, Comment.author_id == User.id)
        .where(Comment.post_id == post_id)
        .order_by(Comment.created_at.asc())
    ).all()
    
    comments = []
    for comment, user in comments_with_users:
        comments.append({
            "id": comment.id,
            "content": comment.content,
            "created_at": comment.created_at,
            "author": {
                "id": user.id,
                "username": user.username,
                "avatar_url": user.avatar_url
            }
        })
    
    return {"comments": comments}

@app.post("/posts/{post_id}/comments")
def create_comment(
    post_id: int,
    comment: CommentCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Create a new comment on a post"""
    username = verify_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get user
    user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Create comment with notification using the helper function
    try:
        new_comment = create_comment_with_notification(db, post_id, user.id, comment.content)
        return {"success": True, "comment_id": new_comment.id}
    except ValueError as e:
        if "Post not found" in str(e):
            raise HTTPException(status_code=404, detail="Post not found")
        else:
            raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Predefined post tags
PREDEFINED_POST_TAGS = [
    "Art Showcase", 
    "Work in Progress", 
    "Tutorial", 
    "Feedback Request", 
    "Commission Open", 
    "Digital Art", 
    "Traditional Art", 
    "Photography", 
    "Design", 
    "Discussion"
]

# Predefined skill tags for artists
PREDEFINED_SKILL_TAGS = [
    "Digital Painting",
    "Character Design", 
    "Concept Art",
    "Illustration",
    "Logo Design",
    "UI/UX Design",
    "Portrait Art",
    "Landscape Art",
    "Abstract Art",
    "3D Modeling",
    "Animation",
    "Photography",
    "Photo Editing",
    "Graphic Design",
    "Typography",
    "Watercolor",
    "Oil Painting",
    "Acrylic Painting",
    "Pencil Drawing",
    "Ink Drawing",
    "Digital Sculpting",
    "Environment Design",
    "Vehicle Design",
    "Architecture Design",
    "Fashion Design",
    "Product Design",
    "Comic Art",
    "Manga Art",
    "Storyboarding",
    "Game Art"
]

# Endpoint to get available post tags
@app.get("/post-tags")
def get_post_tags():
    """Get available predefined tags for posts"""
    return {"tags": PREDEFINED_POST_TAGS}

@app.get("/skill-tags")
def get_skill_tags():
    """Get available predefined tags for user skills"""
    return {"tags": PREDEFINED_SKILL_TAGS}

# Follow/Unfollow endpoints
@app.post("/users/{user_id}/follow")
def follow_user(
    user_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Follow a user"""
    print(f"[FOLLOW DEBUG] Attempting to follow user_id: {user_id}")
    
    username = verify_token(token)
    if not username:
        print(f"[FOLLOW DEBUG] Invalid token")
        raise HTTPException(status_code=401, detail="Invalid token")
    
    print(f"[FOLLOW DEBUG] Current user: {username}")
    
    # Get current user
    current_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not current_user:
        print(f"[FOLLOW DEBUG] Current user not found in database")
        raise HTTPException(status_code=401, detail="User not found")
    
    print(f"[FOLLOW DEBUG] Current user ID: {current_user.id}")
    
    # Check if target user exists
    target_user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not target_user:
        print(f"[FOLLOW DEBUG] Target user {user_id} not found")
        raise HTTPException(status_code=404, detail="Target user not found")
    
    print(f"[FOLLOW DEBUG] Target user found: {target_user.username}")
    
    # Can't follow yourself
    if current_user.id == user_id:
        print(f"[FOLLOW DEBUG] User trying to follow themselves")
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    
    # Check if already following
    existing_follow = db.execute(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.following_id == user_id
        )
    ).scalar_one_or_none()
    
    if existing_follow:
        print(f"[FOLLOW DEBUG] Already following this user")
        raise HTTPException(status_code=400, detail="Already following this user")
    
    print(f"[FOLLOW DEBUG] Creating new follow relationship")
    
    # Create follow relationship
    new_follow = Follow(
        follower_id=current_user.id,
        following_id=user_id
    )
    db.add(new_follow)
    db.commit()
    
    print(f"[FOLLOW DEBUG] Follow relationship created successfully")
    
    # Create notification for the followed user
    notification_service = NotificationService(db)
    try:
        notification_service.create_follow_notification(
            follower_id=current_user.id,
            following_id=user_id
        )
        print(f"[FOLLOW DEBUG] Follow notification created")
    except Exception as e:
        # Log the error but don't fail the follow operation
        print(f"[FOLLOW DEBUG] Failed to create follow notification: {e}")
    
    return {"success": True, "message": f"Now following {target_user.username}"}

@app.delete("/users/{user_id}/follow")
def unfollow_user(
    user_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Unfollow a user"""
    print(f"[UNFOLLOW DEBUG] Attempting to unfollow user_id: {user_id}")
    
    username = verify_token(token)
    if not username:
        print(f"[UNFOLLOW DEBUG] Invalid token")
        raise HTTPException(status_code=401, detail="Invalid token")
    
    print(f"[UNFOLLOW DEBUG] Current user: {username}")
    
    # Get current user
    current_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not current_user:
        print(f"[UNFOLLOW DEBUG] Current user not found in database")
        raise HTTPException(status_code=401, detail="User not found")
    
    print(f"[UNFOLLOW DEBUG] Current user ID: {current_user.id}")
    
    # Check if target user exists (for better debugging)
    target_user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not target_user:
        print(f"[UNFOLLOW DEBUG] Target user {user_id} not found")
        raise HTTPException(status_code=404, detail="Target user not found")
    
    print(f"[UNFOLLOW DEBUG] Target user found: {target_user.username}")
    
    # Find and delete follow relationship
    follow_record = db.execute(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.following_id == user_id
        )
    ).scalar_one_or_none()
    
    print(f"[UNFOLLOW DEBUG] Follow record found: {follow_record is not None}")
    
    if not follow_record:
        print(f"[UNFOLLOW DEBUG] No follow relationship found between user {current_user.id} and {user_id}")
        # Let's also check all follows for this user for debugging
        all_follows = db.execute(
            select(Follow).where(Follow.follower_id == current_user.id)
        ).all()
        print(f"[UNFOLLOW DEBUG] User {current_user.id} is following: {[f.following_id for f in all_follows]}")
        raise HTTPException(status_code=404, detail="Not following this user")
    
    print(f"[UNFOLLOW DEBUG] Deleting follow relationship")
    db.delete(follow_record)
    db.commit()
    
    print(f"[UNFOLLOW DEBUG] Unfollow successful")
    return {"success": True, "message": "Unfollowed user"}

@app.get("/users/{user_id}/followers")
def get_user_followers(user_id: int, db: Session = Depends(get_db)):
    """Get followers of a user"""
    followers = db.execute(
        select(Follow, User)
        .join(User, Follow.follower_id == User.id)
        .where(Follow.following_id == user_id)
        .order_by(User.username.asc())
    ).all()
    
    follower_list = []
    for follow, user in followers:
        follower_list.append({
            "id": user.id,
            "username": user.username,
            "avatar_url": user.avatar_url
        })
    
    return {"followers": follower_list}

@app.get("/users/{user_id}/following")
def get_user_following(user_id: int, db: Session = Depends(get_db)):
    """Get users that a user is following"""
    following = db.execute(
        select(Follow, User)
        .join(User, Follow.following_id == User.id)
        .where(Follow.follower_id == user_id)
        .order_by(User.username.asc())
    ).all()
    
    following_list = []
    for follow, user in following:
        following_list.append({
            "id": user.id,
            "username": user.username,
            "avatar_url": user.avatar_url
        })
    
    return {"following": following_list}

@app.get("/users/{user_id}/follow_stats")
def get_user_follow_stats(user_id: int, db: Session = Depends(get_db)):
    """Get follow statistics for a user"""
    # Count followers
    followers_count = db.execute(
        select(func.count(Follow.follower_id))
        .where(Follow.following_id == user_id)
    ).scalar()
    
    # Count following
    following_count = db.execute(
        select(func.count(Follow.following_id))
        .where(Follow.follower_id == user_id)
    ).scalar()
    
    return {
        "followers_count": followers_count or 0,
        "following_count": following_count or 0
    }

@app.get("/users/{user_id}/is_following")
def check_is_following(
    user_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Check if current user is following the specified user"""
    username = verify_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get current user
    current_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not current_user:
        raise HTTPException(status_code=404, detail="Current user not found")
    
    # Check if following
    follow_record = db.execute(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.following_id == user_id
        )
    ).scalar_one_or_none()
    
    return {"is_following": follow_record is not None}


# =================== MESSAGING ENDPOINTS ===================

@app.post("/send-message", response_model=MessageSchema)
def send_message(
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    """Send a message to another user"""
    # Get current user from token
    username = verify_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    current_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if receiver exists
    receiver = db.execute(select(User).where(User.id == message_data.receiver_id)).scalar_one_or_none()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")
    
    # Can't send message to yourself
    if current_user.id == message_data.receiver_id:
        raise HTTPException(status_code=400, detail="Cannot send message to yourself")
    
    # Create new message
    new_message = Message(
        content=message_data.content,
        sender_id=current_user.id,
        receiver_id=message_data.receiver_id
    )
    
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    # Return message with user details
    message_with_users = db.execute(
        select(Message).where(Message.id == new_message.id)
    ).scalar_one()
    
    return message_with_users


@app.get("/conversations")
def get_conversations(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    """Get list of users the current user has conversations with"""
    # Get current user from token
    username = verify_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    current_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all users who have exchanged messages with current user
    # Using raw SQL for complex query
    conversations_query = """
    SELECT DISTINCT 
        u.id, u.username, u.avatar_url,
        m.content as last_message,
        m.created_at as last_message_time,
        m.sender_id as last_sender_id,
        COUNT(CASE WHEN m2.is_read = false AND m2.receiver_id = :current_user_id THEN 1 END) as unread_count
    FROM users u
    JOIN messages m ON (m.sender_id = u.id OR m.receiver_id = u.id)
    LEFT JOIN messages m2 ON (
        (m2.sender_id = u.id AND m2.receiver_id = :current_user_id) OR 
        (m2.sender_id = :current_user_id AND m2.receiver_id = u.id)
    )
    WHERE (m.sender_id = :current_user_id OR m.receiver_id = :current_user_id)
    AND u.id != :current_user_id
    AND m.id = (
        SELECT MAX(m3.id) 
        FROM messages m3 
        WHERE (m3.sender_id = u.id AND m3.receiver_id = :current_user_id) 
        OR (m3.sender_id = :current_user_id AND m3.receiver_id = u.id)
    )
    GROUP BY u.id, u.username, u.avatar_url, m.content, m.created_at, m.sender_id
    ORDER BY m.created_at DESC
    """
    
    result = db.execute(
        text(conversations_query),
        {"current_user_id": current_user.id}
    )
    
    conversations = []
    for row in result:
        conversations.append({
            "user": {
                "id": row.id,
                "username": row.username,
                "avatar_url": row.avatar_url
            },
            "last_message": row.last_message,
            "last_message_time": row.last_message_time,
            "last_sender_id": row.last_sender_id,
            "unread_count": row.unread_count or 0
        })
    
    return conversations


@app.get("/messages/{user_id}")
def get_messages_with_user(
    user_id: int,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    """Get messages between current user and specified user"""
    # Get current user from token
    username = verify_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    current_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if other user exists
    other_user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get messages between the two users
    messages = db.execute(
        select(Message)
        .where(
            ((Message.sender_id == current_user.id) & (Message.receiver_id == user_id)) |
            ((Message.sender_id == user_id) & (Message.receiver_id == current_user.id))
        )
        .order_by(Message.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).scalars().all()
    
    # Mark received messages as read
    db.execute(
        text("""
        UPDATE messages 
        SET is_read = true 
        WHERE sender_id = :sender_id 
        AND receiver_id = :receiver_id 
        AND is_read = false
        """),
        {"sender_id": user_id, "receiver_id": current_user.id}
    )
    db.commit()
    
    # Reverse to show oldest first
    messages = list(reversed(messages))
    
    return {
        "messages": messages,
        "other_user": {
            "id": other_user.id,
            "username": other_user.username,
            "avatar_url": other_user.avatar_url
        }
    }


@app.put("/messages/{message_id}/read")
def mark_message_as_read(
    message_id: int,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    """Mark a specific message as read"""
    # Get current user from token
    username = verify_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    current_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get message
    message = db.execute(select(Message).where(Message.id == message_id)).scalar_one_or_none()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Only receiver can mark message as read
    if message.receiver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only mark received messages as read")
    
    message.is_read = True
    db.commit()
    
    return {"success": True, "message": "Message marked as read"}


@app.get("/unread-messages-count")
def get_unread_messages_count(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    """Get total count of unread messages for current user"""
    # Get current user from token
    username = verify_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    current_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Count unread messages
    unread_count = db.execute(
        select(func.count(Message.id))
        .where(Message.receiver_id == current_user.id)
        .where(Message.is_read == False)
    ).scalar()
    
    return {"unread_count": unread_count}


# ei part extra
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from database import SessionLocal
from models import PortfolioItem, User

@app.get("/portfolio/{artwork_id}")
def get_artwork_by_id(artwork_id: int):
    db = SessionLocal()
    artwork = db.query(PortfolioItem).filter(PortfolioItem.id == artwork_id).first()
    if not artwork:
        raise HTTPException(status_code=404, detail="Artwork not found")

    user = db.query(User).filter(User.id == artwork.artist_id).first()

    return {
        "artwork": {
            "id": artwork.id,
            "title": artwork.title,
            "description": artwork.description,
            "image_url": artwork.image_url,
            "created_at": artwork.created_at,
            "user": {
                "id": user.id,
                "username": user.username,
                "bio": user.bio,
                "avatar_url": user.avatar_url
            } if user else None
        }
    }


# Notification endpoints
@app.get("/notifications", response_model=List[NotificationSchema])
def get_notifications(
    limit: int = 50,
    offset: int = 0,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Get notifications for the current user"""
    username = verify_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get current user
    current_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not current_user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Get notifications using the service
    notification_service = NotificationService(db)
    notifications = notification_service.get_user_notifications(
        user_id=current_user.id,
        limit=limit,
        offset=offset
    )
    
    return notifications

@app.get("/notifications/with-details")
def get_notifications_with_details(
    limit: int = 50,
    offset: int = 0,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Get notifications with user details for the current user"""
    username = verify_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get current user
    current_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not current_user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Get notifications with details using the service
    notification_service = NotificationService(db)
    notifications = notification_service.get_user_notifications_with_details(
        user_id=current_user.id,
        limit=limit,
        offset=offset
    )
    
    return {"notifications": notifications}

@app.post("/notifications/{notification_id}/mark-read")
def mark_notification_read(
    notification_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Mark a notification as read"""
    username = verify_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get current user
    current_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not current_user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Mark notification as read
    notification_service = NotificationService(db)
    success = notification_service.mark_notification_as_read(
        notification_id=notification_id,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"success": True, "message": "Notification marked as read"}

@app.post("/notifications/mark-all-read")
def mark_all_notifications_read(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for the current user"""
    username = verify_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get current user
    current_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not current_user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Mark all notifications as read
    notification_service = NotificationService(db)
    count = notification_service.mark_all_notifications_as_read(current_user.id)
    
    return {"success": True, "message": f"Marked {count} notifications as read"}

@app.get("/notifications/unread-count")
def get_unread_notification_count(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Get count of unread notifications for the current user"""
    username = verify_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get current user
    current_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not current_user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Get unread count
    notification_service = NotificationService(db)
    unread_count = notification_service.get_unread_count(current_user.id)
    
    return {"unread_count": unread_count}


# Comment API Endpoints
@app.post("/comments")
def create_comment_endpoint(
    comment: CommentCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Create a new comment and automatically trigger notifications
    """
    # Get current user from token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        current_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
        
        if not current_user:
            raise HTTPException(status_code=401, detail="User not found")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Verify the post exists
    post = db.query(Post).filter(Post.id == comment.post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    try:
        # Create comment with automatic notification
        created_comment = create_comment_with_notification(
            db=db,
            post_id=comment.post_id,
            author_id=current_user.id,
            content=comment.content
        )
        
        # Get comment with additional info
        comment_data = get_comment_with_notifications(db, created_comment.id)
        
        return comment_data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating comment: {str(e)}"
        )

@app.get("/posts/{post_id}/comments")
def get_post_comments_endpoint(
    post_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all comments for a specific post
    """
    # Verify post exists
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    # Get all comments for the post
    comments = db.query(Comment).filter(Comment.post_id == post_id).order_by(Comment.created_at.asc()).all()
    
    result = []
    for comment in comments:
        comment_data = get_comment_with_notifications(db, comment.id)
        if comment_data:
            result.append(comment_data)
    
    return result

@app.put("/comments/{comment_id}")
def update_comment(
    comment_id: int,
    comment_update: CommentUpdate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Update a comment (only by the comment author)"""
    # Get current user from token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        current_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
        
        if not current_user:
            raise HTTPException(status_code=401, detail="User not found")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get the comment
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Check if current user is the author of the comment
    if comment.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own comments")
    
    # Update the comment
    comment.content = comment_update.content
    db.commit()
    db.refresh(comment)
    
    # Return updated comment data
    return {
        "id": comment.id,
        "content": comment.content,
        "created_at": comment.created_at,
        "post_id": comment.post_id,
        "author_id": comment.author_id,
        "author": {
            "id": comment.author.id,
            "username": comment.author.username,
            "avatar_url": comment.author.avatar_url
        }
    }

@app.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Delete a comment (only by the comment author)"""
    # Get current user from token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        current_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
        
        if not current_user:
            raise HTTPException(status_code=401, detail="User not found")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get the comment
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Check if current user is the author of the comment
    if comment.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own comments")
    
    # Delete the comment
    db.delete(comment)
    db.commit()
    
    return {"message": "Comment deleted successfully"}

@app.post("/notifications/{notification_id}/read")
def mark_notification_read_endpoint(
    notification_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Mark a specific notification as read
    """
    # Get current user from token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        current_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
        
        if not current_user:
            raise HTTPException(status_code=401, detail="User not found")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    notification_service = NotificationService(db)
    success = notification_service.mark_notification_as_read(notification_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return {"message": "Notification marked as read"}

@app.post("/notifications/read-all")
def mark_all_notifications_read_endpoint(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Mark all notifications as read for the current user
    """
    # Get current user from token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        current_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
        
        if not current_user:
            raise HTTPException(status_code=401, detail="User not found")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    notification_service = NotificationService(db)
    count = notification_service.mark_all_notifications_as_read(current_user.id)
    
    return {"message": f"Marked {count} notifications as read"}


# Review endpoints
@app.post("/users/{user_id}/reviews")
def create_review(user_id: int, review_data: ReviewCreate, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    """Create a new review for a user"""
    # Get current user
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        current_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
        
        if not current_user:
            raise HTTPException(status_code=401, detail="User not found")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Check if user is trying to review themselves
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot review yourself")
    
    # Check if target user exists
    target_user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate rating is between 1-5
    if review_data.rating < 1 or review_data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    # Create review (no restriction on multiple reviews)
    review = Review(
        rating=review_data.rating,
        comment=review_data.comment,
        artist_id=user_id,
        reviewer_id=current_user.id
    )
    
    db.add(review)
    db.commit()
    db.refresh(review)
    
    return {"message": "Review created successfully", "review_id": review.id}

@app.get("/users/{user_id}/reviews")
def get_user_reviews(user_id: int, db: Session = Depends(get_db)):
    """Get all reviews for a user"""
    # Check if user exists
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get reviews with reviewer information
    reviews = db.execute(
        select(Review, User).join(User, Review.reviewer_id == User.id).where(Review.artist_id == user_id).order_by(Review.created_at.desc())
    ).all()
    
    review_list = []
    for review, reviewer in reviews:
        review_list.append({
            "id": review.id,
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at,
            "reviewer": {
                "id": reviewer.id,
                "username": reviewer.username,
                "avatar_url": reviewer.avatar_url
            }
        })
    
    return {"reviews": review_list}

@app.get("/users/{user_id}/reviews/stats")
def get_user_review_stats(user_id: int, db: Session = Depends(get_db)):
    """Get review statistics for a user"""
    # Check if user exists
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get review statistics
    reviews = db.execute(select(Review).where(Review.artist_id == user_id)).scalars().all()
    
    if not reviews:
        return {
            "total_reviews": 0,
            "average_rating": 0,
            "rating_distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        }
    
    total_reviews = len(reviews)
    average_rating = sum(review.rating for review in reviews) / total_reviews
    
    rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for review in reviews:
        rating_distribution[review.rating] += 1
    
    return {
        "total_reviews": total_reviews,
        "average_rating": round(average_rating, 1),
        "rating_distribution": rating_distribution
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
