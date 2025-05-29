#!/usr/bin/env python3
"""
Script to generate Lithuanian pronunciation audio files using OpenAI TTS.

This script reads a list of Lithuanian words and generates MP3 pronunciation 
files using OpenAI's text-to-speech API. Files are saved to a cache directory
that can be served by the Atacama web application.

Usage:
    python gen_audio.py --batch words.txt
    python gen_audio.py --word "duona"
    python gen_audio.py --batch words.txt --voice alloy
    python gen_audio.py --batch words.txt --multi-voice  # automatically enables --organize-by-voice
    python gen_audio.py --batch words.txt --output-dir ./audio --organize-by-voice
    python gen_audio.py --batch words.txt --speed 0.75 --voice nova
    python gen_audio.py --batch words.txt --force  # overwrite existing files
"""

import argparse
import os
import sys
import time
from pathlib import Path
from typing import List, Optional, Dict, Tuple, Set
import re

try:
    import openai
except ImportError:
    print("OpenAI library not installed. Install with: pip install openai")
    sys.exit(1)

MODEL = "gpt-4o-mini-tts"

# TTS instructions for Lithuanian pronunciation
LITHUANIAN_TTS_INSTRUCTIONS = """
Read this word in Lithuanian with clear, accurate pronunciation.
- Emphasize proper Lithuanian vowel length and stress patterns
- Maintain proper Lithuanian intonation with a natural rise and fall
- The voice should be calm and clear at a moderate pace
- Articulate each syllable distinctly without rushing
- Use standard Lithuanian pronunciation, not dialectal or slang variants
- Pronounce every phoneme fully - do not drop consonant clusters or reduce unstressed vowels
"""

# Define voice groups
VOICE_GROUPS = {
    "masculine": ["onyx", "echo"],
    "feminine": ["nova", "shimmer"],
    "ambiguous": ["alloy", "fable"]
}

# Default voices for multi-voice generation (one from each group)
DEFAULT_MULTI_VOICES = ["onyx", "nova", "alloy"]

# Complete list of Lithuanian letters and diacritics
# Lithuanian alphabet: a ą b c č d e ę ė f g h i į y j k l m n o p r s š t u ų ū v z ž
LITHUANIAN_CHARS = "aąbcčdeęėfghiįyjklmnoprsštuųūvzž"

def sanitize_word(word: str) -> Optional[str]:
    """
    Sanitize a Lithuanian word for use as a filename.
    
    :param word: The Lithuanian word to sanitize
    :return: Sanitized filename-safe version or None if invalid
    """
    word = word.strip().lower()
    
    # Allow all Lithuanian letters, basic Latin letters, and safe characters
    sanitized = re.sub(r'[^a-z' + LITHUANIAN_CHARS + r'\-_]', '', word)
    
    if not sanitized or len(sanitized) > 100:
        return None
        
    return sanitized

def read_api_key_from_file(key_file: str = "keys/openai.key") -> Optional[str]:
    """
    Read OpenAI API key from a file.
    
    :param key_file: Path to the file containing the API key
    :return: API key as string or None if file not found/readable
    """
    try:
        key_path = Path(key_file)
        if key_path.exists():
            with open(key_path, 'r', encoding='utf-8') as f:
                return f.read().strip()
        return None
    except Exception as e:
        print(f"Error reading API key file: {str(e)}")
        return None

def generate_audio(
    word: str, 
    voice: str = "alloy", 
    output_dir: Path = None,
    organize_by_voice: bool = False,
    force: bool = False,
    delay: float = 0.0,
) -> bool:
    """
    Generate audio pronunciation for a Lithuanian word using OpenAI TTS.
    
    :param word: Lithuanian word to pronounce
    :param voice: OpenAI voice to use (alloy, echo, fable, onyx, nova, shimmer)
    :param output_dir: Directory to save the audio file
    :param organize_by_voice: Whether to organize files in subdirectories by voice
    :param force: Whether to overwrite existing files
    :param delay: Delay in seconds to wait after successful API call
    :return: True if successful, False otherwise
    """
    if not output_dir:
        output_dir = Path("./audio_cache")
    
    # Sanitize word for filename
    sanitized_word = sanitize_word(word)
    if not sanitized_word:
        print(f"Error: Invalid word format: {word}")
        return False
    
    # Create voice-specific subdirectory if requested
    if organize_by_voice:
        voice_dir = output_dir / voice
        voice_dir.mkdir(parents=True, exist_ok=True)
        file_path = voice_dir / f"{sanitized_word}.mp3"
    else:
        file_path = output_dir / f"{sanitized_word}.mp3"
    
    # Skip if file already exists and force is not enabled
    if file_path.exists() and not force:
        print(f"Skipping {word} (voice: {voice}): file already exists")
        return True
    elif file_path.exists() and force:
        print(f"Overwriting existing file for {word} (voice: {voice})")
    
    try:
        print(f"Generating audio for: {word} (voice: {voice})")
    
        
        # Create the TTS request with optimized settings for Lithuanian pronunciation
        response = openai.audio.speech.create(
            model=MODEL,
            voice=voice,
            input=word,
            response_format="mp3",
            instructions=LITHUANIAN_TTS_INSTRUCTIONS,
        )
        
        # Save the audio file
        with open(file_path, 'wb') as f:
            f.write(response.content)
        
        print(f"Saved: {file_path}")
        
        # Apply delay after successful API call if specified
        if delay > 0:
            time.sleep(delay)
            
        return True
        
    except Exception as e:
        print(f"Error generating audio for '{word}' with voice '{voice}': {str(e)}")
        return False

