import React, { useState, useEffect } from 'react';
import onboardingFlowManager, { ONBOARDING_STEPS } from '../../Managers/onboardingFlowManager.js';
import WelcomeScreen from '../WelcomeScreen.jsx';
import JourneyModeScreen from './JourneyModeScreen.jsx';
import QuestionTypesScreen from './QuestionTypesScreen.jsx';
import OtherModesScreen from './OtherModesScreen.jsx';

/**
 * Main OnboardingFlow component that orchestrates the entire onboarding experience
 */
const OnboardingFlow = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(ONBOARDING_STEPS.WELCOME);
  const [isLoading, setIsLoading] = useState(true);
  const [welcomeData, setWelcomeData] = useState(null); // Store welcome screen data

  // Initialize onboarding flow manager
  useEffect(() => {
    const initializeFlow = async () => {
      await onboardingFlowManager.initialize();
      setCurrentStep(onboardingFlowManager.getCurrentStep());
      setIsLoading(false);

      // If already complete, immediately call onComplete
      if (onboardingFlowManager.isComplete()) {
        onComplete();
        return;
      }
    };

    initializeFlow();

    // Listen for flow changes
    const handleFlowChange = (flowState) => {
      console.log('OnboardingFlow: Flow state changed:', flowState);
      setCurrentStep(flowState.currentStep);
      
      if (flowState.isComplete) {
        console.log('OnboardingFlow: Onboarding complete, calling onComplete with:', welcomeData);
        // Pass the welcome data when onboarding is complete
        if (welcomeData) {
          onComplete(welcomeData.skillLevel, welcomeData.storageMode);
        } else {
          onComplete();
        }
      }
    };

    onboardingFlowManager.addListener(handleFlowChange);

    return () => {
      onboardingFlowManager.removeListener(handleFlowChange);
    };
  }, [onComplete, welcomeData]);

  // Handle welcome screen completion (includes skill level and storage selection)
  const handleWelcomeComplete = async (skillLevel, storageMode) => {
    console.log('OnboardingFlow: Welcome completed with', { skillLevel, storageMode });
    // Store the welcome data for later use
    setWelcomeData({ skillLevel, storageMode });
    
    // Advance to next onboarding step
    await onboardingFlowManager.advanceStep();
    console.log('OnboardingFlow: Advanced to next step, current step:', onboardingFlowManager.getCurrentStep());
  };

  // Handle advancing to next step
  const handleNext = async () => {
    await onboardingFlowManager.advanceStep();
  };

  // Handle skipping the tutorial
  const handleSkip = async () => {
    await onboardingFlowManager.completeOnboarding();
  };

  if (isLoading) {
    return (
      <div className="w-container">
        <div className="w-card w-welcome-card">
          <div className="w-welcome-loading">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  // Render the appropriate screen based on current step
  switch (currentStep) {
    case ONBOARDING_STEPS.WELCOME:
      return (
        <WelcomeScreen 
          onComplete={handleWelcomeComplete}
        />
      );

    case ONBOARDING_STEPS.JOURNEY_MODE:
      return (
        <JourneyModeScreen 
          onNext={handleNext}
          onSkip={handleSkip}
        />
      );

    case ONBOARDING_STEPS.QUESTION_TYPES:
      return (
        <QuestionTypesScreen 
          onNext={handleNext}
          onSkip={handleSkip}
        />
      );

    case ONBOARDING_STEPS.OTHER_MODES:
      return (
        <OtherModesScreen 
          onNext={handleNext}
          onSkip={handleSkip}
        />
      );

    case ONBOARDING_STEPS.COMPLETE:
    default:
      // This should not normally be reached since we call onComplete
      // when the flow is complete, but it's here as a fallback
      onComplete();
      return null;
  }
};

export default OnboardingFlow;