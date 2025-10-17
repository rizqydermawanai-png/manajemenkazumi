// lib/expeditionApi.ts
import type { Address, OnlineOrder } from '../types';

// The API key has been moved to the server (server.mjs) for security.
// This file no longer contains sensitive information.

export interface ShippingOption {
    code: string; // e.g., "jne"
    service: string; // e.g., "REG"
    description: string; // e.g., "Layanan Reguler"
    cost: number;
    etd: string; // e.g., "1-2 HARI"
}

export interface TrackingHistory {
    timestamp: string;
    status: string;
    location: string;
}

/**
 * Fetches shipping cost options from our own secure backend endpoint.
 * The backend will then call the external expedition API with the secure API key.
 * @param destination - The destination address object.
 * @param weightInGrams - The total weight of the package in grams.
 * @returns A promise that resolves with an array of shipping options.
 */
export const getShippingCosts = async (destination: Address, weightInGrams: number): Promise<ShippingOption[]> => {
    try {
        const response = await fetch('/api/shipping-cost', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destination, weightInGrams }),
        });
        if (!response.ok) {
            console.error('Failed to fetch shipping costs from backend');
            return [];
        }
        return await response.json();
    } catch (error) {
        console.error('Error calling /api/shipping-cost:', error);
        return []; // Return an empty array on network failure.
    }
};

/**
 * Fetches package tracking history from our own secure backend endpoint.
 * @param trackingNumber - The package's tracking number.
 * @param courier - The courier code (e.g., 'jne', 'sicepat').
 * @returns A promise that resolves with the tracking history.
 */
export const trackPackage = async (trackingNumber: string, courier: string): Promise<TrackingHistory[]> => {
    try {
        const response = await fetch('/api/track-package', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trackingNumber, courier }),
        });
        if (!response.ok) {
            console.error('Failed to fetch tracking data from backend');
            return [];
        }
        return await response.json();
    } catch (error) {
        console.error('Error calling /api/track-package:', error);
        return []; // Return an empty array on network failure.
    }
};