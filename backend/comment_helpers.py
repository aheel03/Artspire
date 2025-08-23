"""
Comment notification helper functions

These functions handle the automatic creation of notifications
when comments are posted.
"""

from notification_service import NotificationService
from models import Comment, Post, User
from sqlalchemy.orm import Session

def create_comment_with_notification(
    db: Session,
    post_id: int,
    author_id: int,
    content: str
):
    """
    Create a comment and automatically trigger a notification
    
    Args:
        db: Database session
        post_id: ID of the post being commented on
        author_id: ID of the user creating the comment
        content: Comment content
    
    Returns:
        Comment: The created comment object
    """
    # Create the comment
    comment = Comment(
        content=content,
        post_id=post_id,
        author_id=author_id
    )
    
    db.add(comment)
    db.commit()
    db.refresh(comment)
    
    # Create notification
    notification_service = NotificationService(db)
    
    try:
        # Create notification for the post author
        notification_service.create_comment_notification(
            commenter_id=author_id,
            post_id=post_id,
            comment_id=comment.id
        )
    
    except Exception as e:
        print(f"Error creating notification: {e}")
        # Don't fail the comment creation if notification fails
        pass
    
    return comment

def get_comment_with_notifications(db: Session, comment_id: int):
    """
    Get a comment with its related notification information
    
    Args:
        db: Database session
        comment_id: ID of the comment
    
    Returns:
        dict: Comment data with notification info
    """
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        return None
    
    # Get the post and author information
    post = db.query(Post).filter(Post.id == comment.post_id).first()
    author = db.query(User).filter(User.id == comment.author_id).first()
    
    return {
        "id": comment.id,
        "content": comment.content,
        "created_at": comment.created_at,
        "post_id": comment.post_id,
        "author_id": comment.author_id,
        "author_username": author.username if author else None,
        "post_title": post.content[:50] + "..." if post and len(post.content) > 50 else post.content if post else None
    }
