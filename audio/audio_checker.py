#!/usr/bin/env python3
"""
Audio Content Checker Library

This module provides functions to analyze audio file contents using OpenAI's API
to check for word accuracy and detect unwanted noises like audible breaths.
"""

import os
import base64
import json
from typing import Dict, List, Optional, Tuple, Union
from pathlib import Path
from dataclasses import dataclass
from enum import Enum

try:
    import openai
except ImportError:
    openai = None

try:
    from pydub import AudioSegment
except ImportError:
    AudioSegment = None

from .audio_utils import read_api_key_from_file
from .config import (
    DEFAULT_MODEL, API_KEY_FILE, DEFAULT_LANGUAGE, 
    DEFAULT_TEMPERATURE, SUPPORTED_FORMATS, MAX_AUDIO_SIZE_MB
)


class AudioQualityIssue(Enum):
    """Types of audio quality issues that can be detected."""
    AUDIBLE_BREATH = "audible_breath"
    BACKGROUND_NOISE = "background_noise"
    MOUTH_SOUNDS = "mouth_sounds"
    DISTORTION = "distortion"
    VOLUME_INCONSISTENCY = "volume_inconsistency"
    PRONUNCIATION_ERROR = "pronunciation_error"
    WORD_MISMATCH = "word_mismatch"
    UNCLEAR_SPEECH = "unclear_speech"


@dataclass
class AudioAnalysisResult:
    """Result of audio content analysis."""
    is_word_correct: bool
    expected_word: str
    detected_issues: List[AudioQualityIssue]
    confidence_score: float  # 0.0 to 1.0
    transcript: str
    detailed_feedback: str
    suggestions: List[str]
    audio_duration: Optional[float] = None


