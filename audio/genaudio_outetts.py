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

from audio_utils import (
    sanitize_lithuanian_word,
    read_words_from_file,
    ensure_output_directory,
    LITHUANIAN_TTS_INSTRUCTIONS
)

# Get the directory where this script is located
SCRIPT_DIR = Path(__file__).parent

# Audio format options
AUDIO_FORMATS = {
    "wav": {"extension": ".wav", "description": "WAV (uncompressed, largest files)"},
    "mp3": {"extension": ".mp3", "description": "MP3 (compressed, good compatibility)"},
    "ogg": {"extension": ".ogg", "description": "OGG Vorbis (compressed, better quality/size ratio)"},
    "flac": {"extension": ".flac", "description": "FLAC (lossless compression, medium size)"}
}

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


def process_file(interface, file_path, output_dir, speaker_name=None, force=False, output_format="wav"):
    """
    Process a text file and generate audio for each line.
    
    Args:
        interface: The TTS interface
        file_path: Path to the text file
        output_dir: Directory to save the audio files
        speaker_name: Speaker profile to use
        force: Whether to overwrite existing files
        output_format: The desired final output format (wav, mp3, ogg, flac)
    """
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} not found")
        return
    
    # Create output directory if it doesn't exist
    output_dir = ensure_output_directory(output_dir)
    
    lines = read_words_from_file(file_path)
    
    if not lines:
        print("No lines found in the file")
        return
    
    print(f"Processing {len(lines)} lines from {file_path}")
    
    # Get the extension for the target format
    target_extension = AUDIO_FORMATS.get(output_format, {}).get("extension", ".wav")
    
    for i, line in enumerate(lines):
        wav_file = output_dir / f"audio_{i+1}.wav"
        target_file = output_dir / f"audio_{i+1}{target_extension}"
        
        # Skip if target file exists and not forcing overwrite
        if target_file.exists() and not force:
            print(f"Skipping line {i+1}: file already exists in {output_format} format")
            continue
        
        # Skip if WAV file exists and not forcing overwrite
        if wav_file.exists() and not force and output_format == "wav":
            print(f"Skipping line {i+1}: WAV file already exists")
            continue
        
        print(f"Processing line {i+1}/{len(lines)}")
        generate_audio(interface, line, str(wav_file), speaker_name)


def generate_lithuanian_audio(interface, text, output_path, speaker_name="ash"):
    """
    Generate audio for a Lithuanian word or phrase with proper pronunciation.
    
    Args:
        interface: The OuteTTS interface
        text: The Lithuanian word or phrase to pronounce
        output_path: Path to save the audio file
        speaker_name: Speaker voice to use (ash, alloy, or nova). Default is ash.
    
    Returns:
        Path to the generated audio file or None if failed
    """
    # Map speaker name to the corresponding JSON file
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    speaker_file = os.path.join(script_dir, f"lithuanian_{speaker_name}.json")
    
    # Verify that the speaker file exists
    if not os.path.exists(speaker_file):
        raise Exception(f"Speaker file {speaker_file} not found. Available options are: ash, alloy, nova.")
    sanitized_text = sanitize_lithuanian_word(text)
    if not sanitized_text:
        print(f"Error: Invalid Lithuanian text format: {text}")
        return None
    
    print(f"Generating Lithuanian pronunciation for: {text}")
    
    # Load speaker profile
    if speaker_file is None:
        raise Exception("Speaker file is required for Lithuanian audio generation")
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


def process_lithuanian_batch(interface, file_path, output_dir, force=False, speaker_name="ash", output_format="wav"):
    """
    Process a batch of Lithuanian words or phrases from a file.
    
    Args:
        interface: The OuteTTS interface
        file_path: Path to the file containing Lithuanian words or phrases (one per line)
        output_dir: Directory to save the audio files
        force: Whether to overwrite existing files
        speaker_name: Lithuanian speaker voice to use (ash, alloy, or nova). Default is ash.
        output_format: The desired final output format (wav, mp3, ogg, flac)
    
    Returns:
        Tuple of (success_count, total_count)
    """
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} not found")
        return 0, 0
    
    # Create output directory if it doesn't exist
    output_dir = ensure_output_directory(output_dir)
    
    entries = read_words_from_file(file_path)
    
    if not entries:
        print("No entries found in the file")
        return 0, 0
    
    print(f"Processing {len(entries)} Lithuanian entries from {file_path}")
    
    success_count = 0
    total_count = len(entries)
    
    # Get the extension for the target format
    target_extension = AUDIO_FORMATS.get(output_format, {}).get("extension", ".wav")
    
    for i, entry in enumerate(entries, 1):
        sanitized = sanitize_lithuanian_word(entry)
        if not sanitized:
            print(f"[{i}/{total_count}] Skipping invalid entry: {entry}")
            continue
        
        # Check if the target format file already exists
        target_file = output_dir / f"{sanitized}{target_extension}"
        wav_file = output_dir / f"{sanitized}.wav"
        
        # Skip if target file exists and not forcing overwrite
        if target_file.exists() and not force:
            print(f"[{i}/{total_count}] Skipping {entry}: file already exists in {output_format} format")
            success_count += 1  # Count as success since file exists
            continue
        
        # Skip if WAV file exists and not forcing overwrite
        if wav_file.exists() and not force:
            print(f"[{i}/{total_count}] Skipping {entry}: WAV file already exists")
            success_count += 1  # Count as success since file exists
            continue
        
        print(f"[{i}/{total_count}] Processing: {entry}")
        if generate_lithuanian_audio(interface, entry, wav_file, speaker_name):
            success_count += 1
            # Add a small delay between generations to avoid overloading
            time.sleep(0.5)
    
    return success_count, total_count


