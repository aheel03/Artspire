from datetime import datetime
from models import Notification, NotificationType, User, Post, Comment
from sqlalchemy.orm import Session

class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def create_follow_notification(self, follower_id: int, following_id: int):
        follower = self.db.query(User).filter(User.id == follower_id).first()
        if not follower:
            raise ValueError("Follower user not found")
        message = f"{follower.username} started following you."
        notification = Notification(
            user_id=following_id,
            actor_id=follower_id,
            message=message,
            type=NotificationType.follow,
            created_at=datetime.utcnow(),
            is_read=False
        )
        self.db.add(notification)
        self.db.commit()
        return notification

    def create_comment_notification(self, commenter_id: int, post_id: int, comment_id: int):
        """Create a notification when someone comments on a post"""
        commenter = self.db.query(User).filter(User.id == commenter_id).first()
        post = self.db.query(Post).filter(Post.id == post_id).first()
        
        if not commenter or not post:
            raise ValueError("Commenter or post not found")
        
        # Don't notify if the commenter is the post author
        if post.author_id == commenter_id:
            return None
        
        message = f"{commenter.username} commented on your post."
        notification = Notification(
            user_id=post.author_id,
            actor_id=commenter_id,
            message=message,
            type=NotificationType.comment,
            created_at=datetime.utcnow(),
            is_read=False
        )
        self.db.add(notification)
        self.db.commit()
        return notification
        self.db.commit()
        return notification

    def create_reply_notification(self, replier_id: int, parent_comment_id: int, comment_id: int):
        """Create a notification when someone replies to a comment"""
        replier = self.db.query(User).filter(User.id == replier_id).first()
        parent_comment = self.db.query(Comment).filter(Comment.id == parent_comment_id).first()
        
        if not replier or not parent_comment:
            raise ValueError("Replier or parent comment not found")
        
        # Don't notify if replying to own comment
        if parent_comment.author_id == replier_id:
            return None
        
        message = f"{replier.username} replied to your comment."
        notification = Notification(
            user_id=parent_comment.author_id,
            actor_id=replier_id,
            message=message,
            type=NotificationType.comment,
            created_at=datetime.utcnow(),
            is_read=False
        )
        self.db.add(notification)
        self.db.commit()
        return notification

    def create_post_reaction_notification(self, reactor_id: int, post_id: int):
        reactor = self.db.query(User).filter(User.id == reactor_id).first()
        post = self.db.query(Post).filter(Post.id == post_id).first()
        if not reactor or not post:
            raise ValueError("Reactor or post not found")
        if post.author_id == reactor_id:
            return None  # Don't notify self
        message = f"{reactor.username} reacted to your post."
        notification = Notification(
            user_id=post.author_id,
            actor_id=reactor_id,
            message=message,
            type=NotificationType.post_reaction,
            created_at=datetime.utcnow(),
            is_read=False
        )
        self.db.add(notification)
        self.db.commit()
        return notification

    def get_user_notifications_with_details(self, user_id: int, limit=50, offset=0):
        notifications = (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        
        result = []
        for n in notifications:
            # Get actor username from the relationship
            actor_username = n.actor.username if n.actor else "Unknown"
            
            notification_data = {
                "id": n.id,
                "username": actor_username,
                "message": n.message,
                "timestamp": n.created_at.isoformat() + 'Z',
                "type": n.type.value,
                "is_read": n.is_read
            }
            
            result.append(notification_data)
        
        return result

    def get_user_notifications(self, user_id: int, limit=50, offset=0):
        """Get notifications for a user, returning Notification objects"""
        return (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def get_unread_count(self, user_id: int):
        return self.db.query(Notification).filter_by(user_id=user_id, is_read=False).count()

    def mark_notification_as_read(self, notification_id: int, user_id: int):
        notification = self.db.query(Notification).filter_by(id=notification_id, user_id=user_id).first()
        if notification:
            notification.is_read = True
            self.db.commit()
            return True
        return False

    def mark_all_notifications_as_read(self, user_id: int):
        count = self.db.query(Notification).filter_by(user_id=user_id, is_read=False).update({"is_read": True})
        self.db.commit()
        return count
