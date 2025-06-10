#!/usr/bin/python3

"""Wordlists for Trakaido, a language learning app for Lithuanian."""

from .nouns import *
from .verbs import *

all_words = {
  "nouns_one": nouns_one,
  "nouns_two": nouns_two,
  "nouns_three": nouns_three,
  "nouns_four": nouns_four,
  "common_words": common_words,
  "verbs_present": verbs_present,
  "verbs_past": verbs_past,
}

def get_all_word_pairs_flat():
    """
    Creates a flat list of all word pairs from all corpora.
    
    Returns:
        list: A list of dictionaries, each containing 'english', 'lithuanian', 
              'corpus', and 'group' keys.
    """
    flat_words = []
    
    # Iterate through all corpora
    for corpus_name, corpus_data in all_words.items():
        # Iterate through all groups
        for group_name, word_pairs in corpus_data.items():
            # Add each word pair to the flat list with corpus information
            for word_pair in word_pairs:
                flat_word = word_pair.copy()  # Create a copy to avoid modifying the original
                flat_word['corpus'] = corpus_name
                flat_word['group'] = group_name
                flat_words.append(flat_word)
    
    return flat_words

def check_for_duplicates():
    """
    Checks for duplicate words in the wordlists.
    
    This function identifies two types of duplicates:
    1. Exact duplicates - the same English word appears multiple times
    2. Semantic duplicates - the same English word with different Lithuanian translations
       (potentially different meanings)
    
    Returns:
        tuple: (exact_duplicates, semantic_duplicates)
            - exact_duplicates: A list of English words that appear multiple times
            - semantic_duplicates: A dictionary where keys are English words and values
              are lists of different Lithuanian translations
    """
    flat_words = get_all_word_pairs_flat()
    
    # Track word occurrences and translations
    word_count = {}
    word_translations = {}
    
    # Find duplicates
    exact_duplicates = []
    semantic_duplicates = {}
    
    for word_pair in flat_words:
        english = word_pair['english']
        lithuanian = word_pair['lithuanian']
        
        # Track word count
        if english in word_count:
            word_count[english] += 1
            if word_count[english] == 2:  # Only add to duplicates list once
                exact_duplicates.append(english)
        else:
            word_count[english] = 1
        
        # Track different translations
        if english in word_translations:
            if lithuanian not in word_translations[english]:
                word_translations[english].append(lithuanian)
                # If we find a new translation, it's a semantic duplicate
                if len(word_translations[english]) == 2:  # Only add to semantic duplicates once
                    semantic_duplicates[english] = word_translations[english]
        else:
            word_translations[english] = [lithuanian]
    
    return exact_duplicates, semantic_duplicates


def find_missing_words(input_words):
    """
    Find English words that are not already in the app's wordlists.
    
    Args:
        input_words: Either a list of words ["word1", "word2"] or a file path 
                    containing one word per line.
    
    Returns:
        list: A list of English words (in order) that are not found in any 
              of the app's wordlists.
    """
    # Get all existing English words from the app
    existing_words = set()
    flat_words = get_all_word_pairs_flat()
    for word_pair in flat_words:
        existing_words.add(word_pair['english'].lower())
    
    # Determine if input_words is a file path or a list
    if isinstance(input_words, str):
        # It's a file path
        try:
            with open(input_words, 'r', encoding='utf-8') as file:
                words_to_check = [line.strip() for line in file if line.strip()]
        except FileNotFoundError:
            raise FileNotFoundError(f"File not found: {input_words}")
        except Exception as e:
            raise Exception(f"Error reading file {input_words}: {e}")
    elif isinstance(input_words, list):
        # It's a list of words
        words_to_check = input_words
    else:
        raise TypeError("input_words must be either a list of words or a file path string")
    
    # Find missing words (preserve order)
    missing_words = []
    for word in words_to_check:
        if word.lower() not in existing_words:
            missing_words.append(word)
    
    return missing_words