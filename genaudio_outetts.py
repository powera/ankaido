#!/usr/bin/env python3
"""
Text-to-Speech Generator using OuteAI/Llama-OuteTTS-1.0-1B

This script uses the OuteTTS model to generate audio files from text input.
It's optimized for Mac with M3 chip (Apple Silicon) and doesn't require NVIDIA/CUDA.

Usage:
    python generate_audio.py --text "Your text here" --output output.wav
    python generate_audio.py --file input.txt --output output.wav
    python generate_audio.py --interactive
    python generate_audio.py --lithuanian "duona" --output lithuanian_audio.wav
    python generate_audio.py --lithuanian "Laba diena" --output laba_diena.wav
    python generate_audio.py --lithuanian-batch words.txt --output-dir ./lithuanian_audio
"""

import argparse
import os
import sys
import time
import outetts
import re
from pathlib import Path


# Complete list of Lithuanian letters and diacritics
# Lithuanian alphabet: a ą b c č d e ę ė f g h i į y j k l m n o p r s š t u ų ū v z ž
LITHUANIAN_CHARS = "aąbcčdeęėfghiįyjklmnoprsštuųūvzž"

# TTS instructions for Lithuanian pronunciation
LITHUANIAN_TTS_INSTRUCTIONS = """
Pronounce this Lithuanian word or phrase with clear, accurate pronunciation:
- Emphasize proper Lithuanian vowel length and stress patterns
- Maintain proper Lithuanian intonation with a natural rise and fall
- Articulate each syllable distinctly without rushing
- Use standard Lithuanian pronunciation, not dialectal variants
- Pronounce every phoneme fully - do not drop consonant clusters or reduce unstressed vowels
- For phrases, maintain proper spacing and natural flow between words
"""

def setup_tts_interface():
    """Initialize and return the TTS interface with the 1B model."""
    print("Initializing OuteTTS model (this may take a moment)...")
    
    # Configure for Apple Silicon (M3)
    interface = outetts.Interface(
        config=outetts.ModelConfig.auto_config(
            model=outetts.Models.VERSION_1_0_SIZE_1B,
            # Using llama.cpp backend which works well on Apple Silicon
            backend=outetts.Backend.LLAMACPP,
            # FP16 is a good balance for Apple Silicon
            quantization=outetts.LlamaCppQuantization.FP16
        )
    )
    
    return interface


def sanitize_lithuanian_word(word: str) -> str:
    """
    Sanitize a Lithuanian word or phrase for use as a filename.
    
    Args:
        word: The Lithuanian word or phrase to sanitize
    
    Returns:
        Sanitized filename-safe version or empty string if invalid
    """
    word = word.strip().lower()
    
    # Replace spaces with underscores for multi-word phrases
    word_with_underscores = word.replace(' ', '_')
    
    # Allow all Lithuanian letters, basic Latin letters, and safe characters
    sanitized = re.sub(r'[^a-z' + LITHUANIAN_CHARS + r'\-_]', '', word_with_underscores)
    
    if not sanitized or len(sanitized) > 100:
        return ""
        
    return sanitized


def list_available_speakers(interface):
    """List all available speaker profiles."""
    print("\nAvailable speaker profiles:")
    speakers = interface.list_speakers()
    for i, speaker in enumerate(speakers):
        print(f"{i+1}. {speaker}")
    return speakers


def generate_audio(interface, text, output_path, speaker_name=None):
    """Generate audio from text and save to the specified output path."""
    start_time = time.time()
    
    # Load speaker profile
    if speaker_name is None:
        # Default to English female neutral voice if none specified
        speaker = interface.load_default_speaker("EN-FEMALE-1-NEUTRAL")
        print(f"Using default speaker: EN-FEMALE-1-NEUTRAL")
    else:
        speaker = interface.load_default_speaker(speaker_name)
        print(f"Using speaker: {speaker_name}")
    
    print(f"Generating audio for text: '{text}'")
    
    # Generate speech
    output = interface.generate(
        config=outetts.GenerationConfig(
            text=text,
            speaker=speaker,
            # Optional parameters for generation quality
            #temperature=0.7,
            #top_p=0.9,
        )
    )
    
    # Save to file
    output.save(output_path)
    
    elapsed_time = time.time() - start_time
    print(f"Audio generated and saved to {output_path} in {elapsed_time:.2f} seconds")
    
    return output_path


