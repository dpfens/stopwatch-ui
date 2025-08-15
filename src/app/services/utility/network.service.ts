import { Injectable, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { fromEvent, merge, startWith, map, distinctUntilChanged } from 'rxjs';

/**
 * Network Information API interface extending EventTarget
 * Provides information about the connection a device is using to communicate with the network.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation
 */
interface NetworkInformation extends EventTarget {
  /** The effective bandwidth estimate in megabits per second */
  readonly downlink: number;
  /** The maximum downlink speed, in megabits per second (Mbps), for the underlying connection technology */
  readonly downlinkMax?: number;
  /** The effective type of the connection meaning one of 'slow-2g', '2g', '3g', or '4g' */
  readonly effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  /** The estimated effective round-trip time of the current connection, in milliseconds */
  readonly rtt: number;
  /** Returns true if the user has set a reduced data usage option on the user agent */
  readonly saveData: boolean;
  /** The type of connection a device is using to communicate with the network */
  readonly type?: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | undefined;
  /** Event handler for when connection information changes */
  onchange: ((this: NetworkInformation, ev: Event) => any) | null;
}

/**
 * Extended Navigator interface to include Network Information API properties
 */
declare global {
  interface Navigator {
    /** Standard Network Information API */
    readonly connection?: NetworkInformation;
    /** Mozilla-specific Network Information API */
    readonly mozConnection?: NetworkInformation;
    /** WebKit-specific Network Information API */
    readonly webkitConnection?: NetworkInformation;
  }
}

/**
 * Battery Status API interface extending EventTarget
 * Provides information about the system's battery charge level.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/BatteryManager
 */
interface BatteryManager extends EventTarget {
  /** Indicates whether the battery is charging */
  readonly charging: boolean;
  /** The amount of time until the battery is charged, in seconds */
  readonly chargingTime: number;
  /** The amount of time until the battery is discharged, in seconds */
  readonly dischargingTime: number;
  /** The level of the battery (0 to 1.0) */
  readonly level: number;
  /** Event handler for when the charging state changes */
  onchargingchange: ((this: BatteryManager, ev: Event) => any) | null;
  /** Event handler for when the charging time changes */
  onchargingtimechange: ((this: BatteryManager, ev: Event) => any) | null;
  /** Event handler for when the discharging time changes */
  ondischargingtimechange: ((this: BatteryManager, ev: Event) => any) | null;
  /** Event handler for when the battery level changes */
  onlevelchange: ((this: BatteryManager, ev: Event) => any) | null;
}

/**
 * Service for monitoring and providing reactive network connectivity state and quality metrics.
 * 
 * This service provides comprehensive network monitoring capabilities including:
 * - Basic online/offline detection
 * - Connection type and quality assessment
 * - Network performance metrics (downlink speed, RTT)
 * - Data saver mode detection
 * - Adaptive content recommendations based on network conditions
 * 
 * All properties are reactive Angular signals that automatically update when network conditions change.
 * 
 * @example
 * ```typescript
 * constructor(private networkState: NetworkStateService) {
 *   // React to network changes
 *   effect(() => {
 *     if (this.networkState.isOffline()) {
 *       this.showOfflineMessage();
 *     }
 *   });
 * 
 *   // Adjust video quality based on connection
 *   effect(() => {
 *     const quality = this.networkState.recommendedVideoQuality();
 *     this.videoPlayer.setQuality(quality);
 *   });
 * }
 * ```
 * 
 * @since 1.0.0
 */
@Injectable({
  providedIn: 'root'
})
export class NetworkStateService {
  /**
   * Reactive signal indicating whether the device is currently online.
   * 
   * Automatically updates when the browser's online/offline events fire.
   * Uses `navigator.onLine` as the source of truth.
   * 
   * @returns Signal<boolean> - true if online, false if offline
   */
  readonly isOnline = toSignal(
    merge(
      fromEvent(window, 'online'),
      fromEvent(window, 'offline')
    ).pipe(
      startWith(null),
      map(() => navigator.onLine),
      distinctUntilChanged()
    ),
    { initialValue: navigator.onLine }
  );

  /**
   * Reactive signal indicating whether the device is currently offline.
   * 
   * Computed from the inverse of `isOnline()`.
   * 
   * @returns Signal<boolean> - true if offline, false if online
   */
  readonly isOffline = computed(() => !this.isOnline());

  /** Private property holding the Network Information API connection object */
  private readonly connection = this.getConnection();

  /**
   * Reactive signal providing the current connection type.
   * 
   * Returns the type of network connection being used (wifi, cellular, ethernet, etc.).
   * Falls back to undefined if the Network Information API is not available.
   * 
   * @returns Signal<string> - Connection type or undefined
   */
  readonly connectionType = this.connection ? toSignal(
    merge(
      fromEvent(this.connection, 'change'),
      fromEvent(window, 'load')
    ).pipe(
      startWith(null),
      map(() => this.connection?.type || undefined),
      distinctUntilChanged()
    ),
    { initialValue: this.connection?.type || undefined }
  ) : signal<string | undefined>(undefined);

  /**
   * Reactive signal providing the effective connection type.
   * 
   * Returns a simplified classification of network speed: '4g', '3g', '2g', 'slow-2g'.
   * This is based on actual network performance rather than just the connection type.
   * 
   * @returns Signal<string> - Effective connection type or undefined
   */
  readonly effectiveType = this.connection ? toSignal(
    merge(
      fromEvent(this.connection, 'change'),
      fromEvent(window, 'load')
    ).pipe(
      startWith(null),
      map(() => this.connection?.effectiveType || undefined),
      distinctUntilChanged()
    ),
    { initialValue: this.connection?.effectiveType || undefined }
  ) : signal<string | undefined>(undefined);

  /**
   * Reactive signal providing the current downlink speed in Mbps.
   * 
   * Represents the effective bandwidth estimate in megabits per second.
   * Returns 0 if the Network Information API is not available.
   * 
   * @returns Signal<number> - Downlink speed in Mbps
   */
  readonly downlinkSpeed = this.connection ? toSignal(
    merge(
      fromEvent(this.connection, 'change'),
      fromEvent(window, 'load')
    ).pipe(
      startWith(null),
      map(() => this.connection?.downlink || 0),
      distinctUntilChanged()
    ),
    { initialValue: this.connection?.downlink || 0 }
  ) : signal(0);

  /**
   * Reactive signal providing the current round-trip time in milliseconds.
   * 
   * Represents the estimated effective round-trip time of the current connection.
   * Lower values indicate better network responsiveness.
   * 
   * @returns Signal<number> - RTT in milliseconds
   */
  readonly rtt = this.connection ? toSignal(
    merge(
      fromEvent(this.connection, 'change'),
      fromEvent(window, 'load')
    ).pipe(
      startWith(null),
      map(() => this.connection?.rtt || 0),
      distinctUntilChanged()
    ),
    { initialValue: this.connection?.rtt || 0 }
  ) : signal(0);

  /**
   * Reactive signal indicating whether data saver mode is enabled.
   * 
   * Returns true if the user has requested a reduced data usage option in their browser.
   * Applications should respect this by reducing data consumption when true.
   * 
   * @returns Signal<boolean> - true if data saver is enabled
   */
  readonly isDataSaverEnabled = this.connection ? toSignal(
    merge(
      fromEvent(this.connection, 'change'),
      fromEvent(window, 'load')
    ).pipe(
      startWith(null),
      map(() => this.connection?.saveData || false),
      distinctUntilChanged()
    ),
    { initialValue: this.connection?.saveData || false }
  ) : signal(false);

  /**
   * Computed signal providing an overall assessment of connection quality.
   * 
   * Analyzes effective connection type, downlink speed, and RTT to provide
   * a simplified quality rating: 'excellent', 'good', 'fair', 'poor', 'offline', or undefined.
   * 
   * Quality thresholds:
   * - excellent: 4G with >5Mbps downlink and <50ms RTT
   * - good: 4G or 3G with >2Mbps downlink
   * - fair: 3G or 2G connections
   * - poor: slow-2g connections
   * - offline: no connection
   * 
   * @returns Signal<string> - Connection quality assessment
   */
  readonly connectionQuality = computed(() => {
    const effective = this.effectiveType();
    const downlink = this.downlinkSpeed();
    const rtt = this.rtt();

    if (!this.isOnline()) return 'offline';
    if (effective === '4g' && downlink > 5 && rtt < 50) return 'excellent';
    if (effective === '4g' || (effective === '3g' && downlink > 2)) return 'good';
    if (effective === '3g' || effective === '2g') return 'fair';
    if (effective === 'slow-2g') return 'poor';
    
    // Fallback based on metrics if effectiveType is unknown
    if (downlink > 10 && rtt < 50) return 'excellent';
    if (downlink > 2 && rtt < 150) return 'good';
    if (downlink > 0.5 && rtt < 300) return 'fair';
    if (downlink > 0) return 'poor';
    
    return undefined;
  });

  /**
   * Computed signal recommending appropriate video quality based on network conditions.
   * 
   * Provides adaptive video quality recommendations to optimize user experience
   * while respecting bandwidth limitations:
   * - '1080p': Excellent connections with >10Mbps
   * - '720p': Excellent or good connections
   * - '480p': Fair connections
   * - '360p': Poor connections
   * - '240p': Very poor connections
   * - 'none': Offline
   * 
   * @returns Signal<string> - Recommended video quality setting
   */
  readonly recommendedVideoQuality = computed(() => {
    const quality = this.connectionQuality();
    const downlink = this.downlinkSpeed();
    
    if (quality === 'offline') return 'none';
    if (quality === 'excellent' && downlink > 10) return '1080p';
    if (quality === 'excellent' || quality === 'good') return '720p';
    if (quality === 'fair') return '480p';
    if (quality === 'poor') return '360p';
    return '240p';
  });

  /**
   * Computed signal indicating whether content should autoplay.
   * 
   * Considers connection quality and data saver settings to determine
   * if autoplay is appropriate. Returns false for poor connections,
   * offline state, or when data saver is enabled.
   * 
   * @returns Signal<boolean> - true if autoplay is recommended
   */
  readonly canAutoplay = computed(() => {
    return this.connectionQuality() !== 'offline' && 
           this.connectionQuality() !== 'poor' && 
           !this.isDataSaverEnabled();
  });

  /**
   * Computed signal providing a comprehensive network profile and recommendations.
   * 
   * Aggregates all network information into a single object for easy consumption.
   * Includes current metrics and adaptive recommendations for various content types.
   * 
   * @returns Signal<object> - Complete network profile with recommendations
   * 
   * @example
   * ```typescript
   * const profile = this.networkState.networkProfile();
   * if (profile.recommendations.prefetch) {
   *   this.prefetchNextPage();
   * }
   * ```
   */
  readonly networkProfile = computed(() => ({
    online: this.isOnline(),
    type: this.connectionType(),
    effectiveType: this.effectiveType(),
    quality: this.connectionQuality(),
    downlink: this.downlinkSpeed(),
    rtt: this.rtt(),
    dataSaver: this.isDataSaverEnabled(),
    recommendations: {
      videoQuality: this.recommendedVideoQuality(),
      autoplay: this.canAutoplay(),
      prefetch: this.connectionQuality() === 'excellent' || this.connectionQuality() === 'good',
      animations: this.connectionQuality() !== 'poor'
    }
  }));

  /**
   * Attempts to get the Network Information API connection object.
   * 
   * Checks for the standard API and vendor-prefixed versions (Mozilla, WebKit).
   * Returns undefined if the API is not supported by the browser.
   * 
   * @private
   * @returns NetworkInformation | undefined - Connection object or undefined
   */
  private getConnection(): NetworkInformation | undefined {
    return (navigator as any).connection || 
           (navigator as any).mozConnection || 
           (navigator as any).webkitConnection;
  }
}

/**
 * Service for monitoring device battery status and providing power-aware recommendations.
 * 
 * This service provides reactive access to battery information including:
 * - Battery charge level
 * - Charging status
 * - Time estimates for charging/discharging
 * - Power saving recommendations
 * 
 * All properties are reactive Angular signals that update when battery status changes.
 * Gracefully handles browsers that don't support the Battery Status API.
 * 
 * @example
 * ```typescript
 * constructor(private battery: BatteryService) {
 *   // React to low battery
 *   effect(() => {
 *     if (this.battery.isPowerSaveRecommended()) {
 *       this.enablePowerSaveMode();
 *     }
 *   });
 * 
 *   // Show battery status
 *   effect(() => {
 *     const info = this.battery.batteryInfo();
 *     this.updateBatteryUI(info);
 *   });
 * }
 * ```
 * 
 * @since 1.0.0
 */
@Injectable({
  providedIn: 'root'
})
export class BatteryService {
  /**
   * Internal signal holding the BatteryManager instance.
   * 
   * @private
   */
  private batteryManager = signal<BatteryManager | null>(null);
  
  /**
   * Reactive signal providing the current battery level as a percentage.
   * 
   * Converts the battery API's 0-1 level to a 0-100 percentage.
   * Returns 100 if battery API is not available (assumes plugged in).
   * 
   * @returns Signal<number> - Battery level percentage (0-100)
   */
  readonly level = computed(() => {
    const battery = this.batteryManager();
    return battery ? Math.round(battery.level * 100) : 100;
  });

  /**
   * Reactive signal indicating whether the device is currently charging.
   * 
   * Returns true if the battery API is not available (assumes plugged in).
   * 
   * @returns Signal<boolean> - true if charging or API unavailable
   */
  readonly isCharging = computed(() => {
    const battery = this.batteryManager();
    return battery ? battery.charging : true;
  });

  /**
   * Reactive signal providing estimated time until fully charged.
   * 
   * Returns the time in seconds, or 0 if not charging or API unavailable.
   * 
   * @returns Signal<number> - Charging time in seconds
   */
  readonly chargingTime = computed(() => {
    const battery = this.batteryManager();
    return battery?.chargingTime || 0;
  });

  /**
   * Reactive signal providing estimated time until battery is discharged.
   * 
   * Returns the time in seconds, or Infinity if charging or API unavailable.
   * 
   * @returns Signal<number> - Discharging time in seconds or Infinity
   */
  readonly dischargingTime = computed(() => {
    const battery = this.batteryManager();
    return battery?.dischargingTime || Infinity;
  });

  /**
   * Computed signal providing a categorized battery status.
   * 
   * Categorizes battery state into meaningful groups:
   * - 'charging': Device is plugged in
   * - 'high': >80% charge
   * - 'medium': 51-80% charge  
   * - 'low': 21-50% charge
   * - 'critical': ≤20% charge
   * 
   * @returns Signal<string> - Battery status category
   */
  readonly batteryStatus = computed(() => {
    const level = this.level();
    const charging = this.isCharging();
    
    if (charging) return 'charging';
    if (level > 80) return 'high';
    if (level > 50) return 'medium';
    if (level > 20) return 'low';
    return 'critical';
  });

  /**
   * Computed signal indicating whether power saving mode is recommended.
   * 
   * Recommends power saving when device is not charging and battery is below 30%.
   * Applications should reduce CPU-intensive operations when this returns true.
   * 
   * @returns Signal<boolean> - true if power saving is recommended
   */
  readonly isPowerSaveRecommended = computed(() => {
    return !this.isCharging() && this.level() < 30;
  });

  /**
   * Computed signal providing comprehensive battery information.
   * 
   * Aggregates all battery metrics into a single object for easy consumption.
   * 
   * @returns Signal<object> - Complete battery information
   * 
   * @example
   * ```typescript
   * const battery = this.batteryService.batteryInfo();
   * console.log(`Battery: ${battery.level}% (${battery.status})`);
   * ```
   */
  readonly batteryInfo = computed(() => ({
    level: this.level(),
    isCharging: this.isCharging(),
    status: this.batteryStatus(),
    chargingTime: this.chargingTime(),
    dischargingTime: this.dischargingTime(),
    powerSaveMode: this.isPowerSaveRecommended()
  }));

  /**
   * Initializes the battery service and sets up event listeners.
   * 
   * Attempts to access the Battery Status API and registers event handlers
   * for battery state changes. Gracefully handles API unavailability.
   * 
   * @constructor
   */
  constructor() {
    // Initialize battery API if available
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: BatteryManager) => {
        this.batteryManager.set(battery);
        
        // Update on battery events
        battery.addEventListener('levelchange', () => {
          this.batteryManager.set({...battery});
        });
        
        battery.addEventListener('chargingchange', () => {
          this.batteryManager.set({...battery});
        });
        
        battery.addEventListener('chargingtimechange', () => {
          this.batteryManager.set({...battery});
        });
        
        battery.addEventListener('dischargingtimechange', () => {
          this.batteryManager.set({...battery});
        });
      });
    }
  }
}

