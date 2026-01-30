// Advanced Distance Calculator with Real Map Routing
// Uses multiple APIs for accurate distance and time calculations

class DistanceCalculator {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 10 * 60 * 1000; // 10 minutes cache
        this.fallbackCache = new Map();
        this.apiKeys = {
            // Add your API keys here or load from environment
            google: null, // Google Maps API key
            mapbox: null, // Mapbox API key
            openroute: null // OpenRouteService API key
        };
    }

    // Calculate distance and time between two points
    async calculateDistanceAndTime(fromCoords, toCoords, options = {}) {
        const cacheKey = this.getCacheKey(fromCoords, toCoords, options);
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log('📦 Using cached distance calculation');
                return cached.data;
            }
        }

        try {
            // Try different APIs in order of preference
            let result = null;
            
            if (this.apiKeys.google && options.mode !== 'walking') {
                result = await this.calculateWithGoogleMaps(fromCoords, toCoords, options);
            } else if (this.apiKeys.mapbox) {
                result = await this.calculateWithMapbox(fromCoords, toCoords, options);
            } else if (this.apiKeys.openroute) {
                result = await this.calculateWithOpenRoute(fromCoords, toCoords, options);
            } else {
                // Fallback to enhanced Haversine with realistic time estimation
                result = await this.calculateWithEnhancedHaversine(fromCoords, toCoords, options);
            }

            // Cache the result
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

            return result;

        } catch (error) {
            console.error('❌ Distance calculation failed:', error);
            
            // Use fallback calculation
            const fallback = await this.calculateWithEnhancedHaversine(fromCoords, toCoords, options);
            this.fallbackCache.set(cacheKey, fallback);
            return fallback;
        }
    }

    // Calculate using Google Maps Distance Matrix API
    async calculateWithGoogleMaps(fromCoords, toCoords, options = {}) {
        const mode = options.mode || 'driving';
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${fromCoords.lat},${fromCoords.lng}&destinations=${toCoords.lat},${toCoords.lng}&mode=${mode}&key=${this.apiKeys.google}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
                const element = data.rows[0].elements[0];
                return {
                    distance: {
                        km: element.distance.value / 1000,
                        miles: element.distance.value / 1609.34,
                        text: element.distance.text
                    },
                    duration: {
                        seconds: element.duration.value,
                        minutes: Math.round(element.duration.value / 60),
                        text: element.duration.text
                    },
                    source: 'google-maps',
                    mode: mode
                };
            }
            throw new Error('Google Maps API returned error: ' + data.status);
        } catch (error) {
            console.error('Google Maps API error:', error);
            throw error;
        }
    }

    // Calculate using Mapbox Directions API
    async calculateWithMapbox(fromCoords, toCoords, options = {}) {
        const mode = options.mode === 'driving' ? 'driving-traffic' : options.mode || 'driving';
        const url = `https://api.mapbox.com/directions/v5/mapbox/${mode}/${fromCoords.lng},${fromCoords.lat};${toCoords.lng},${toCoords.lat}?access_token=${this.apiKeys.mapbox}&overview=full&geometries=geojson`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                return {
                    distance: {
                        km: route.distance / 1000,
                        miles: route.distance / 1609.34,
                        text: this.formatDistance(route.distance / 1000)
                    },
                    duration: {
                        seconds: route.duration,
                        minutes: Math.round(route.duration / 60),
                        text: this.formatDuration(route.duration)
                    },
                    source: 'mapbox',
                    mode: mode
                };
            }
            throw new Error('Mapbox API returned no routes');
        } catch (error) {
            console.error('Mapbox API error:', error);
            throw error;
        }
    }

    // Calculate using OpenRouteService API
    async calculateWithOpenRoute(fromCoords, toCoords, options = {}) {
        const profile = options.mode === 'driving' ? 'driving-car' : options.mode === 'walking' ? 'foot-walking' : 'cycling-regular';
        const url = `https://api.openrouteservice.org/v2/directions/${profile}?api_key=${this.apiKeys.openroute}&start=${fromCoords.lng},${fromCoords.lat}&end=${toCoords.lng},${toCoords.lat}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.features && data.features.length > 0) {
                const route = data.features[0].properties;
                return {
                    distance: {
                        km: route.segments[0].distance / 1000,
                        miles: route.segments[0].distance / 1609.34,
                        text: this.formatDistance(route.segments[0].distance / 1000)
                    },
                    duration: {
                        seconds: route.segments[0].duration,
                        minutes: Math.round(route.segments[0].duration / 60),
                        text: this.formatDuration(route.segments[0].duration)
                    },
                    source: 'openroute',
                    mode: profile
                };
            }
            throw new Error('OpenRouteService API returned no routes');
        } catch (error) {
            console.error('OpenRouteService API error:', error);
            throw error;
        }
    }

    // Enhanced Haversine calculation with realistic time estimation
    async calculateWithEnhancedHaversine(fromCoords, toCoords, options = {}) {
        const mode = options.mode || 'driving';
        
        // Calculate straight-line distance using Haversine
        const distanceKm = this.haversineDistance(fromCoords, toCoords);
        
        // Apply road network factor (typically 1.2-1.4 for urban areas)
        const roadFactor = this.getRoadFactor(mode, distanceKm);
        const roadDistanceKm = distanceKm * roadFactor;
        
        // Calculate realistic travel time based on mode and distance
        const avgSpeed = this.getAverageSpeed(mode, roadDistanceKm);
        const timeSeconds = (roadDistanceKm / avgSpeed) * 3600;
        
        return {
            distance: {
                km: roadDistanceKm,
                miles: roadDistanceKm / 1.60934,
                text: this.formatDistance(roadDistanceKm)
            },
            duration: {
                seconds: Math.round(timeSeconds),
                minutes: Math.round(timeSeconds / 60),
                text: this.formatDuration(timeSeconds)
            },
            source: 'enhanced-haversine',
            mode: mode,
            accuracy: 'estimated'
        };
    }

    // Haversine formula for calculating distance between two points
    haversineDistance(fromCoords, toCoords) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(toCoords.lat - fromCoords.lat);
        const dLng = this.toRadians(toCoords.lng - fromCoords.lng);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(fromCoords.lat)) * Math.cos(this.toRadians(toCoords.lat)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Get road network factor based on mode and distance
    getRoadFactor(mode, distanceKm) {
        if (mode === 'walking') {
            return distanceKm < 2 ? 1.3 : 1.2; // Pedestrian paths are more direct
        } else if (mode === 'cycling') {
            return 1.25; // Bike paths
        } else {
            // Driving - varies by distance (shorter distances have more indirect routes)
            if (distanceKm < 2) return 1.4;
            if (distanceKm < 5) return 1.3;
            if (distanceKm < 10) return 1.25;
            return 1.2;
        }
    }

    // Get average speed based on mode and distance
    getAverageSpeed(mode, distanceKm) {
        if (mode === 'walking') {
            return 5; // 5 km/h walking speed
        } else if (mode === 'cycling') {
            return 15; // 15 km/h cycling speed
        } else {
            // Driving - varies by distance and urban/rural
            if (distanceKm < 2) return 25; // Urban stop-and-go
            if (distanceKm < 5) return 30; // Mixed urban
            if (distanceKm < 15) return 40; // Suburban
            return 50; // Highway speeds
        }
    }

    // Format distance for display
    formatDistance(km) {
        if (km < 1) {
            return `${Math.round(km * 1000)} m`;
        } else if (km < 10) {
            return `${km.toFixed(1)} km`;
        } else {
            return `${Math.round(km)} km`;
        }
    }

    // Format duration for display
    formatDuration(seconds) {
        const minutes = Math.round(seconds / 60);
        if (minutes < 60) {
            return `${minutes} min`;
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
        }
    }

    // Generate cache key
    getCacheKey(fromCoords, toCoords, options) {
        return `${fromCoords.lat},${fromCoords.lng}-${toCoords.lat},${toCoords.lng}-${options.mode || 'driving'}`;
    }

    // Convert degrees to radians
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Batch calculate distances for multiple destinations
    async calculateMultipleDistances(fromCoords, toCoordsList, options = {}) {
        const results = [];
        
        // Process in batches to avoid API rate limits
        const batchSize = 10;
        for (let i = 0; i < toCoordsList.length; i += batchSize) {
            const batch = toCoordsList.slice(i, i + batchSize);
            const batchPromises = batch.map(toCoords => 
                this.calculateDistanceAndTime(fromCoords, toCoords, options)
                    .catch(error => {
                        console.error(`Failed to calculate distance to ${toCoords.lat},${toCoords.lng}:`, error);
                        return null;
                    })
            );
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Add delay between batches to respect rate limits
            if (i + batchSize < toCoordsList.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return results;
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
        this.fallbackCache.clear();
        console.log('🗑️ Distance calculator cache cleared');
    }

    // Get cache statistics
    getCacheStats() {
        return {
            cacheSize: this.cache.size,
            fallbackCacheSize: this.fallbackCache.size,
            cacheTimeout: this.cacheTimeout
        };
    }
}

// Create global instance
window.distanceCalculator = new DistanceCalculator();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DistanceCalculator;
}
