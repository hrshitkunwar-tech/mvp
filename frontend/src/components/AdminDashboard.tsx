import { useState } from 'react';
import {
    Activity,
    CheckCircle2,
    XCircle,
    Clock,
    TrendingUp,
    Users,
    Zap,
    Eye,
    Brain,
    Wrench,
    AlertTriangle,
    BarChart3,
    Filter,
    Download
} from 'lucide-react';
import './AdminDashboard.css';

interface Execution {
    id: string;
    procedureName: string;
    sessionId: string;
    status: 'active' | 'completed' | 'failed';
    currentStep: number;
    totalSteps: number;
    startTime: Date;
    duration?: number;
}

interface AgentLog {
    id: string;
    agentType: 'intent' | 'procedure' | 'guidance' | 'recovery';
    timestamp: Date;
    input: string;
    output: string;
    latency: number;
}

interface SystemMetrics {
    activeExecutions: number;
    completedToday: number;
    successRate: number;
    avgLatency: number;
    totalSessions: number;
}

// Mock data
const mockMetrics: SystemMetrics = {
    activeExecutions: 3,
    completedToday: 47,
    successRate: 94.5,
    avgLatency: 2.3,
    totalSessions: 128
};

const mockExecutions: Execution[] = [
    {
        id: 'exec_001',
        procedureName: 'Create GitHub Repository',
        sessionId: 'session_abc123',
        status: 'active',
        currentStep: 3,
        totalSteps: 5,
        startTime: new Date(Date.now() - 120000),
        duration: 120
    },
    {
        id: 'exec_002',
        procedureName: 'Deploy to Vercel',
        sessionId: 'session_def456',
        status: 'completed',
        currentStep: 8,
        totalSteps: 8,
        startTime: new Date(Date.now() - 300000),
        duration: 245
    },
    {
        id: 'exec_003',
        procedureName: 'Setup CI/CD Pipeline',
        sessionId: 'session_ghi789',
        status: 'failed',
        currentStep: 4,
        totalSteps: 10,
        startTime: new Date(Date.now() - 180000),
        duration: 180
    }
];

const mockAgentLogs: AgentLog[] = [
    {
        id: 'log_001',
        agentType: 'intent',
        timestamp: new Date(Date.now() - 30000),
        input: 'User viewing GitHub dashboard',
        output: 'Intent: Create new repository',
        latency: 1.2
    },
    {
        id: 'log_002',
        agentType: 'guidance',
        timestamp: new Date(Date.now() - 25000),
        input: 'Step 2: Click New repository',
        output: 'Instruction: Click the "New repository" button',
        latency: 0.8
    },
    {
        id: 'log_003',
        agentType: 'procedure',
        timestamp: new Date(Date.now() - 20000),
        input: 'Intent: Create repository',
        output: 'Selected procedure: Create GitHub Repository',
        latency: 1.5
    }
];

