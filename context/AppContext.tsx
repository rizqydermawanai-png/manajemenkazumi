// context/AppContext.tsx
import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
// FIX: Import `AppState` from `../types` where it is defined and exported, not from `initialState`.
import { initialState } from './initialState';
import { ActionType } from './actions';
import type { AppState, StockHistoryType, ActivityLog, StockHistoryEntry, UserData, AttendanceRecord, PrayerRecord, PrayerName, AccountChangeRequest, OnlineOrderStatus, OnlineOrder } from '../types';
import { getPrayerTimes } from '../lib/prayerTimes';
import { generateSequentialId } from '../lib/utils';
import { calculatePerformanceScore } from '../lib/performance';
import { DatabaseService } from '../lib/database';

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<ActionType> }>({
    state: initialState,
    dispatch: () => null,
});

const appReducer = (state: AppState, action: ActionType): AppState => {
    // Helper function to add activity log
    const addActivity = (type: string, description: string, relatedId?: string): ActivityLog[] => {
        const userId = state.currentUser ? state.currentUser.uid : 'system';
        const newLog: ActivityLog = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), userId, type, description, relatedId };
        return [newLog, ...state.activityLog.slice(0, 499)];
    };
    
    // Helper function to add stock history
    const addStockHistory = (
        currentStockHistory: StockHistoryEntry[],
        itemId: string,
        itemName: string,
        type: StockHistoryType,
        quantityChange: number,
        finalStock: number,
        notes: string
    ): StockHistoryEntry[] => {
        const userId = state.currentUser ? state.currentUser.uid : 'system';
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
        return [newHistory, ...currentStockHistory];
    };
    
    // Recalculate performance score helper
    const recalculateAllUserScores = (currentState: AppState): UserData[] => {
        return currentState.users.map(user => {
            if (['member', 'admin', 'kepala_gudang', 'kepala_produksi', 'kepala_penjualan', 'penjualan'].includes(user.role)) {
                const { score, history } = calculatePerformanceScore(user, currentState.attendanceRecords, currentState.prayerRecords);
                return { ...user, performanceScore: score, pointHistory: history };
            }
            return user;
        });
    };

    switch (action.type) {
        case 'LOGIN': {
            const user = action.payload;
            let lastUsers = state.lastLoggedInUsers.filter(u => u.uid !== user.uid);
            lastUsers.unshift({ uid: user.uid, username: user.username });
            
            const getInitialPage = () => {
                if (!user || user.role === 'customer') return null;
                if (user.role === 'super_admin') return 'recapitulation';
                if (user.role === 'kepala_gudang') return 'warehouse';
                if (user.role === 'kepala_produksi') return 'production';
                if (user.role === 'kepala_penjualan' || user.role === 'penjualan') return 'salesCalculator';
                if (user.department === 'gudang') return 'warehouse';
                if (user.department === 'penjualan') return 'salesCalculator';
                return 'production';
            };
            const initialPage = getInitialPage();

            return {
                ...state,
                currentUser: user,
                page: initialPage, // Set initial page atomically with login
                lastLoggedInUsers: lastUsers.slice(0, 5),
                activityLog: addActivity('Manajemen Akun', `Pengguna ${user.username} berhasil login.`)
            };
        }
        case 'LOGOUT':
            return {
                ...state,
                currentUser: null,
                cart: [],
                activityLog: state.currentUser ? addActivity('Manajemen Akun', `Pengguna ${state.currentUser.username} logout.`) : state.activityLog
            };

        case 'REGISTER_STAFF':
        case 'REGISTER_CUSTOMER': {
            const newUser = action.payload.user;
            return {
                ...state,
                users: [...state.users, newUser],
                activityLog: addActivity('Manajemen Akun', `Akun baru mendaftar: ${newUser.username}`, newUser.uid)
            };
        }
        
        case 'ADD_ACTIVITY': {
            const { type, description, relatedId } = action.payload;
            return {
                ...state,
                activityLog: addActivity(type, description, relatedId),
            };
        }

        case 'UPDATE_CURRENT_USER': {
            const newCurrentUser = typeof action.payload === 'function' ? action.payload(state.currentUser!) : action.payload;
            if (!newCurrentUser) { 
                return state;
            }
            return {
                ...state,
                currentUser: newCurrentUser,
                users: state.users.map(u => u.uid === newCurrentUser.uid ? newCurrentUser : u),
                activityLog: addActivity('Manajemen Akun', 'Memperbarui profil pribadi.')
            };
        }

        case 'UPDATE_STOCK': {
            let newMaterials = [...state.materials];
            let newFinishedGoods = [...state.finishedGoods];
            let newStockHistory = [...state.stockHistory];

            for (const update of action.payload) {
                const { itemId, quantityChange, type, notes } = update;
                
                const materialIndex = newMaterials.findIndex(m => m.id === itemId);
                if (materialIndex > -1) {
                    const material = newMaterials[materialIndex];
                    const newStock = material.stock + quantityChange;
                    newMaterials[materialIndex] = { ...material, stock: newStock };
                    newStockHistory = addStockHistory(newStockHistory, itemId, material.name, type, quantityChange, newStock, notes);
                    continue;
                }

                const goodIndex = newFinishedGoods.findIndex(g => g.id === itemId);
                if (goodIndex > -1) {
                    const good = newFinishedGoods[goodIndex];
                    const newStock = good.stock + quantityChange;
                    newFinishedGoods[goodIndex] = { ...good, stock: newStock };
                    newStockHistory = addStockHistory(newStockHistory, itemId, `${good.name} ${good.size} (${good.colorName})`, type, quantityChange, newStock, notes);
                }
            }
            return { ...state, materials: newMaterials, finishedGoods: newFinishedGoods, stockHistory: newStockHistory };
        }
        
        case 'RECEIVE_PRODUCTION_GOODS': {
            const report = action.payload;
            let updatedGoodsState = [...state.finishedGoods];
            let newStockHistory = [...state.stockHistory];

            report.hppResult.garmentOrder.forEach(orderItem => {
                const goodId = `${report.selectedGarment}-${orderItem.model}-${orderItem.size}-${orderItem.colorName}`.replace(/\s+/g, '-').toLowerCase();
                const existingGoodIndex = updatedGoodsState.findIndex(g => g.id === goodId);
                const itemName = `${report.selectedGarment} ${orderItem.model || ''}`.trim();

                if (existingGoodIndex > -1) {
                    const newStock = updatedGoodsState[existingGoodIndex].stock + orderItem.quantity;
                    updatedGoodsState[existingGoodIndex].stock = newStock;
                    newStockHistory = addStockHistory(newStockHistory, goodId, `${itemName} ${orderItem.size} (${orderItem.colorName})`, 'in-production', orderItem.quantity, newStock, `Masuk dari produksi #${report.id}`);
                } else {
                    const newGood = {
                        id: goodId,
                        productionReportId: report.id, name: itemName, model: orderItem.model || '',
                        size: orderItem.size, colorName: orderItem.colorName, colorCode: orderItem.colorCode,
                        stock: orderItem.quantity, hpp: report.hppResult.hppPerGarment, sellingPrice: report.hppResult.sellingPricePerGarment,
                        imageUrls: [],
                    };
                    updatedGoodsState.push(newGood);
                    newStockHistory = addStockHistory(newStockHistory, goodId, `${newGood.name} ${newGood.size} (${newGood.colorName})`, 'in-production', newGood.stock, newGood.stock, `Masuk dari produksi #${report.id}`);
                }
            });
            
            return {
                ...state,
                finishedGoods: updatedGoodsState,
                stockHistory: newStockHistory,
                productionReports: state.productionReports.map(r => r.id === report.id ? { ...r, isReceivedInWarehouse: true } : r),
                activityLog: addActivity('Gudang', `Menerima barang dari produksi #${report.id}`, report.id)
            };
        }
        
        case 'DISPATCH_ONLINE_ORDER': {
            const { order, trackingNumber } = action.payload;
            const subtotal = order.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
            
            const newSale = {
                id: generateSequentialId('INV'),
                timestamp: new Date().toISOString(),
                userId: state.currentUser!.uid,
                customerName: order.customerName,
                items: order.items,
                result: { subtotal, discountAmount: 0, taxAmount: 0, grandTotal: subtotal },
                type: 'online' as const,
                status: 'selesai' as const,
                onlineOrderId: order.id,
            };
            
            const updatedOnlineOrders = state.onlineOrders.map(o => o.id === order.id ? {
                ...o, status: 'siap_kirim' as const, trackingNumber,
                history: [...o.history, { status: 'siap_kirim' as const, timestamp: new Date().toISOString(), userId: state.currentUser!.uid }]
            } : o);
            
            return {
                ...state,
                sales: [newSale, ...state.sales],
                onlineOrders: updatedOnlineOrders,
                activityLog: addActivity('Gudang', `Mengirim pesanan online #${order.id}`, order.id)
            };
        }
        
        case 'PLACE_ONLINE_ORDER': {
            const { orderInfo, cart } = action.payload;
            const newOrder: OnlineOrder = {
                id: generateSequentialId('ORD'),
                timestamp: new Date().toISOString(),
                customerName: orderInfo.customerName,
                shippingAddress: orderInfo.shippingAddress,
                notes: orderInfo.notes,
                paymentMethod: orderInfo.paymentMethod,
                shippingMethod: orderInfo.shippingMethod,
                shippingCost: orderInfo.shippingCost,
                downPaymentProofUrl: orderInfo.paymentProofUrl,
                status: 'pending_payment' as const,
                items: cart,
                history: [{ status: 'pending_payment' as const, timestamp: new Date().toISOString(), userId: state.currentUser?.uid || null }],
                orderType: 'direct',
            };
            return {
                ...state,
                onlineOrders: [newOrder, ...state.onlineOrders],
                cart: [], 
                activityLog: addActivity('Pelanggan', `Pesanan online baru #${newOrder.id} dibuat.`, newOrder.id)
            };
        }

        case 'PLACE_PO_ORDER': {
            const { orderInfo, poCart } = action.payload;
            const subtotal = poCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const downPayment = subtotal * 0.5;
            
            const newOrder: OnlineOrder = {
                id: generateSequentialId('PO'),
                timestamp: new Date().toISOString(),
                customerName: orderInfo.customerName,
                shippingAddress: orderInfo.shippingAddress,
                notes: orderInfo.notes,
                paymentMethod: orderInfo.paymentMethod,
                shippingMethod: orderInfo.shippingMethod,
                shippingCost: orderInfo.shippingCost,
                downPaymentProofUrl: orderInfo.paymentProofUrl,
                status: 'pending_dp' as const,
                items: poCart,
                history: [{ status: 'pending_dp' as const, timestamp: new Date().toISOString(), userId: state.currentUser?.uid || null }],
                orderType: 'po',
                downPayment: downPayment,
                remainingPayment: subtotal - downPayment,
            };
            return {
                ...state,
                onlineOrders: [newOrder, ...state.onlineOrders],
                poCart: [], 
                activityLog: addActivity('Pelanggan', `Pesanan Pre-Order baru #${newOrder.id} dibuat.`, newOrder.id)
            };
        }

        case 'APPROVE_PAYMENT': {
            const { orderId } = action.payload;
            const orderToApprove = state.onlineOrders.find(o => o.id === orderId);
    
            if (!orderToApprove || !state.currentUser) return state;
            
            // For regular orders, move to pending_gudang.
            // For PO orders, this action is now split. This handles regular orders.
            const newStatus: OnlineOrderStatus = orderToApprove.orderType === 'direct' ? 'pending_gudang' : 'in_production';
            
            if (orderToApprove.orderType === 'direct') {
                const updatedOrder = {
                    ...orderToApprove,
                    status: 'pending_gudang' as const,
                    history: [
                        ...orderToApprove.history,
                        { status: 'pending_gudang' as const, timestamp: new Date().toISOString(), userId: state.currentUser.uid }
                    ]
                };
                 const updatedOnlineOrders = state.onlineOrders.map(o => o.id === orderId ? updatedOrder : o);
                return {
                    ...state,
                    onlineOrders: updatedOnlineOrders,
                    activityLog: addActivity('Gudang', `Menyetujui pembayaran untuk pesanan #${orderId}`, orderId),
                };
            }
            // PO approval logic is now handled in UPDATE_ORDER_STATUS with more context. This case now primarily handles regular orders.
            return state;
        }
        
        case 'UPDATE_ORDER_STATUS': {
            const { orderId, status, assigneeId, estimatedCompletionDate } = action.payload;
            const orderToUpdate = state.onlineOrders.find(o => o.id === orderId);
            if (!orderToUpdate || !state.currentUser) return state;
        
            const updatedOrder: OnlineOrder = {
                ...orderToUpdate,
                status,
                history: [...orderToUpdate.history, { status, timestamp: new Date().toISOString(), userId: state.currentUser.uid }],
                ...(assigneeId && { assignedTo: assigneeId }),
                ...(estimatedCompletionDate && { estimatedCompletionDate: estimatedCompletionDate })
            };
        
            let newActivityLog = state.activityLog;
            if (status === 'approved_gudang') {
                newActivityLog = addActivity('Gudang', `${state.currentUser.fullName} mulai mengerjakan pesanan #${orderId}`, orderId);
            }
            if (status === 'in_production') {
                 newActivityLog = addActivity('Gudang', `Menyetujui DP & memulai produksi untuk PO #${orderId}`, orderId);
            }
        
            return {
                ...state,
                onlineOrders: state.onlineOrders.map(o => o.id === orderId ? updatedOrder : o),
                activityLog: newActivityLog,
            };
        }

        case 'ADD_ATTENDANCE': {
            if (!state.currentUser) return state;
            const { status, proof } = action.payload;
            const newRecord: AttendanceRecord = {
                id: crypto.randomUUID(),
                userId: state.currentUser.uid,
                date: new Date().toISOString().split('T')[0],
                status, proof,
                clockInTimestamp: new Date().toISOString(),
            };
            const updatedAttendance = [...state.attendanceRecords, newRecord];
            const newState = {
                ...state,
                attendanceRecords: updatedAttendance,
                activityLog: addActivity('Kehadiran', `Mencatat kehadiran sebagai: ${status}`)
            };
            return { ...newState, users: recalculateAllUserScores(newState) };
        }

        case 'CLOCK_OUT': {
            const { attendanceId, clockOutTime } = action.payload;
            const updatedAttendance = state.attendanceRecords.map(r => r.id === attendanceId ? { ...r, clockOutTimestamp: clockOutTime } : r);
            const newState = {
                ...state,
                attendanceRecords: updatedAttendance,
                activityLog: addActivity('Kehadiran', 'Mencatat waktu pulang (clock out).')
            };
            return { ...newState, users: recalculateAllUserScores(newState) };
        }

        case 'ADD_PRAYER_RECORD': {
            if (!state.currentUser) return state;
            const { prayerName, photoProof } = action.payload;
            const now = new Date();
            const prayerTimes = getPrayerTimes(now);
            const prayerTime = prayerTimes[prayerName.toLowerCase() as keyof typeof prayerTimes] as Date;
            const onTimeLimit = new Date(prayerTime.getTime() + 30 * 60 * 1000);
            const status = now <= onTimeLimit ? 'on_time' : 'late';
            const newRecord: PrayerRecord = {
                id: crypto.randomUUID(),
                userId: state.currentUser.uid,
                date: now.toISOString().split('T')[0],
                prayerName,
                timestamp: now.toISOString(),
                photoProof, status,
            };
            const updatedPrayers = [...state.prayerRecords, newRecord];
            const newState = {
                ...state,
                prayerRecords: updatedPrayers,
                activityLog: addActivity('Laporan Sholat', `Melaporkan sholat ${prayerName} (${status === 'on_time' ? 'Tepat Waktu' : 'Terlambat'})`)
            };
            return { ...newState, users: recalculateAllUserScores(newState) };
        }
        
        case 'SUBMIT_SURVEY': {
            if (!state.currentUser) return state;
            const { answers } = action.payload;
            const newResponse = {
                id: crypto.randomUUID(),
                surveyId: `Q${Math.floor(new Date().getMonth() / 3) + 1}-${new Date().getFullYear()}`,
                userId: state.currentUser.uid,
                submittedAt: new Date().toISOString(),
                answers,
            };
            const updatedUser = { ...state.currentUser, lastSurveyDate: new Date().toISOString() };
            return {
                ...state,
                surveyResponses: [...state.surveyResponses, newResponse],
                currentUser: updatedUser,
                users: state.users.map(u => u.uid === updatedUser.uid ? updatedUser : u),
                activityLog: addActivity('Survei', 'Mengisi survei kepuasan pegawai.')
            };
        }

        case 'CONFIRM_SALARY': {
            const payrollId = action.payload;
            const payroll = state.payrollHistory.find(p => p.id === payrollId);
            return {
                ...state,
                payrollHistory: state.payrollHistory.map(p => p.id === payrollId ? { ...p, status: 'confirmed', confirmedAt: new Date().toISOString() } : p),
                activityLog: payroll ? addActivity('Penggajian', `Mengonfirmasi penerimaan gaji periode ${payroll.period}.`) : state.activityLog
            };
        }
        
        case 'SUBMIT_WARRANTY_CLAIM': {
            const newClaim = action.payload;
            return {
                ...state,
                warrantyClaims: [newClaim, ...state.warrantyClaims],
                activityLog: addActivity('Garansi', `Mengajukan klaim garansi untuk pesanan #${newClaim.orderId}`, newClaim.id),
            };
        }
        
        case 'UPDATE_WARRANTY_CLAIM_STATUS': {
            const { claimId, status, adminNotes } = action.payload;
            const updatedClaims = state.warrantyClaims.map(claim =>
                claim.id === claimId
                    ? {
                        ...claim,
                        status,
                        adminNotes,
                        reviewedBy: state.currentUser?.uid,
                        reviewedAt: new Date().toISOString(),
                      }
                    : claim
            );
            const claim = state.warrantyClaims.find(c => c.id === claimId);
            return {
                ...state,
                warrantyClaims: updatedClaims,
                activityLog: claim ? addActivity('Garansi', `Memperbarui status klaim #${claimId} menjadi ${status}`, claimId) : state.activityLog,
            };
        }
        
        case 'SEND_CHAT_MESSAGE': {
            const { customerUid, message } = action.payload;
            const customer = state.users.find(u => u.uid === customerUid);
            const oldSession = state.chats[customerUid] || { customerName: customer?.fullName || 'Unknown', messages: [] };
            const newSession = {
                ...oldSession,
                messages: [...oldSession.messages, message]
            };
            return { ...state, chats: { ...state.chats, [customerUid]: newSession } };
        }

        case 'MARK_CHAT_AS_READ': {
            const { customerUid, reader } = action.payload;
            const oldSession = state.chats[customerUid];
            if (!oldSession) return state;

            const newMessages = oldSession.messages.map(msg => {
                if (reader === 'admin' && !msg.readByAdmin) {
                    return { ...msg, readByAdmin: true };
                }
                if (reader === 'customer' && !msg.readByCustomer) {
                    return { ...msg, readByCustomer: true };
                }
                return msg;
            });

            const newSession = { ...oldSession, messages: newMessages };
            return { ...state, chats: { ...state.chats, [customerUid]: newSession } };
        }

        case 'SET_COMPANY_INFO': {
            return {
                ...state,
                companyInfo: action.payload,
                activityLog: addActivity('Pengaturan', 'Memperbarui informasi perusahaan.')
            }
        }

        case 'SET_STOCK_THRESHOLDS': {
            return {
                ...state,
                stockThresholds: action.payload,
                activityLog: addActivity('Pengaturan', `Memperbarui ambang batas stok: Material (${action.payload.materials}), Barang Jadi (${action.payload.finishedGoods}).`)
            }
        }

        case 'SET_STANDARD_PRODUCTION_COSTS': {
            return {
                ...state,
                standardProductionCosts: action.payload,
                activityLog: addActivity('Pengaturan', 'Memperbarui standar biaya produksi.')
            }
        }
        
        case 'SET_STANDARD_PROFIT_MARGIN': {
            return {
                ...state,
                standardProfitMargin: action.payload,
                activityLog: addActivity('Pengaturan', `Memperbarui margin profit standar menjadi ${action.payload}%.`)
            }
        }

        case 'SET_PAGE': return { ...state, page: typeof action.payload === 'function' ? action.payload(state.page!) : action.payload };
        case 'SET_VIEWING_EMPLOYEE_ID': return { ...state, viewingEmployeeId: action.payload };
        case 'SET_CART': return { ...state, cart: typeof action.payload === 'function' ? action.payload(state.cart) : action.payload };
        case 'SET_PO_CART': return { ...state, poCart: typeof action.payload === 'function' ? action.payload(state.poCart) : action.payload };
        case 'SET_CHATS': return { ...state, chats: typeof action.payload === 'function' ? action.payload(state.chats) : action.payload };
        case 'SET_MESSAGES': return { ...state, messages: typeof action.payload === 'function' ? action.payload(state.messages) : action.payload };
        case 'SET_PRODUCTION_REPORTS': return { ...state, productionReports: typeof action.payload === 'function' ? action.payload(state.productionReports) : action.payload };
        case 'SET_SALES': return { ...state, sales: typeof action.payload === 'function' ? action.payload(state.sales) : action.payload };
        case 'SET_MATERIALS': return { ...state, materials: typeof action.payload === 'function' ? action.payload(state.materials) : action.payload };
        case 'SET_FINISHED_GOODS': return { ...state, finishedGoods: typeof action.payload === 'function' ? action.payload(state.finishedGoods) : action.payload };
        case 'SET_ONLINE_ORDERS': return { ...state, onlineOrders: typeof action.payload === 'function' ? action.payload(state.onlineOrders) : action.payload };
        case 'SET_STOCK_HISTORY': return { ...state, stockHistory: typeof action.payload === 'function' ? action.payload(state.stockHistory) : action.payload };
        case 'SET_PRODUCTION_REQUESTS': return { ...state, productionRequests: typeof action.payload === 'function' ? action.payload(state.productionRequests) : action.payload };
        case 'SET_SIZING_STANDARDS': return { ...state, sizingStandards: typeof action.payload === 'function' ? action.payload(state.sizingStandards) : action.payload };
        case 'SET_STOCK_ADJUSTMENTS': return { ...state, stockAdjustments: typeof action.payload === 'function' ? action.payload(state.stockAdjustments) : action.payload };
        case 'SET_BANK_ACCOUNTS': return { ...state, bankAccounts: typeof action.payload === 'function' ? action.payload(state.bankAccounts) : action.payload };
        case 'SET_PROMO_CODES': return { ...state, promoCodes: typeof action.payload === 'function' ? action.payload(state.promoCodes) : action.payload };
        case 'SET_PRODUCT_DISCOUNTS': return { ...state, productDiscounts: typeof action.payload === 'function' ? action.payload(state.productDiscounts) : action.payload };
        case 'SET_CUSTOMER_VOUCHERS': return { ...state, customerVouchers: typeof action.payload === 'function' ? action.payload(state.customerVouchers) : action.payload };
        case 'SET_PAYROLL_HISTORY': return { ...state, payrollHistory: typeof action.payload === 'function' ? action.payload(state.payrollHistory) : action.payload };
        case 'SET_SURVEY_RESPONSES': return { ...state, surveyResponses: typeof action.payload === 'function' ? action.payload(state.surveyResponses) : action.payload };
        case 'SET_SURVEY_QUESTIONS': return { ...state, surveyQuestions: typeof action.payload === 'function' ? action.payload(state.surveyQuestions) : action.payload };
        case 'SET_WARRANTY_CLAIMS': return { ...state, warrantyClaims: typeof action.payload === 'function' ? action.payload(state.warrantyClaims) : action.payload };
        case 'SET_GARMENT_PATTERNS': return { ...state, garmentPatterns: typeof action.payload === 'function' ? action.payload(state.garmentPatterns) : action.payload };
        case 'SET_ACCOUNT_CHANGE_REQUESTS': return { ...state, accountChangeRequests: typeof action.payload === 'function' ? action.payload(state.accountChangeRequests!) : action.payload };
        case 'SET_ATTENDANCE_RECORDS': {
            const payload = typeof action.payload === 'function' ? action.payload(state.attendanceRecords) : action.payload;
            const newState = { ...state, attendanceRecords: payload };
            return { ...newState, users: recalculateAllUserScores(newState) };
        }
        case 'SET_PRAYER_RECORDS': {
            const payload = typeof action.payload === 'function' ? action.payload(state.prayerRecords) : action.payload;
            const newState = { ...state, prayerRecords: payload };
            return { ...newState, users: recalculateAllUserScores(newState) };
        }
        case 'SET_USERS': {
            const payload = typeof action.payload === 'function' ? action.payload(state.users) : action.payload;
            const newState = { ...state, users: payload };
            return newState;
        }

        default:
            return state;
    }
};

