import React from 'react';
import BaseOnboardingScreen from './BaseOnboardingScreen.jsx';

/**
 * Onboarding screen explaining Journey Mode
 */
const JourneyModeScreen = ({ onNext, onSkip }) => {
  return (
    <BaseOnboardingScreen
      title="🗺️ What is Journey Mode?"
      subtitle="Your personalized learning adventure"
      onNext={onNext}
      onSkip={onSkip}
      currentStep={2}
      totalSteps={5}
      nextButtonText="Got it!"
    >
      <div className="w-onboarding-journey-content">
        <div className="w-onboarding-feature-highlight">
          <div className="w-onboarding-feature-icon">🎯</div>
          <div className="w-onboarding-feature-text">
            <h3>Smart Learning Path</h3>
            <p>Journey Mode creates a personalized learning experience that adapts to your progress and focuses on words you need to practice most.</p>
          </div>
        </div>

        <div className="w-onboarding-how-it-works">
          <h3 className="w-onboarding-section-title">How Journey Mode Works:</h3>
          
          <div className="w-onboarding-steps">
            <div className="w-onboarding-step">
              <div className="w-onboarding-step-number">1</div>
              <div className="w-onboarding-step-content">
                <strong>Intelligent Selection:</strong> The system chooses words based on your learning history, prioritizing new words and those you've struggled with.
              </div>
            </div>

            <div className="w-onboarding-step">
              <div className="w-onboarding-step-number">2</div>
              <div className="w-onboarding-step-content">
                <strong>Varied Activities:</strong> You'll encounter different types of questions (flashcards, multiple choice, typing, listening) to reinforce learning.
              </div>
            </div>

            <div className="w-onboarding-step">
              <div className="w-onboarding-step-number">3</div>
              <div className="w-onboarding-step-content">
                <strong>Progress Tracking:</strong> Your performance is tracked, and the system adjusts difficulty and repetition accordingly.
              </div>
            </div>

            <div className="w-onboarding-step">
              <div className="w-onboarding-step-number">4</div>
              <div className="w-onboarding-step-content">
                <strong>Motivational Breaks:</strong> Celebrate your progress with encouraging messages and achievement milestones.
              </div>
            </div>
          </div>
        </div>

        <div className="w-onboarding-tip">
          <div className="w-onboarding-tip-icon">💡</div>
          <div className="w-onboarding-tip-text">
            <strong>Pro Tip:</strong> Journey Mode is perfect for daily practice sessions. It ensures you're always working on the most effective content for your current level.
          </div>
        </div>

        <div className="w-onboarding-benefits">
          <h4>Why use Journey Mode?</h4>
          <ul className="w-onboarding-benefits-list">
            <li>✨ <strong>Personalized:</strong> Adapts to your learning style and pace</li>
            <li>🎯 <strong>Efficient:</strong> Focuses on what you need to learn most</li>
            <li>🏆 <strong>Motivating:</strong> Tracks progress and celebrates achievements</li>
            <li>🔄 <strong>Comprehensive:</strong> Uses multiple question types for better retention</li>
          </ul>
        </div>
      </div>
    </BaseOnboardingScreen>
  );
};

export default JourneyModeScreen;