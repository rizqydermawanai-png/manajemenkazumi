// pages/SizingStandardsPage.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Plus } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CustomInput } from '../components/ui/CustomInput';
import { useToast } from '../hooks/useToast';
import { GARMENT_PATTERNS } from '../lib/data';
import type { AllSizingStandards } from '../types';

interface SizingStandardsPageProps {
    sizingStandards: AllSizingStandards;
    setSizingStandards: React.Dispatch<React.SetStateAction<AllSizingStandards>>;
    addActivity: (type: string, description: string, relatedId?: string) => void;
}

export const SizingStandardsPage = ({ sizingStandards, setSizingStandards, addActivity }: SizingStandardsPageProps) => {
    const garmentTypes = Object.keys(GARMENT_PATTERNS);
    const [activeTab, setActiveTab] = useState<string>(garmentTypes[0]);
    const [localStandards, setLocalStandards] = useState<AllSizingStandards>(sizingStandards);
    const { addToast } = useToast();

    useEffect(() => {
        setLocalStandards(sizingStandards);
    }, [sizingStandards]);

    const handleInputChange = (size: string, param: string, value: string) => {
        const numericValue = parseFloat(value) || 0;
        const updatedTabStandards = { ...localStandards[activeTab] };
        updatedTabStandards[size][param] = numericValue;
        setLocalStandards({ ...localStandards, [activeTab]: updatedTabStandards });
    };

    const handleSaveChanges = () => {
        setSizingStandards(localStandards);
        addActivity('Pengaturan', `Memperbarui standar ukuran untuk ${GARMENT_PATTERNS[activeTab].title}`);
        addToast({ title: 'Sukses', message: `Standar ukuran untuk ${GARMENT_PATTERNS[activeTab].title} telah disimpan.`, type: 'success' });
    };

    const handleAddNewSize = () => {
        const newSizeName = prompt('Masukkan nama ukuran baru (contoh: XXXL):');
        if (newSizeName && newSizeName.trim() !== '') {
            const trimmedSizeName = newSizeName.trim().toUpperCase();
            const currentSizes = localStandards[activeTab];

            if (currentSizes[trimmedSizeName]) {
                addToast({ title: 'Error', message: `Ukuran "${trimmedSizeName}" sudah ada.`, type: 'error' });
                return;
            }

            // Create a new size with default values based on the first parameter set
            const parameters = Object.keys(Object.values(currentSizes)[0] || {});
            const newSizeMeasurements: { [key: string]: number } = {};
            parameters.forEach(p => { newSizeMeasurements[p] = 0; });

            const updatedTabStandards = { ...currentSizes, [trimmedSizeName]: newSizeMeasurements };
            setLocalStandards({ ...localStandards, [activeTab]: updatedTabStandards });
            addToast({ title: 'Ukuran Ditambahkan', message: `Ukuran baru "${trimmedSizeName}" telah ditambahkan. Jangan lupa simpan perubahan.`, type: 'info' });
        }
    };
    
    const currentGarmentSizes = localStandards[activeTab] || {};
    const sizes = Object.keys(currentGarmentSizes);
    const parameters = sizes.length > 0 ? Object.keys(currentGarmentSizes[sizes[0]]) : [];

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800">Standard Ukuran Pakaian</h1>
            <Card>
                <div className="flex border-b mb-4">
                    {garmentTypes.map(type => (
                        <button
                            key={type}
                            onClick={() => setActiveTab(type)}
                            className={`px-4 py-2 font-semibold transition-colors ${activeTab === type ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-indigo-500'}`}
                        >
                            {GARMENT_PATTERNS[type].title}
                        </button>
                    ))}
                </div>
                
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px] text-sm text-left">
                            <thead className="bg-slate-50">
                                <tr className="text-slate-600">
                                    <th className="p-3 font-semibold">Ukuran</th>
                                    {parameters.map(param => (
                                        <th key={param} className="p-3 font-semibold text-center">{param} (cm)</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sizes.map(size => (
                                    <tr key={size} className="border-b hover:bg-slate-50/50">
                                        <td className="p-2 font-semibold text-slate-700">{size}</td>
                                        {parameters.map(param => (
                                            <td key={param} className="p-2">
                                                <CustomInput
                                                    type="number"
                                                    className="text-center"
                                                    value={localStandards[activeTab][size][param]}
                                                    onChange={(e) => handleInputChange(size, param, e.target.value)}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 flex justify-between">
                        <Button variant="outline" onClick={handleAddNewSize}><Plus size={16}/> Tambah Ukuran</Button>
                        <Button onClick={handleSaveChanges}><Save size={16}/> Simpan Perubahan</Button>
                    </div>
                </motion.div>
            </Card>
        </div>
    );
};