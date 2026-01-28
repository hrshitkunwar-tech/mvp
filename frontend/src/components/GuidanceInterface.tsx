import { useState, useEffect } from 'react';
import {
    CheckCircle2,
    Circle,
    ArrowRight,
    Clock,
    Target,
    Lightbulb,
    AlertCircle,
    Sparkles,
    ChevronRight,
    Play,
    Pause
} from 'lucide-react';
import './GuidanceInterface.css';

// Mock data - will be replaced with Convex real-time data
interface Step {
    id: string;
    instruction: string;
    status: 'pending' | 'active' | 'completed' | 'failed';
    confidence?: number;
    element?: {
        label: string;
        type: string;
    };
}

interface Procedure {
    id: string;
    name: string;
    description: string;
    currentStep: number;
    totalSteps: number;
    steps: Step[];
    status: 'active' | 'paused' | 'completed';
}

const mockProcedure: Procedure = {
    id: 'proc_001',
    name: 'Create GitHub Repository',
    description: 'Step-by-step guide to create a new repository on GitHub',
    currentStep: 2,
    totalSteps: 5,
    status: 'active',
    steps: [
        {
            id: 'step_1',
            instruction: 'Click the "New" button in the top-right corner',
            status: 'completed',
            confidence: 0.95,
            element: { label: 'New', type: 'button' }
        },
        {
            id: 'step_2',
            instruction: 'Click "New repository" from the dropdown menu',
            status: 'active',
            confidence: 0.92,
            element: { label: 'New repository', type: 'menu-item' }
        },
        {
            id: 'step_3',
            instruction: 'Enter a repository name in the "Repository name" field',
            status: 'pending',
            element: { label: 'Repository name', type: 'input' }
        },
        {
            id: 'step_4',
            instruction: 'Select "Public" or "Private" visibility',
            status: 'pending',
            element: { label: 'Visibility', type: 'radio-group' }
        },
        {
            id: 'step_5',
            instruction: 'Click the "Create repository" button',
            status: 'pending',
            element: { label: 'Create repository', type: 'button' }
        }
    ]
};

function GuidanceInterface() {
    const [procedure, setProcedure] = useState<Procedure>(mockProcedure);
    const [showHints, setShowHints] = useState(true);

    // Simulate real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            // This will be replaced with Convex subscriptions
            console.log('Checking for updates...');
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    const getStepIcon = (status: Step['status']) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 size={20} className="step-icon-completed" />;
            case 'active':
                return <Circle size={20} className="step-icon-active animate-pulse" />;
            case 'failed':
                return <AlertCircle size={20} className="step-icon-failed" />;
            default:
                return <Circle size={20} className="step-icon-pending" />;
        }
    };

    const currentStep = procedure.steps[procedure.currentStep - 1];
    const progress = (procedure.currentStep / procedure.totalSteps) * 100;

    return (
        <div className="guidance-interface">
            <div className="guidance-grid">
                {/* Main Guidance Panel */}
                <div className="guidance-main">
                    {/* Current Step Card */}
                    <div className="current-step-card card glass">
                        <div className="step-header">
                            <div className="step-badge">
                                <Target size={16} />
                                <span>Step {procedure.currentStep} of {procedure.totalSteps}</span>
                            </div>
                            <div className="step-controls">
                                {procedure.status === 'active' ? (
                                    <button className="btn btn-sm btn-ghost" onClick={() => setProcedure({ ...procedure, status: 'paused' })}>
                                        <Pause size={14} />
                                        Pause
                                    </button>
                                ) : (
                                    <button className="btn btn-sm btn-primary" onClick={() => setProcedure({ ...procedure, status: 'active' })}>
                                        <Play size={14} />
                                        Resume
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="current-step-content">
                            <div className="step-icon-large">
                                <Sparkles size={32} />
                            </div>
                            <h2 className="step-instruction">{currentStep.instruction}</h2>

                            {currentStep.element && (
                                <div className="step-target">
                                    <div className="target-label">Target Element</div>
                                    <div className="target-info">
                                        <span className="target-type">{currentStep.element.type}</span>
                                        <ChevronRight size={14} className="text-tertiary" />
                                        <span className="target-name">"{currentStep.element.label}"</span>
                                    </div>
                                </div>
                            )}

                            {currentStep.confidence && (
                                <div className="confidence-indicator">
                                    <div className="confidence-label">Confidence</div>
                                    <div className="confidence-bar">
                                        <div
                                            className="confidence-fill"
                                            style={{ width: `${currentStep.confidence * 100}%` }}
                                        />
                                    </div>
                                    <div className="confidence-value">{(currentStep.confidence * 100).toFixed(0)}%</div>
                                </div>
                            )}
                        </div>

                        <div className="step-actions">
                            <button className="btn btn-lg btn-success" style={{ flex: 1 }}>
                                <CheckCircle2 size={18} />
                                Mark as Complete
                            </button>
                            <button className="btn btn-lg btn-secondary">
                                <AlertCircle size={18} />
                                Need Help
                            </button>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="progress-section card glass">
                        <div className="progress-header">
                            <h3 className="progress-title">{procedure.name}</h3>
                            <span className="progress-percentage">{Math.round(progress)}%</span>
                        </div>
                        <p className="progress-description">{procedure.description}</p>
                        <div className="progress-bar-container">
                            <div
                                className="progress-bar-fill"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="progress-stats">
                            <div className="stat">
                                <CheckCircle2 size={16} className="stat-icon" />
                                <span>{procedure.currentStep - 1} completed</span>
                            </div>
                            <div className="stat">
                                <Clock size={16} className="stat-icon" />
                                <span>{procedure.totalSteps - procedure.currentStep + 1} remaining</span>
                            </div>
                        </div>
                    </div>

                    {/* Hints Panel */}
                    {showHints && (
                        <div className="hints-panel card glass animate-fade-in">
                            <div className="hints-header">
                                <div className="hints-title">
                                    <Lightbulb size={18} />
                                    <h4>Helpful Tips</h4>
                                </div>
                                <button
                                    className="btn btn-sm btn-ghost"
                                    onClick={() => setShowHints(false)}
                                >
                                    Dismiss
                                </button>
                            </div>
                            <ul className="hints-list">
                                <li>Look for the highlighted element on your screen</li>
                                <li>The confidence score shows how certain we are about this step</li>
                                <li>You can pause guidance at any time and resume later</li>
                            </ul>
                        </div>
                    )}
                </div>

                {/* Steps Timeline */}
                <div className="steps-timeline">
                    <div className="timeline-card card glass">
                        <div className="timeline-header">
                            <h3>All Steps</h3>
                            <span className="badge badge-info">{procedure.totalSteps} steps</span>
                        </div>

                        <div className="timeline-steps">
                            {procedure.steps.map((step, index) => (
                                <div
                                    key={step.id}
                                    className={`timeline-step ${step.status}`}
                                >
                                    <div className="timeline-step-marker">
                                        {getStepIcon(step.status)}
                                        {index < procedure.steps.length - 1 && (
                                            <div className="timeline-connector" />
                                        )}
                                    </div>
                                    <div className="timeline-step-content">
                                        <div className="timeline-step-number">Step {index + 1}</div>
                                        <div className="timeline-step-instruction">{step.instruction}</div>
                                        {step.status === 'completed' && (
                                            <div className="timeline-step-badge badge badge-success">
                                                <CheckCircle2 size={12} />
                                                Completed
                                            </div>
                                        )}
                                        {step.status === 'active' && (
                                            <div className="timeline-step-badge badge badge-info">
                                                <ArrowRight size={12} />
                                                Current
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GuidanceInterface;
