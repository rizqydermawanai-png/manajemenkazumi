// App.tsx
import React, { useState, useCallback, createContext, useContext, useMemo, useEffect } from 'react';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import { io } from 'socket.io-client';
import { 
    LogOut, LayoutDashboard, Shirt, Warehouse, ShoppingCart, BarChart2, MessageSquare, 
    UserCog, Activity, Menu, X, Printer, Ruler, Tag, Award, DollarSign, ClipboardList,
    CalendarCheck, TrendingUp, Clock, UserX, BookOpen, CalendarCheck2
} from 'lucide-react';

import { AuthPage } from './pages/AuthPage';
import { RecapitulationPage } from './pages/Recapitulation';
import { ProductionPage } from './pages/Production';
import { WarehousePage } from './pages/Warehouse';
import { SalesPage } from './pages/Sales';
import { ReportsPage } from './pages/Reports';
import { SettingsPage } from './pages/Settings';
import { MessageBoardPage } from './pages/MessageBoard';
import { ActivityLogPage } from './pages/ActivityLog';
import { SizingStandardsPage } from './pages/SizingStandardsPage';
import { CatalogPage } from './pages/CatalogPage';
import { PromoPage } from './pages/PromoPage';
import { LoyalCustomersPage } from './pages/LoyalCustomersPage';
import { PayrollPage } from './pages/PayrollPage';
import { SurveyPage } from './pages/SurveyPage';
import { AttendancePage } from './pages/AttendancePage';
import { PerformanceDashboardPage } from './pages/PerformanceStatusPage';
import { MySalaryPage } from './pages/MySalaryPage';
import { TerminationConfirmationPage } from './pages/TerminationConfirmationPage';
import { AutoLogoutPage } from './pages/AutoLogoutPage';
import { SopPage } from './pages/SopPage';
import { ClockOutPage } from './pages/ClockOutPage';
import { PrayerReportPage } from './pages/PrayerReportPage';
import { EmployeePerformanceDetailPage } from './pages/EmployeePerformanceDetailPage'; // New Import

import { SurveyFormModal } from './components/SurveyFormModal';
import { AttendanceModal } from './components/AttendanceModal';
import { WorkClock } from './components/WorkClock';
import { PrayerSubmissionModal } from './components/PrayerSubmissionModal'; 
import { PrayerTimeReminder } from './components/PrayerTimeReminder'; 

import { ToastProvider, useToast } from './hooks/useToast';
import { INITIAL_USERS, INITIAL_REPORTS, INITIAL_SALES, INITIAL_INVENTORY, INITIAL_ONLINE_ORDERS, INITIAL_STOCK_HISTORY, INITIAL_MESSAGES, INITIAL_MATERIALS, INITIAL_SIZING_STANDARDS, INITIAL_BANK_ACCOUNTS, INITIAL_PROMO_CODES, INITIAL_PRODUCT_DISCOUNTS, INITIAL_SURVEY_RESPONSES, INITIAL_ATTENDANCE, INITIAL_PERFORMANCE_STATUSES, INITIAL_SURVEY_QUESTIONS } from './lib/data';
import type { UserData, ActivityLog, Message, ProductionReport, Sale, InventoryItem, OnlineOrder, StockHistoryEntry, ProductionRequest, ManualDispatch, Material, FinishedGood, StockHistoryType, AllSizingStandards, StockAdjustment, SaleItem, Address, BankAccount, PromoCode, CustomerVoucher, ProductDiscount, PayrollEntry, SurveyResponse, SurveyAnswer, AttendanceRecord, AttendanceStatus, PerformanceStatus, PerformanceSignal, SurveyQuestion, PointLogEntry, Department, PrayerRecord, PrayerName } from './types';
import { Button } from './components/ui/Button';
import { generateSequentialId } from './lib/utils';
import { printSalarySlip } from './lib/print';
import { calculatePerformanceScore } from './lib/performance';
import { getPrayerTimes } from './lib/prayerTimes';

// ===================================================================================
// Print Preview Modal Functionality
// ===================================================================================
interface PrintContextType {
    showPrintPreview: (content: string, title: string) => void;
}

const PrintContext = createContext<PrintContextType | undefined>(undefined);

export const usePrintPreview = () => {
    const context = useContext(PrintContext);
    if (!context) throw new Error('usePrintPreview must be used within a PrintProvider');
    return context;
};

const PrintPreviewModal = ({ isOpen, onClose, title, content }: { isOpen: boolean; onClose: () => void; title: string; content: string; }) => {
    const [isPrinting, setIsPrinting] = useState(false);
    const { addToast } = useToast();

    const handlePrintClick = () => {
        if (isPrinting) return;
        setIsPrinting(true);

        const printWindow = window.open('', '_blank');

        if (!printWindow) {
            addToast({
                title: 'Pop-up Diblokir',
                message: 'Browser Anda mungkin memblokir pop-up. Izinkan pop-up untuk situs ini agar dapat mencetak.',
                type: 'error',
                duration: 6000
            });
            setIsPrinting(false);
            return;
        }

        const linkedStylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
        const tailwindScript = `<script src="https://cdn.tailwindcss.com"></script>`;

        const htmlToPrint = `
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <title>${title}</title>
                <meta charset="UTF-8" />
                ${linkedStylesheets.map(el => el.outerHTML).join('\n')}
                ${tailwindScript}
                <style>
                    @media print {
                        @page { 
                            size: A4;
                            margin: 1cm;
                        }
                        html, body {
                            width: 210mm;
                            height: 297mm;
                            -webkit-print-color-adjust: exact !important;
                            color-adjust: exact !important;
                        }
                    }
                    body {
                      font-family: 'Inter', sans-serif;
                      background-color: #fff;
                    }
                </style>
            </head>
            <body>
                ${content}
            </body>
            </html>
        `;
        
        printWindow.document.write(htmlToPrint);
        printWindow.document.close();

        setTimeout(() => {
            try {
                printWindow.focus();
                printWindow.print();
            } catch (e) {
                console.error("Print call failed:", e);
                addToast({ title: 'Error Cetak', message: 'Gagal memanggil fungsi cetak browser.', type: 'error' });
            } finally {
                if (!printWindow.closed) {
                    printWindow.close();
                }
                setIsPrinting(false);
            }
        }, 1000);
    };


    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, y: -20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.95, y: 20, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col h-[95vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        <header className="flex justify-between items-center p-4 border-b bg-white rounded-t-xl flex-shrink-0">
                            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePrintClick}
                                    disabled={isPrinting}
                                    className="inline-flex items-center justify-center rounded-lg font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 gap-2 bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-sm hover:shadow-md shadow-indigo-500/20 px-3 py-1.5 text-sm disabled:opacity-50"
                                >
                                    <Printer size={16}/> {isPrinting ? 'Mencetak...' : 'Cetak'}
                                </button>
                                <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </header>
                        <main className="p-2 sm:p-4 overflow-y-auto flex-grow">
                            <div id="printable-content-preview" className="bg-white shadow-lg max-w-[210mm] mx-auto" dangerouslySetInnerHTML={{ __html: content }} />
                        </main>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const PrintProvider = ({ children }: React.PropsWithChildren<{}>) => {
    const [isOpen, setIsOpen] = useState(false);
    const [printContent, setPrintContent] = useState('');
    const [printTitle, setPrintTitle] = useState('');

    const showPrintPreview = useCallback((content: string, title: string) => {
        setPrintContent(content);
        setPrintTitle(title);
        setIsOpen(true);
    }, []);

    const hidePrintPreview = useCallback(() => setIsOpen(false), []);

    return (
        <PrintContext.Provider value={{ showPrintPreview }}>
            {children}
            <PrintPreviewModal isOpen={isOpen} onClose={hidePrintPreview} title={printTitle} content={printContent} />
        </PrintContext.Provider>
    );
};
// ===================================================================================

// Debounce helper function
function debounce<T extends (...args: any[]) => any>(func: T, delay: number) {
    let timeout: ReturnType<typeof setTimeout>;
    return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    } as T;
}

