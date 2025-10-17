// lib/data.ts
import { Shirt, Wind, HandPlatter } from 'lucide-react';
import type { GarmentPattern, UserData, StandardColor, ProductionReport, Sale, Message, Material, OnlineOrder, StockHistoryEntry, AllSizingStandards, BankAccount, PromoCode, ProductDiscount, SurveyResponse, AttendanceRecord, PerformanceStatus, SurveyQuestion } from '../types';

// =====================================================================================================
// DATA STATIS (STATIC DATA)
// =====================================================================================================

export const LOGO_URL = 'https://placehold.co/150x50?text=Kazumi';

// Data Pengguna Awal (Initial User Data)
export const INITIAL_USERS: UserData[] = [
    { uid: 'kazumisp_uid', username: 'kazumisp', password: 'kazumisp', role: 'super_admin', department: null, isApproved: true, createdAt: new Date().toISOString(), email: 'superadmin@example.com', whatsapp: '6281234567890', fullName: 'Kazumi Super Admin', bio: 'CEO of Kazumi', profilePictureUrl: 'https://placehold.co/100x100/4F46E5/FFFFFF?text=SP', performanceReviews: [] },
    { uid: 'kazumiad_uid', username: 'kazumiad', password: 'kazumiad', role: 'admin', department: null, isApproved: true, createdAt: new Date().toISOString(), email: 'admin@example.com', whatsapp: '6281234567891', fullName: 'Kazumi Admin', bio: 'Wakil CEO Kazumi', profilePictureUrl: 'https://placehold.co/100x100/10B981/FFFFFF?text=AD', baseSalary: 10000000, performanceReviews: [] },
    { 
        uid: 'kazumiproduksi_uid', 
        username: 'produksi', 
        password: 'produksi', 
        role: 'member', 
        department: 'produksi', 
        isApproved: true, 
        createdAt: new Date().toISOString(), 
        email: 'produksi@example.com', 
        whatsapp: '6281234567892', 
        fullName: 'Anggota Produksi', 
        bio: 'Staff Produksi', 
        profilePictureUrl: 'https://placehold.co/100x100/F59E0B/FFFFFF?text=PR', 
        baseSalary: 5000000, 
        performanceReviews: [],
        performanceScore: {
            totalPoints: 85,
            breakdown: { punctuality: 15, discipline: 50, productivity: 10, initiative: 10 },
            lastUpdated: new Date().toISOString()
        },
        pointHistory: [
            { id: 'ph1', date: new Date().toISOString(), points: 10, category: 'initiative', reason: 'Memberikan ide efisiensi', grantedBy: 'kazumisp_uid' },
            { id: 'ph2', date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), points: 2, category: 'punctuality', reason: 'Tepat waktu' }
        ]
    },
    { uid: 'kazumigudang_uid', username: 'gudang', password: 'gudang', role: 'member', department: 'gudang', isApproved: true, createdAt: new Date().toISOString(), email: 'gudang@example.com', whatsapp: '6281234567893', fullName: 'Anggota Gudang', bio: 'Staff Gudang', profilePictureUrl: 'https://placehold.co/100x100/6366F1/FFFFFF?text=GD', baseSalary: 4500000, performanceReviews: [] },
    { uid: 'cust-rizqyder-uid', username: 'rizqyder', password: 'rizqyder', role: 'customer', department: null, isApproved: true, createdAt: new Date().toISOString(), email: 'rizqy@example.com', whatsapp: '6281234567899', fullName: 'Rizqy Dermawan', bio: 'Pelanggan setia', profilePictureUrl: 'https://api.dicebear.com/8.x/initials/svg?seed=Rizqy Dermawan' }
];

export const INITIAL_MATERIALS: Material[] = [
    { id: 'mat-cotton-24s', name: 'Cotton Combed 24s', stock: 100, unit: 'kg', pricePerUnit: 150000 },
    { id: 'mat-fleece', name: 'Cotton Fleece', stock: 50, unit: 'kg', pricePerUnit: 180000 },
    { id: 'mat-denim', name: 'Denim 14oz', stock: 200, unit: 'meter', pricePerUnit: 80000 },
];

// This is now deprecated and replaced by INITIAL_SIZING_STANDARDS
// export const GARMENT_SIZES: { [key: string]: { [key: string]: any } } = { ... };

