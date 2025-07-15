/**
 * OnboardingFlow Manager
 * 
 * Manages the flow of onboarding screens for new users.
 * Handles progression through different instructional screens and tracks completion.
 */

import safeStorage from '../DataStorage/safeStorage';

export const ONBOARDING_STEPS = {
  WELCOME: 'welcome',
  JOURNEY_MODE: 'journey_mode',
  QUESTION_TYPES: 'question_types', 
  OTHER_MODES: 'other_modes',
  COMPLETE: 'complete'
};

class OnboardingFlowManager {
  constructor() {
    this.currentStep = ONBOARDING_STEPS.WELCOME;
    this.completedSteps = new Set();
    this.listeners = new Set();
    this.isInitialized = false;
  }

  /**
   * Initialize the onboarding flow manager
   * Loads any existing progress from storage
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Check if user has completed onboarding
      const hasCompletedOnboarding = safeStorage?.getItem('trakaido-onboarding-complete');
      
      if (hasCompletedOnboarding === 'true') {
        this.currentStep = ONBOARDING_STEPS.COMPLETE;
        this.completedSteps = new Set(Object.values(ONBOARDING_STEPS));
      } else {
        // Load any partial progress
        const savedProgress = safeStorage?.getItem('trakaido-onboarding-progress');
        if (savedProgress) {
          try {
            const progress = JSON.parse(savedProgress);
            this.currentStep = progress.currentStep || ONBOARDING_STEPS.WELCOME;
            this.completedSteps = new Set(progress.completedSteps || []);
          } catch (error) {
            console.warn('Failed to parse onboarding progress:', error);
            // Reset to beginning if corrupted
            this.currentStep = ONBOARDING_STEPS.WELCOME;
            this.completedSteps = new Set();
          }
        }
      }

      this.isInitialized = true;
      this.notifyListeners();
    } catch (error) {
      console.error('Error initializing onboarding flow:', error);
      this.currentStep = ONBOARDING_STEPS.WELCOME;
      this.completedSteps = new Set();
      this.isInitialized = true;
    }
  }

  /**
   * Get the current step in the onboarding flow
   */
  getCurrentStep() {
    return this.currentStep;
  }

  /**
   * Check if onboarding is complete
   */
  isComplete() {
    return this.currentStep === ONBOARDING_STEPS.COMPLETE;
  }

  /**
   * Check if a specific step has been completed
   */
  isStepCompleted(step) {
    return this.completedSteps.has(step);
  }

  /**
   * Get the next step in the flow
   */
  getNextStep(currentStep) {
    const stepOrder = [
      ONBOARDING_STEPS.WELCOME,
      ONBOARDING_STEPS.JOURNEY_MODE,
      ONBOARDING_STEPS.QUESTION_TYPES,
      ONBOARDING_STEPS.OTHER_MODES,
      ONBOARDING_STEPS.COMPLETE
    ];

    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex === -1 || currentIndex === stepOrder.length - 1) {
      return ONBOARDING_STEPS.COMPLETE;
    }
    
    return stepOrder[currentIndex + 1];
  }

  /**
   * Advance to the next step in the onboarding flow
   */
  async advanceStep() {
    if (this.currentStep === ONBOARDING_STEPS.COMPLETE) {
      return;
    }

    // Mark current step as completed
    this.completedSteps.add(this.currentStep);
    
    // Move to next step
    this.currentStep = this.getNextStep(this.currentStep);
    
    // If we've reached the end, mark onboarding as complete
    if (this.currentStep === ONBOARDING_STEPS.COMPLETE) {
      await this.completeOnboarding();
    } else {
      // Save progress
      await this.saveProgress();
    }

    this.notifyListeners();
  }

  /**
   * Skip to a specific step (for testing or navigation)
   */
  async skipToStep(step) {
    if (!Object.values(ONBOARDING_STEPS).includes(step)) {
      throw new Error(`Invalid onboarding step: ${step}`);
    }

    this.currentStep = step;
    
    if (step === ONBOARDING_STEPS.COMPLETE) {
      await this.completeOnboarding();
    } else {
      await this.saveProgress();
    }

    this.notifyListeners();
  }

  /**
   * Complete the onboarding process
   */
  async completeOnboarding() {
    try {
      // Mark all steps as completed
      this.completedSteps = new Set(Object.values(ONBOARDING_STEPS));
      this.currentStep = ONBOARDING_STEPS.COMPLETE;
      
      // Set completion flags
      safeStorage?.setItem('trakaido-onboarding-complete', 'true');
      safeStorage?.setItem('trakaido-has-seen-intro', 'true');
      
      // Clear progress tracking since we're done
      safeStorage?.removeItem('trakaido-onboarding-progress');
      
      this.notifyListeners();
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  }

  /**
   * Reset onboarding progress (for testing or re-onboarding)
   */
  async resetOnboarding() {
    try {
      this.currentStep = ONBOARDING_STEPS.WELCOME;
      this.completedSteps = new Set();
      
      safeStorage?.removeItem('trakaido-onboarding-complete');
      safeStorage?.removeItem('trakaido-has-seen-intro');
      safeStorage?.removeItem('trakaido-onboarding-progress');
      
      this.notifyListeners();
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  }

  /**
   * Save current progress to storage
   */
  async saveProgress() {
    try {
      const progress = {
        currentStep: this.currentStep,
        completedSteps: Array.from(this.completedSteps),
        timestamp: Date.now()
      };
      
      safeStorage?.setItem('trakaido-onboarding-progress', JSON.stringify(progress));
    } catch (error) {
      console.error('Error saving onboarding progress:', error);
    }
  }

  /**
   * Add a listener for onboarding state changes
   */
  addListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Remove a listener
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of state changes
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback({
          currentStep: this.currentStep,
          completedSteps: Array.from(this.completedSteps),
          isComplete: this.isComplete()
        });
      } catch (error) {
        console.error('Error in onboarding listener:', error);
      }
    });
  }

  /**
   * Get progress information for UI display
   */
  getProgressInfo() {
    const totalSteps = Object.values(ONBOARDING_STEPS).length - 1; // Exclude COMPLETE
    const completedCount = this.completedSteps.size;
    
    return {
      currentStep: this.currentStep,
      completedSteps: Array.from(this.completedSteps),
      totalSteps,
      completedCount,
      progressPercentage: Math.round((completedCount / totalSteps) * 100),
      isComplete: this.isComplete()
    };
  }
}

// Create and export singleton instance
const onboardingFlowManager = new OnboardingFlowManager();
export default onboardingFlowManager;