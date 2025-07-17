import React from 'react';
import BaseOnboardingScreen from './BaseOnboardingScreen.jsx';

/**
 * Onboarding screen explaining how to type Lithuanian diacritics
 */
const LithuanianDiacriticsScreen = ({ onNext, onSkip }) => {
  return (
    <BaseOnboardingScreen
      title="🇱🇹 Typing Lithuanian Characters"
      subtitle="Learn how to type special Lithuanian letters on your device"
      onNext={onNext}
      onSkip={onSkip}
      currentStep={4}
      totalSteps={5}
      nextButtonText="Got it!"
    >
      <div className="w-onboarding-diacritics-content">
        <div className="w-onboarding-intro-text">
          <p>Lithuanian uses special characters with diacritics (accent marks). Here's how to type them on different devices:</p>
        </div>

        <div className="w-onboarding-device-section">
          <h3 className="w-onboarding-section-title">📱 iOS (iPhone/iPad)</h3>
          <div className="w-onboarding-method">
            <div className="w-onboarding-method-steps">
              <div className="w-onboarding-step">
                <div className="w-onboarding-step-number">1</div>
                <div className="w-onboarding-step-content">
                  <strong>Add Lithuanian Keyboard:</strong> Go to Settings → General → Keyboard → Keyboards → Add New Keyboard → Lithuanian
                </div>
              </div>
              <div className="w-onboarding-step">
                <div className="w-onboarding-step-number">2</div>
                <div className="w-onboarding-step-content">
                  <strong>Switch Keyboards:</strong> Tap the globe icon 🌐 on your keyboard to switch to Lithuanian
                </div>
              </div>
              <div className="w-onboarding-step">
                <div className="w-onboarding-step-number">3</div>
                <div className="w-onboarding-step-content">
                  <strong>Type Special Characters:</strong> Long-press letters to see diacritic options (ą, č, ę, ė, į, š, ų, ū, ž)
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-onboarding-device-section">
          <h3 className="w-onboarding-section-title">🤖 Android</h3>
          <div className="w-onboarding-method">
            <div className="w-onboarding-method-steps">
              <div className="w-onboarding-step">
                <div className="w-onboarding-step-number">1</div>
                <div className="w-onboarding-step-content">
                  <strong>Add Lithuanian Keyboard:</strong> Settings → System → Languages & input → Virtual keyboard → Gboard → Languages → Add keyboard → Lithuanian
                </div>
              </div>
              <div className="w-onboarding-step">
                <div className="w-onboarding-step-number">2</div>
                <div className="w-onboarding-step-content">
                  <strong>Switch Languages:</strong> Tap the language key or swipe the spacebar to switch to Lithuanian
                </div>
              </div>
              <div className="w-onboarding-step">
                <div className="w-onboarding-step-number">3</div>
                <div className="w-onboarding-step-content">
                  <strong>Type Special Characters:</strong> Long-press letters to access diacritics, or use the dedicated keys
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-onboarding-device-section">
          <h3 className="w-onboarding-section-title">💻 Desktop (Windows/Mac/Linux)</h3>
          
          <div className="w-onboarding-method">
            <h4>Method 1: Add Lithuanian Keyboard Layout</h4>
            <div className="w-onboarding-method-steps">
              <div className="w-onboarding-step">
                <div className="w-onboarding-step-content">
                  <strong>Windows:</strong> Settings → Time & Language → Language → Add a language → Lithuanian
                </div>
              </div>
              <div className="w-onboarding-step">
                <div className="w-onboarding-step-content">
                  <strong>Mac:</strong> System Preferences → Keyboard → Input Sources → + → Lithuanian
                </div>
              </div>
              <div className="w-onboarding-step">
                <div className="w-onboarding-step-content">
                  <strong>Linux:</strong> Settings → Region & Language → + → Lithuanian
                </div>
              </div>
            </div>
          </div>

          <div className="w-onboarding-method">
            <h4>Method 2: Alt Codes (Windows)</h4>
            <div className="w-onboarding-alt-codes">
              <div className="w-onboarding-alt-code-grid">
                <div className="w-onboarding-alt-code-item">
                  <span className="w-onboarding-char">ą</span>
                  <span className="w-onboarding-code">Alt + 0261</span>
                </div>
                <div className="w-onboarding-alt-code-item">
                  <span className="w-onboarding-char">č</span>
                  <span className="w-onboarding-code">Alt + 0269</span>
                </div>
                <div className="w-onboarding-alt-code-item">
                  <span className="w-onboarding-char">ę</span>
                  <span className="w-onboarding-code">Alt + 0281</span>
                </div>
                <div className="w-onboarding-alt-code-item">
                  <span className="w-onboarding-char">ė</span>
                  <span className="w-onboarding-code">Alt + 0279</span>
                </div>
                <div className="w-onboarding-alt-code-item">
                  <span className="w-onboarding-char">į</span>
                  <span className="w-onboarding-code">Alt + 0303</span>
                </div>
                <div className="w-onboarding-alt-code-item">
                  <span className="w-onboarding-char">š</span>
                  <span className="w-onboarding-code">Alt + 0353</span>
                </div>
                <div className="w-onboarding-alt-code-item">
                  <span className="w-onboarding-char">ų</span>
                  <span className="w-onboarding-code">Alt + 0371</span>
                </div>
                <div className="w-onboarding-alt-code-item">
                  <span className="w-onboarding-char">ū</span>
                  <span className="w-onboarding-code">Alt + 0363</span>
                </div>
                <div className="w-onboarding-alt-code-item">
                  <span className="w-onboarding-char">ž</span>
                  <span className="w-onboarding-code">Alt + 0382</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-onboarding-method">
            <h4>Method 3: Option Key (Mac)</h4>
            <div className="w-onboarding-method-steps">
              <div className="w-onboarding-step">
                <div className="w-onboarding-step-content">
                  Hold <strong>Option</strong> and press the base letter, then type the letter again for most diacritics
                </div>
              </div>
              <div className="w-onboarding-step">
                <div className="w-onboarding-step-content">
                  Or use the Character Viewer: <strong>Control + Command + Space</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-onboarding-tip">
          <div className="w-onboarding-tip-icon">💡</div>
          <div className="w-onboarding-tip-text">
            <strong>Pro Tip:</strong> Learning to type diacritics correctly is part of mastering Lithuanian! Trakaido checks for proper diacritics in typing exercises, so take time to set up your keyboard properly. It will become second nature with practice.
          </div>
        </div>

        <div className="w-onboarding-character-reference">
          <h4>Lithuanian Special Characters Reference:</h4>
          <div className="w-onboarding-char-list">
            <span className="w-onboarding-char-example">Ą ą</span>
            <span className="w-onboarding-char-example">Č č</span>
            <span className="w-onboarding-char-example">Ę ę</span>
            <span className="w-onboarding-char-example">Ė ė</span>
            <span className="w-onboarding-char-example">Į į</span>
            <span className="w-onboarding-char-example">Š š</span>
            <span className="w-onboarding-char-example">Ų ų</span>
            <span className="w-onboarding-char-example">Ū ū</span>
            <span className="w-onboarding-char-example">Ž ž</span>
          </div>
        </div>
      </div>
    </BaseOnboardingScreen>
  );
};

export default LithuanianDiacriticsScreen;