def process_file(interface, file_path, output_dir, speaker_name=None):
    """Process a text file and generate audio for each line."""
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} not found")
        return
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f.readlines() if line.strip()]
    
    print(f"Processing {len(lines)} lines from {file_path}")
    
    for i, line in enumerate(lines):
        output_file = os.path.join(output_dir, f"audio_{i+1}.wav")
        generate_audio(interface, line, output_file, speaker_name)


def generate_lithuanian_audio(interface, text, output_path, speaker_name=None):
    """
    Generate audio for a Lithuanian word or phrase with proper pronunciation.
    
    Args:
        interface: The OuteTTS interface
        text: The Lithuanian word or phrase to pronounce
        output_path: Path to save the audio file
        speaker_name: Speaker profile to use (default: None, will use a default speaker)
    
    Returns:
        Path to the generated audio file or None if failed
    """
    sanitized_text = sanitize_lithuanian_word(text)
    if not sanitized_text:
        print(f"Error: Invalid Lithuanian text format: {text}")
        return None
    
    print(f"Generating Lithuanian pronunciation for: {text}")
    
    # Prepare the text with instructions for better Lithuanian pronunciation
    is_phrase = ' ' in text
    if is_phrase:
        text_with_instructions = f"{LITHUANIAN_TTS_INSTRUCTIONS}\n\nPhrase: {text}"
    else:
        text_with_instructions = f"{LITHUANIAN_TTS_INSTRUCTIONS}\n\nWord: {text}"
    
    # Load speaker profile
    if speaker_name is None:
        # Default to a female voice for Lithuanian
        # Using EN-FEMALE-1-NEUTRAL as it seems to handle Lithuanian pronunciation reasonably well
        # You may want to experiment with different speaker profiles for better results
        default_lithuanian_speaker = "EN-FEMALE-1-NEUTRAL"
        speaker = interface.load_default_speaker(default_lithuanian_speaker)
        print(f"Using default speaker for Lithuanian: {default_lithuanian_speaker}")
    else:
        speaker = interface.load_default_speaker(speaker_name)
        print(f"Using speaker: {speaker_name}")
    
    try:
        # Generate speech with specific settings for Lithuanian
        output = interface.generate(
            config=outetts.GenerationConfig(
                text=text_with_instructions,  # Use text with instructions for better pronunciation
                speaker=speaker,
                # Settings optimized for clear pronunciation
                # temperature=0.5,  # Lower temperature for more consistent output
                # top_p=0.95,
                # Slower speed for clearer articulation
                speed=0.9,
            )
        )
        
        # Save to file
        output.save(output_path)
        print(f"Lithuanian audio saved to {output_path}")
        return output_path
        
    except Exception as e:
        print(f"Error generating Lithuanian audio for '{text}': {str(e)}")
        return None


def process_lithuanian_batch(interface, file_path, output_dir, speaker_name=None, force=False):
    """
    Process a batch of Lithuanian words or phrases from a file.
    
    Args:
        interface: The OuteTTS interface
        file_path: Path to the file containing Lithuanian words or phrases (one per line)
        output_dir: Directory to save the audio files
        speaker_name: Speaker profile to use
        force: Whether to overwrite existing files
    
    Returns:
        Tuple of (success_count, total_count)
    """
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} not found")
        return 0, 0
    
    # Create output directory if it doesn't exist
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    with open(file_path, 'r', encoding='utf-8') as f:
        entries = [line.strip() for line in f.readlines() if line.strip()]
    
    if not entries:
        print("No entries found in the file")
        return 0, 0
    
    print(f"Processing {len(entries)} Lithuanian entries from {file_path}")
    
    success_count = 0
    total_count = len(entries)
    
    for i, entry in enumerate(entries, 1):
        sanitized = sanitize_lithuanian_word(entry)
        if not sanitized:
            print(f"[{i}/{total_count}] Skipping invalid entry: {entry}")
            continue
        
        output_file = output_dir / f"{sanitized}.wav"
        
        # Skip if file exists and not forcing overwrite
        if output_file.exists() and not force:
            print(f"[{i}/{total_count}] Skipping {entry}: file already exists")
            success_count += 1  # Count as success since file exists
            continue
        
        print(f"[{i}/{total_count}] Processing: {entry}")
        if generate_lithuanian_audio(interface, entry, output_file, speaker_name):
            success_count += 1
            # Add a small delay between generations to avoid overloading
            time.sleep(0.5)
    
    return success_count, total_count