function AdminDashboard() {
    const [executions] = useState<Execution[]>(mockExecutions);
    const [agentLogs] = useState<AgentLog[]>(mockAgentLogs);
    const [metrics] = useState<SystemMetrics>(mockMetrics);
    const [selectedTab, setSelectedTab] = useState<'executions' | 'agents' | 'tools'>('executions');

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getAgentIcon = (type: AgentLog['agentType']) => {
        switch (type) {
            case 'intent': return <Brain size={16} />;
            case 'procedure': return <Zap size={16} />;
            case 'guidance': return <Eye size={16} />;
            case 'recovery': return <Wrench size={16} />;
        }
    };

    const getStatusBadge = (status: Execution['status']) => {
        switch (status) {
            case 'active':
                return <span className="badge badge-info"><Activity size={12} /> Active</span>;
            case 'completed':
                return <span className="badge badge-success"><CheckCircle2 size={12} /> Completed</span>;
            case 'failed':
                return <span className="badge badge-error"><XCircle size={12} /> Failed</span>;
        }
    };

    return (
        <div className="admin-dashboard">
            {/* Metrics Overview */}
            <div className="metrics-grid">
                <div className="metric-card card glass">
                    <div className="metric-icon" style={{ background: 'var(--gradient-primary)' }}>
                        <Activity size={24} />
                    </div>
                    <div className="metric-content">
                        <div className="metric-label">Active Executions</div>
                        <div className="metric-value">{metrics.activeExecutions}</div>
                        <div className="metric-trend">
                            <TrendingUp size={14} />
                            <span>Live monitoring</span>
                        </div>
                    </div>
                </div>

                <div className="metric-card card glass">
                    <div className="metric-icon" style={{ background: 'var(--gradient-success)' }}>
                        <CheckCircle2 size={24} />
                    </div>
                    <div className="metric-content">
                        <div className="metric-label">Completed Today</div>
                        <div className="metric-value">{metrics.completedToday}</div>
                        <div className="metric-trend success">
                            <TrendingUp size={14} />
                            <span>+12% from yesterday</span>
                        </div>
                    </div>
                </div>

                <div className="metric-card card glass">
                    <div className="metric-icon" style={{ background: 'linear-gradient(135deg, hsl(38, 92%, 60%), hsl(45, 92%, 70%))' }}>
                        <BarChart3 size={24} />
                    </div>
                    <div className="metric-content">
                        <div className="metric-label">Success Rate</div>
                        <div className="metric-value">{metrics.successRate}%</div>
                        <div className="metric-trend success">
                            <TrendingUp size={14} />
                            <span>Above target</span>
                        </div>
                    </div>
                </div>

                <div className="metric-card card glass">
                    <div className="metric-icon" style={{ background: 'linear-gradient(135deg, hsl(200, 90%, 60%), hsl(210, 90%, 70%))' }}>
                        <Clock size={24} />
                    </div>
                    <div className="metric-content">
                        <div className="metric-label">Avg Latency</div>
                        <div className="metric-value">{metrics.avgLatency}s</div>
                        <div className="metric-trend">
                            <TrendingUp size={14} />
                            <span>Per guidance</span>
                        </div>
                    </div>
                </div>

                <div className="metric-card card glass">
                    <div className="metric-icon" style={{ background: 'linear-gradient(135deg, hsl(280, 85%, 65%), hsl(290, 85%, 75%))' }}>
                        <Users size={24} />
                    </div>
                    <div className="metric-content">
                        <div className="metric-label">Total Sessions</div>
                        <div className="metric-value">{metrics.totalSessions}</div>
                        <div className="metric-trend success">
                            <TrendingUp size={14} />
                            <span>+8 new today</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Tabs */}
            <div className="dashboard-tabs">
                <div className="tabs-header card glass">
                    <div className="tabs-nav">
                        <button
                            className={`tab-button ${selectedTab === 'executions' ? 'active' : ''}`}
                            onClick={() => setSelectedTab('executions')}
                        >
                            <Activity size={18} />
                            Executions
                        </button>
                        <button
                            className={`tab-button ${selectedTab === 'agents' ? 'active' : ''}`}
                            onClick={() => setSelectedTab('agents')}
                        >
                            <Brain size={18} />
                            Agent Logs
                        </button>
                        <button
                            className={`tab-button ${selectedTab === 'tools' ? 'active' : ''}`}
                            onClick={() => setSelectedTab('tools')}
                        >
                            <Wrench size={18} />
                            Tool Logs
                        </button>
                    </div>
                    <div className="tabs-actions">
                        <button className="btn btn-sm btn-ghost">
                            <Filter size={16} />
                            Filter
                        </button>
                        <button className="btn btn-sm btn-secondary">
                            <Download size={16} />
                            Export
                        </button>
                    </div>
                </div>

                {/* Executions Tab */}
                {selectedTab === 'executions' && (
                    <div className="tab-content animate-fade-in">
                        <div className="executions-table card glass">
                            <div className="table-header">
                                <h3>Recent Executions</h3>
                                <span className="badge badge-neutral">{executions.length} total</span>
                            </div>
                            <div className="table-content">
                                {executions.map((execution) => (
                                    <div key={execution.id} className="execution-row">
                                        <div className="execution-main">
                                            <div className="execution-info">
                                                <h4 className="execution-name">{execution.procedureName}</h4>
                                                <div className="execution-meta">
                                                    <span className="execution-session">
                                                        Session: <code>{execution.sessionId}</code>
                                                    </span>
                                                    <span className="execution-time">
                                                        <Clock size={14} />
                                                        {formatTime(execution.startTime)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="execution-status">
                                                {getStatusBadge(execution.status)}
                                            </div>
                                        </div>
                                        <div className="execution-progress">
                                            <div className="progress-info">
                                                <span className="progress-text">
                                                    Step {execution.currentStep} of {execution.totalSteps}
                                                </span>
                                                {execution.duration && (
                                                    <span className="progress-duration">
                                                        {formatDuration(execution.duration)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="progress-bar-container">
                                                <div
                                                    className="progress-bar-fill"
                                                    style={{ width: `${(execution.currentStep / execution.totalSteps) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Agent Logs Tab */}
                {selectedTab === 'agents' && (
                    <div className="tab-content animate-fade-in">
                        <div className="logs-container card glass">
                            <div className="table-header">
                                <h3>Agent Activity</h3>
                                <span className="badge badge-info">
                                    <Activity size={12} className="animate-pulse" />
                                    Live
                                </span>
                            </div>
                            <div className="logs-list">
                                {agentLogs.map((log) => (
                                    <div key={log.id} className="log-entry">
                                        <div className="log-header">
                                            <div className="log-agent">
                                                <div className="agent-icon">
                                                    {getAgentIcon(log.agentType)}
                                                </div>
                                                <span className="agent-type">{log.agentType} Agent</span>
                                            </div>
                                            <div className="log-meta">
                                                <span className="log-latency">
                                                    <Zap size={14} />
                                                    {log.latency}s
                                                </span>
                                                <span className="log-time">{formatTime(log.timestamp)}</span>
                                            </div>
                                        </div>
                                        <div className="log-content">
                                            <div className="log-section">
                                                <div className="log-label">Input</div>
                                                <div className="log-text">{log.input}</div>
                                            </div>
                                            <div className="log-arrow">→</div>
                                            <div className="log-section">
                                                <div className="log-label">Output</div>
                                                <div className="log-text">{log.output}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tool Logs Tab */}
                {selectedTab === 'tools' && (
                    <div className="tab-content animate-fade-in">
                        <div className="tools-placeholder card glass">
                            <div className="placeholder-icon">
                                <Wrench size={48} />
                            </div>
                            <h3>Tool Execution Logs</h3>
                            <p className="text-secondary">
                                Tool validation logs will appear here in real-time as procedures execute.
                            </p>
                            <div className="placeholder-stats">
                                <div className="stat-item">
                                    <CheckCircle2 size={20} className="stat-icon" />
                                    <div>
                                        <div className="stat-value">156</div>
                                        <div className="stat-label">Validations Today</div>
                                    </div>
                                </div>
                                <div className="stat-item">
                                    <AlertTriangle size={20} className="stat-icon" />
                                    <div>
                                        <div className="stat-value">3</div>
                                        <div className="stat-label">Failed Validations</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminDashboard;
