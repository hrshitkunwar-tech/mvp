import { useState } from 'react';
import GuidancePopup from './GuidancePopup';
import './GuidanceDemo.css';

// Example workflow steps
const exampleWorkflow = [
    {
        stepNumber: 1,
        totalSteps: 4,
        instruction: 'Click "New Repository" in the top-right corner.',
        reassurance: 'This will open the repository creation form.'
    },
    {
        stepNumber: 2,
        totalSteps: 4,
        instruction: 'Enter a name for your repository in the text field.',
    },
    {
        stepNumber: 3,
        totalSteps: 4,
        instruction: 'Select "Public" or "Private" visibility.',
        reassurance: 'You can change this later in settings.'
    },
    {
        stepNumber: 4,
        totalSteps: 4,
        instruction: 'Click "Create repository" at the bottom.',
    }
];

function GuidanceDemo() {
    const [isActive, setIsActive] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    const handleStartWorkflow = () => {
        setIsActive(true);
        setCurrentStepIndex(0);
    };

    const handleNextStep = () => {
        if (currentStepIndex < exampleWorkflow.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        } else {
            // Workflow complete
            setIsActive(false);
            setCurrentStepIndex(0);
        }
    };

    const handleStopWorkflow = () => {
        setIsActive(false);
        setCurrentStepIndex(0);
    };

    return (
        <div className="guidance-demo">
            <div className="guidance-demo__content">
                <h2>Navigator Guidance System</h2>
                <p className="guidance-demo__description">
                    In-product, step-by-step guidance that appears as a calm, minimal pop-up
                    in the top-right corner.
                </p>

                <div className="guidance-demo__controls">
                    {!isActive ? (
                        <button
                            className="guidance-demo__button guidance-demo__button--primary"
                            onClick={handleStartWorkflow}
                        >
                            Start Workflow Demo
                        </button>
                    ) : (
                        <div className="guidance-demo__active-controls">
                            <button
                                className="guidance-demo__button guidance-demo__button--secondary"
                                onClick={handleNextStep}
                            >
                                {currentStepIndex < exampleWorkflow.length - 1
                                    ? 'Complete Step & Continue'
                                    : 'Complete Workflow'}
                            </button>
                            <button
                                className="guidance-demo__button guidance-demo__button--text"
                                onClick={handleStopWorkflow}
                            >
                                Stop Workflow
                            </button>
                        </div>
                    )}
                </div>

                <div className="guidance-demo__info">
                    <h3>Design Specifications</h3>
                    <ul>
                        <li>✓ Fixed position: top-right corner (16px offset)</li>
                        <li>✓ Glass effect with backdrop blur</li>
                        <li>✓ Calm, minimal typography (12px/14px)</li>
                        <li>✓ Fade in + 4px upward settle animation (~180ms)</li>
                        <li>✓ One step at a time, numbered and finite</li>
                        <li>✓ No buttons, no chat UI, no free-form text</li>
                        <li>✓ Never blocks primary UI interactions</li>
                        <li>✓ Accent color (#4C6FFF) only for active states</li>
                    </ul>
                </div>

                <div className="guidance-demo__example">
                    <h3>Example Output</h3>
                    <div className="guidance-demo__example-box">
                        <div className="guidance-demo__example-step">Step 2 of 4</div>
                        <div className="guidance-demo__example-instruction">
                            Click "Enable APIs" in the left sidebar.
                        </div>
                    </div>
                </div>
            </div>

            {/* The actual guidance pop-up */}
            <GuidancePopup
                isActive={isActive}
                currentStep={isActive ? exampleWorkflow[currentStepIndex] : null}
                onStepComplete={handleNextStep}
            />
        </div>
    );
}

export default GuidanceDemo;