/**
 * Service for monitoring Core Web Vitals and performance metrics.
 * 
 * This service tracks key performance indicators including:
 * - First Contentful Paint (FCP)
 * - Largest Contentful Paint (LCP) 
 * - First Input Delay (FID)
 * - Cumulative Layout Shift (CLS)
 * - Time to First Byte (TTFB)
 * - Interaction to Next Paint (INP)
 * - Overall performance score
 * 
 * Uses the Performance Observer API to collect real-time metrics.
 * Provides a performance score based on Google's Core Web Vitals thresholds.
 * 
 * @example
 * ```typescript
 * constructor(private webVitals: WebVitalsService) {
 *   // Monitor performance score
 *   effect(() => {
 *     const vitals = this.webVitals.vitals();
 *     if (vitals.score && vitals.score < 70) {
 *       this.showPerformanceWarning();
 *     }
 *   });
 * }
 * ```
 * 
 * @see https://web.dev/vitals/
 * @since 1.0.0
 */
@Injectable({
  providedIn: 'root'
})
export class WebVitalsService {
  /**
   * Signal tracking First Contentful Paint timing.
   * 
   * FCP measures the time from navigation to when any part of the page's content
   * is rendered on the screen. Lower values indicate faster perceived loading.
   * 
   * @private
   */
  private readonly fcp = signal<number | null>(null);

