import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Image, Calendar, Download } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import IntegrationStatus from './IntegrationStatus';
import './ScreenshotGallery.css';

function ScreenshotGallery() {
    const screenshots = useQuery(api.screenshots.getRecent, { limit: 12 });
    const count = useQuery(api.screenshots.getCount);

    if (screenshots === undefined) {
        return (
            <div className="screenshot-gallery">
                <div className="loading-state">
                    <div className="loading-spinner animate-spin"></div>
                    <p>Loading screenshots...</p>
                </div>
            </div>
        );
    }

    if (!screenshots || screenshots.length === 0) {
        return (
            <div className="screenshot-gallery">
                <div className="empty-state card glass">
                    <div className="empty-icon">
                        <Image size={64} />
                    </div>
                    <h3>No Screenshots Yet</h3>
                    <p className="text-secondary">
                        Use the VisionGuide Chrome extension to capture screenshots.
                    </p>
                    <div className="empty-stats">
                        <div className="stat-badge">
                            <span className="stat-label">Total Screenshots</span>
                            <span className="stat-value">{count || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="screenshot-gallery">
            <IntegrationStatus />

            <div className="gallery-header">
                <div className="header-content">
                    <h2>Screenshot Gallery</h2>
                    <p className="text-secondary">
                        Real-time screenshots from VisionGuide extension
                    </p>
                </div>
                <div className="header-stats">
                    <span className="badge badge-info">
                        <Image size={14} />
                        {count} total
                    </span>
                    <span className="badge badge-success">
                        <span className="live-dot animate-pulse"></span>
                        Live
                    </span>
                </div>
            </div>

            <div className="gallery-grid">
                {screenshots.map((screenshot) => (
                    <div key={screenshot._id} className="screenshot-card card glass-hover">
                        <div className="screenshot-image-container">
                            {screenshot.url ? (
                                <img
                                    src={screenshot.url}
                                    alt={`Screenshot from ${new Date(screenshot.timestamp).toLocaleString()}`}
                                    className="screenshot-image"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="screenshot-placeholder">
                                    <Image size={32} />
                                    <span>Loading...</span>
                                </div>
                            )}
                        </div>

                        <div className="screenshot-info">
                            <div className="screenshot-meta">
                                <Calendar size={14} />
                                <span className="screenshot-time">
                                    {formatDistanceToNow(screenshot.timestamp, { addSuffix: true })}
                                </span>
                            </div>

                            <div className="screenshot-actions">
                                {screenshot.url && (
                                    <>
                                        <a
                                            href={screenshot.url}
                                            download={`screenshot-${screenshot.timestamp}.png`}
                                            className="btn btn-sm btn-ghost"
                                            title="Download"
                                        >
                                            <Download size={14} />
                                        </a>
                                        <a
                                            href={screenshot.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-sm btn-ghost"
                                            title="View Full Size"
                                        >
                                            <Image size={14} />
                                        </a>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="screenshot-id">
                            <code>{screenshot._id}</code>
                        </div>
                    </div>
                ))}
            </div>

            {screenshots.length >= 12 && (
                <div className="gallery-footer">
                    <p className="text-secondary">
                        Showing {screenshots.length} most recent screenshots
                    </p>
                </div>
            )}
        </div>
    );
}

export default ScreenshotGallery;
