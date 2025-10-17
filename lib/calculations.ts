// lib/calculations.ts
import type { GarmentPattern, GarmentOrderItem, AdditionalCost, MaterialPriceUnit, HPPResult } from '../types';

interface CalculateHPPParams {
    garmentInfo: GarmentPattern;
    materialPrice: number;
    materialPriceUnit: MaterialPriceUnit;
    order: GarmentOrderItem[];
    additionalCosts: AdditionalCost[];
    materialName: string;
    profitMargin: number;
}

interface CalculationResult {
    success: boolean;
    message: string;
    data: HPPResult | null;
}

/**
 * Calculates the Cost of Goods Sold (HPP) for a production run.
 */
export function calculateHPP(params: CalculateHPPParams): CalculationResult {
    const { garmentInfo, materialPrice, materialPriceUnit, order, additionalCosts, materialName, profitMargin } = params;

    if (!materialPrice || materialPrice <= 0) {
        return { success: false, message: 'Harga bahan utama harus diisi.', data: null };
    }

    const garmentsProduced = order.reduce((sum, item) => sum + item.quantity, 0);
    if (garmentsProduced <= 0) {
        return { success: false, message: 'Jumlah pesanan harus lebih dari 0.', data: null };
    }

    const totalMaterialConsumption = garmentsProduced * garmentInfo.materialConsumption;
    const totalMaterialCost = totalMaterialConsumption * materialPrice;
    
    const totalAdditionalCostPerGarment = additionalCosts.reduce((sum, item) => sum + item.cost, 0);
    const totalAdditionalCost = totalAdditionalCostPerGarment * garmentsProduced;

    const totalProductionCost = totalMaterialCost + totalAdditionalCost;
    const hppPerGarment = totalProductionCost / garmentsProduced;

    const resultData: HPPResult = {
        garmentsProduced,
        totalMaterialCost,
        totalAdditionalCost,
        totalProductionCost,
        hppPerGarment,
        sellingPricePerGarment: hppPerGarment * (1 + (profitMargin / 100)),
        profitMargin,
        garmentOrder: order,
        additionalCosts,
        materialConsumption: [{
            name: materialName,
            quantity: totalMaterialConsumption,
            unit: materialPriceUnit,
            cost: totalMaterialCost,
        }]
    };
    
    return { success: true, message: 'Calculation successful', data: resultData };
}