// Pola Pakaian with Icons
export const GARMENT_PATTERNS: { [key: string]: GarmentPattern } = {
    kaos: {
        title: 'Kaos',
        models: ['Regular', 'Regular-Fit', 'Oversized', 'Boxy Oversize'],
        materialConsumption: 0.25, // kg per piece
        materialId: 'mat-cotton-24s',
        icon: Shirt
    },
    kemeja: {
        title: 'Kemeja',
        models: ['Lengan Panjang', 'Lengan Pendek', 'Flanel'],
        materialConsumption: 1.5, // meters per piece
        materialId: 'mat-cotton-24s',
        icon: Shirt
    },
    jaket: {
        title: 'Jaket',
        models: ['Hoodie', 'Bomber', 'Denim'],
        materialConsumption: 0.8, // kg per piece
        materialId: 'mat-fleece',
        icon: Wind
    },
    celana: {
        title: 'Celana',
        models: ['Panjang Chino', 'Cargo', 'Pendek'],
        materialConsumption: 1.2, // meters per piece
        materialId: 'mat-denim',
        icon: HandPlatter
    },
};

export const INITIAL_SIZING_STANDARDS: AllSizingStandards = {
    kaos: {
        'S': { 'Lebar Dada': 48, 'Panjang Badan': 68, 'Panjang Lengan': 21 },
        'M': { 'Lebar Dada': 50, 'Panjang Badan': 70, 'Panjang Lengan': 22 },
        'L': { 'Lebar Dada': 52, 'Panjang Badan': 72, 'Panjang Lengan': 23 },
        'XL': { 'Lebar Dada': 54, 'Panjang Badan': 74, 'Panjang Lengan': 24 },
        'XXL': { 'Lebar Dada': 56, 'Panjang Badan': 76, 'Panjang Lengan': 25 },
    },
    kemeja: {
        'S': { 'Lebar Dada': 50, 'Panjang Badan': 70, 'Panjang Lengan': 60 },
        'M': { 'Lebar Dada': 52, 'Panjang Badan': 72, 'Panjang Lengan': 61 },
        'L': { 'Lebar Dada': 54, 'Panjang Badan': 74, 'Panjang Lengan': 62 },
        'XL': { 'Lebar Dada': 56, 'Panjang Badan': 76, 'Panjang Lengan': 63 },
        'XXL': { 'Lebar Dada': 58, 'Panjang Badan': 78, 'Panjang Lengan': 64 },
    },
    jaket: {
        'S': { 'Lebar Dada': 52, 'Panjang Badan': 65, 'Panjang Lengan': 62 },
        'M': { 'Lebar Dada': 55, 'Panjang Badan': 68, 'Panjang Lengan': 64 },
        'L': { 'Lebar Dada': 58, 'Panjang Badan': 71, 'Panjang Lengan': 66 },
        'XL': { 'Lebar Dada': 61, 'Panjang Badan': 74, 'Panjang Lengan': 68 },
        'XXL': { 'Lebar Dada': 64, 'Panjang Badan': 77, 'Panjang Lengan': 70 },
    },
    celana: {
        'S': { 'Lingkar Pinggang': 80, 'Panjang Celana': 98, 'Lebar Paha': 30 },
        'M': { 'Lingkar Pinggang': 84, 'Panjang Celana': 100, 'Lebar Paha': 32 },
        'L': { 'Lingkar Pinggang': 88, 'Panjang Celana': 102, 'Lebar Paha': 34 },
        'XL': { 'Lingkar Pinggang': 92, 'Panjang Celana': 104, 'Lebar Paha': 36 },
        'XXL': { 'Lingkar Pinggang': 96, 'Panjang Celana': 106, 'Lebar Paha': 38 },
    }
};

export const INITIAL_SURVEY_QUESTIONS: SurveyQuestion[] = [
    { id: 'sq_1', text: 'Secara keseluruhan, seberapa puaskah Anda dengan pekerjaan Anda saat ini?' },
    { id: 'sq_2', text: 'Apakah Anda merasa beban kerja Anda saat ini seimbang dan dapat dikelola?' },
    { id: 'sq_3', text: 'Seberapa baik Anda merasa didukung oleh atasan langsung Anda?' },
    { id: 'sq_4', text: 'Apakah Anda merasa ada peluang yang cukup untuk pertumbuhan dan pengembangan karir di perusahaan ini?' },
    { id: 'sq_5', text: 'Bagaimana Anda menilai lingkungan dan budaya kerja di tim Anda?' },
    { id: 'sq_6', text: 'Apakah Anda merasa dihargai dan diakui atas kontribusi yang Anda berikan?' },
];