export type Page = 'recapitulation' | 'production' | 'warehouse' | 'salesCalculator' | 'report' | 'messageBoard' | 'myProfile' | 'accountManagement' | 'activityLogs' | 'sizingStandards' | 'promo' | 'loyalCustomers' | 'payroll' | 'surveys' | 'attendance' | 'performanceDashboard' | 'mySalary' | 'sop' | 'prayerReport' | 'employeePerformanceDetail';

interface NavItemConfig {
    icon: React.ElementType;
    label: string;
    pageName: Page;
    roles: string[];
    departments?: string[];
}

const AppContent = () => {
    const getInitialPage = (user: UserData | null): Page => {
        if (!user || user.role === 'customer') return 'production';
        if (user.role === 'super_admin') return 'recapitulation';
        if (user.department === 'gudang') return 'warehouse';
        if (user.department === 'penjualan') return 'salesCalculator';
        return 'production';
    };
    const { addToast } = useToast();
    const { showPrintPreview } = usePrintPreview();

    // App-wide state
    const [currentUser, setCurrentUser] = useState<UserData | null>(null);
    const [users, setUsers] = useState<UserData[]>(INITIAL_USERS);
    const [lastLoggedInUsers, setLastLoggedInUsers] = useState<{uid: string, username: string}[]>([]);
    const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
    const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
    const [productionReports, setProductionReports] = useState<ProductionReport[]>(INITIAL_REPORTS);
    const [sales, setSales] = useState<Sale[]>(INITIAL_SALES);
    const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
    const [stockHistory, setStockHistory] = useState<StockHistoryEntry[]>(INITIAL_STOCK_HISTORY);
    const [productionRequests, setProductionRequests] = useState<ProductionRequest[]>([]);
    const [onlineOrders, setOnlineOrders] = useState<OnlineOrder[]>(INITIAL_ONLINE_ORDERS);
    const [manualDispatches, setManualDispatches] = useState<ManualDispatch[]>([]);
    const [materials, setMaterials] = useState<Material[]>(INITIAL_MATERIALS);
    const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([]);
    const [sizingStandards, setSizingStandards] = useState<AllSizingStandards>(INITIAL_SIZING_STANDARDS);
    const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(INITIAL_BANK_ACCOUNTS);
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>(INITIAL_PROMO_CODES);
    const [productDiscounts, setProductDiscounts] = useState<ProductDiscount[]>(INITIAL_PRODUCT_DISCOUNTS);
    const [customerVouchers, setCustomerVouchers] = useState<CustomerVoucher[]>([]);
    const [payrollHistory, setPayrollHistory] = useState<PayrollEntry[]>([]);
    const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>(INITIAL_SURVEY_RESPONSES);
    const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>(INITIAL_SURVEY_QUESTIONS);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
    const [performanceStatuses, setPerformanceStatuses] = useState<PerformanceStatus[]>(INITIAL_PERFORMANCE_STATUSES);
    const [prayerRecords, setPrayerRecords] = useState<PrayerRecord[]>([]);
    
    const [page, setPage] = useState<Page | 'autoLogout'>(getInitialPage(currentUser));
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [cart, setCart] = useState<SaleItem[]>([]);
    const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
    const [isAttendancePending, setIsAttendancePending] = useState(false);
    const [isPrayerModalOpen, setIsPrayerModalOpen] = useState(false);
    const [clockOutContext, setClockOutContext] = useState<'on_time' | 'overtime' | null>(null);
    const [viewingEmployeeId, setViewingEmployeeId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Data Fetching and Saving
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/data');
                if (!response.ok) throw new Error('Failed to fetch data');
                const data = await response.json();

                setCurrentUser(data.loggedInUser || null);
                setUsers(data.kazumiLocalUsers || INITIAL_USERS);
                setLastLoggedInUsers(data.kazumiLastLoggedInUsers || []);
                setActivityLog(data.kazumiActivityLogs || []);
                setMessages(data.kazumiMessages || INITIAL_MESSAGES);
                setProductionReports(data.kazumiHPPReports || INITIAL_REPORTS);
                setSales(data.kazumiSales || INITIAL_SALES);
                setInventory(data.kazumiInventory || INITIAL_INVENTORY);
                setStockHistory(data.kazumiStockHistory || INITIAL_STOCK_HISTORY);
                setProductionRequests(data.kazumiProductionRequests || []);
                setOnlineOrders(data.kazumiOnlineOrders || INITIAL_ONLINE_ORDERS);
                setManualDispatches(data.kazumiManualDispatches || []);
                setMaterials(data.kazumiMaterials || INITIAL_MATERIALS);
                setFinishedGoods(data.kazumiFinishedGoods || []);
                setSizingStandards(data.kazumiSizingStandards || INITIAL_SIZING_STANDARDS);
                setStockAdjustments(data.kazumiStockAdjustments || []);
                setBankAccounts(data.kazumiBankAccounts || INITIAL_BANK_ACCOUNTS);
                setPromoCodes(data.kazumiPromoCodes || INITIAL_PROMO_CODES);
                setProductDiscounts(data.kazumiProductDiscounts || INITIAL_PRODUCT_DISCOUNTS);
                setCustomerVouchers(data.kazumiCustomerVouchers || []);
                setPayrollHistory(data.kazumiPayrollHistory || []);
                setSurveyResponses(data.kazumiSurveyResponses || INITIAL_SURVEY_RESPONSES);
                setSurveyQuestions(data.kazumiSurveyQuestions || INITIAL_SURVEY_QUESTIONS);
                setAttendanceRecords(data.kazumiAttendance || INITIAL_ATTENDANCE);
                setPerformanceStatuses(data.kazumiPerformance || INITIAL_PERFORMANCE_STATUSES);
                setPrayerRecords(data.kazumiPrayerRecords || []);

            } catch (error) {
                console.error("Error fetching data from server:", error);
                addToast({ title: 'Error Koneksi', message: 'Gagal memuat data dari server.', type: 'error' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [addToast]);

    // Socket.IO connection and real-time updates
    useEffect(() => {
        const socket = io();

        const stateUpdaters: { [key: string]: React.Dispatch<React.SetStateAction<any>> } = {
            loggedInUser: setCurrentUser, kazumiLocalUsers: setUsers, kazumiLastLoggedInUsers: setLastLoggedInUsers,
            kazumiActivityLogs: setActivityLog, kazumiMessages: setMessages, kazumiHPPReports: setProductionReports,
            kazumiSales: setSales, kazumiInventory: setInventory, kazumiStockHistory: setStockHistory,
            kazumiProductionRequests: setProductionRequests, kazumiOnlineOrders: setOnlineOrders,
            kazumiManualDispatches: setManualDispatches, kazumiMaterials: setMaterials,
            kazumiFinishedGoods: setFinishedGoods, kazumiSizingStandards: setSizingStandards,
            kazumiStockAdjustments: setStockAdjustments, kazumiBankAccounts: setBankAccounts,
            kazumiPromoCodes: setPromoCodes, kazumiProductDiscounts: setProductDiscounts,
            kazumiCustomerVouchers: setCustomerVouchers, kazumiPayrollHistory: setPayrollHistory,
            kazumiSurveyResponses: setSurveyResponses, kazumiSurveyQuestions: setSurveyQuestions,
            kazumiAttendance: setAttendanceRecords, kazumiPerformance: setPerformanceStatuses,
            kazumiPrayerRecords: setPrayerRecords,
        };

        socket.on('data_updated', (partialData: Record<string, any>) => {
            console.log('Received real-time update:', partialData);
            addToast({ title: 'Data Diperbarui', message: 'Tampilan telah disinkronkan secara real-time.', type: 'info', duration: 2000 });
            Object.keys(partialData).forEach(key => {
                const updater = stateUpdaters[key];
                if (updater) {
                    updater(partialData[key]);
                }
            });
        });

        return () => {
            socket.off('data_updated');
            socket.disconnect();
        };
    }, [
        addToast, setCurrentUser, setUsers, setLastLoggedInUsers, setActivityLog, setMessages,
        setProductionReports, setSales, setInventory, setStockHistory, setProductionRequests,
        setOnlineOrders, setManualDispatches, setMaterials, setFinishedGoods, setSizingStandards,
        setStockAdjustments, setBankAccounts, setPromoCodes, setProductDiscounts,
        setCustomerVouchers, setPayrollHistory, setSurveyResponses, setSurveyQuestions,
        setAttendanceRecords, setPerformanceStatuses, setPrayerRecords
    ]);
    
    // --- Granular Data Persistence ---
    const saveData = useCallback(debounce(async (dataToSave: object) => {
        if (isLoading) return; // Prevent saving during initial load
        try {
            await fetch('/api/data', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSave),
            });
        } catch (error) {
            console.error("Error saving data slice:", error);
            addToast({ title: 'Error Simpan', message: 'Gagal menyimpan sebagian data ke server.', type: 'error' });
        }
    }, 1000), [addToast, isLoading]);

    const useDebouncedSave = (key: string, value: any) => {
        useEffect(() => {
            if (isLoading) return;
            saveData({ [key]: value });
        }, [value]);
    };
    
    useDebouncedSave('loggedInUser', currentUser);
    useDebouncedSave('kazumiLocalUsers', users);
    useDebouncedSave('kazumiLastLoggedInUsers', lastLoggedInUsers);
    useDebouncedSave('kazumiActivityLogs', activityLog);
    useDebouncedSave('kazumiMessages', messages);
    useDebouncedSave('kazumiHPPReports', productionReports);
    useDebouncedSave('kazumiSales', sales);
    useDebouncedSave('kazumiInventory', inventory);
    useDebouncedSave('kazumiStockHistory', stockHistory);
    useDebouncedSave('kazumiProductionRequests', productionRequests);
    useDebouncedSave('kazumiOnlineOrders', onlineOrders);
    useDebouncedSave('kazumiManualDispatches', manualDispatches);
    useDebouncedSave('kazumiMaterials', materials);
    useDebouncedSave('kazumiFinishedGoods', finishedGoods);
    useDebouncedSave('kazumiSizingStandards', sizingStandards);
    useDebouncedSave('kazumiStockAdjustments', stockAdjustments);
    useDebouncedSave('kazumiBankAccounts', bankAccounts);
    useDebouncedSave('kazumiPromoCodes', promoCodes);
    useDebouncedSave('kazumiProductDiscounts', productDiscounts);
    useDebouncedSave('kazumiCustomerVouchers', customerVouchers);
    useDebouncedSave('kazumiPayrollHistory', payrollHistory);
    useDebouncedSave('kazumiSurveyResponses', surveyResponses);
    useDebouncedSave('kazumiSurveyQuestions', surveyQuestions);
    useDebouncedSave('kazumiAttendance', attendanceRecords);
    useDebouncedSave('kazumiPerformance', performanceStatuses);
    useDebouncedSave('kazumiPrayerRecords', prayerRecords);


    useEffect(() => {
        setPage(getInitialPage(currentUser));
    }, [currentUser]);

    useEffect(() => {
        if (!users.some(u => u.role === 'member' || u.role === 'admin')) {
            return;
        }

        let needsUpdate = false;
        const updatedUsers = users.map(user => {
            if (user.role === 'member' || user.role === 'admin') {
                const { score: newScore, history: newHistory } = calculatePerformanceScore(user, attendanceRecords, prayerRecords);

                const currentScore = user.performanceScore;
                const currentHistory = user.pointHistory || [];

                const scoresAreEqual = currentScore &&
                    currentScore.totalPoints === newScore.totalPoints &&
                    currentScore.breakdown.punctuality === newScore.breakdown.punctuality &&
                    currentScore.breakdown.discipline === newScore.breakdown.discipline &&
                    currentScore.breakdown.productivity === newScore.breakdown.productivity &&
                    currentScore.breakdown.initiative === newScore.breakdown.initiative;
                
                const historiesAreEqual = currentHistory.length === newHistory.length && 
                                          currentHistory.every((entry, index) => entry.id === newHistory[index].id);

                if (!scoresAreEqual || !historiesAreEqual) {
                    needsUpdate = true;
                    return { ...user, performanceScore: newScore, pointHistory: newHistory };
                }
            }
            return user;
        });

        if (needsUpdate) {
            setUsers(updatedUsers);
        }
    }, [users, attendanceRecords, prayerRecords]);
    
    const todaysAttendance = useMemo(() => {
        if (!currentUser) return null;
        const today = new Date().toISOString().split('T')[0];
        return attendanceRecords.find(r => r.userId === currentUser.uid && r.date === today && r.status === 'Hadir');
    }, [attendanceRecords, currentUser]);

    const hasClockedIn = !!todaysAttendance;
    const hasClockedOut = !!todaysAttendance?.clockOutTimestamp;

    useEffect(() => {
        if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'member')) {
            const today = new Date().toISOString().split('T')[0];
            const hasAttendedToday = attendanceRecords.some(
                record => record.userId === currentUser.uid && record.date === today
            );
            if (!hasAttendedToday) {
                setIsAttendancePending(true);
            } else {
                setIsAttendancePending(false);
            }
        } else {
            setIsAttendancePending(false);
        }
    }, [currentUser, attendanceRecords]);

    useEffect(() => {
        if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'member')) {
            const fourMonthsAgo = new Date();
            fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

            const lastSurvey = currentUser.lastSurveyDate ? new Date(currentUser.lastSurveyDate) : null;
            const lastPayroll = currentUser.lastPayrollDate ? new Date(currentUser.lastPayrollDate) : null;
            
            if (lastPayroll && (!lastSurvey || lastSurvey < fourMonthsAgo)) {
                 setTimeout(() => setIsSurveyModalOpen(true), 1500);
            }
        }
    }, [currentUser]);

    const handleAttendanceSubmit = async (status: AttendanceStatus, proof: string) => {
        if (!currentUser) return;

        let finalProof = proof;
        if ((status === 'Hadir' || status === 'Sakit') && proof.startsWith('data:image')) {
            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: proof }),
                });
                if (!response.ok) throw new Error('Upload failed');
                const data = await response.json();
                finalProof = data.url;
            } catch (error) {
                console.error("Image upload error:", error);
                addToast({ title: 'Upload Gagal', message: 'Tidak dapat mengunggah gambar ke server.', type: 'error' });
                return;
            }
        }

        const newRecord: AttendanceRecord = {
            id: crypto.randomUUID(),
            userId: currentUser.uid,
            date: new Date().toISOString().split('T')[0],
            status,
            proof: finalProof,
            clockInTimestamp: new Date().toISOString(),
        };
        setAttendanceRecords(prev => [...prev, newRecord]);
        addActivity('Kehadiran', `Mencatat kehadiran sebagai: ${status}`);
        setIsAttendancePending(false);
        addToast({ title: 'Kehadiran Dicatat', message: 'Terima kasih, selamat bekerja!', type: 'success' });
    };

    const handleClockOut = () => {
        if (!currentUser || !todaysAttendance) return;
        if (window.confirm('Anda yakin ingin clock out untuk hari ini?')) {
            const clockOutTimestamp = new Date();
            
            const endWork = new Date(todaysAttendance.date);
            endWork.setHours(16, 0, 0, 0); // 4:00 PM
            const overtimeMinutes = (clockOutTimestamp.getTime() - endWork.getTime()) / (1000 * 60);
            const isOvertime = overtimeMinutes > 30;

            const updatedRecord = { ...todaysAttendance, clockOutTimestamp: clockOutTimestamp.toISOString() };
            setAttendanceRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
            
            addActivity('Kehadiran', 'Mencatat waktu pulang (clock out).');
            setClockOutContext(isOvertime ? 'overtime' : 'on_time');
        }
    };
    
    const handlePrayerSubmit = async (prayerName: PrayerName, photoProof: string) => {
        if (!currentUser) return;

        let finalProof = photoProof;
        if (photoProof.startsWith('data:image')) {
            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: photoProof }),
                });
                if (!response.ok) throw new Error('Upload failed');
                const data = await response.json();
                finalProof = data.url;
            } catch (error) {
                console.error("Image upload error:", error);
                addToast({ title: 'Upload Gagal', message: 'Tidak dapat mengunggah bukti sholat.', type: 'error' });
                return;
            }
        }
        
        const now = new Date();
        const prayerTimes = getPrayerTimes(now);
        const prayerTime = prayerTimes[prayerName.toLowerCase() as keyof typeof prayerTimes] as Date;
        
        const onTimeLimit = new Date(prayerTime.getTime() + 30 * 60 * 1000);
        const status = now <= onTimeLimit ? 'on_time' : 'late';

        const newRecord: PrayerRecord = {
            id: crypto.randomUUID(),
            userId: currentUser.uid,
            date: now.toISOString().split('T')[0],
            prayerName,
            timestamp: now.toISOString(),
            photoProof: finalProof,
            status,
        };
        
        setPrayerRecords(prev => [...prev, newRecord]);
        addActivity('Laporan Sholat', `Melaporkan sholat ${prayerName} (${status === 'on_time' ? 'Tepat Waktu' : 'Terlambat'})`);
        addToast({ 
            title: 'Laporan Diterima', 
            message: `Terima kasih, laporan sholat ${prayerName} Anda telah dicatat.`, 
            type: 'success' 
        });
        setIsPrayerModalOpen(false);
    };

    const handleSurveySubmit = (answers: SurveyAnswer[]) => {
        if (!currentUser) return;

        const newResponse: SurveyResponse = {
            id: crypto.randomUUID(),
            surveyId: `Q${Math.floor(new Date().getMonth() / 3) + 1}-${new Date().getFullYear()}`,
            userId: currentUser.uid,
            submittedAt: new Date().toISOString(),
            answers: answers,
        };

        setSurveyResponses(prev => [...prev, newResponse]);

        const updatedUser = { ...currentUser, lastSurveyDate: new Date().toISOString() };
        setCurrentUser(updatedUser);
        setUsers(prevUsers => prevUsers.map(u => u.uid === currentUser.uid ? updatedUser : u));

        addActivity('Survei', 'Mengisi survei kepuasan pegawai.');
        addToast({ title: 'Terima Kasih!', message: 'Umpan balik Anda telah kami terima.', type: 'success' });
        setIsSurveyModalOpen(false);
    };

    const activeProductDiscounts = useMemo(() => {
        const now = new Date();
        return productDiscounts.filter(d => 
            d.status === 'active' && 
            new Date(d.startDate) <= now && 
            new Date(d.endDate) >= now
        );
    }, [productDiscounts]);

    const productsWithDiscounts = useMemo(() => {
        return finishedGoods.map(good => {
            const discount = activeProductDiscounts.find(d => d.productId === good.id);
            if (discount) {
                const salePrice = discount.discountType === 'fixed'
                    ? good.sellingPrice - discount.discountValue
                    : good.sellingPrice * (1 - discount.discountValue / 100);
                return { ...good, salePrice: Math.max(0, salePrice) };
            }
            const { salePrice, ...goodWithoutSalePrice } = good;
            return goodWithoutSalePrice;
        });
    }, [finishedGoods, activeProductDiscounts]);

    const addActivity = useCallback((type: string, description: string, relatedId?: string) => {
        const userId = currentUser ? currentUser.uid : 'system';
        const newLog: ActivityLog = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), userId, type, description, relatedId };
        setActivityLog(prev => [newLog, ...prev.slice(0, 99)]);
    }, [currentUser]);
    
    const addStockHistory = useCallback((itemId: string, itemName: string, type: StockHistoryType, quantityChange: number, finalStock: number, notes: string) => {
        const userId = currentUser ? currentUser.uid : 'system';
        const newHistory: StockHistoryEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            productId: itemId,
            productName: itemName,
            type: type,
            quantity: quantityChange,
            finalStock: finalStock,
            source: notes,
            userId: userId,
        };
        setStockHistory(prev => [newHistory, ...prev]);
    }, [currentUser]);

    const updateStock = useCallback((updates: { itemId: string, quantityChange: number, type: StockHistoryType, notes: string }[]) => {
        let success = true;
        
        const newMaterials = [...materials];
        const newFinishedGoods = [...finishedGoods];
        
        for (const update of updates) {
            const { itemId, quantityChange } = update;
             if (quantityChange < 0) {
                const material = newMaterials.find(m => m.id === itemId);
                if (material && material.stock < Math.abs(quantityChange)) {
                     addToast({ title: 'Stok Kurang', message: `Stok ${material.name} tidak mencukupi.`, type: 'error' });
                     success = false;
                     break;
                }
                const good = newFinishedGoods.find(g => g.id === itemId);
                if (good && good.stock < Math.abs(quantityChange)) {
                     addToast({ title: 'Stok Kurang', message: `Stok ${good.name} ${good.size} tidak mencukupi.`, type: 'error' });
                     success = false;
                     break;
                }
            }
        }
        
        if (!success) return false;

        updates.forEach(update => {
            const { itemId, quantityChange, type, notes } = update;
            
            const materialIndex = newMaterials.findIndex(m => m.id === itemId);
            if (materialIndex > -1) {
                const material = newMaterials[materialIndex];
                const newStock = material.stock + quantityChange;
                newMaterials[materialIndex] = { ...material, stock: newStock };
                addStockHistory(itemId, material.name, type, quantityChange, newStock, notes);
                return;
            }

            const goodIndex = newFinishedGoods.findIndex(g => g.id === itemId);
            if (goodIndex > -1) {
                const good = newFinishedGoods[goodIndex];
                const newStock = good.stock + quantityChange;
                newFinishedGoods[goodIndex] = { ...good, stock: newStock };
                addStockHistory(itemId, `${good.name} ${good.size} (${good.colorName})`, type, quantityChange, newStock, notes);
            }
        });

        setMaterials(newMaterials);
        setFinishedGoods(newFinishedGoods);
        return true;
    }, [materials, finishedGoods, addStockHistory, addToast]);

    const receiveProductionGoods = useCallback((report: ProductionReport) => {
        const goodsFromReport: { good: FinishedGood, originalQuantity: number }[] = [];

        report.hppResult.garmentOrder.forEach(orderItem => {
            const goodId = `${report.selectedGarment}-${orderItem.model}-${orderItem.size}-${orderItem.colorName}`.replace(/\s+/g, '-').toLowerCase();
            const good: FinishedGood = {
                id: goodId,
                productionReportId: report.id,
                name: `${report.selectedGarment} ${orderItem.model || ''}`.trim(),
                model: orderItem.model || '',
                size: orderItem.size,
                colorName: orderItem.colorName,
                colorCode: orderItem.colorCode,
                stock: orderItem.quantity,
                hpp: report.hppResult.hppPerGarment,
                sellingPrice: report.hppResult.sellingPricePerGarment,
            };
            goodsFromReport.push({ good, originalQuantity: orderItem.quantity });
        });
    
        const updatedGoodsState = [...finishedGoods];
        goodsFromReport.forEach(({ good, originalQuantity }) => {
            const existingGoodIndex = updatedGoodsState.findIndex(g => g.id === good.id);
            if (existingGoodIndex > -1) {
                const newStock = updatedGoodsState[existingGoodIndex].stock + originalQuantity;
                updatedGoodsState[existingGoodIndex].stock = newStock;
                addStockHistory(good.id, `${good.name} ${good.size} (${good.colorName})`, 'in-production', originalQuantity, newStock, `Masuk dari produksi #${report.id}`);
            } else {
                updatedGoodsState.push(good);
                addStockHistory(good.id, `${good.name} ${good.size} (${good.colorName})`, 'in-production', originalQuantity, originalQuantity, `Masuk dari produksi #${report.id}`);
            }
        });
        
        setFinishedGoods(updatedGoodsState);
        setProductionReports(prev => prev.map(r => r.id === report.id ? { ...r, isReceivedInWarehouse: true } : r));
        addActivity('Gudang', `Menerima barang dari produksi #${report.id}`, report.id);
        addToast({ title: 'Berhasil', message: 'Barang dari produksi telah ditambahkan ke stok.', type: 'success' });
    }, [finishedGoods, setFinishedGoods, setProductionReports, addStockHistory, addActivity, addToast]);

    const handleLogin = (user: UserData) => {
        setCurrentUser(user);
        if (user.role !== 'customer') {
            let lastUsers = lastLoggedInUsers.filter(u => u.uid !== user.uid);
            lastUsers.unshift({ uid: user.uid, username: user.username });
            setLastLoggedInUsers(lastUsers.slice(0, 5));
        }
        addActivity('Manajemen Akun', `Pengguna ${user.username} berhasil login.`);
        addToast({ title: 'Login Berhasil', message: `Selamat datang kembali, ${user.fullName}!`, type: 'success' });
    };
    
    const handleRegister = async (newUser: Omit<UserData, 'uid' | 'role' | 'isApproved' | 'createdAt' | 'department' | 'profilePictureUrl' | 'sanctions' | 'status' | 'pointHistory' | 'performanceScore'>) => {
        const existingUser = users.find(u => u.username.toLowerCase() === newUser.username.toLowerCase());
        if (existingUser) {
            addToast({ title: 'Registrasi Gagal', message: 'User ID sudah digunakan.', type: 'error' });
            return { success: false, message: 'User ID sudah digunakan.' };
        }

        const registeredUser: UserData = {
            ...newUser,
            uid: `cust-${crypto.randomUUID()}`,
            role: 'pending',
            isApproved: false,
            createdAt: new Date().toISOString(),
            department: null,
            profilePictureUrl: `https://api.dicebear.com/8.x/initials/svg?seed=${newUser.fullName}`,
            sanctions: []
        };

        setUsers(prev => [...prev, registeredUser]);
        addActivity('Manajemen Akun', `Pelanggan baru mendaftar (menunggu persetujuan): ${registeredUser.username}`, registeredUser.uid);
        
        return { success: true, message: 'Registrasi berhasil! Akun Anda akan segera diverifikasi oleh admin.' };
    };

    const handleStaffRegister = async (newUser: Omit<UserData, 'uid' | 'role' | 'isApproved' | 'createdAt' | 'profilePictureUrl' | 'sanctions' | 'status' | 'pointHistory' | 'performanceScore'> & { department: Department }) => {
        const existingUser = users.find(u => u.username.toLowerCase() === newUser.username.toLowerCase());
        if (existingUser) {
            return { success: false, message: 'User ID sudah digunakan.' };
        }

        const registeredUser: UserData = {
            ...newUser,
            uid: `staff-${crypto.randomUUID()}`,
            role: 'pending',
            isApproved: false,
            createdAt: new Date().toISOString(),
            profilePictureUrl: `https://api.dicebear.com/8.x/initials/svg?seed=${newUser.fullName}`,
            sanctions: [],
            baseSalary: 3000000,
        };

        setUsers(prev => [...prev, registeredUser]);
        addActivity('Manajemen Akun', `Pegawai baru mendaftar (menunggu persetujuan): ${registeredUser.username}`, registeredUser.uid);
        
        return { success: true, message: 'Registrasi berhasil! Akun Anda akan segera diverifikasi oleh admin.' };
    };

    const handleLogout = () => {
        addActivity('Manajemen Akun', `Pengguna ${currentUser?.username} logout.`);
        setCurrentUser(null);
        setCart([]);
        setClockOutContext(null);
        setViewingEmployeeId(null);
    };
    
    const handlePlaceOnlineOrder = (
        orderInfo: {
            customerName: string;
            shippingAddress: Address;
            notes: string;
            paymentMethod: string;
            shippingMethod: string;
            shippingCost: number;
            paymentProofUrl: string;
        },
        orderedCart: SaleItem[]
    ) => {
         const newOrder: OnlineOrder = {
            id: generateSequentialId('ORD'),
            timestamp: new Date().toISOString(),
            customerName: orderInfo.customerName,
            shippingAddress: orderInfo.shippingAddress,
            notes: orderInfo.notes,
            paymentMethod: orderInfo.paymentMethod,
            shippingMethod: orderInfo.shippingMethod,
            shippingCost: orderInfo.shippingCost,
            paymentProofUrl: orderInfo.paymentProofUrl,
            status: 'pending_payment',
            items: orderedCart,
            history: [{ status: 'pending_payment', timestamp: new Date().toISOString(), userId: currentUser?.uid || null }]
        };
        setOnlineOrders(prev => [newOrder, ...prev]);
        addActivity('Pelanggan', `Pesanan online baru #${newOrder.id} dibuat.`, newOrder.id);
        addToast({ title: 'Pesanan Diterima', message: 'Pesanan Anda sedang diproses oleh tim kami.', type: 'success' });
        setCart([]);
    };
    
    const handleUpdateCustomerProfile = (updates: Partial<UserData>) => {
        if (!currentUser) return;
        const updatedUser = { ...currentUser, ...updates };
        setCurrentUser(updatedUser);
        setUsers(prevUsers => prevUsers.map(u => u.uid === currentUser.uid ? updatedUser : u));
        addActivity('Manajemen Akun', 'Memperbarui profil pribadi.');
        addToast({ title: 'Profil Diperbarui', message: 'Informasi profil Anda telah berhasil disimpan.', type: 'success' });
    };

    const handleDispatchOnlineOrder = (order: OnlineOrder, trackingNumber: string) => {
        if (!currentUser) return;

        const stockUpdates = order.items.map(item => ({
            itemId: item.id,
            quantityChange: -item.quantity,
            type: 'out-sale' as StockHistoryType,
            notes: `Penjualan Online #${order.id}`
        }));
        
        const stockUpdateSuccess = updateStock(stockUpdates);

        if (stockUpdateSuccess) {
            const subtotal = order.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
            const newSale: Sale = {
                id: generateSequentialId('INV'),
                timestamp: new Date().toISOString(),
                userId: currentUser.uid,
                customerName: order.customerName,
                items: order.items,
                result: { subtotal: subtotal, discountAmount: 0, taxAmount: 0, grandTotal: subtotal },
                type: 'online',
                status: 'selesai',
                onlineOrderId: order.id,
            };
            setSales(prev => [newSale, ...prev]);

            setOnlineOrders(prev => prev.map(o => o.id === order.id ? {
                ...o,
                status: 'siap_kirim',
                trackingNumber: trackingNumber,
                history: [...o.history, { status: 'siap_kirim', timestamp: new Date().toISOString(), userId: currentUser.uid }]
            } : o));

            addActivity('Gudang', `Mengirim pesanan online #${order.id}`, order.id);
            addToast({ title: 'Pesanan Dikirim', message: `Pesanan untuk ${order.customerName} telah dikirim dan penjualan dicatat.`, type: 'success' });
        }
    };
    
    const handleConfirmSalary = useCallback((payrollId: string) => {
        setPayrollHistory(prev => prev.map(p => 
            p.id === payrollId 
            ? { ...p, status: 'confirmed', confirmedAt: new Date().toISOString() }
            : p
        ));
        const payroll = payrollHistory.find(p => p.id === payrollId);
        if (payroll && currentUser) {
            addActivity('Penggajian', `Mengonfirmasi penerimaan gaji periode ${payroll.period}.`);
            addToast({ title: 'Konfirmasi Berhasil', message: 'Terima kasih telah mengonfirmasi penerimaan gaji Anda.', type: 'success' });
        }
    }, [payrollHistory, addActivity, addToast, currentUser]);
    
    const handlePrintSalarySlip = useCallback((payrollId: string) => {
        const payroll = payrollHistory.find(p => p.id === payrollId);
        const employee = users.find(u => u.uid === payroll?.employeeId);
        const issuer = users.find(u => u.uid === payroll?.processedById);
        
        if (payroll && employee && issuer) {
            printSalarySlip(payroll, employee, issuer, showPrintPreview);
        } else {
            addToast({ title: 'Error', message: 'Tidak dapat menemukan data untuk mencetak slip.', type: 'error' });
        }
    }, [payrollHistory, users, showPrintPreview, addToast]);

    const handleViewEmployeePerformance = (userId: string) => {
        setViewingEmployeeId(userId);
        setPage('employeePerformanceDetail');
    };

    const handleBackToAccountManagement = () => {
        setViewingEmployeeId(null);
        setPage('accountManagement');
    };


    interface NavItemProps {
        icon: React.ElementType;
        label: string;
        pageName: Page;
    }

    const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, pageName }) => (
        <button
            onClick={() => { setPage(pageName); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
            className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group relative ${ page === pageName ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500 hover:bg-indigo-100 hover:text-indigo-600' }`}
        >
            <Icon size={20} className={`mr-3 flex-shrink-0 transition-colors duration-200 ${page === pageName ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'}`} />
            <span className="truncate">{label}</span>
        </button>
    );
    
    const renderStaffPage = () => {
        if (!currentUser || typeof page !== 'string') return null;
        const pageProps = { currentUser, users, addActivity, updateStock };
        switch (page) {
            case 'recapitulation': return <RecapitulationPage sales={sales} productionReports={productionReports} materials={materials} finishedGoods={finishedGoods} activityLogs={activityLog} users={users} />;
            case 'production': return <ProductionPage {...pageProps} materials={materials} productionReports={productionReports} setProductionReports={setProductionReports} sizingStandards={sizingStandards} productionRequests={productionRequests} setProductionRequests={setProductionRequests} finishedGoods={finishedGoods} users={users} />;
            case 'warehouse': return <WarehousePage {...pageProps} materials={materials} setMaterials={setMaterials} productionReports={productionReports} setProductionReports={setProductionReports} finishedGoods={finishedGoods} setFinishedGoods={setFinishedGoods} onlineOrders={onlineOrders} setOnlineOrders={setOnlineOrders} stockHistory={stockHistory} addStockHistory={addStockHistory} receiveProductionGoods={receiveProductionGoods} stockAdjustments={stockAdjustments} setStockAdjustments={setStockAdjustments} productionRequests={productionRequests} setProductionRequests={setProductionRequests} onDispatchOrder={handleDispatchOnlineOrder} users={users} />;
            case 'salesCalculator': return <SalesPage {...pageProps} sales={sales} setSales={setSales} finishedGoods={productsWithDiscounts} promoCodes={promoCodes} />;
            case 'report': return <ReportsPage sales={sales} productionReports={productionReports} users={users} stockHistory={stockHistory} productionRequests={productionRequests} inventory={inventory} />;
            case 'payroll': return <PayrollPage {...pageProps} payrollHistory={payrollHistory} setPayrollHistory={setPayrollHistory} setUsers={setUsers} />;
            case 'surveys': return <SurveyPage surveyResponses={surveyResponses} users={users} surveyQuestions={surveyQuestions} setSurveyQuestions={setSurveyQuestions} currentUser={currentUser} addActivity={addActivity} />;
            case 'promo': return <PromoPage {...pageProps} promoCodes={promoCodes} setPromoCodes={setPromoCodes} productDiscounts={productDiscounts} setProductDiscounts={setProductDiscounts} finishedGoods={finishedGoods} users={users} />;
            case 'loyalCustomers': return <LoyalCustomersPage {...pageProps} sales={sales} promoCodes={promoCodes} customerVouchers={customerVouchers} setCustomerVouchers={setCustomerVouchers} users={users} />;
            case 'messageBoard': return <MessageBoardPage currentUser={currentUser} users={users} addActivity={addActivity} messages={messages} setMessages={setMessages} />;
            case 'activityLogs': return <ActivityLogPage logs={activityLog} users={users} />;
            case 'sizingStandards': return <SizingStandardsPage sizingStandards={sizingStandards} setSizingStandards={setSizingStandards} addActivity={addActivity} />;
            case 'myProfile':
            case 'accountManagement': 
                return <SettingsPage {...pageProps} setUsers={setUsers} setCurrentUser={setCurrentUser} initialTab={page} bankAccounts={bankAccounts} setBankAccounts={setBankAccounts} showPrintPreview={showPrintPreview} messages={messages} setMessages={setMessages} onViewEmployeePerformance={handleViewEmployeePerformance} />;
            case 'attendance': return <AttendancePage attendanceRecords={attendanceRecords} setAttendanceRecords={setAttendanceRecords} users={users} performanceStatuses={performanceStatuses} addActivity={addActivity} />;
            case 'performanceDashboard': return <PerformanceDashboardPage currentUser={currentUser} users={users} />;
            case 'mySalary': return <MySalaryPage currentUser={currentUser} payrollHistory={payrollHistory} onConfirmSalary={handleConfirmSalary} onPrintSlip={handlePrintSalarySlip} />;
            case 'sop': return <SopPage currentUser={currentUser} />;
            case 'prayerReport': return <PrayerReportPage currentUser={currentUser} prayerRecords={prayerRecords} onOpenModal={() => setIsPrayerModalOpen(true)} />;
            case 'employeePerformanceDetail':
                if (!viewingEmployeeId) {
                    return <SettingsPage {...pageProps} setUsers={setUsers} setCurrentUser={setCurrentUser} initialTab={'accountManagement'} bankAccounts={bankAccounts} setBankAccounts={setBankAccounts} showPrintPreview={showPrintPreview} messages={messages} setMessages={setMessages} onViewEmployeePerformance={handleViewEmployeePerformance} />;
                }
                return <EmployeePerformanceDetailPage userId={viewingEmployeeId} users={users} onBack={handleBackToAccountManagement} />;
            default: return <RecapitulationPage sales={sales} productionReports={productionReports} materials={materials} finishedGoods={finishedGoods} activityLogs={activityLog} users={users}/>;
        }
    };
    
    const navItems: NavItemConfig[] = [
        { icon: LayoutDashboard, label: 'Rekapitulasi', pageName: 'recapitulation', roles: ['super_admin'] },
        { icon: CalendarCheck, label: 'Absensi', pageName: 'attendance', roles: ['super_admin', 'admin'] },
        { icon: Shirt, label: 'Produksi', pageName: 'production', roles: ['super_admin', 'admin', 'member'], departments: ['produksi'] },
        { icon: Warehouse, label: 'Gudang', pageName: 'warehouse', roles: ['super_admin', 'admin', 'member'], departments: ['gudang'] },
        { icon: ShoppingCart, label: 'Penjualan', pageName: 'salesCalculator', roles: ['super_admin', 'admin', 'member'], departments: ['penjualan'] },
        { icon: BarChart2, label: 'Laporan', pageName: 'report', roles: ['super_admin', 'admin', 'member'] },
        { icon: DollarSign, label: 'Penggajian', pageName: 'payroll', roles: ['super_admin'] },
        { icon: Ruler, label: 'Fitting Ukuran', pageName: 'sizingStandards', roles: ['super_admin'] },
        { icon: Tag, label: 'Promo & Diskon', pageName: 'promo', roles: ['super_admin', 'admin'] },
        { icon: Award, label: 'Pelanggan Setia', pageName: 'loyalCustomers', roles: ['super_admin', 'admin'] },
        { icon: ClipboardList, label: 'Survei Kepuasan', pageName: 'surveys', roles: ['super_admin'] },
        { icon: DollarSign, label: 'Gaji Saya', pageName: 'mySalary', roles: ['admin', 'member'] },
        { icon: TrendingUp, label: 'Dasbor Kinerja', pageName: 'performanceDashboard', roles: ['admin', 'member'] },
        { icon: CalendarCheck2, label: 'Laporan Sholat', pageName: 'prayerReport', roles: ['admin', 'member'] },
        { icon: BookOpen, label: 'Pedoman SOP', pageName: 'sop', roles: ['super_admin', 'admin', 'member'] },
        { icon: MessageSquare, label: 'Papan Pesan', pageName: 'messageBoard', roles: ['super_admin', 'admin', 'member'] },
        { icon: UserCog, label: 'Profil Saya', pageName: 'myProfile', roles: ['super_admin', 'admin', 'member'] },
        { icon: UserCog, label: 'Manajemen Akun', pageName: 'accountManagement', roles: ['super_admin', 'admin'] },
        { icon: Activity, label: 'Aktivitas Kerja', pageName: 'activityLogs', roles: ['super_admin'] },
    ];

    const accessibleNavItems = navItems.filter(item => 
        currentUser && currentUser.role && item.roles.includes(currentUser.role) && 
        (currentUser.role === 'super_admin' || currentUser.role === 'admin' || !item.departments || (currentUser.department && item.departments.includes(currentUser.department)))
    );

    const sidebarVariants: Variants = {
        open: { x: 0, transition: { type: 'spring', stiffness: 400, damping: 40 } },
        closed: { x: '-100%', transition: { type: 'spring', stiffness: 400, damping: 40 } }
    };

    // Centralized view logic for smoother transitions
    const getCurrentView = (): string => {
        if (isLoading) return 'loading';
        if (!currentUser) return 'login';
        if (clockOutContext) return 'clock_out';
        if (page === 'autoLogout') return 'auto_logout';
        if (!currentUser.isApproved && currentUser.role !== 'pending') return 'deactivated';
        if (currentUser.status === 'pending_termination') return 'termination_pending';
        if (isAttendancePending && currentUser.role !== 'super_admin') return 'attendance_pending';
        if (currentUser.role === 'customer') return 'customer_catalog';
        return 'dashboard'; // The main app with sidebar
    };

    const currentView = getCurrentView();
    
    const renderDashboard = () => (
      <div id="main-app-container" className="flex h-screen bg-slate-50 overflow-hidden">
          <AnimatePresence>
          {isSidebarOpen && (
               <motion.div
                  className="fixed inset-0 bg-black/30 z-30 md:hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSidebarOpen(false)}
              />
          )}
          </AnimatePresence>
          <motion.aside 
               className="w-64 bg-white/95 backdrop-blur-sm border-r border-slate-200/80 flex flex-col p-4 absolute md:relative h-full z-40"
               variants={sidebarVariants}
               initial={false}
               animate={isSidebarOpen ? "open" : "closed"}
          >
              <div className="flex justify-between items-center mb-8 px-2">
                  <h1 className="text-2xl font-bold text-indigo-600">KAZUMI</h1>
                  <button className="md:hidden text-slate-500" onClick={() => setIsSidebarOpen(false)}><X/></button>
              </div>
              <nav className="flex-grow space-y-1.5 overflow-y-auto">
                  {accessibleNavItems.map(item => <NavItem key={item.pageName} icon={item.icon} label={item.label} pageName={item.pageName as Page} />)}
              </nav>
              <div className="mt-auto pt-4 border-t border-slate-200/80">
                  <div className="flex items-center p-2 mb-2">
                      <img src={currentUser!.profilePictureUrl} alt={currentUser!.fullName} className="w-10 h-10 rounded-full mr-3 object-cover" />
                      <div className="flex-1 overflow-hidden">
                          <p className="font-semibold text-slate-800 truncate">{currentUser!.fullName}</p>
                          <p className="text-sm text-slate-500 capitalize truncate">{currentUser!.role === 'member' ? currentUser!.department : currentUser!.role.replace('_', ' ')}</p>
                      </div>
                  </div>
                   {hasClockedIn && !hasClockedOut && (
                      <Button variant="outline" size="sm" className="w-full mb-2" onClick={handleClockOut}>
                          <Clock size={16} className="mr-2"/> Clock Out
                      </Button>
                  )}
                  <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors group"
                  >
                      <LogOut size={20} className="mr-3 text-slate-400 group-hover:text-red-500 transition-colors" />
                      Logout
                  </button>
              </div>
          </motion.aside>
          <main className="flex-1 flex flex-col overflow-hidden">
              <header className="bg-white/80 backdrop-blur-sm p-4 border-b flex items-center md:hidden">
                  <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600">
                      <Menu />
                  </button>
                  <h2 className="ml-4 font-semibold text-slate-800">{accessibleNavItems.find(i => i.pageName === page)?.label}</h2>
              </header>
              <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                   <AnimatePresence mode="wait">
                      <motion.div
                          key={page}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3, ease: 'easeOut' }}
                      >
                          {renderStaffPage()}
                      </motion.div>
                  </AnimatePresence>
              </div>
          </main>
           {isSurveyModalOpen && currentUser && (
              <SurveyFormModal
                  onClose={() => setIsSurveyModalOpen(false)}
                  onSubmit={handleSurveySubmit}
                  surveyQuestions={surveyQuestions}
              />
          )}
          {isPrayerModalOpen && currentUser && (
              <PrayerSubmissionModal
                  onClose={() => setIsPrayerModalOpen(false)}
                  onSubmit={handlePrayerSubmit}
              />
          )}
          {hasClockedIn && !hasClockedOut && (
              <>
                  <WorkClock todaysAttendance={todaysAttendance} />
                  <PrayerTimeReminder />
              </>
          )}
      </div>
    );

    const renderCurrentView = () => {
        switch (currentView) {
            case 'loading':
                return (
                    <div className="flex h-screen bg-slate-50 items-center justify-center">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-indigo-600">KAZUMI</div>
                            <p className="text-slate-500">Memuat data...</p>
                        </div>
                    </div>
                );
            case 'login':
                return <AuthPage onLogin={handleLogin} onRegister={handleRegister} onStaffRegister={handleStaffRegister} users={users} lastLoggedInUsers={lastLoggedInUsers} />;
            case 'clock_out':
                return <ClockOutPage type={clockOutContext!} onFinish={handleLogout} />;
            case 'auto_logout':
                return <AutoLogoutPage onLogout={handleLogout} />;
            case 'deactivated':
                return (
                    <div className="flex h-screen bg-slate-100 items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center bg-white p-8 rounded-2xl shadow-2xl">
                            <UserX size={48} className="mx-auto text-red-500 mb-4" />
                            <h1 className="text-2xl font-bold text-slate-800">Akun Dinonaktifkan</h1>
                            <p className="text-slate-600 mt-2 mb-6">Akun Anda telah dinonaktifkan. Silakan hubungi administrator untuk informasi lebih lanjut.</p>
                            <Button variant="danger" onClick={handleLogout}><LogOut size={16} className="mr-2" /> Logout</Button>
                        </motion.div>
                    </div>
                );
            case 'termination_pending':
                 return <TerminationConfirmationPage currentUser={currentUser!} messages={messages} setMessages={setMessages} users={users} setUsers={setUsers} setCurrentUser={setCurrentUser} addActivity={addActivity} onConfirmAndProceedToLogout={() => setPage('autoLogout')} />;
            case 'attendance_pending':
                return <AttendanceModal onSubmit={handleAttendanceSubmit} fullName={currentUser!.fullName} />;
            case 'customer_catalog':
                 return <CatalogPage products={productsWithDiscounts} onPlaceOrder={handlePlaceOnlineOrder} onLogout={handleLogout} currentUser={currentUser!} onUpdateProfile={handleUpdateCustomerProfile} cart={cart} setCart={setCart} onlineOrders={onlineOrders} bankAccounts={bankAccounts} promoCodes={promoCodes} />;
            case 'dashboard':
                return renderDashboard();
            default:
                return null;
        }
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={currentView}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
                {renderCurrentView()}
            </motion.div>
        </AnimatePresence>
    );
};

const App = () => (
    <ToastProvider>
        <PrintProvider>
            <AppContent />
        </PrintProvider>
    </ToastProvider>
);

export default App;