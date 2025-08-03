/**
 * Hook for loading options lists with client-side caching
 */

import { useEffect, useState } from "react";

import type { OptionsList } from "~/models/optionsList.server";
import {
  OptionsListCache,
  PersistentOptionsListCache,
} from "~/utils/optionsListCache";

interface UseOptionsListState {
  optionsList: OptionsList | null;
  isLoading: boolean;
  isCached: boolean;
  error: string | null;
}

export function useOptionsListWithCache(
  initialData: OptionsList | null,
  optionsListId: string,
): UseOptionsListState {
  const [state, setState] = useState<UseOptionsListState>({
    optionsList: initialData,
    isLoading: false,
    isCached: false,
    error: null,
  });

  useEffect(() => {
    // If we have initial data, cache it
    if (initialData) {
      OptionsListCache.set(initialData);
      PersistentOptionsListCache.set(initialData);
      setState((prev) => ({
        ...prev,
        optionsList: initialData,
        isCached: false,
      }));
      return;
    }

    // Try to get from cache first
    const cached =
      OptionsListCache.get(optionsListId) ||
      PersistentOptionsListCache.get(optionsListId);

    if (cached) {
      setState((prev) => ({
        ...prev,
        optionsList: cached,
        isCached: true,
        isLoading: false,
      }));
      return;
    }

    // If not in cache and no initial data, we need to load it
    // This would typically trigger a fetch or navigation
    setState((prev) => ({ ...prev, isLoading: true, isCached: false }));
  }, [initialData, optionsListId]);

  return state;
}

// Utility to preload an options list into cache
export async function preloadOptionsList(
  id: string,
  userId: string,
): Promise<void> {
  // Check if already cached
  if (OptionsListCache.has(id)) {
    return;
  }

  try {
    // This would be a direct API call, bypassing Remix loader
    const response = await fetch(`/api/options-lists/${id}`, {
      headers: {
        "X-User-ID": userId, // You'd implement proper auth headers
      },
    });

    if (response.ok) {
      const optionsList = await response.json();
      OptionsListCache.set(optionsList);
      PersistentOptionsListCache.set(optionsList);
      console.log(`⚡ Preloaded options list: ${id}`);
    }
  } catch (error) {
    console.warn(`Failed to preload options list ${id}:`, error);
  }
}
