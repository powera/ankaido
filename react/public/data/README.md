# Data Directory

This directory contains vocabulary data files used by the Ankaido application. 

**Important:** Sample data. Do not use in production without license review.

## File Structure

### vocabulary_registry.json

The main registry file that defines all available vocabularies and their metadata.

**Structure:**
```json
{
  "vocabularies": [
    {
      "id": "unique_vocabulary_id",
      "name": "Display Name",
      "corpus": "Corpus Name",
      "file": "data_file.json",
      "description": "Description of the vocabulary",
      "enabled": true,
      "typing_directions": "Instructions for the user",
      "metadata": {
        "source": "Source information",
        "language_pair": "language1-language2",
        "difficulty_levels": ["beginner", "intermediate", "advanced"],
        "word_count": 100,
        "last_updated": "2024-01-01T00:00:00.000000"
      }
    }
  ],
  "schema_version": "1.0",
  "last_updated": "2024-01-01T00:00:00.000000Z"
}
```

### Vocabulary Data Files

Individual vocabulary files contain arrays of vocabulary entries with a consistent term-definition structure:

```json
[
  {
    "term": "word_or_term",
    "definition": "explanation_or_translation",
    "corpus": "Corpus Name",
    "group": "Category/Group",
    "guid": "unique_identifier",
    "levels": ["difficulty_level"],
    "alternatives": {
      "term": ["alternative_terms", "synonyms"]
    },
    "metadata": {
      "difficulty_level": 1,
      "notes": "Additional context, examples, or etymology",
      "tags": ["tag1", "tag2", "tag3"]
    }
  }
]
```

## Field Descriptions

### Common Fields

- **corpus**: The name of the vocabulary corpus/collection
- **group**: Category or thematic grouping within the corpus
- **guid**: Unique identifier for the entry
- **levels**: Array of difficulty levels (beginner, intermediate, advanced, expert)
- **alternatives**: Object containing alternative forms or synonyms
- **metadata**: Additional information about the entry

### Metadata Fields

- **difficulty_level**: Numeric difficulty (1=beginner, 2=intermediate, 3=advanced, etc.)
- **notes**: Additional context, examples, or etymology
- **tags**: Array of descriptive tags for categorization

### Core Content Fields

- **term**: The word, phrase, or concept being defined
- **definition**: The explanation, translation, or meaning of the term

**Note**: For language-learning vocabularies, the `term` would typically be the foreign-language word, and the `definition` would be the English translation.

## Difficulty Levels

- **beginner**: Basic, commonly used terms
- **intermediate**: Moderately complex terms requiring some background
- **advanced**: Complex terms requiring significant expertise
- **expert**: Highly specialized or rare terms
