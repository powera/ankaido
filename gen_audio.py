#!/usr/bin/env python3
"""
Script to generate Lithuanian pronunciation audio files using OpenAI TTS.

This script reads a list of Lithuanian words and generates MP3 pronunciation 
files using OpenAI's text-to-speech API. Files are saved to a cache directory
that can be served by the Atacama web application.

Usage:
    python generate_lithuanian_audio.py words.txt
    python generate_lithuanian_audio.py --word "duona"
    python generate_lithuanian_audio.py --batch words.txt --voice alloy
"""

import argparse
import os
import sys
import time
from pathlib import Path
from typing import List, Optional
import re

try:
    import openai
except ImportError:
    print("OpenAI library not installed. Install with: pip install openai")
    sys.exit(1)

def sanitize_word(word: str) -> Optional[str]:
    """
    Sanitize a Lithuanian word for use as a filename.
    
    :param word: The Lithuanian word to sanitize
    :return: Sanitized filename-safe version or None if invalid
    """
    word = word.strip().lower()
    
    # Allow only Lithuanian letters, basic Latin letters, and safe characters
    # Lithuanian uses: ą, č, ę, ė, į, š, ų, ū, ž
    sanitized = re.sub(r'[^a-ząčęėįšųūž\-_]', '', word)
    
    if not sanitized or len(sanitized) > 100:
        return None
        
    return sanitized

def generate_audio(word: str, voice: str = "alloy", output_dir: Path = None) -> bool:
    """
    Generate audio pronunciation for a Lithuanian word using OpenAI TTS.
    
    :param word: Lithuanian word to pronounce
    :param voice: OpenAI voice to use (alloy, echo, fable, onyx, nova, shimmer)
    :param output_dir: Directory to save the audio file
    :return: True if successful, False otherwise
    """
    if not output_dir:
        output_dir = Path("./audio_cache")
    
    # Sanitize word for filename
    sanitized_word = sanitize_word(word)
    if not sanitized_word:
        print(f"Error: Invalid word format: {word}")
        return False
    
    output_file = output_dir / f"{sanitized_word}.mp3"
    
    # Skip if file already exists
    if output_file.exists():
        print(f"Skipping {word}: file already exists")
        return True
    
    try:
        print(f"Generating audio for: {word}")
        
        # Create the TTS request
        response = openai.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=word,
            response_format="mp3"
        )
        
        # Save the audio file
        with open(output_file, 'wb') as f:
            f.write(response.content)
        
        print(f"Saved: {output_file}")
        return True
        
    except Exception as e:
        print(f"Error generating audio for '{word}': {str(e)}")
        return False

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
    parser.add_argument('--delay', type=float, default=1.0,
                       help='Delay between API calls in seconds (default: 1.0)')
    
    # Handle positional argument for backwards compatibility
    parser.add_argument('input_file', nargs='?', help='Text file with words (alternative to --batch)')
    
    args = parser.parse_args()
    
    # Set up OpenAI API key
    api_key = args.api_key or os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("Error: OpenAI API key required. Set OPENAI_API_KEY environment variable or use --api-key")
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
    elif args.input_file:
        words = read_words_from_file(args.input_file)
    else:
        print("Error: Must specify either --word, --batch, or provide input file")
        parser.print_help()
        sys.exit(1)
    
    if not words:
        print("Error: No words to process")
        sys.exit(1)
    
    print(f"Processing {len(words)} words with voice '{args.voice}'")
    
    # Generate audio for each word
    success_count = 0
    for i, word in enumerate(words, 1):
        print(f"[{i}/{len(words)}] ", end="")
        
        if generate_audio(word, args.voice, output_dir):
            success_count += 1
        
        # Add delay between requests to respect rate limits
        if i < len(words) and args.delay > 0:
            time.sleep(args.delay)
    
    print(f"\nCompleted: {success_count}/{len(words)} files generated successfully")
    
    if success_count < len(words):
        sys.exit(1)

if __name__ == "__main__":
    main()