def generate_multi_voice_audio(
    word: str,
    voices: List[str] = DEFAULT_MULTI_VOICES,
    output_dir: Path = None,
    organize_by_voice: bool = True,
    delay: float = 1.0,
    force: bool = False
) -> Tuple[int, int]:
    """
    Generate audio for a word using multiple voices.
    
    :param word: The word to pronounce
    :param voices: List of voices to use
    :param output_dir: Base output directory
    :param organize_by_voice: Whether to organize files in subdirectories by voice
    :param delay: Delay between API calls in seconds
    :param force: Whether to overwrite existing files
    :return: Tuple of (success_count, total_count)
    """
    success_count = 0
    total_count = len(voices)
    
    for i, voice in enumerate(voices):
        if generate_audio(word, voice, output_dir, organize_by_voice, force, delay):
            success_count += 1
    
    return success_count, total_count

def read_words_from_file(file_path: str) -> List[str]:
    """
    Read words from a text file, one word per line.
    
    :param file_path: Path to the text file
    :return: List of words
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            words = [line.strip() for line in f if line.strip()]
        return words
    except Exception as e:
        print(f"Error reading words file: {str(e)}")
        return []

def main():
    parser = argparse.ArgumentParser(description="Generate Lithuanian pronunciation audio files")
    parser.add_argument('--word', type=str, help='Single word to generate audio for')
    parser.add_argument('--batch', type=str, help='Text file with words to process (one per line)')
    parser.add_argument('--voice', type=str, default='alloy', 
                       choices=['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
                       help='OpenAI voice to use (default: alloy)')
    parser.add_argument('--output-dir', type=str, default='./lithuanian-audio-cache',
                       help='Output directory for audio files (default: ./lithuanian-audio-cache)')
    parser.add_argument('--api-key', type=str, help='OpenAI API key (or set OPENAI_API_KEY env var)')
    parser.add_argument('--api-key-file', type=str, default='keys/openai.key',
                       help='File containing OpenAI API key (default: keys/openai.key)')
    parser.add_argument('--delay', type=float, default=1.0,
                       help='Delay between API calls in seconds (default: 1.0)')
    parser.add_argument('--organize-by-voice', action='store_true',
                       help='Organize output files in subdirectories by voice')
    parser.add_argument('--multi-voice', action='store_true',
                       help='Generate audio using multiple voices (one masculine, one feminine, one ambiguous). Automatically enables --organize-by-voice')
    parser.add_argument('--voices', type=str, nargs='+',
                       help='Specific voices to use with --multi-voice (overrides defaults)')
    parser.add_argument('--force', action='store_true',
                       help='Overwrite existing audio files instead of skipping them')
    
    args = parser.parse_args()
    
    # If multi-voice is set, automatically set organize-by-voice to True
    if args.multi_voice:
        args.organize_by_voice = True
        
    # Set up OpenAI API key with priority:
    # 1. Command line argument
    # 2. Environment variable
    # 3. API key file
    api_key = args.api_key or os.getenv('OPENAI_API_KEY') or read_api_key_from_file(args.api_key_file)
    if not api_key:
        print("Error: OpenAI API key required. Set OPENAI_API_KEY environment variable, use --api-key, or create a key file")
        sys.exit(1)
    
    openai.api_key = api_key
    
    # Create output directory
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"Output directory: {output_dir}")
    
    # Determine words to process
    words = []
    
    if args.word:
        words = [args.word]
    elif args.batch:
        words = read_words_from_file(args.batch)
    else:
        print("Error: Must specify either --word or --batch")
        parser.print_help()
        sys.exit(1)
    
    if not words:
        print("Error: No words to process")
        sys.exit(1)
    
    # Determine which voices to use
    if args.multi_voice:
        voices_to_use = args.voices if args.voices else DEFAULT_MULTI_VOICES
        print(f"Processing {len(words)} words with multiple voices: {', '.join(voices_to_use)}")
    else:
        voices_to_use = [args.voice]
        print(f"Processing {len(words)} words with voice '{args.voice}'")
    
    # Generate audio for each word
    total_success = 0
    total_attempts = 0
    
    for i, word in enumerate(words, 1):
        print(f"[{i}/{len(words)}] ", end="")
        
        if args.multi_voice:
            success, attempts = generate_multi_voice_audio(
                word, 
                voices_to_use, 
                output_dir, 
                args.organize_by_voice,
                args.delay,
                args.force
            )
            total_success += success
            total_attempts += attempts
        else:
            if generate_audio(word, args.voice, output_dir, args.organize_by_voice, args.force, args.delay):
                total_success += 1
            total_attempts += 1
    
    print(f"\nCompleted: {total_success}/{total_attempts} files generated successfully")
    
    if total_success < total_attempts:
        sys.exit(1)

if __name__ == "__main__":
    main()
