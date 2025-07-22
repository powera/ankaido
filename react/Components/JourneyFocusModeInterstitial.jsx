import { JOURNEY_FOCUS_PROBABILITIES } from '../Utilities/activitySelection';

const JourneyFocusModeInterstitial = ({ focusMode, onContinue, onReturnToNormal }) => {
  const getModeInfo = () => {
    const normalProbs = JOURNEY_FOCUS_PROBABILITIES.normal;
    const focusProbs = JOURNEY_FOCUS_PROBABILITIES[focusMode];
    
    if (!focusProbs) return null;
    
    switch (focusMode) {
      case 'new-words':
        return {
          title: '🌱 New Words Focus Mode',
          description: 'Focus on learning new vocabulary',
          features: [
            `Increased new word introduction rate (${focusProbs.newWordIntroduction}% vs ${normalProbs.newWordIntroduction}%)`,
            'Reduced weight for well-known words',
          ],
          tip: 'Perfect for expanding your vocabulary quickly!'
        };
      case 'review-words':
        return {
          title: '📚 Review Words Focus Mode',
          description: 'Focus on reinforcing learned vocabulary',
          features: [
            `No new word introductions (${focusProbs.newWordIntroduction}% vs ${normalProbs.newWordIntroduction}%)`,
            'Only words with 3+ correct answers',
          ],
          tip: 'Great for strengthening your existing knowledge!'
        };
      default:
        return null;
    }
  };

  const modeInfo = getModeInfo();
  
  if (!modeInfo) return null;

  return (
    <div className="w-card">
      <div className="w-text-center w-mb-large">
        <div className="w-question w-mb-large" style={{ fontSize: '2rem', margin: 'var(--spacing-large) 0' }}>
          {modeInfo.title}
        </div>
        <div style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', margin: 'var(--spacing-base) 0' }}>
          {modeInfo.description}
        </div>
        <div style={{ 
          fontSize: '1rem', 
          color: 'var(--color-text)', 
          margin: 'var(--spacing-large) 0',
          padding: 'var(--spacing-base)',
          backgroundColor: 'var(--color-background-light)',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--color-border-light)',
          textAlign: 'left'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: 'var(--spacing-small)' }}>
            What's different:
          </div>
          <ul style={{ margin: 0, paddingLeft: 'var(--spacing-base)' }}>
            {modeInfo.features.map((feature, index) => (
              <li key={index} style={{ marginBottom: 'var(--spacing-small)' }}>
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <div style={{ 
          fontSize: '1rem', 
          color: 'var(--color-primary)', 
          margin: 'var(--spacing-base) 0',
          fontStyle: 'italic'
        }}>
          {modeInfo.tip}
        </div>
        <div style={{ 
          display: 'flex', 
          gap: 'var(--spacing-base)', 
          justifyContent: 'center',
          marginTop: 'var(--spacing-large)',
          flexWrap: 'wrap'
        }}>
          <button 
            className="w-button" 
            onClick={onContinue}
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Continue with {focusMode === 'new-words' ? 'New Words' : 'Review'} Mode →
          </button>
          <button 
            className="w-button" 
            onClick={onReturnToNormal}
          >
            Use Normal Mode Instead
          </button>
        </div>
      </div>
    </div>
  );
};

export default JourneyFocusModeInterstitial;