class AudioChecker:
    """Main class for checking audio file contents."""
    
    def __init__(self, api_key: Optional[str] = None, model: str = DEFAULT_MODEL):
        """
        Initialize the AudioChecker.
        
        Args:
            api_key: OpenAI API key. If None, will try to read from keys/openai.key
            model: OpenAI model to use for analysis
        """
        if openai is None:
            raise ImportError("OpenAI library not installed. Install with: pip install openai")
        
        self.api_key = api_key or read_api_key_from_file(API_KEY_FILE)
        if not self.api_key:
            raise ValueError(f"OpenAI API key not provided and not found in {API_KEY_FILE}")
        
        self.client = openai.OpenAI(api_key=self.api_key)
        self.model = model
    
    def _encode_audio_file(self, audio_path: str) -> str:
        """
        Encode audio file to base64 for API transmission.
        
        Args:
            audio_path: Path to the audio file
            
        Returns:
            Base64 encoded audio data
        """
        with open(audio_path, "rb") as audio_file:
            return base64.b64encode(audio_file.read()).decode('utf-8')
    
    def _get_audio_duration(self, audio_path: str) -> Optional[float]:
        """
        Get audio file duration in seconds.
        
        Args:
            audio_path: Path to the audio file
            
        Returns:
            Duration in seconds or None if unable to determine
        """
        if AudioSegment is None:
            return None
        
        try:
            audio = AudioSegment.from_file(audio_path)
            return len(audio) / 1000.0  # Convert milliseconds to seconds
        except Exception:
            return None
    
    def _create_analysis_prompt(self, expected_word: str, language: str = "Lithuanian") -> str:
        """
        Create the prompt for audio analysis.
        
        Args:
            expected_word: The word that should be spoken in the audio
            language: Language of the expected word
            
        Returns:
            Formatted prompt for the AI
        """
        return f"""
You are an expert audio quality analyst specializing in {language} pronunciation and speech clarity.

Analyze this audio file and provide a comprehensive assessment. The audio should contain the {language} word: "{expected_word}"

Please evaluate:

1. WORD ACCURACY:
   - Does the audio contain the expected word "{expected_word}"?
   - Is the pronunciation correct for {language}?
   - Are there any mispronunciations or word substitutions?

2. AUDIO QUALITY ISSUES:
   - Audible breaths (inhaling/exhaling sounds)
   - Mouth sounds (lip smacks, tongue clicks, saliva sounds)
   - Background noise or interference
   - Audio distortion or clipping
   - Volume inconsistencies
   - Unclear or mumbled speech

3. OVERALL ASSESSMENT:
   - Confidence level in your analysis (0-100%)
   - Transcript of what was actually spoken
   - Specific suggestions for improvement

Respond immediately with a summary of these issues.

Issue types should be from: audible_breath, background_noise, mouth_sounds, distortion, volume_inconsistency, pronunciation_error, word_mismatch, unclear_speech
"""
    
    def check_audio_file(
        self, 
        audio_path: str, 
        expected_word: str, 
        language: str = DEFAULT_LANGUAGE
    ) -> AudioAnalysisResult:
        """
        Check an audio file for word accuracy and quality issues.
        
        Args:
            audio_path: Path to the audio file to analyze
            expected_word: The word that should be spoken in the audio
            language: Language of the expected word (default: Lithuanian)
            
        Returns:
            AudioAnalysisResult with detailed analysis
            
        Raises:
            FileNotFoundError: If audio file doesn't exist
            ValueError: If API response is invalid
        """
        if not Path(audio_path).exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
        
        # Get audio duration
        duration = self._get_audio_duration(audio_path)
        
        # Encode audio file
        audio_data = self._encode_audio_file(audio_path)
        
        # Create analysis prompt
        prompt = self._create_analysis_prompt(expected_word, language)
        
        try:
            # Make API call
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "input_audio",
                                "input_audio": {
                                    "data": audio_data,
                                    "format": "mp3"  # Adjust based on your audio format
                                }
                            }
                        ]
                    }
                ],
                temperature=DEFAULT_TEMPERATURE  # Low temperature for consistent analysis
            )
            
            # Parse response
            print("=== OpenAI API Response Debug ===")
            print(f"Model: {response.model}")
            print(f"Usage: {response.usage}")
            print(f"Response ID: {response.id}")
            print(f"Created: {response.created}")
            print(f"Choices count: {len(response.choices)}")
            for choice in response.choices:
                print(f"Finish reason: {choice.finish_reason}")
                print(f"Content length: {len(choice.message.content) if choice.message.content else 0}")
                print("--- Response Content ---")
                print(choice.message.content)
            print("=== End Debug ===")
            response_text = response.choices[0].message.content
            
            # Try to extract JSON from response
            try:
                # Look for JSON in the response
                json_start = response_text.find('{')
                json_end = response_text.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = response_text[json_start:json_end]
                    result_data = json.loads(json_str)
                else:
                    raise ValueError("No JSON found in response")
            except (json.JSONDecodeError, ValueError):
                # Fallback: create result from text analysis
                result_data = self._parse_text_response(response_text, expected_word)
            
            # Convert issue strings to enums
            detected_issues = []
            for issue_str in result_data.get("detected_issues", []):
                try:
                    detected_issues.append(AudioQualityIssue(issue_str))
                except ValueError:
                    # Skip unknown issue types
                    continue
            
            return AudioAnalysisResult(
                is_word_correct=result_data.get("is_word_correct", False),
                expected_word=expected_word,
                detected_issues=detected_issues,
                confidence_score=result_data.get("confidence_score", 0.0),
                transcript=result_data.get("transcript", ""),
                detailed_feedback=result_data.get("detailed_feedback", ""),
                suggestions=result_data.get("suggestions", []),
                audio_duration=duration
            )
            
        except Exception as e:
            raise ValueError(f"Error analyzing audio: {str(e)}")
    
    def _parse_text_response(self, response_text: str, expected_word: str) -> Dict:
        """
        Fallback method to parse non-JSON responses.
        
        Args:
            response_text: Raw response text from API
            expected_word: Expected word for analysis
            
        Returns:
            Dictionary with parsed analysis results
        """
        # Basic text parsing fallback
        is_correct = "correct" in response_text.lower() and "incorrect" not in response_text.lower()
        
        # Look for common issue indicators
        issues = []
        if "breath" in response_text.lower():
            issues.append("audible_breath")
        if "noise" in response_text.lower():
            issues.append("background_noise")
        if "mouth" in response_text.lower() or "smack" in response_text.lower():
            issues.append("mouth_sounds")
        if "distort" in response_text.lower():
            issues.append("distortion")
        if "unclear" in response_text.lower() or "mumbl" in response_text.lower():
            issues.append("unclear_speech")
        
        return {
            "is_word_correct": is_correct,
            "confidence_score": 0.5,  # Default moderate confidence
            "transcript": expected_word if is_correct else "unclear",
            "detected_issues": issues,
            "detailed_feedback": response_text,
            "suggestions": ["Please review the detailed feedback for improvement suggestions."]
        }
    
    def batch_check_audio_files(
        self, 
        audio_files: List[Tuple[str, str]], 
        language: str = DEFAULT_LANGUAGE
    ) -> List[AudioAnalysisResult]:
        """
        Check multiple audio files in batch.
        
        Args:
            audio_files: List of tuples (audio_path, expected_word)
            language: Language of the expected words
            
        Returns:
            List of AudioAnalysisResult objects
        """
        results = []
        for audio_path, expected_word in audio_files:
            try:
                result = self.check_audio_file(audio_path, expected_word, language)
                results.append(result)
            except Exception as e:
                # Create error result
                error_result = AudioAnalysisResult(
                    is_word_correct=False,
                    expected_word=expected_word,
                    detected_issues=[],
                    confidence_score=0.0,
                    transcript="",
                    detailed_feedback=f"Error analyzing file: {str(e)}",
                    suggestions=["Check if the audio file exists and is readable."]
                )
                results.append(error_result)
        
        return results
    
    def get_quality_summary(self, results: List[AudioAnalysisResult]) -> Dict:
        """
        Generate a summary of quality issues across multiple audio files.
        
        Args:
            results: List of AudioAnalysisResult objects
            
        Returns:
            Dictionary with quality statistics and common issues
        """
        if not results:
            return {"error": "No results to analyze"}
        
        total_files = len(results)
        correct_words = sum(1 for r in results if r.is_word_correct)
        
        # Count issue types
        issue_counts = {}
        for result in results:
            for issue in result.detected_issues:
                issue_counts[issue.value] = issue_counts.get(issue.value, 0) + 1
        
        # Calculate average confidence
        avg_confidence = sum(r.confidence_score for r in results) / total_files
        
        return {
            "total_files": total_files,
            "correct_words": correct_words,
            "word_accuracy_rate": correct_words / total_files,
            "average_confidence": avg_confidence,
            "common_issues": sorted(issue_counts.items(), key=lambda x: x[1], reverse=True),
            "files_with_issues": sum(1 for r in results if r.detected_issues),
            "clean_files": sum(1 for r in results if not r.detected_issues and r.is_word_correct)
        }


