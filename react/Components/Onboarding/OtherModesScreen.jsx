import React from 'react';
import BaseOnboardingScreen from './BaseOnboardingScreen.jsx';

/**
 * Onboarding screen explaining other learning modes available
 */
const OtherModesScreen = ({ onNext, onSkip }) => {
  return (
    <BaseOnboardingScreen
      title="🎮 Other Learning Modes"
      subtitle="Specialized tools for focused practice"
      onNext={onNext}
      onSkip={onSkip}
      currentStep={4}
      totalSteps={4}
      nextButtonText="Start Learning!"
    >
      <div className="w-onboarding-other-modes">
        <p className="w-onboarding-intro-text">
          Beyond Journey Mode, Trakaido offers specialized modes for targeted learning and practice:
        </p>

        <div className="w-onboarding-modes-grid">
          <div className="w-onboarding-mode-category">
            <h3 className="w-onboarding-category-title">📚 Vocabulary Modes</h3>
            
            <div className="w-onboarding-mode">
              <div className="w-onboarding-mode-icon">📑</div>
              <div className="w-onboarding-mode-content">
                <h4>Vocabulary Lists</h4>
                <p>Browse and study organized word collections. Perfect for reviewing specific topics or preparing for tests.</p>
              </div>
            </div>

            <div className="w-onboarding-mode">
              <div className="w-onboarding-mode-icon">🎯</div>
              <div className="w-onboarding-mode-content">
                <h4>Drill Mode</h4>
                <p>Intensive practice sessions focused on specific word groups or difficulty levels. Great for targeted improvement.</p>
              </div>
            </div>

            <div className="w-onboarding-mode">
              <div className="w-onboarding-mode-icon">🔗</div>
              <div className="w-onboarding-mode-content">
                <h4>Multi-Word Sequences</h4>
                <p>Learn phrases and expressions that go together. Essential for natural-sounding Lithuanian.</p>
              </div>
            </div>
          </div>

          <div className="w-onboarding-mode-category">
            <h3 className="w-onboarding-category-title">📖 Grammar Modes</h3>
            
            <div className="w-onboarding-mode">
              <div className="w-onboarding-mode-icon">🔄</div>
              <div className="w-onboarding-mode-content">
                <h4>Conjugations</h4>
                <p>Practice verb forms and tenses. Master how verbs change based on person, number, and time.</p>
                <div className="w-onboarding-mode-example">
                  <em>eiti → einu, eini, eina...</em>
                </div>
              </div>
            </div>

            <div className="w-onboarding-mode">
              <div className="w-onboarding-mode-icon">📐</div>
              <div className="w-onboarding-mode-content">
                <h4>Declensions</h4>
                <p>Learn how nouns and adjectives change based on their role in the sentence (cases).</p>
                <div className="w-onboarding-mode-example">
                  <em>namas → namo, namui, namą...</em>
                </div>
              </div>
            </div>
          </div>

          <div className="w-onboarding-mode-category">
            <h3 className="w-onboarding-category-title">🎧 Focused Practice</h3>
            
            <div className="w-onboarding-mode">
              <div className="w-onboarding-mode-icon">🃏</div>
              <div className="w-onboarding-mode-content">
                <h4>Flash Card Mode</h4>
                <p>Classic flashcard practice with your selected vocabulary. Simple and effective for quick review sessions.</p>
              </div>
            </div>

            <div className="w-onboarding-mode">
              <div className="w-onboarding-mode-icon">✅</div>
              <div className="w-onboarding-mode-content">
                <h4>Multiple Choice Mode</h4>
                <p>Focus exclusively on multiple choice questions. Great for test preparation and confidence building.</p>
              </div>
            </div>

            <div className="w-onboarding-mode">
              <div className="w-onboarding-mode-icon">⌨️</div>
              <div className="w-onboarding-mode-content">
                <h4>Typing Mode</h4>
                <p>Dedicated typing practice to improve spelling and active recall. Build muscle memory for Lithuanian words.</p>
              </div>
            </div>

            <div className="w-onboarding-mode">
              <div className="w-onboarding-mode-icon">🎧</div>
              <div className="w-onboarding-mode-content">
                <h4>Listening Mode</h4>
                <p>Pure audio practice to develop your ear for Lithuanian pronunciation and improve listening comprehension.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-onboarding-recommendation">
          <div className="w-onboarding-recommendation-icon">🌟</div>
          <div className="w-onboarding-recommendation-content">
            <h3>Our Recommendation</h3>
            <p>
              <strong>Start with Journey Mode</strong> for your daily practice - it provides the most comprehensive and adaptive learning experience. 
              Use the other modes when you want to focus on specific skills or review particular topics.
            </p>
          </div>
        </div>

        <div className="w-onboarding-tip">
          <div className="w-onboarding-tip-icon">💡</div>
          <div className="w-onboarding-tip-text">
            <strong>Pro Tip:</strong> You can switch between modes anytime using the mode selector. Your progress is saved across all modes!
          </div>
        </div>
      </div>
    </BaseOnboardingScreen>
  );
};

export default OtherModesScreen;