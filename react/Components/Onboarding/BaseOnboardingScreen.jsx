import React from 'react';

/**
 * Base component for onboarding screens
 * Provides consistent layout and styling for all onboarding steps
 */
const BaseOnboardingScreen = ({ 
  title, 
  subtitle, 
  children, 
  onNext, 
  onSkip,
  nextButtonText = "Continue",
  showSkip = true,
  showProgress = true,
  currentStep = 1,
  totalSteps = 4,
  className = ""
}) => {
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="w-container">
      <div className={`w-card w-welcome-card w-onboarding-card ${className}`}>
        {showProgress && (
          <div className="w-onboarding-progress">
            <div className="w-onboarding-progress-bar">
              <div 
                className="w-onboarding-progress-fill" 
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="w-onboarding-progress-text">
              Step {currentStep} of {totalSteps}
            </div>
          </div>
        )}

        <div className="w-welcome-header w-onboarding-header">
          <h1 className="w-welcome-title w-onboarding-title">
            {title}
          </h1>
          {subtitle && (
            <p className="w-welcome-subtitle w-onboarding-subtitle">
              {subtitle}
            </p>
          )}
        </div>

        <div className="w-onboarding-content">
          {children}
        </div>

        <div className="w-onboarding-actions">
          <div className="w-onboarding-actions-left">
            {showSkip && (
              <button
                onClick={onSkip}
                className="w-button w-button-secondary w-onboarding-skip"
              >
                Skip Tutorial
              </button>
            )}
          </div>
          
          <div className="w-onboarding-actions-right">
            <button
              onClick={onNext}
              className="w-button w-onboarding-next"
            >
              {nextButtonText} →
            </button>
          </div>
        </div>

        <div className="w-splash-footer">
          © 2025 Yevaud Platforms LLC. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default BaseOnboardingScreen;