def interactive_mode(interface):
    """Run in interactive mode, allowing the user to generate multiple audio files."""
    print("\nEntering interactive mode. Type 'exit' to quit, 'speakers' to list available speakers.")
    
    # Default speaker
    current_speaker = "EN-FEMALE-1-NEUTRAL"
    speaker = interface.load_default_speaker(current_speaker)
    
    while True:
        user_input = input("\nEnter text (or command): ").strip()
        
        if user_input.lower() == 'exit':
            print("Exiting interactive mode.")
            break
        
        elif user_input.lower() == 'speakers':
            speakers = list_available_speakers(interface)
            speaker_idx = input("Select speaker number (or press Enter to keep current): ")
            if speaker_idx and speaker_idx.isdigit() and 1 <= int(speaker_idx) <= len(speakers):
                current_speaker = speakers[int(speaker_idx) - 1]
                speaker = interface.load_default_speaker(current_speaker)
                print(f"Speaker changed to: {current_speaker}")
            else:
                print(f"Keeping current speaker: {current_speaker}")
        
        elif user_input:
            output_file = input("Enter output filename (default: output.wav): ").strip()
            if not output_file:
                output_file = "output.wav"
            
            # Generate audio
            generate_audio(interface, user_input, output_file, current_speaker)


def main():
    parser = argparse.ArgumentParser(description="Generate audio files using OuteTTS")
    
    # Create a mutually exclusive group for input methods
    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument("--text", type=str, help="Text to convert to speech")
    input_group.add_argument("--file", type=str, help="Path to a text file to process")
    input_group.add_argument("--interactive", action="store_true", help="Run in interactive mode")
    input_group.add_argument("--lithuanian", type=str, help="Lithuanian word or phrase to generate pronunciation for")
    input_group.add_argument("--lithuanian-batch", type=str, help="Path to a file with Lithuanian words or phrases (one per line)")
    
    parser.add_argument("--output", type=str, help="Output audio file path (for single text) or directory (for file input)")
    parser.add_argument("--output-dir", type=str, help="Output directory for batch processing (alternative to --output)")
    parser.add_argument("--speaker", type=str, help="Speaker profile to use (default: EN-FEMALE-1-NEUTRAL)")
    parser.add_argument("--force", action="store_true", help="Overwrite existing files instead of skipping them")
    
    args = parser.parse_args()
    
    # Initialize the TTS interface
    interface = setup_tts_interface()
    
    # Determine output path/directory
    output_path = args.output or args.output_dir
    
    try:
        if args.interactive:
            interactive_mode(interface)
        
        elif args.text:
            if not output_path:
                output_path = "output.wav"
            generate_audio(interface, args.text, output_path, args.speaker)
        
        elif args.file:
            if not output_path:
                output_path = "output_audio"
            process_file(interface, args.file, output_path, args.speaker)
        
        elif args.lithuanian:
            if not output_path:
                output_path = f"{sanitize_lithuanian_word(args.lithuanian)}.wav"
            generate_lithuanian_audio(interface, args.lithuanian, output_path, args.speaker)
        
        elif args.lithuanian_batch:
            if not output_path:
                output_path = "lithuanian_audio"
            
            success_count, total_count = process_lithuanian_batch(
                interface, 
                args.lithuanian_batch, 
                output_path, 
                args.speaker,
                args.force
            )
            
            print(f"\nCompleted: {success_count}/{total_count} Lithuanian audio files generated successfully")
    
    except KeyboardInterrupt:
        print("\nProcess interrupted by user")
    except Exception as e:
        print(f"Error: {e}")
    
    print("Done!")


if __name__ == "__main__":
    main()