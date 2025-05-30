#!/usr/bin/env python3
"""
Text-to-Speech Generator using OuteAI/Llama-OuteTTS-1.0-1B

This script uses the OuteTTS model to generate audio files from text input.
It's optimized for Mac with M3 chip (Apple Silicon) and doesn't require NVIDIA/CUDA.
Supports multiple audio formats (WAV, MP3, OGG, FLAC) with configurable quality settings.

Usage:
    # Basic usage (defaults to WAV format)
    python genaudio_outetts.py --text "Your text here" --output output.wav
    
    # Generate MP3 audio (more space-efficient)
    python genaudio_outetts.py --text "Your text here" --format mp3 --output output.mp3
    
    # Process a text file with each line as separate audio, convert to OGG format
    python genaudio_outetts.py --file input.txt --format ogg --quality high --output-dir ./audio_files
    
    # Interactive mode with ability to change speakers and audio formats
    python genaudio_outetts.py --interactive
    
    # Lithuanian pronunciation examples
    python genaudio_outetts.py --lithuanian "duona" --format mp3 --output lithuanian_audio.mp3
    python genaudio_outetts.py --lithuanian "Laba diena" --format flac --output laba_diena.flac
    python genaudio_outetts.py --lithuanian-batch words.txt --format mp3 --output-dir ./lithuanian_audio
    
Audio Format Options:
    --format wav|mp3|ogg|flac   Select audio format (default: wav)
    --quality low|medium|high   Set quality level (default: medium)
    --keep-wav                  Keep original WAV files after conversion
"""

import argparse
import os
import sys
import time
import outetts
import re
import subprocess
import soundfile as sf
from pathlib import Path


# Complete list of Lithuanian letters and diacritics
# Lithuanian alphabet: a ą b c č d e ę ė f g h i į y j k l m n o p r s š t u ų ū v z ž
LITHUANIAN_CHARS = "aąbcčdeęėfghiįyjklmnoprsštuųūvzž"

# Audio format options
AUDIO_FORMATS = {
    "wav": {"extension": ".wav", "description": "WAV (uncompressed, largest files)"},
    "mp3": {"extension": ".mp3", "description": "MP3 (compressed, good compatibility)"},
    "ogg": {"extension": ".ogg", "description": "OGG Vorbis (compressed, better quality/size ratio)"},
    "flac": {"extension": ".flac", "description": "FLAC (lossless compression, medium size)"}
}

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


def generate_lithuanian_audio(interface, text, output_path, speaker_file="lithuanian_ash.json"):
    """
    Generate audio for a Lithuanian word or phrase with proper pronunciation.
    
    Args:
        interface: The OuteTTS interface
        text: The Lithuanian word or phrase to pronounce
        output_path: Path to save the audio file
        speaker_file: Optional speaker profile file (default is a generic Lithuanian speaker)
    
    Returns:
        Path to the generated audio file or None if failed
    """
    sanitized_text = sanitize_lithuanian_word(text)
    if not sanitized_text:
        print(f"Error: Invalid Lithuanian text format: {text}")
        return None
    
    print(f"Generating Lithuanian pronunciation for: {text}")
    
    # Load speaker profile
    if speaker_file is None:
        # Default to a female voice for Lithuanian
        # Using EN-FEMALE-1-NEUTRAL as it seems to handle Lithuanian pronunciation reasonably well
        # You may want to experiment with different speaker profiles for better results
        default_lithuanian_speaker = "EN-FEMALE-1-NEUTRAL"
        speaker = interface.load_default_speaker(default_lithuanian_speaker)
        print(f"Using default speaker for Lithuanian: {default_lithuanian_speaker}")
    else:
        speaker = interface.load_speaker(speaker_file)
        print(f"Using speaker from file: {speaker_file}")
    
    try:
        # Generate speech with just the Lithuanian text
        # The model should handle Lithuanian pronunciation based on the characters
        output = interface.generate(
            config=outetts.GenerationConfig(
                text=text,  # Just use the Lithuanian text directly
                speaker=speaker
            )
        )
        
        # Save to file - convert Path to string if needed
        output_path_str = str(output_path) if hasattr(output_path, 'is_file') else output_path
        output.save(output_path_str)
        print(f"Lithuanian audio saved to {output_path_str}")
        return output_path_str
        
    except Exception as e:
        print(f"Error generating Lithuanian audio for '{text}': {str(e)}")
        return None