# Convenience functions for easy usage
def check_single_audio(
    audio_path: str, 
    expected_word: str, 
    api_key: Optional[str] = None,
    language: str = DEFAULT_LANGUAGE
) -> AudioAnalysisResult:
    """
    Convenience function to check a single audio file.
    
    Args:
        audio_path: Path to the audio file
        expected_word: Expected word in the audio
        api_key: OpenAI API key (optional)
        language: Language of the expected word
        
    Returns:
        AudioAnalysisResult with analysis
    """
    checker = AudioChecker(api_key=api_key)
    return checker.check_audio_file(audio_path, expected_word, language)


def check_audio_directory(
    directory_path: str,
    word_mapping: Dict[str, str],
    api_key: Optional[str] = None,
    language: str = DEFAULT_LANGUAGE
) -> List[AudioAnalysisResult]:
    """
    Check all audio files in a directory.
    
    Args:
        directory_path: Path to directory containing audio files
        word_mapping: Dictionary mapping filename (without extension) to expected word
        api_key: OpenAI API key (optional)
        language: Language of the expected words
        
    Returns:
        List of AudioAnalysisResult objects
    """
    checker = AudioChecker(api_key=api_key)
    
    audio_files = []
    directory = Path(directory_path)
    
    for audio_file in directory.glob("*.mp3"):  # Adjust extensions as needed
        filename_stem = audio_file.stem
        if filename_stem in word_mapping:
            audio_files.append((str(audio_file), word_mapping[filename_stem]))
    
    return checker.batch_check_audio_files(audio_files, language)