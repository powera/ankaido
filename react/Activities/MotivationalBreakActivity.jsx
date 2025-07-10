import React from 'react';

const MotivationalBreakActivity = ({ onContinue }) => {
  const motivationalMessages = [
    "Keep going, you're doing great! 🌟",
    "Your progress is impressive! 💪",
    "You're building amazing language skills! 🚀",
    "Every word you learn is a step forward! ✨",
    "Your dedication is paying off! 🎯",
    "You're becoming more fluent every day! 🌱",
    "Great job staying consistent! 👏",
    "Your Lithuanian journey is inspiring! 🏆",
    "Keep up the excellent work! 💫",
    "You're mastering this language! 🎉"
  ];

  const appUsageTips = [
    "Tip: Use the audio feature to improve your pronunciation!",
    "Tip: Try different study modes to challenge yourself!",
    "Tip: In typing mode, don't type the parentheticals like (f.), (body part), etc.",
    "Tip: Consistent daily practice is more effective than long sessions!",
    "Tip: Don't worry about mistakes - they're part of learning!",
    "Tip: The journey mode adapts to your learning progress!",
    "Tip: Take breaks when you need them - your brain needs time to process!"
  ];

  const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
  const randomTip = appUsageTips[Math.floor(Math.random() * appUsageTips.length)];

  return (
    <div className="w-card">
      <div className="w-text-center w-mb-large">
        <div className="w-question w-mb-large" style={{ fontSize: '2rem', margin: 'var(--spacing-large) 0' }}>
          {randomMessage}
        </div>
        <div style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', margin: 'var(--spacing-base) 0' }}>
          Take a moment to appreciate your progress!
        </div>
        <div style={{ 
          fontSize: '1rem', 
          color: 'var(--color-primary)', 
          margin: 'var(--spacing-large) 0',
          padding: 'var(--spacing-base)',
          backgroundColor: 'var(--color-background-light)',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--color-border-light)'
        }}>
          {randomTip}
        </div>
        <button 
          className="w-button" 
          onClick={onContinue} 
          style={{ marginTop: 'var(--spacing-large)' }}
        >
          Continue Journey →
        </button>
      </div>
    </div>
  );
};

export default MotivationalBreakActivity;