  /**
   * Signal tracking Largest Contentful Paint timing.
   * 
   * LCP measures the time from navigation to when the largest content element
   * becomes visible. Good LCP scores are 2.5 seconds or less.
   * 
   * @private  
   */
  private readonly lcp = signal<number | null>(null);

  /**
   * Signal tracking First Input Delay.
   * 
   * FID measures the time from when a user first interacts with your site
   * to the time when the browser responds. Good FID scores are 100ms or less.
   * 
   * @private
   */
  private readonly fid = signal<number | null>(null);

  /**
   * Signal tracking Cumulative Layout Shift.
   * 
   * CLS measures visual stability by quantifying unexpected layout shifts.
   * Good CLS scores are 0.1 or less.
   * 
   * @private
   */
  private readonly cls = signal<number | null>(null);

  /**
   * Signal tracking Time to First Byte.
   * 
   * TTFB measures the time between the request for a resource and when
   * the first byte of a response begins to arrive.
   * 
   * @private
   */
  private readonly ttfb = signal<number | null>(null);

  /**
   * Signal tracking Interaction to Next Paint.
   * 
   * INP measures the latency of all click, tap, and keyboard interactions
   * with a page throughout its lifespan.
   * 
   * @private
   */
  private readonly inp = signal<number | null>(null);