def convert_audio(input_path, output_format="mp3", quality="medium", delete_original=False):
    """
    Convert audio file to a more space-efficient format.
    
    Args:
        input_path: Path to the input audio file (typically WAV)
        output_format: Target format - "mp3", "ogg", or "flac" (default: "mp3")
        quality: Quality setting - "low", "medium", or "high" (default: "medium")
        delete_original: Whether to delete the original file after conversion (default: False)
    
    Returns:
        Path to the converted file or None if conversion failed
    """
    if output_format not in AUDIO_FORMATS:
        print(f"Error: Unsupported output format '{output_format}'. Supported formats: {', '.join(AUDIO_FORMATS.keys())}")
        return None
    
    input_path = Path(input_path)
    if not input_path.exists():
        print(f"Error: Input file {input_path} not found")
        return None
    
    # Determine output path with new extension
    output_extension = AUDIO_FORMATS[output_format]["extension"]
    output_path = input_path.with_suffix(output_extension)
    
    # Set quality parameters based on format
    quality_settings = {
        "mp3": {"low": "96k", "medium": "128k", "high": "192k"},
        "ogg": {"low": "3", "medium": "5", "high": "7"},
        "flac": {"low": "1", "medium": "5", "high": "8"}
    }
    
    quality_value = quality_settings.get(output_format, {}).get(quality, "medium")
    
    try:
        # Method 1: Try using soundfile if format is supported
        if output_format in ["flac", "ogg"]:
            try:
                data, samplerate = sf.read(str(input_path))
                sf.write(str(output_path), data, samplerate, format=output_format.upper())
                print(f"Converted {input_path} to {output_path} using soundfile")
                
                if delete_original:
                    input_path.unlink()
                    
                return output_path
            except Exception as e:
                print(f"Warning: soundfile conversion failed: {e}. Trying ffmpeg...")
        
        # Method 2: Use ffmpeg as a fallback or for MP3
        cmd = []
        if output_format == "mp3":
            cmd = ["ffmpeg", "-y", "-i", str(input_path), "-b:a", quality_value, str(output_path)]
        elif output_format == "ogg":
            cmd = ["ffmpeg", "-y", "-i", str(input_path), "-c:a", "libvorbis", "-q:a", quality_value, str(output_path)]
        elif output_format == "flac":
            cmd = ["ffmpeg", "-y", "-i", str(input_path), "-compression_level", quality_value, str(output_path)]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"Error during conversion: {result.stderr}")
            return None
        
        print(f"Converted {input_path} to {output_path} using ffmpeg")
        
        # Get file sizes for comparison
        original_size = input_path.stat().st_size
        converted_size = output_path.stat().st_size
        size_reduction = (1 - (converted_size / original_size)) * 100
        
        print(f"Size reduction: {size_reduction:.1f}% (from {original_size/1024:.1f}KB to {converted_size/1024:.1f}KB)")
        
        if delete_original:
            input_path.unlink()
            print(f"Deleted original file: {input_path}")
        
        return output_path
        
    except Exception as e:
        print(f"Error converting audio: {str(e)}")
        return None


