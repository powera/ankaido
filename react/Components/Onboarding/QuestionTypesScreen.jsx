import React from 'react';
import BaseOnboardingScreen from './BaseOnboardingScreen.jsx';

/**
 * Onboarding screen explaining different question types
 */
const QuestionTypesScreen = ({ onNext, onSkip }) => {
  return (
    <BaseOnboardingScreen
      title="❓ Types of Questions"
      subtitle="Different ways to learn and practice"
      onNext={onNext}
      onSkip={onSkip}
      currentStep={3}
      totalSteps={4}
      nextButtonText="Show me more!"
    >
      <div className="w-onboarding-question-types">
        <p className="w-onboarding-intro-text">
          Trakaido uses various question types to help you learn Lithuanian effectively. Each type targets different aspects of language learning:
        </p>

        <div className="w-onboarding-question-grid">
          <div className="w-onboarding-question-type">
            <div className="w-onboarding-question-icon">🃏</div>
            <div className="w-onboarding-question-content">
              <h3>Flash Cards</h3>
              <p>Classic card-based learning. See a word in one language, recall it in another. Great for building vocabulary and quick recognition.</p>
              <div className="w-onboarding-question-example">
                <strong>Example:</strong> See "house" → Think "namas"
              </div>
            </div>
          </div>

          <div className="w-onboarding-question-type">
            <div className="w-onboarding-question-icon">✅</div>
            <div className="w-onboarding-question-content">
              <h3>Multiple Choice</h3>
              <p>Choose the correct answer from several options. Helps with recognition and eliminates guessing by providing context.</p>
              <div className="w-onboarding-question-example">
                <strong>Example:</strong> "house" = ? <br/>
                A) namas ✓ B) medis C) vanduo
              </div>
            </div>
          </div>

          <div className="w-onboarding-question-type">
            <div className="w-onboarding-question-icon">⌨️</div>
            <div className="w-onboarding-question-content">
              <h3>Typing Practice</h3>
              <p>Type the correct translation. Improves spelling, reinforces memory through active recall, and builds muscle memory.</p>
              <div className="w-onboarding-question-example">
                <strong>Example:</strong> "house" → Type: "namas"
              </div>
            </div>
          </div>

          <div className="w-onboarding-question-type">
            <div className="w-onboarding-question-icon">🎧</div>
            <div className="w-onboarding-question-content">
              <h3>Listening Mode</h3>
              <p>Hear the pronunciation and identify the word. Develops listening skills and helps with proper pronunciation.</p>
              <div className="w-onboarding-question-example">
                <strong>Example:</strong> 🔊 [na-mas] → "house"
              </div>
            </div>
          </div>
        </div>

        <div className="w-onboarding-learning-science">
          <h3 className="w-onboarding-section-title">🧠 The Science Behind It</h3>
          <div className="w-onboarding-science-points">
            <div className="w-onboarding-science-point">
              <strong>Spaced Repetition:</strong> Questions are timed to appear just as you're about to forget, maximizing retention.
            </div>
            <div className="w-onboarding-science-point">
              <strong>Active Recall:</strong> Typing and speaking engage different parts of your brain than just recognition.
            </div>
            <div className="w-onboarding-science-point">
              <strong>Multi-Modal Learning:</strong> Visual, auditory, and kinesthetic learning styles are all engaged.
            </div>
          </div>
        </div>

        <div className="w-onboarding-tip">
          <div className="w-onboarding-tip-icon">🎯</div>
          <div className="w-onboarding-tip-text">
            <strong>Learning Tip:</strong> Journey Mode automatically mixes these question types to give you a well-rounded learning experience. You can also practice specific types in their dedicated modes.
          </div>
        </div>
      </div>
    </BaseOnboardingScreen>
  );
};

export default QuestionTypesScreen;