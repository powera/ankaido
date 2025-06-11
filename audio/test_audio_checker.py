#!/usr/bin/env python3
"""
Test script for the audio_checker library.

This script demonstrates how to use the audio content checking functionality.
Run this script to test the library with sample audio files.
"""

import sys
from pathlib import Path
from audio_checker import AudioChecker, check_single_audio, AudioQualityIssue


def test_audio_checker():
    """Test the AudioChecker functionality."""
    print("Testing Audio Content Checker Library")
    print("=" * 50)
    
    # Check if we have any audio files to test with
    audio_cache_dir = Path("lithuanian-audio-cache/ash")
    if not audio_cache_dir.exists():
        print("No audio cache directory found. Please generate some audio files first.")
        return
    
    # Find some audio files to test
    audio_files = list(audio_cache_dir.glob("*.mp3"))[:3]  # Test first 3 files
    
    if not audio_files:
        print("No MP3 files found in audio cache directory.")
        return
    
    try:
        # Initialize checker
        print("Initializing AudioChecker...")
        checker = AudioChecker()
        print("✓ AudioChecker initialized successfully")
        
        # Test individual files
        for audio_file in audio_files:
            print(f"\nAnalyzing: {audio_file.name}")
            print("-" * 30)
            
            # Extract expected word from filename (remove .mp3 extension)
            expected_word = audio_file.stem.replace('_', ' ')
            
            try:
                result = checker.check_audio_file(
                    str(audio_file), 
                    expected_word, 
                    language="Lithuanian"
                )
                
                print(f"Expected word: {result.expected_word}")
                print(f"Word correct: {'✓' if result.is_word_correct else '✗'}")
                print(f"Confidence: {result.confidence_score:.2f}")
                print(f"Transcript: {result.transcript}")
                
                if result.detected_issues:
                    print("Issues detected:")
                    for issue in result.detected_issues:
                        print(f"  - {issue.value}")
                else:
                    print("No quality issues detected ✓")
                
                if result.suggestions:
                    print("Suggestions:")
                    for suggestion in result.suggestions:
                        print(f"  • {suggestion}")
                
                if result.audio_duration:
                    print(f"Duration: {result.audio_duration:.2f} seconds")
                
            except Exception as e:
                print(f"Error analyzing {audio_file.name}: {str(e)}")
        
        # Test batch processing
        print(f"\n{'='*50}")
        print("Testing Batch Processing")
        print("=" * 50)
        
        audio_word_pairs = [
            (str(audio_file), audio_file.stem.replace('_', ' ')) 
            for audio_file in audio_files
        ]
        
        results = checker.batch_check_audio_files(audio_word_pairs, language="Lithuanian")
        
        # Generate summary
        summary = checker.get_quality_summary(results)
        
        print(f"Batch Analysis Summary:")
        print(f"  Total files: {summary['total_files']}")
        print(f"  Correct words: {summary['correct_words']}")
        print(f"  Accuracy rate: {summary['word_accuracy_rate']:.2%}")
        print(f"  Average confidence: {summary['average_confidence']:.2f}")
        print(f"  Files with issues: {summary['files_with_issues']}")
        print(f"  Clean files: {summary['clean_files']}")
        
        if summary['common_issues']:
            print("Most common issues:")
            for issue, count in summary['common_issues'][:3]:
                print(f"  - {issue}: {count} files")
        
    except ImportError as e:
        print(f"Missing dependency: {str(e)}")
        print("Please install required packages: pip install openai pydub")
    except ValueError as e:
        print(f"Configuration error: {str(e)}")
        print("Please ensure your OpenAI API key is available in keys/openai.key")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")


def test_convenience_function():
    """Test the convenience function."""
    print("\n" + "=" * 50)
    print("Testing Convenience Function")
    print("=" * 50)
    
    # Find a sample audio file
    audio_cache_dir = Path("lithuanian-audio-cache/ash")
    audio_files = list(audio_cache_dir.glob("*.mp3"))
    
    if not audio_files:
        print("No audio files available for testing.")
        return
    
    sample_file = audio_files[0]
    expected_word = sample_file.stem.replace('_', ' ')
    
    try:
        print(f"Using convenience function to analyze: {sample_file.name}")
        result = check_single_audio(
            str(sample_file),
            expected_word,
            language="Lithuanian"
        )
        
        print(f"Result: {'✓ Correct' if result.is_word_correct else '✗ Incorrect'}")
        print(f"Confidence: {result.confidence_score:.2f}")
        
        if result.detected_issues:
            print(f"Issues: {', '.join(issue.value for issue in result.detected_issues)}")
        else:
            print("No issues detected")
            
    except Exception as e:
        print(f"Error with convenience function: {str(e)}")


if __name__ == "__main__":
    print("Audio Content Checker Library Test")
    print("This test requires:")
    print("1. OpenAI API key in keys/openai.key")
    print("2. Audio files in lithuanian-audio-cache/ash/")
    print("3. Required packages: openai, pydub")
    print()
    
    response = input("Continue with test? (y/n): ").lower().strip()
    if response == 'y':
        test_audio_checker()
        test_convenience_function()
    else:
        print("Test cancelled.")