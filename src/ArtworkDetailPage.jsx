import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ArtworkDetailPage.css'; // Create this CSS as needed

const ArtworkDetailPage = () => {
    const { id } = useParams();  // get artwork id from URL
    const [artwork, setArtwork] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
    const fetchArtwork = async () => {
        try {
        console.log(id);
        
        const response = await fetch(`http://localhost:8000/portfolio/${id}`);
        if (response.ok) {
            const data = await response.json();
            setArtwork(data.artwork);
        } else {
            setError('Artwork not found.');
        }
    } catch (err) {
        console.error(err);
        setError('Failed to fetch artwork.');
    } finally {
        setLoading(false);
    }
};

    fetchArtwork();
    }, [id]);

    const getImageUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('/')) return `http://localhost:8000${url}`;
        if (url.startsWith('http')) return url;
        return `http://localhost:8000/${url}`;
    };

    if (loading) return <div className="artwork-detail-page">Loading...</div>;
    if (error) return <div className="artwork-detail-page">{error}</div>;
    if (!artwork) return null;

    return (
        <div className="artwork-detail-page">
            <button className="back-button" onClick={() => navigate(-1)}>Back</button>
            <h1>{artwork.title}</h1>
            <img
                src={getImageUrl(artwork.image_url)}
                alt={artwork.title}
                className="artwork-detail-image"
            />

            <div>
                <p className="description-text">
                    <strong>Description:</strong> {artwork.description || "No description available."}
                </p>

                <div className="artist-info">
                    <h3>Artist</h3>
                    <p><strong>Name:</strong> {artwork.user?.username}</p>
                    <p><strong>Bio:</strong> {artwork.user?.bio || "No bio available."}</p>
                </div>
            </div>
        </div>
    );
};

export default ArtworkDetailPage;