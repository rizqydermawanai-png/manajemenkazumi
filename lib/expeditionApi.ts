// lib/expeditionApi.ts
import type { Address, OnlineOrder } from '../types';

// The API key is now securely stored on the backend (server.mjs).
// The frontend only calls our own secure endpoints.

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
    if (!destination || !destination.city || !weightInGrams) {
        console.error('Missing destination city or weight for shipping cost calculation.');
        return [];
    }

    try {
        const response = await fetch('/api/shipping-cost', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                destinationCity: destination.city,
                weight: weightInGrams,
            }),
        });

        if (!response.ok) {
            throw new Error(`API call failed with status: ${response.status}`);
        }

        const data = await response.json();

        // Flatten the API response into the ShippingOption[] structure
        const options: ShippingOption[] = [];
        if (data && data.rajaongkir && data.rajaongkir.results) {
            data.rajaongkir.results.forEach((courierResult: any) => {
                courierResult.costs.forEach((service: any) => {
                    options.push({
                        code: courierResult.code.toLowerCase(),
                        service: service.service,
                        description: service.description,
                        cost: service.cost[0].value,
                        etd: service.cost[0].etd.replace(/ HARI/i, '') + ' hari',
                    });
                });
            });
        }
        return options;
    } catch (error) {
        console.error("Error fetching shipping costs:", error);
        return [];
    }
};

/**
 * Fetches package tracking history from our own secure backend endpoint.
 * @param trackingNumber - The package's tracking number.
 * @param courier - The courier code (e.g., 'jne', 'jnt').
 * @returns A promise that resolves with the tracking history.
 */
export const trackPackage = async (trackingNumber: string, courier: string): Promise<TrackingHistory[]> => {
    if (!trackingNumber || !courier) {
        console.error('Missing tracking number or courier for tracking.');
        return [];
    }

    try {
        const response = await fetch('/api/track-package', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                trackingNumber,
                courier,
            }),
        });

        if (!response.ok) {
            throw new Error(`API call failed with status: ${response.status}`);
        }

        const data = await response.json();

        // Map the API response to the TrackingHistory[] structure
        if (data && data.rajaongkir && data.rajaongkir.result && data.rajaongkir.result.manifest) {
            return data.rajaongkir.result.manifest.map((item: any) => ({
                timestamp: `${item.manifest_date} ${item.manifest_time}`,
                status: item.manifest_description,
                location: item.city_name,
            })).sort((a: TrackingHistory, b: TrackingHistory) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }

        return [];
    } catch (error) {
        console.error("Error fetching tracking data:", error);
        return [];
    }
};