def main():
    parser = argparse.ArgumentParser(description="Generate audio files using OuteTTS")
    
    # Create a mutually exclusive group for input methods
    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument("--text", type=str, help="Text to convert to speech")
    input_group.add_argument("--file", type=str, help="Path to a text file to process")
    input_group.add_argument("--lithuanian", type=str, help="Lithuanian word or phrase to generate pronunciation for")
    input_group.add_argument("--lithuanian-batch", type=str, help="Path to a file with Lithuanian words or phrases (one per line)")
    
    parser.add_argument("--output", type=str, help="Output audio file path (for single text) or directory (for file input)")
    parser.add_argument("--output-dir", type=str, help="Output directory for batch processing (alternative to --output)")
    parser.add_argument("--speaker", type=str, help="Speaker profile to use (default: EN-FEMALE-1-NEUTRAL)")
    parser.add_argument("--lithuanian-speaker", type=str, choices=["ash", "alloy", "nova"], default="ash",
                        help="Lithuanian speaker voice to use (ash, alloy, or nova) (default: ash)")
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
        
        if args.text:
            if not output_path:
                # Use the appropriate extension based on format
                extension = AUDIO_FORMATS[args.format]["extension"]
                output_path = f"output{extension}"
            
            # Check if the target format file already exists
            target_path = Path(output_path)
            if target_path.exists() and not args.force:
                print(f"Skipping generation: {target_path.name} already exists in {args.format} format")
            else:
                # Always generate WAV first if we need to convert
                if need_conversion and not output_path.endswith(".wav"):
                    wav_path = Path(output_path).with_suffix(".wav")
                    
                    # Check if WAV exists and we're not forcing overwrite
                    if wav_path.exists() and not args.force:
                        print(f"WAV file {wav_path.name} already exists, using it for conversion")
                    else:
                        generate_audio(interface, args.text, str(wav_path), args.speaker)
                    
                    # Convert to desired format if target doesn't exist or force is True
                    if not target_path.exists() or args.force:
                        convert_audio(wav_path, args.format, args.quality, delete_original)
                else:
                    generate_audio(interface, args.text, output_path, args.speaker)
        
        elif args.file:
            if not output_path:
                output_path = "output_audio"
            
            # Create output directory
            os.makedirs(output_path, exist_ok=True)
            
            # Process file to generate WAV files
            process_file(interface, args.file, output_path, args.speaker, args.force, args.format)
            
            # Convert all WAV files if needed
            if need_conversion:
                print(f"\nConverting audio files to {args.format.upper()} format...")
                wav_files = list(Path(output_path).glob("*.wav"))
                
                converted_count = 0
                for wav_file in wav_files:
                    # Check if the target format file already exists
                    target_file = wav_file.with_suffix(AUDIO_FORMATS[args.format]["extension"])
                    if target_file.exists() and not args.force:
                        print(f"Skipping conversion of {wav_file.name}: {target_file.name} already exists")
                        continue
                        
                    if convert_audio(wav_file, args.format, args.quality, delete_original):
                        converted_count += 1
                
                print(f"Converted {converted_count}/{len(wav_files)} files to {args.format.upper()} format")
        
        elif args.lithuanian:
            if not output_path:
                sanitized = sanitize_lithuanian_word(args.lithuanian)
                extension = AUDIO_FORMATS[args.format]["extension"]
                # Use the new directory structure with speaker-specific subdirectory
                output_dir = ensure_output_directory(SCRIPT_DIR / f"lithuanian-audio-cache/{args.lithuanian_speaker}")
                output_path = output_dir / f"{sanitized}{extension}"
            
            # Check if the target format file already exists
            target_path = Path(output_path)
            if target_path.exists() and not args.force:
                print(f"Skipping generation: {target_path.name} already exists in {args.format} format")
            else:
                # Always generate WAV first if we need to convert
                if need_conversion and not str(output_path).endswith(".wav"):
                    wav_path = Path(output_path).with_suffix(".wav")
                    
                    # Check if WAV exists and we're not forcing overwrite
                    if wav_path.exists() and not args.force:
                        print(f"WAV file {wav_path.name} already exists, using it for conversion")
                    else:
                        generate_lithuanian_audio(interface, args.lithuanian, str(wav_path), args.lithuanian_speaker)
                    
                    # Convert to desired format if target doesn't exist or force is True
                    if not target_path.exists() or args.force:
                        convert_audio(wav_path, args.format, args.quality, delete_original)
                else:
                    generate_lithuanian_audio(interface, args.lithuanian, str(output_path), args.lithuanian_speaker)
        
        elif args.lithuanian_batch:
            if not output_path:
                # Use the new directory structure with speaker-specific subdirectory
                output_path = SCRIPT_DIR / f"lithuanian-audio-cache/{args.lithuanian_speaker}"
            
            # Process batch to generate WAV files, passing the target format
            success_count, total_count = process_lithuanian_batch(
                interface, 
                args.lithuanian_batch, 
                output_path, 
                args.force,
                args.lithuanian_speaker,
                args.format  # Pass the target format
            )
            
            # Convert all WAV files if needed
            if need_conversion:
                print(f"\nConverting audio files to {args.format.upper()} format...")
                # Make sure we're looking in the right directory
                output_dir = Path(output_path)
                wav_files = list(output_dir.glob("*.wav"))
                
                converted_count = 0
                for wav_file in wav_files:
                    # Check if the target format file already exists
                    target_file = wav_file.with_suffix(AUDIO_FORMATS[args.format]["extension"])
                    if target_file.exists() and not args.force:
                        print(f"Skipping conversion of {wav_file.name}: {target_file.name} already exists")
                        continue
                        
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