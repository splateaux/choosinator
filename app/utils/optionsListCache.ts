/**
 * Client-side caching for options lists to reduce database queries
 */

import { OptionsList } from "~/models/optionsList.server";

interface CacheEntry {
  data: OptionsList;
  timestamp: number;
  expiresAt: number;
}

export class OptionsListCache {
  private static cache = new Map<string, CacheEntry>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static set(optionsList: OptionsList): void {
    const now = Date.now();
    this.cache.set(optionsList.id, {
      data: optionsList,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION,
    });

    // Clean up expired entries occasionally
    if (this.cache.size > 100) {
      this.cleanup();
    }
  }

  static get(id: string): OptionsList | null {
    const entry = this.cache.get(id);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(id);
      return null;
    }

    console.log(
      `📋 Cache HIT for options list: ${id} (${Date.now() - entry.timestamp}ms old)`,
    );
    return entry.data;
  }

  static has(id: string): boolean {
    return this.get(id) !== null;
  }

  static invalidate(id: string): void {
    this.cache.delete(id);
    console.log(`🗑️ Cache invalidated for options list: ${id}`);
  }

  static clear(): void {
    this.cache.clear();
    console.log("🧹 Options list cache cleared");
  }

  static getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // TODO: Implement hit rate tracking if needed
    };
  }

  private static cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(
        `🧹 Cleaned ${cleaned} expired entries from options list cache`,
      );
    }
  }
}

// Browser-only cache that persists across page reloads
export class PersistentOptionsListCache {
  private static readonly STORAGE_KEY = "choosinator_options_cache";
  private static readonly MAX_AGE = 10 * 60 * 1000; // 10 minutes

  static set(optionsList: OptionsList): void {
    if (typeof window === "undefined") return;

    try {
      const cache = this.getStoredCache();
      cache[optionsList.id] = {
        data: optionsList,
        timestamp: Date.now(),
      };

      // Limit cache size
      const entries = Object.entries(cache);
      if (entries.length > 50) {
        // Keep only the 25 most recent entries
        const sorted = entries
          .sort(([, a], [, b]) => b.timestamp - a.timestamp)
          .slice(0, 25);

        const trimmedCache: Record<string, { data: OptionsList; timestamp: number }> = {};
        sorted.forEach(([id, entry]) => {
          trimmedCache[id] = entry;
        });

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedCache));
      } else {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cache));
      }
    } catch (error) {
      console.warn("Failed to persist options list to cache:", error);
    }
  }

  static get(id: string): OptionsList | null {
    if (typeof window === "undefined") return null;

    try {
      const cache = this.getStoredCache();
      const entry = cache[id];

      if (!entry) return null;

      // Check if expired
      if (Date.now() - entry.timestamp > this.MAX_AGE) {
        delete cache[id];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cache));
        return null;
      }

      console.log(`💾 Persistent cache HIT for options list: ${id}`);
      return entry.data;
    } catch (error) {
      console.warn("Failed to read from persistent cache:", error);
      return null;
    }
  }

  private static getStoredCache(): Record<
    string,
    { data: OptionsList; timestamp: number }
  > {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }
}
