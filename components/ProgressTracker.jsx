'use client';

export default function ProgressTracker({ steps }) {
    return (
        <div className="progress-container">
            {steps.map((step, index) => (
                <div
                    key={index}
                    className={`progress-step ${step.status}`}
                >
                    <div className="progress-indicator">
                        {step.status === 'complete' ? '✓' :
                            step.status === 'active' ? '⟳' :
                                (index + 1)}
                    </div>
                    <div className="progress-text">
                        <div className="progress-title">{step.name}</div>
                        <div className="progress-status">
                            {step.status === 'complete' ? 'Completed' :
                                step.status === 'active' ? 'Processing...' :
                                    'Waiting'}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