  /**
   * Computed signal providing an overall performance score.
   * 
   * Calculates a score from 0-100 based on Core Web Vitals thresholds:
   * - LCP: Good ≤2.5s, Poor >4s
   * - FID: Good ≤100ms, Poor >300ms  
   * - CLS: Good ≤0.1, Poor >0.25
   * 
   * Returns null if insufficient metrics are available.
   * 
   * @returns Signal<number | null> - Performance score 0-100 or null
   */
  readonly performanceScore = computed(() => {
    const lcpValue = this.lcp();
    const fidValue = this.fid();
    const clsValue = this.cls();
    
    if (!lcpValue || !fidValue || !clsValue) return null;
    
    // Score based on Google's thresholds
    let score = 100;
    
    // LCP scoring (good < 2.5s, poor > 4s)
    if (lcpValue <= 2500) score += 0;
    else if (lcpValue <= 4000) score -= 10;
    else score -= 25;
    
    // FID scoring (good < 100ms, poor > 300ms)
    if (fidValue <= 100) score += 0;
    else if (fidValue <= 300) score -= 10;
    else score -= 25;
    
    // CLS scoring (good < 0.1, poor > 0.25)
    if (clsValue <= 0.1) score += 0;
    else if (clsValue <= 0.25) score -= 10;
    else score -= 25;
    
    return Math.max(0, Math.min(100, score));
  });

