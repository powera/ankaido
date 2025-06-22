import React from 'react';
import MultipleChoiceActivity from '../Activities/MultipleChoiceActivity';

const MultipleChoiceMode = ({
  wordListManager,
  wordListState,
  studyMode,
  audioEnabled,
  playAudio,
  handleHoverStart,
  handleHoverEnd,
  handleMultipleChoiceAnswer,
  quizMode = "multiple-choice"
}) => {
  return (
    <MultipleChoiceActivity
      wordListManager={wordListManager}
      wordListState={wordListState}
      studyMode={studyMode}
      audioEnabled={audioEnabled}
      playAudio={playAudio}
      handleHoverStart={handleHoverStart}
      handleHoverEnd={handleHoverEnd}
      onAnswer={handleMultipleChoiceAnswer}
      quizMode={quizMode}
    />
  );
};

export default MultipleChoiceMode;