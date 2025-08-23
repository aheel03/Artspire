// Frontend notification service
class NotificationService {
    constructor() {
        this.apiUrl = 'http://localhost:8000';
    }

    // Get auth token from localStorage
    getAuthToken() {
        // Try both token keys used in the application
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        console.log('Retrieved token:', token ? `${token.substring(0, 10)}...` : 'null');
        return token;
    }

    // Get headers with auth token
    getHeaders() {
        const token = this.getAuthToken();
        if (!token) {
            console.warn('No token found for request headers');
            return {
                'Content-Type': 'application/json'
            };
        }
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    // Get notifications for the current user
    async getNotifications(limit = 50, offset = 0) {
        try {
            const token = this.getAuthToken();
            if (!token) {
                console.warn('No authentication token found');
                return [];
            }

            const response = await fetch(
                `${this.apiUrl}/notifications/with-details?limit=${limit}&offset=${offset}`,
                {
                    method: 'GET',
                    headers: this.getHeaders()
                }
            );

            if (!response.ok) {
                console.error(`HTTP ${response.status}: ${response.statusText}`);
                const errorText = await response.text();
                console.error('Error response body:', errorText);
                if (response.status === 401) {
                    console.warn('Authentication failed - user may need to log in again');
                    // Clear invalid token
                    localStorage.removeItem('token');
                    localStorage.removeItem('access_token');
                    // Redirect to login or show login prompt
                    window.location.href = '/login';
                }
                throw new Error(`HTTP ${response.status}: Failed to fetch notifications`);
            }

            const data = await response.json();
            return data.notifications || [];
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }
    }

    // Get unread notification count
    async getUnreadCount() {
        try {
            const token = this.getAuthToken();
            if (!token) {
                console.warn('No authentication token found for unread count');
                return 0;
            }

            console.log('Making request to get unread count...');
            const response = await fetch(
                `${this.apiUrl}/notifications/unread-count`,
                {
                    method: 'GET',
                    headers: this.getHeaders()
                }
            );

            console.log('Unread count response status:', response.status);
            if (!response.ok) {
                console.error(`HTTP ${response.status}: ${response.statusText}`);
                const errorText = await response.text();
                console.error('Error response body:', errorText);
                if (response.status === 401) {
                    console.warn('Authentication failed - user may need to log in again');
                    // Clear invalid token
                    localStorage.removeItem('token');
                    localStorage.removeItem('access_token');
                }
                throw new Error(`HTTP ${response.status}: Failed to fetch unread count`);
            }

            const data = await response.json();
            console.log('Unread count data:', data);
            return data.unread_count || 0;
        } catch (error) {
            console.error('Error fetching unread count:', error);
            throw error;
        }
    }

    // Mark notification as read
    async markAsRead(notificationId) {
        try {
            const response = await fetch(
                `${this.apiUrl}/notifications/${notificationId}/mark-read`,
                {
                    method: 'POST',
                    headers: this.getHeaders()
                }
            );

            if (!response.ok) {
                throw new Error('Failed to mark notification as read');
            }

            return await response.json();
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return null;
        }
    }

    // Mark all notifications as read
    async markAllAsRead() {
        try {
            const response = await fetch(
                `${this.apiUrl}/notifications/mark-all-read`,
                {
                    method: 'POST',
                    headers: this.getHeaders()
                }
            );

            if (!response.ok) {
                throw new Error('Failed to mark all notifications as read');
            }

            return await response.json();
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            return null;
        }
    }

    // Process notification event (for testing)
    async processEvent(eventData) {
        try {
            const response = await fetch(
                `${this.apiUrl}/notifications/process-event`,
                {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify(eventData)
                }
            );

            if (!response.ok) {
                throw new Error('Failed to process notification event');
            }

            return await response.json();
        } catch (error) {
            console.error('Error processing notification event:', error);
            return null;
        }
    }
}

export default NotificationService;