def process_lithuanian_batch(interface, file_path, output_dir, force=False):
    """
    Process a batch of Lithuanian words or phrases from a file.
    
    Args:
        interface: The OuteTTS interface
        file_path: Path to the file containing Lithuanian words or phrases (one per line)
        output_dir: Directory to save the audio files
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
        if generate_lithuanian_audio(interface, entry, output_file):
            success_count += 1
            # Add a small delay between generations to avoid overloading
            time.sleep(0.5)
    
    return success_count, total_count


def interactive_mode(interface):
    """Run in interactive mode, allowing the user to generate multiple audio files."""
    print("\nEntering interactive mode.")
    print("Commands:")
    print("  'exit' - Quit interactive mode")
    print("  'speakers' - List and select available speakers")
    print("  'formats' - List and select available audio formats")
    print("  'help' - Show this help message")
    
    # Default settings
    current_speaker = "EN-FEMALE-1-NEUTRAL"
    speaker = interface.load_default_speaker(current_speaker)
    current_format = "mp3"  # Default to MP3 for space efficiency
    current_quality = "medium"
    delete_original = True
    
    while True:
        user_input = input("\nEnter text (or command): ").strip()
        
        if user_input.lower() == 'exit':
            print("Exiting interactive mode.")
            break
        
        elif user_input.lower() == 'help':
            print("\nCommands:")
            print("  'exit' - Quit interactive mode")
            print("  'speakers' - List and select available speakers")
            print("  'formats' - List and select available audio formats")
            print("  'help' - Show this help message")
        
        elif user_input.lower() == 'speakers':
            speakers = list_available_speakers(interface)
            speaker_idx = input("Select speaker number (or press Enter to keep current): ")
            if speaker_idx and speaker_idx.isdigit() and 1 <= int(speaker_idx) <= len(speakers):
                current_speaker = speakers[int(speaker_idx) - 1]
                speaker = interface.load_default_speaker(current_speaker)
                print(f"Speaker changed to: {current_speaker}")
            else:
                print(f"Keeping current speaker: {current_speaker}")
        
        elif user_input.lower() == 'formats':
            print("\nAvailable audio formats:")
            for i, (format_key, format_info) in enumerate(AUDIO_FORMATS.items(), 1):
                print(f"{i}. {format_key.upper()} - {format_info['description']}")
            
            format_idx = input("Select format number (or press Enter to keep current): ")
            if format_idx and format_idx.isdigit() and 1 <= int(format_idx) <= len(AUDIO_FORMATS):
                current_format = list(AUDIO_FORMATS.keys())[int(format_idx) - 1]
                print(f"Format changed to: {current_format.upper()}")
                
                # Ask for quality if not WAV
                if current_format != "wav":
                    print("\nQuality options:")
                    print("1. low - Smaller file size, lower quality")
                    print("2. medium - Balanced file size and quality")
                    print("3. high - Larger file size, better quality")
                    
                    quality_idx = input("Select quality (or press Enter for medium): ")
                    if quality_idx == "1":
                        current_quality = "low"
                    elif quality_idx == "3":
                        current_quality = "high"
                    else:
                        current_quality = "medium"
                    
                    print(f"Quality set to: {current_quality}")
                    
                    # Ask about keeping original WAV files
                    keep_wav = input("Keep original WAV files after conversion? (y/N): ").lower()
                    delete_original = keep_wav != 'y'
            else:
                print(f"Keeping current format: {current_format.upper()}")
        
        elif user_input:
            # Determine default filename with appropriate extension
            extension = AUDIO_FORMATS[current_format]["extension"]
            default_filename = f"output{extension}"
            
            output_file = input(f"Enter output filename (default: {default_filename}): ").strip()
            if not output_file:
                output_file = default_filename
            
            # Add extension if not provided
            if not any(output_file.endswith(fmt["extension"]) for fmt in AUDIO_FORMATS.values()):
                output_file = f"{output_file}{extension}"
            
            # For non-WAV formats, we need to generate WAV first, then convert
            if current_format != "wav" and not output_file.endswith(".wav"):
                wav_path = Path(output_file).with_suffix(".wav")
                generate_audio(interface, user_input, str(wav_path), current_speaker)
                
                # Convert to desired format
                convert_audio(wav_path, current_format, current_quality, delete_original)
            else:
                # Generate audio directly
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
    
    # Audio format options
    parser.add_argument("--format", type=str, choices=list(AUDIO_FORMATS.keys()), default="wav",
                        help="Audio format to use (default: wav)")
    parser.add_argument("--quality", type=str, choices=["low", "medium", "high"], default="medium",
                        help="Audio quality setting (default: medium)")
    parser.add_argument("--keep-wav", action="store_true", 
                        help="Keep original WAV files after conversion (default: delete WAV files)")
    
    args = parser.parse_args()
    
    # Initialize the TTS interface
    interface = setup_tts_interface()
    
    # Determine output path/directory
    output_path = args.output or args.output_dir
    
    try:
        # Check if we need to convert audio (only if format is not wav)
        need_conversion = args.format != "wav"
        delete_original = not args.keep_wav
        
        if args.interactive:
            interactive_mode(interface)
        
        elif args.text:
            if not output_path:
                # Use the appropriate extension based on format
                extension = AUDIO_FORMATS[args.format]["extension"]
                output_path = f"output{extension}"
            
            # Always generate WAV first if we need to convert
            if need_conversion and not output_path.endswith(".wav"):
                wav_path = Path(output_path).with_suffix(".wav")
                generate_audio(interface, args.text, str(wav_path), args.speaker)
                
                # Convert to desired format
                convert_audio(wav_path, args.format, args.quality, delete_original)
            else:
                generate_audio(interface, args.text, output_path, args.speaker)
        
        elif args.file:
            if not output_path:
                output_path = "output_audio"
            
            # Create output directory
            os.makedirs(output_path, exist_ok=True)
            
            # Process file to generate WAV files
            process_file(interface, args.file, output_path, args.speaker)
            
            # Convert all WAV files if needed
            if need_conversion:
                print(f"\nConverting audio files to {args.format.upper()} format...")
                wav_files = list(Path(output_path).glob("*.wav"))
                
                for wav_file in wav_files:
                    convert_audio(wav_file, args.format, args.quality, delete_original)
        
        elif args.lithuanian:
            if not output_path:
                sanitized = sanitize_lithuanian_word(args.lithuanian)
                extension = AUDIO_FORMATS[args.format]["extension"]
                output_path = f"{sanitized}{extension}"
            
            # Always generate WAV first if we need to convert
            if need_conversion and not output_path.endswith(".wav"):
                wav_path = Path(output_path).with_suffix(".wav")
                generate_lithuanian_audio(interface, args.lithuanian, str(wav_path))
                
                # Convert to desired format
                convert_audio(wav_path, args.format, args.quality, delete_original)
            else:
                generate_lithuanian_audio(interface, args.lithuanian, output_path)
        
        elif args.lithuanian_batch:
            if not output_path:
                output_path = "lithuanian_audio"
            
            # Process batch to generate WAV files
            success_count, total_count = process_lithuanian_batch(
                interface, 
                args.lithuanian_batch, 
                output_path, 
                args.force
            )
            
            # Convert all WAV files if needed
            if need_conversion:
                print(f"\nConverting audio files to {args.format.upper()} format...")
                wav_files = list(Path(output_path).glob("*.wav"))
                
                converted_count = 0
                for wav_file in wav_files:
                    if convert_audio(wav_file, args.format, args.quality, delete_original):
                        converted_count += 1
                
                print(f"Converted {converted_count}/{len(wav_files)} files to {args.format.upper()} format")
            
            print(f"\nCompleted: {success_count}/{total_count} Lithuanian audio files generated successfully")
    
    except KeyboardInterrupt:
        print("\nProcess interrupted by user")
    except Exception as e:
        print(f"Error: {e}")
    
    print("Done!")


if __name__ == "__main__":
    main()