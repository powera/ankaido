import React from 'react';
import BlitzActivity from '../Activities/BlitzActivity';
import { generateMultipleChoiceOptions } from '../Utilities/multipleChoiceGenerator';
import { activityStatsManager } from '../Managers/activityStatsManager';
import audioManager from '../Managers/audioManager';

const BlitzMode = ({ 
  wordListManager,
  wordListState,
  studyMode,
  setStudyMode,
  audioEnabled,
  autoAdvance,
  defaultDelay,
  blitzConfig, // { corpus, useSelectedGroupsOnly }
  corporaData,
  selectedGroups,
  onExitBlitz
}) => {
  // Blitz-specific state
  const [blitzWords, setBlitzWords] = React.useState([]); // Current 8 words being displayed
  const [targetWordIndex, setTargetWordIndex] = React.useState(0); // Which of the 8 words is the target
  const [multipleChoiceOptions, setMultipleChoiceOptions] = React.useState([]);
  const [showAnswer, setShowAnswer] = React.useState(false);
  const [selectedAnswer, setSelectedAnswer] = React.useState(null);
  const [questionsAnswered, setQuestionsAnswered] = React.useState(0);
  const [score, setScore] = React.useState(0);
  const [isGameComplete, setIsGameComplete] = React.useState(false);
  const [corpusWords, setCorpusWords] = React.useState([]); // All words from the same corpus
  const [usedWords, setUsedWords] = React.useState(new Set()); // Track used words
  
  const MAX_QUESTIONS = 25;

  // Initialize blitz game when blitz config changes
  React.useEffect(() => {
    if (blitzConfig && corporaData && corporaData[blitzConfig.corpus]) {
      initializeBlitzGame();
    }
  }, [blitzConfig, corporaData, selectedGroups]);

  // Reinitialize game when study mode changes
  React.useEffect(() => {
    if (blitzConfig && corporaData && corporaData[blitzConfig.corpus] && blitzWords.length > 0) {
      // Only reinitialize if we have an active game
      initializeBlitzGame();
    }
  }, [studyMode]);

  const initializeBlitzGame = () => {
    if (!blitzConfig || !corporaData[blitzConfig.corpus]) return;

    // Generate words directly from corporaData for the selected corpus
    let allWords = [];
    const corpusData = corporaData[blitzConfig.corpus];
    
    if (corpusData && corpusData.groups) {
      // Check if all groups are selected - if so, treat as "use all groups"
      const allGroupsCount = Object.keys(corpusData.groups).length;
      const selectedGroupsCount = selectedGroups && selectedGroups[blitzConfig.corpus] ? selectedGroups[blitzConfig.corpus].length : 0;
      const allGroupsSelected = selectedGroupsCount === allGroupsCount;
      
      if (blitzConfig.useSelectedGroupsOnly && selectedGroups && selectedGroups[blitzConfig.corpus] && !allGroupsSelected) {
        // Use only selected groups from Study Materials (when not all groups are selected)
        const selectedCorpusGroups = selectedGroups[blitzConfig.corpus];
        selectedCorpusGroups.forEach(groupName => {
          if (corpusData.groups[groupName]) {
            const wordsWithMetadata = corpusData.groups[groupName].map(word => ({
              ...word,
              corpus: blitzConfig.corpus,
              group: groupName
            }));
            allWords = allWords.concat(wordsWithMetadata);
          }
        });
      } else {
        // Use all groups from the selected corpus (original behavior or when all groups are selected)
        Object.entries(corpusData.groups).forEach(([groupName, groupWords]) => {
          const wordsWithMetadata = groupWords.map(word => ({
            ...word,
            corpus: blitzConfig.corpus,
            group: groupName
          }));
          allWords = allWords.concat(wordsWithMetadata);
        });
      }
    }

    if (allWords.length === 0) return;
    
    // Use all words from the selected corpus
    const sameCorpusWords = allWords;
    
    // Calculate max questions (up to 25, but not more than half the corpus)
    const maxPossibleQuestions = Math.min(MAX_QUESTIONS, Math.floor(sameCorpusWords.length / 2));
    
    if (sameCorpusWords.length < 8) {
      console.warn('Not enough words in corpus for Blitz mode (need at least 8)');
      return;
    }

    setCorpusWords(sameCorpusWords);
    
    // Shuffle and select initial 8 words
    const shuffledWords = [...sameCorpusWords].sort(() => Math.random() - 0.5);
    const initial8Words = shuffledWords.slice(0, 8);
    
    setBlitzWords(initial8Words);
    setTargetWordIndex(0); // First word is the target
    setUsedWords(new Set(initial8Words.map(word => word.id || `${word.english}-${word.lithuanian}`)));
    
    // Generate options from these 8 words
    generateOptionsFromBlitzWords(initial8Words, 0);
    
    // Reset game state
    setQuestionsAnswered(0);
    setScore(0);
    setIsGameComplete(false);
    setShowAnswer(false);
    setSelectedAnswer(null);
  };

  const generateOptionsFromBlitzWords = (words, targetIndex) => {
    const answerField = studyMode === 'english-to-lithuanian' ? 'lithuanian' : 'english';
    
    // Create options array where each word's answer is in the same position as the word
    const options = words.map(word => word[answerField]);
    setMultipleChoiceOptions(options);
  };

  const handleAnswerClick = React.useCallback(async (selectedOption, isCorrect) => {
    // Update local state
    setSelectedAnswer(selectedOption);
    setShowAnswer(true);

    // Play audio for correct answer in EN->LT mode
    if (isCorrect && audioEnabled && studyMode === 'english-to-lithuanian') {
      const currentTargetWord = blitzWords[targetWordIndex];
      if (currentTargetWord && currentTargetWord.lithuanian) {
        try {
          await audioManager.playAudio(currentTargetWord.lithuanian);
        } catch (error) {
          console.error('Error playing audio:', error);
        }
      }
    }

    // Update score and questions answered immediately
    const newQuestionsAnswered = questionsAnswered + 1;
    setQuestionsAnswered(newQuestionsAnswered);
    
    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    // Update session stats
    if (wordListManager && typeof isCorrect === 'boolean') {
      wordListManager.updateSessionStats(isCorrect);
    }

    // Update journey stats
    //const currentTargetWord = blitzWords[targetWordIndex];
    //if (currentTargetWord && typeof isCorrect === 'boolean') {
    //  try {
    //    await activityStatsManager.updateWordStats(currentTargetWord, 'blitz', isCorrect);
    //  } catch (error) {
    //    console.error('Error updating journey stats:', error);
    //  }
    //}

    // Check if game should end
    const maxQuestions = Math.min(MAX_QUESTIONS, Math.floor(corpusWords.length / 2));
    if (newQuestionsAnswered >= maxQuestions) {
      setTimeout(() => {
        setIsGameComplete(true);
      }, 1500);
      return;
    }

    // Auto-advance to next question after a short delay
    setTimeout(() => {
      nextQuestion();
    }, 1200); // 1.2 second delay to show the answer

  }, [blitzWords, targetWordIndex, wordListManager, questionsAnswered, corpusWords.length]);

  const nextQuestion = () => {
    // Replace the current target word with a new word from the corpus
    const availableWords = corpusWords.filter(word => 
      !usedWords.has(word.id || `${word.english}-${word.lithuanian}`)
    );

    if (availableWords.length === 0) {
      // No more words available, end game
      setIsGameComplete(true);
      return;
    }

    // Select a random available word
    const newWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    
    // Update the blitz words array by replacing the current target word
    const newBlitzWords = [...blitzWords];
    newBlitzWords[targetWordIndex] = newWord;
    
    // Add the new word to used words
    const newUsedWords = new Set(usedWords);
    newUsedWords.add(newWord.id || `${newWord.english}-${newWord.lithuanian}`);
    
    // Choose a new target word from the remaining 7 words (not the one we just added)
    const availableTargetIndices = Array.from({length: 8}, (_, i) => i).filter(i => i !== targetWordIndex);
    const newTargetIndex = availableTargetIndices[Math.floor(Math.random() * availableTargetIndices.length)];
    
    // Update state
    setBlitzWords(newBlitzWords);
    setUsedWords(newUsedWords);
    setTargetWordIndex(newTargetIndex);
    
    // Generate new options
    generateOptionsFromBlitzWords(newBlitzWords, newTargetIndex);
    
    // Reset answer state
    setShowAnswer(false);
    setSelectedAnswer(null);
  };

  const handleReset = () => {
    wordListManager.resetSessionStats();
    initializeBlitzGame();
  };

  const handlePlayAgain = () => {
    initializeBlitzGame();
  };

  // Don't render if we don't have blitz config or enough words
  if (!blitzConfig || !blitzWords.length || corpusWords.length < 20) {
    return (
      <div className="w-card">
        <div style={{ textAlign: 'center', padding: 'var(--spacing-large)' }}>
          <div className="w-question w-mb-large">⚡ Blitz Mode</div>
          <div>Not enough words available for Blitz mode. Need at least 20 words.</div>
          <div style={{ marginTop: 'var(--spacing-medium)', fontSize: '0.9em', color: '#666' }}>
            {blitzConfig?.useSelectedGroupsOnly ? (
              <>
                Currently using only selected groups from Study Materials ({corpusWords.length} words available).
                <br />
                Try selecting more groups in Study Materials or switch to "Use all groups" in Blitz setup.
              </>
            ) : (
              <>
                Current corpus has {corpusWords.length} words. This corpus needs more vocabulary to play Blitz mode.
              </>
            )}
          </div>
          <button 
            className="w-button"
            onClick={onExitBlitz}
            style={{ marginTop: 'var(--spacing-medium)' }}
          >
            ← Back to Mode Selection
          </button>
        </div>
      </div>
    );
  }

  const currentTargetWord = blitzWords[targetWordIndex];
  const maxQuestions = Math.min(MAX_QUESTIONS, Math.floor(corpusWords.length / 2));

  return (
    <>

      {isGameComplete ? (
        <div className="w-card">
          <div style={{ textAlign: 'center', padding: 'var(--spacing-large)' }}>
            <div className="w-question w-mb-large">⚡ Blitz Complete!</div>
            <div style={{ fontSize: '1.5em', marginBottom: 'var(--spacing-medium)' }}>
              Final Score: {score}/{questionsAnswered}
            </div>
            <div style={{ marginBottom: 'var(--spacing-large)', color: '#666' }}>
              {score === questionsAnswered ? '🎉 Perfect score!' : 
               score >= questionsAnswered * 0.8 ? '🌟 Great job!' :
               score >= questionsAnswered * 0.6 ? '👍 Good work!' : '💪 Keep practicing!'}
            </div>
            <button className="w-button" onClick={handlePlayAgain} style={{ marginRight: 'var(--spacing-small)' }}>
              🔄 Play Again
            </button>
            <button className="w-button" onClick={handleReset} style={{ marginRight: 'var(--spacing-small)' }}>
              📊 Reset Stats
            </button>
            <button className="w-button" onClick={onExitBlitz}>
              ← Back to Mode Selection
            </button>
          </div>
        </div>
      ) : (
        <BlitzActivity
          currentWord={currentTargetWord}
          studyMode={studyMode}
          onAnswerClick={handleAnswerClick}
          audioEnabled={audioEnabled}
          multipleChoiceOptions={multipleChoiceOptions}
          selectedAnswer={selectedAnswer}
          showAnswer={showAnswer}
          questionsAnswered={questionsAnswered}
          totalQuestions={maxQuestions}
          score={score}
          isGameComplete={isGameComplete}
          targetWordIndex={targetWordIndex}
          onExitBlitz={onExitBlitz}
        />
      )}
      
      {/* Stats display */}
      <div className="w-stats" style={{ marginTop: 'var(--spacing-medium)' }}>
        <div className="w-stat-item">
          <span className="w-stat-label">Session Correct:</span>
          <span className="w-stat-value">{wordListState.stats.correct}</span>
        </div>
        <div className="w-stat-item">
          <span className="w-stat-label">Session Incorrect:</span>
          <span className="w-stat-value">{wordListState.stats.incorrect}</span>
        </div>
        <div className="w-stat-item">
          <span className="w-stat-label">Session Total:</span>
          <span className="w-stat-value">{wordListState.stats.total}</span>
        </div>
      </div>
    </>
  );
};

export default BlitzMode;