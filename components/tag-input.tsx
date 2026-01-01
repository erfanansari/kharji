'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Tag as TagIcon, Plus } from 'lucide-react';
import { type Tag } from '@/lib/types/expense';

interface TagInputProps {
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
}

export function TagInput({ selectedTags, onTagsChange }: TagInputProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch all tags on mount
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/tags');
        if (response.ok) {
          const tags = await response.json();
          setAllTags(tags);
        }
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      }
    };

    fetchTags();
  }, []);

  // Filter tags based on input
  useEffect(() => {
    if (inputValue.trim()) {
      const search = inputValue.toLowerCase();
      const filtered = allTags.filter(
        tag =>
          tag.name.toLowerCase().includes(search) &&
          !selectedTags.some(selected => selected.id === tag.id)
      );
      setFilteredTags(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredTags([]);
      setShowSuggestions(false);
    }
  }, [inputValue, allTags, selectedTags]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const createTag = async (name: string) => {
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });

      if (response.ok) {
        const newTag = await response.json();
        setAllTags(prev => [...prev, newTag]);
        onTagsChange([...selectedTags, newTag]);
        setInputValue('');
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const selectTag = (tag: Tag) => {
    onTagsChange([...selectedTags, tag]);
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (tagId: number) => {
    onTagsChange(selectedTags.filter(tag => tag.id !== tagId));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();

      // If there's an exact match, select it
      const exactMatch = filteredTags.find(
        tag => tag.name.toLowerCase() === inputValue.toLowerCase()
      );

      if (exactMatch) {
        selectTag(exactMatch);
      } else {
        // Create new tag
        createTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeTag(selectedTags[selectedTags.length - 1].id);
    }
  };

  const hasExactMatch = filteredTags.some(
    tag => tag.name.toLowerCase() === inputValue.toLowerCase()
  );

  return (
    <div className="relative">
      {/* Selected Tags + Input */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent min-h-[42px]">
        {selectedTags.map(tag => (
          <div
            key={tag.id}
            className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium"
          >
            <TagIcon className="h-3 w-3" />
            <span>{tag.name}</span>
            <button
              type="button"
              onClick={() => removeTag(tag.id)}
              className="hover:text-blue-900 dark:hover:text-blue-200"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue && setShowSuggestions(true)}
          placeholder={selectedTags.length === 0 ? "Add tags ..." : ""}
          className="flex-1 min-w-[120px] outline-none bg-transparent text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-500"
        />
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (inputValue.trim() || filteredTags.length > 0) && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto"
        >
          {filteredTags.map(tag => (
            <button
              key={tag.id}
              type="button"
              onClick={() => selectTag(tag)}
              className="w-full px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2"
            >
              <TagIcon className="h-3 w-3 text-zinc-500" />
              {tag.name}
            </button>
          ))}

          {/* Create new tag option */}
          {inputValue.trim() && !hasExactMatch && (
            <button
              type="button"
              onClick={() => createTag(inputValue)}
              disabled={isCreating}
              className="w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2 border-t border-zinc-200 dark:border-zinc-700 disabled:opacity-50"
            >
              <Plus className="h-3 w-3" />
              {isCreating ? 'Creating...' : `Create "${inputValue}"`}
            </button>
          )}

          {filteredTags.length === 0 && !inputValue.trim() && (
            <div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
              Start typing to search or create tags...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
