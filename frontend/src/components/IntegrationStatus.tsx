import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import './IntegrationStatus.css';

function IntegrationStatus() {
    const screenshots = useQuery(api.screenshots.getRecent, { limit: 1 });
    const count = useQuery(api.screenshots.getCount);

    const isConnected = screenshots !== undefined;
    const hasData = count !== undefined && count > 0;

    return (
        <div className="integration-status card glass">
            <h3>Integration Status</h3>

            <div className="status-list">
                <div className={`status-item ${isConnected ? 'success' : 'pending'}`}>
                    {isConnected ? (
                        <CheckCircle2 size={20} className="status-icon-success" />
                    ) : (
                        <AlertCircle size={20} className="status-icon-pending" />
                    )}
                    <div className="status-content">
                        <div className="status-label">Convex Connection</div>
                        <div className="status-value">
                            {isConnected ? 'Connected ✓' : 'Connecting...'}
                        </div>
                    </div>
                </div>

                <div className={`status-item ${hasData ? 'success' : 'warning'}`}>
                    {hasData ? (
                        <CheckCircle2 size={20} className="status-icon-success" />
                    ) : (
                        <XCircle size={20} className="status-icon-warning" />
                    )}
                    <div className="status-content">
                        <div className="status-label">Screenshot Data</div>
                        <div className="status-value">
                            {hasData ? `${count} screenshots` : 'No data yet'}
                        </div>
                    </div>
                </div>

                <div className="status-item info">
                    <AlertCircle size={20} className="status-icon-info" />
                    <div className="status-content">
                        <div className="status-label">Convex URL</div>
                        <div className="status-value">
                            <code>abundant-porpoise-181.convex.cloud</code>
                        </div>
                    </div>
                </div>
            </div>

            {hasData && (
                <div className="status-footer">
                    <p className="text-success">
                        ✓ Successfully connected to VisionGuide Convex database!
                    </p>
                </div>
            )}

            {!hasData && isConnected && (
                <div className="status-footer">
                    <p className="text-secondary">
                        Use the VisionGuide Chrome extension to capture your first screenshot.
                    </p>
                </div>
            )}
        </div>
    );
}

export default IntegrationStatus;