export const INITIAL_SURVEY_RESPONSES: SurveyResponse[] = [
    {
        id: 'resp1', surveyId: 'Q3-2024', userId: 'kazumiad_uid', submittedAt: '2024-07-20T10:00:00Z',
        answers: [
            { questionId: 'sq_1', questionText: INITIAL_SURVEY_QUESTIONS[0].text, answer: 4 },
            { questionId: 'sq_2', questionText: INITIAL_SURVEY_QUESTIONS[1].text, answer: 3 },
            { questionId: 'sq_3', questionText: INITIAL_SURVEY_QUESTIONS[2].text, answer: 5 },
            { questionId: 'sq_4', questionText: INITIAL_SURVEY_QUESTIONS[3].text, answer: 3 },
            { questionId: 'sq_5', questionText: INITIAL_SURVEY_QUESTIONS[4].text, answer: 4 },
            { questionId: 'sq_6', questionText: INITIAL_SURVEY_QUESTIONS[5].text, answer: 4 },
        ]
    },
    {
        id: 'resp2', surveyId: 'Q3-2024', userId: 'kazumiproduksi_uid', submittedAt: '2024-07-21T11:00:00Z',
        answers: [
            { questionId: 'sq_1', questionText: INITIAL_SURVEY_QUESTIONS[0].text, answer: 5 },
            { questionId: 'sq_2', questionText: INITIAL_SURVEY_QUESTIONS[1].text, answer: 4 },
            { questionId: 'sq_3', questionText: INITIAL_SURVEY_QUESTIONS[2].text, answer: 4 },
            { questionId: 'sq_4', questionText: INITIAL_SURVEY_QUESTIONS[3].text, answer: 4 },
            { questionId: 'sq_5', questionText: INITIAL_SURVEY_QUESTIONS[4].text, answer: 5 },
            { questionId: 'sq_6', questionText: INITIAL_SURVEY_QUESTIONS[5].text, answer: 3 },
        ]
    },
    {
        id: 'resp3', surveyId: 'Q3-2024', userId: 'kazumigudang_uid', submittedAt: '2024-07-22T09:30:00Z',
        answers: [
            { questionId: 'sq_1', questionText: INITIAL_SURVEY_QUESTIONS[0].text, answer: 4 },
            { questionId: 'sq_2', questionText: INITIAL_SURVEY_QUESTIONS[1].text, answer: 5 },
            { questionId: 'sq_3', questionText: INITIAL_SURVEY_QUESTIONS[2].text, answer: 3 },
            { questionId: 'sq_4', questionText: INITIAL_SURVEY_QUESTIONS[3].text, answer: 3 },
            { questionId: 'sq_5', questionText: INITIAL_SURVEY_QUESTIONS[4].text, answer: 4 },
            { questionId: 'sq_6', questionText: INITIAL_SURVEY_QUESTIONS[5].text, answer: 4 },
        ]
    }
];

export const INITIAL_BANK_ACCOUNTS: BankAccount[] = [
    { id: 'bca-default', bankName: 'BCA', accountNumber: '1234567890', accountHolderName: 'PT Kazumi Indonesia' },
    { id: 'mandiri-default', bankName: 'Mandiri', accountNumber: '0987654321', accountHolderName: 'PT Kazumi Indonesia' },
];

export const COURIER_OPTIONS = [
    { id: 'jne', name: 'JNE' },
    { id: 'jnt', name: 'J&T Express' },
    { id: 'pos', name: 'POS Indonesia' },
];


export const STANDARD_COLORS: StandardColor[] = [
    { name: 'Pilih Warna', hex: '' }, { name: 'Hitam', hex: '#000000' }, { name: 'Putih', hex: '#FFFFFF' },
    { name: 'Merah', hex: '#FF0000' }, { name: 'Biru', hex: '#0000FF' }, { name: 'Hijau', hex: '#008000' },
];

export const INITIAL_REPORTS: ProductionReport[] = [];
export const INITIAL_SALES: Sale[] = [];
export const INITIAL_INVENTORY: any[] = [];
export const INITIAL_ONLINE_ORDERS: OnlineOrder[] = [];
export const INITIAL_STOCK_HISTORY: StockHistoryEntry[] = [];
export const INITIAL_MESSAGES: Message[] = [];
export const INITIAL_PROMO_CODES: PromoCode[] = [];
export const INITIAL_PRODUCT_DISCOUNTS: ProductDiscount[] = [];
export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];
export const INITIAL_PERFORMANCE_STATUSES: PerformanceStatus[] = [];