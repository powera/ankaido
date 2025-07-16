// Math Games Mode Strings
// These will eventually be replaced by API translations

export const mathGamesStrings = {
  // Mode title and navigation
  modeTitle: "Math Games",
  backToGames: "← Back to Games",
  
  // Game selection
  selectGame: "Select a Math Game",
  gameButtons: {
    rectangles: "How Many Rectangles?",
    temperature: "How Hot Is It?",
    // Placeholders for future games
    addition: "Addition Practice",
    subtraction: "Subtraction Practice",
    multiplication: "Times Tables",
    division: "Division Practice",
    fractions: "Fractions",
    geometry: "Shape Recognition",
    measurement: "Measurement",
    time: "Tell the Time",
    money: "Count Money",
    patterns: "Number Patterns"
  },
  
  // Rectangle counting game
  rectangles: {
    title: "How Many Rectangles?",
    question: "How many rectangles can you see?",
    instructions: "Count all the rectangles in the grid below:",
    feedback: {
      correct: "Correct! Well done!",
      incorrect: "Not quite right. Try again!",
      tryAgain: "Try Again"
    }
  },
  
  // Temperature game
  temperature: {
    title: "How Hot Is It?",
    question: "Is this temperature hot or cold?",
    instructions: "Look at the temperature and decide:",
    options: {
      hot: "Hot",
      cold: "Cold"
    },
    feedback: {
      correct: "Correct! Good job!",
      incorrect: "Not quite right. Try again!",
      tryAgain: "Try Again"
    }
  },
  
  // Common UI elements
  ui: {
    next: "Next →",
    previous: "← Previous",
    score: "Score",
    correct: "Correct",
    incorrect: "Incorrect",
    total: "Total",
    playAgain: "Play Again",
    newGame: "New Game"
  },
  
  // Number words for multiple choice (used in rectangle counting)
  numberWords: {
    0: "zero",
    1: "one", 
    2: "two",
    3: "three",
    4: "four",
    5: "five",
    6: "six",
    7: "seven",
    8: "eight",
    9: "nine",
    10: "ten",
    11: "eleven",
    12: "twelve",
    13: "thirteen",
    14: "fourteen",
    15: "fifteen",
    16: "sixteen",
    17: "seventeen",
    18: "eighteen",
    19: "nineteen",
    20: "twenty"
  }
};

export default mathGamesStrings;