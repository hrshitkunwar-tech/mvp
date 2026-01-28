import { useState, useEffect } from 'react';
import './GuidancePopup.css';

interface GuidanceStep {
    stepNumber: number;
    totalSteps: number;
    instruction: string;
    reassurance?: string;
}

interface GuidancePopupProps {
    isActive: boolean;
    currentStep: GuidanceStep | null;
    onStepComplete?: () => void;
}

function GuidancePopup({ isActive, currentStep, onStepComplete }: GuidancePopupProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isActive && currentStep) {
            // Fade in with upward settle animation
            setTimeout(() => setIsVisible(true), 10);
        } else {
            setIsVisible(false);
        }
    }, [isActive, currentStep]);

    if (!isActive || !currentStep) {
        return null;
    }

    return (
        <div
            className={`guidance-popup ${isVisible ? 'guidance-popup--visible' : ''}`}
            role="complementary"
            aria-live="polite"
            aria-label="Step-by-step guidance"
        >
            <div className="guidance-popup__content">
                {/* Step Indicator */}
                <div className="guidance-popup__step-indicator">
                    Step {currentStep.stepNumber} of {currentStep.totalSteps}
                </div>

                {/* Primary Instruction */}
                <div className="guidance-popup__instruction">
                    {currentStep.instruction}
                </div>

                {/* Optional Reassurance */}
                {currentStep.reassurance && (
                    <div className="guidance-popup__reassurance">
                        {currentStep.reassurance}
                    </div>
                )}
            </div>
        </div>
    );
}

export default GuidancePopup;