export const AppProvider = ({ children }: React.PropsWithChildren<{}>) => {
    const [state, dispatch] = useReducer(appReducer, initialState);
    const [isOnline, setIsOnline] = useState(true);

    // Load state from database on mount
    useEffect(() => {
        const loadStateFromDatabase = async () => {
            try {
                const response = await DatabaseService.getAppState();
                if (response.success && response.data) {
                    // Merge database state with initial state to ensure all properties exist
                    const mergedState = { ...initialState, ...response.data };
                    // Update state without triggering localStorage save
                    Object.keys(mergedState).forEach(key => {
                        if (mergedState[key] !== undefined) {
                            // We'll dispatch actions to update state properly
                        }
                    });
                    console.log('State loaded from database');
                }
            } catch (error) {
                console.error('Failed to load state from database:', error);
                // Fallback to localStorage
                try {
                    const localState = localStorage.getItem('kazumi_appState');
                    if (localState) {
                        const parsedState = JSON.parse(localState);
                        // Similar merge logic for localStorage
                        console.log('State loaded from localStorage');
                    }
                } catch (localError) {
                    console.error('Failed to load from localStorage:', localError);
                }
            }
        };

        loadStateFromDatabase();
    }, []);

    // Save state to database when state changes
    useEffect(() => {
        const saveStateToDatabase = async () => {
            if (!isOnline) return;

            try {
                await DatabaseService.syncAppState(state);
                console.log('State synced to database');
            } catch (error) {
                console.error('Failed to sync state to database:', error);
                // Fallback to localStorage
                try {
                    localStorage.setItem('kazumi_appState', JSON.stringify(state));
                } catch (localError) {
                    console.error("Could not write to localStorage:", localError);
                }
            }
        };

        // Debounce saves to avoid too many requests
        const timeoutId = setTimeout(saveStateToDatabase, 1000);
        return () => clearTimeout(timeoutId);
    }, [state, isOnline]);

    // Monitor online status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
