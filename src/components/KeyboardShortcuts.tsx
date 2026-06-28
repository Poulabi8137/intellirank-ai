import { useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Box, Flex, Text, TextField, Card, ScrollArea, Button, Badge } from '@radix-ui/themes';
import cn from 'clsx';
import styles from './KeyboardShortcuts.module.css';

interface KeyboardShortcut {
  key: string;
  modifiers: ('ctrl' | 'meta' | 'alt' | 'shift')[];
  description: string;
  action: () => void;
  commandPalette?: boolean;
}

interface CommandPaletteProps {
  shortcuts: KeyboardShortcut[];
  isOpen: boolean;
  onClose: () => void;
  onSearch?: (query: string) => void;
}

export function CommandPalette({
  shortcuts,
  isOpen,
  onClose,
  onSearch: _onSearch,
}: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, shortcuts.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const filteredShortcuts = shortcuts.filter(shortcut =>
          shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          shortcut.key.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filteredShortcuts[selectedIndex]) {
          filteredShortcuts[selectedIndex].action();
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, searchQuery, selectedIndex, shortcuts, onClose]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filteredShortcuts = shortcuts.filter(shortcut =>
    shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shortcut.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return createPortal(
    <Box className={styles.overlay} role="dialog" aria-modal="true">
      <Card className={styles.commandPalette} role="searchbox">
        <Flex align="center" gap="sm" className={styles.searchContainer}>
          <Box className={styles.searchIcon} aria-hidden>🔍</Box>
          <TextField.Root
            ref={inputRef}
            className={styles.searchInput}
            placeholder="Type a command or search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Command palette search"
          />
          <Button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close command palette"
          >
            ✕
          </Button>
        </Flex>

        <ScrollArea className={styles.shortcutsList} role="listbox">
          {filteredShortcuts.length === 0 ? (
            <Box className={styles.noResults} role="status" aria-live="polite">
              <Text className={styles.noResultsText}>No commands found</Text>
            </Box>
          ) : (
            filteredShortcuts.map((shortcut, index) => (
              <Box
                key={`${shortcut.key}-${shortcut.description}`}
                className={cn(styles.shortcutItem, index === selectedIndex && styles.selected)}
                role="option"
                aria-selected={index === selectedIndex}
                tabIndex={-1}
                onClick={() => {
                  shortcut.action();
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <Flex justify="between" align="center">
                  <Flex align="center" gap="sm">
                    <Box className={styles.keybinding}>{formatKeybinding(shortcut)}</Box>
                    <Text className={styles.description}>{shortcut.description}</Text>
                  </Flex>
                  {shortcut.commandPalette && (
                    <Badge className={styles.commandPaletteBadge} role="status">Command</Badge>
                  )}
                </Flex>
              </Box>
            ))
          )}
        </ScrollArea>
      </Card>
    </Box>,
    document.body
  );
}

function formatKeybinding(shortcut: KeyboardShortcut): string {
  const modifiers = shortcut.modifiers.map(m => {
    switch (m) {
      case 'ctrl': return 'Ctrl';
      case 'meta': return 'Cmd';
      case 'alt': return 'Alt';
      case 'shift': return 'Shift';
      default: return m;
    }
  }).join(' + ');

  const key = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;

  return modifiers ? `${modifiers} + ${key}` : key;
}

interface KeyboardShortcutsProviderProps {
  children: ReactNode;
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const toggleCommandPalette = useCallback(() => {
    setCommandPaletteOpen(prev => !prev);
  }, []);

  const registerKeyboardShortcuts = useCallback((shortcuts: KeyboardShortcut[]) => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're in an input element
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      // Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
        return;
      }

      // Focus search
      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('[role="search"] input') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }

      // Handle custom shortcuts
      shortcuts.forEach(shortcut => {
        const activeModifiers = shortcut.modifiers.map(m => {
          switch (m) {
            case 'ctrl': return e.ctrlKey;
            case 'meta': return e.metaKey;
            case 'alt': return e.altKey;
            case 'shift': return e.shiftKey;
            default: return false;
          }
        });

        const allActive = activeModifiers.every(Boolean);
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (allActive && keyMatch) {
          e.preventDefault();
          shortcut.action();
        }
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    registerKeyboardShortcuts([
      // Focus Search
      {
        key: '/',
        modifiers: [],
        description: 'Focus candidate search',
        action: () => {
          const searchInput = document.querySelector('[role="search"] input') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
        },
      },
      // Command Palette
      {
        key: 'k',
        modifiers: ['ctrl', 'meta'],
        description: 'Open command palette',
        action: toggleCommandPalette,
        commandPalette: true,
      },
      // Clear filters
      {
        key: '/',
        modifiers: ['ctrl', 'meta'],
        description: 'Clear all filters',
        action: () => {
          // Trigger clear filters event
          window.dispatchEvent(new CustomEvent('clear-filters'));
        },
      },
      // Export
      {
        key: 'e',
        modifiers: ['ctrl', 'meta'],
        description: 'Export current results',
        action: () => {
          // Trigger export event
          window.dispatchEvent(new CustomEvent('export-results'));
        },
      },
      // Shortlist
      {
        key: 's',
        modifiers: ['ctrl', 'meta'],
        description: 'Add selected to shortlist',
        action: () => {
          // Trigger shortlist event
          window.dispatchEvent(new CustomEvent('shortlist-selected'));
        },
      },
      // Comparison
      {
        key: 'c',
        modifiers: ['ctrl', 'meta'],
        description: 'Toggle comparison view',
        action: () => {
          // Trigger comparison toggle event
          window.dispatchEvent(new CustomEvent('toggle-comparison'));
        },
      },
      // Hidden Gems
      {
        key: 'h',
        modifiers: ['ctrl', 'meta'],
        description: 'Toggle hidden gems view',
        action: () => {
          // Trigger hidden gems toggle event
          window.dispatchEvent(new CustomEvent('toggle-hidden-gems'));
        },
      },
    ]);
  }, [registerKeyboardShortcuts, toggleCommandPalette]);

  return (
    <>
      {children}
      <CommandPalette
        shortcuts={[]}
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSearch={() => {}}
      />
    </>
  );
}

interface ShortcutHintProps {
  position?: 'top-right' | 'bottom-left' | 'bottom-right';
}

export function ShortcutHints({ position = 'bottom-right' }: ShortcutHintProps) {
  const getPositionClass = () => {
    switch (position) {
      case 'top-right': return styles.hintsTopRight;
      case 'bottom-left': return styles.hintsBottomLeft;
      case 'bottom-right': return styles.hintsBottomRight;
      default: return styles.hintsBottomRight;
    }
  };

  return (
    <Box className={cn(styles.shortcutHints, getPositionClass())} role="status" aria-label="Keyboard shortcuts">
      <Text className={styles.hintsText}>
        Ctrl+K to search • / to focus • Esc to close
      </Text>
    </Box>
  );
}
