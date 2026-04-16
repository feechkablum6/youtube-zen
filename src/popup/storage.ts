import { DEFAULT_SETTINGS } from '../shared/defaults';
import type { SettingsKey, ZenSettings } from '../shared/types';

type StorageChanges = Record<string, chrome.storage.StorageChange>;
type SettingsListener = (changes: StorageChanges) => void;

const DEFAULT_RECORD = DEFAULT_SETTINGS as unknown as Record<string, unknown>;

export function getSettings(): Promise<ZenSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_RECORD, (stored) => {
      resolve(stored as ZenSettings);
    });
  });
}

export function setSetting<K extends SettingsKey>(
  key: K,
  value: ZenSettings[K]
): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [key]: value }, () => resolve());
  });
}

export function subscribeSettings(listener: SettingsListener): () => void {
  const wrapped = (changes: StorageChanges, areaName: string) => {
    if (areaName !== 'sync') return;
    listener(changes);
  };
  chrome.storage.onChanged.addListener(wrapped);
  return () => chrome.storage.onChanged.removeListener(wrapped);
}