  /**
   * Computed signal providing all collected Web Vitals metrics.
   * 
   * Aggregates all performance metrics into a single object for monitoring
   * and analysis. Includes both raw metrics and calculated performance score.
   * 
   * @returns Signal<object> - Complete Web Vitals data
   * 
   * @example
   * ```typescript
   * const vitals = this.webVitals.vitals();
   * console.log(`LCP: ${vitals.lcp}ms, Score: ${vitals.score}`);
   * ```
   */
  readonly vitals = computed(() => ({
    fcp: this.fcp(),
    lcp: this.lcp(),
    fid: this.fid(),
    cls: this.cls(),
    ttfb: this.ttfb(),
    inp: this.inp(),
    score: this.performanceScore()
  }));

  /**
   * Initializes the Web Vitals service and starts performance observation.
   * 
   * Sets up Performance Observers to collect metrics in real-time.
   * Gracefully handles browsers that don't support specific APIs.
   * 
   * @constructor
   */
  constructor() {
    this.observeWebVitals();
  }

  /**
   * Sets up Performance Observers to collect Core Web Vitals metrics.
   * 
   * Creates observers for:
   * - Largest Contentful Paint (LCP)
   * - First Input Delay (FID) 
   * - Cumulative Layout Shift (CLS)
   * - First Contentful Paint (FCP)
   * - Navigation timing for TTFB
   * 
   * Each observer is wrapped in try-catch to handle API unavailability.
   * 
   * @private
   */
  private observeWebVitals() {
    if (!('PerformanceObserver' in window)) return;

    // Observe LCP
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.lcp.set(lastEntry.renderTime || lastEntry.loadTime);
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      // LCP not supported
    }

    // Observe FID
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstInput = entries[0] as any;
        if (firstInput) {
          this.fid.set(firstInput.processingStart - firstInput.startTime);
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      // FID not supported
    }

    // Observe CLS
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            this.cls.set(clsValue);
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      // CLS not supported
    }

    // Get navigation timing metrics
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      this.ttfb.set(timing.responseStart - timing.requestStart);
    }

    // Get FCP from paint timing
    if ('PerformanceObserver' in window) {
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.name === 'first-contentful-paint') {
            this.fcp.set(entry.startTime);
          }
        }
      });
      try {
        paintObserver.observe({ type: 'paint', buffered: true });
      } catch (e) {
        // Paint timing not supported
      }
    }
  }
}