/**
 * Simple performance monitoring utilities
 */

export class PerformanceMonitor {
    private static timers: Map<string, number> = new Map();

    static startTimer(label: string): void {
        this.timers.set(label, performance.now());
    }

    static endTimer(label: string): number {
        const start = this.timers.get(label);
        if (!start) {
            console.warn(`Timer "${label}" was not started`);
            return 0;
        }

        const duration = performance.now() - start;
        this.timers.delete(label);

        // Log in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
        }

        return duration;
    }

    static measureAsync<T>(label: string, operation: () => Promise<T>): Promise<T> {
        return new Promise(async (resolve, reject) => {
            this.startTimer(label);
            try {
                const result = await operation();
                this.endTimer(label);
                resolve(result);
            } catch (error) {
                this.endTimer(label);
                reject(error);
            }
        });
    }
}

// Browser-only Web Vitals tracking
export function trackWebVitals() {
    if (typeof window === 'undefined') return;

    // Track page navigation timing
    window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        console.log('📊 Page Load Metrics:', {
            'DNS Lookup': navigation.domainLookupEnd - navigation.domainLookupStart,
            'Server Response': navigation.responseEnd - navigation.requestStart,
            'DOM Processing': navigation.domContentLoadedEventEnd - navigation.responseEnd,
            'Total Page Load': navigation.loadEventEnd - navigation.fetchStart,
        });
    });
}

// Track route changes in Remix
export function trackRouteChange(routeName: string) {
    if (typeof window === 'undefined') return;

    const startTime = performance.now();

    // Use requestIdleCallback to measure when the route is "done"
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
            const duration = performance.now() - startTime;
            console.log(`🚀 Route "${routeName}" loaded in ${duration.toFixed(2)}ms`);
        });
    }
}