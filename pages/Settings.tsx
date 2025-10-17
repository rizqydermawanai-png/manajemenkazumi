// pages/Settings.tsx
import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { CustomInput } from '../components/ui/CustomInput';
import { CustomSelect } from '../components/ui/CustomSelect';
import { useToast } from '../hooks/useToast';
import { formatRole, formatDepartment, formatDate } from '../lib/utils';
import type { UserData, Role, Department, BankAccount, PerformanceReview, Sanction, Message, PointLogEntry } from '../types';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { KeyRound, CheckCircle, UserPlus, Trash2, CreditCard, Star, ShieldAlert, Printer, AlertTriangle, Award, UserX, Clock, Send, TrendingUp } from 'lucide-react';
import { printTerminationLetter } from '../lib/print';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsPageProps {
    currentUser: UserData;
    setCurrentUser: React.Dispatch<React.SetStateAction<UserData | null>>;
    users: UserData[];
    setUsers: React.Dispatch<React.SetStateAction<UserData[]>>;
    addActivity: (type: string, description: string, id?: string) => void;
    initialTab: 'myProfile' | 'accountManagement';
    bankAccounts: BankAccount[];
    setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
    showPrintPreview: (htmlContent: string, title: string) => void;
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    onViewEmployeePerformance: (userId: string) => void;
}

export const SettingsPage = ({ currentUser, setCurrentUser, users, setUsers, addActivity, initialTab, bankAccounts, setBankAccounts, showPrintPreview, messages, setMessages, onViewEmployeePerformance }: SettingsPageProps) => {
    const [view, setView] = useState<'myProfile' | 'accountManagement' | 'bankAccounts'>(initialTab);
    
    const { addToast } = useToast();
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';
    const isSuperAdmin = currentUser.role === 'super_admin';

    const handleUserUpdate = (uid: string, updates: Partial<UserData>, silent: boolean = false) => {
        setUsers(users.map(u => u.uid === uid ? { ...u, ...updates } : u));
        const username = users.find(u => u.uid === uid)?.username || 'N/A';
        
        if (updates.isApproved === true) addActivity('Manajemen Akun', `Menyetujui pengguna ${username}`, uid);
        else if (updates.isApproved === false) addActivity('Manajemen Akun', `Menonaktifkan pengguna ${username}`, uid);
        else if (updates.password) addActivity('Manajemen Akun', `Mereset password pengguna ${username}`, uid);
        else if (updates.sanctions) addActivity('Manajemen Akun', `Memberikan sanksi kepada ${username}`, uid)
        else if (updates.pointHistory) addActivity('Manajemen Akun', `Menyesuaikan poin kinerja untuk ${username}`, uid);
        else addActivity('Manajemen Akun', `Memperbarui data pengguna ${username}`, uid);

        if(!silent) addToast({ title: 'Pengguna Diperbarui', type: 'success' });
    };

    const handleUserDelete = (uid: string) => {
         const username = users.find(u => u.uid === uid)?.username || 'N/A';
        if (window.confirm(`Anda yakin ingin menghapus pengguna ${username} secara permanen? Tindakan ini tidak dapat dibatalkan.`)) {
            setUsers(users.filter(u => u.uid !== uid));
            addActivity('Manajemen Akun', `Menghapus pengguna ${username} secara permanen`, uid);
            addToast({ title: 'Pengguna Dihapus', type: 'success' });
            setSelectedUser(null);
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800">Pengaturan</h1>
             <div className="bg-white p-2 rounded-xl shadow-md flex gap-2 flex-wrap">
                <Button variant={view === 'myProfile' ? 'primary' : 'ghost'} onClick={() => setView('myProfile')} className="flex-1">Profil Saya</Button>
                {isAdmin && <Button variant={view === 'accountManagement' ? 'primary' : 'ghost'} onClick={() => setView('accountManagement')} className="flex-1">Manajemen Akun</Button>}
                {isSuperAdmin && <Button variant={view === 'bankAccounts' ? 'primary' : 'ghost'} onClick={() => setView('bankAccounts')} className="flex-1">Rekening Bank</Button>}
            </div>
            {view === 'myProfile' && <MyProfile currentUser={currentUser} setCurrentUser={setCurrentUser} setUsers={setUsers} addActivity={addActivity} />}
            {view === 'accountManagement' && isAdmin && <AccountManagement users={users} onSelectUser={setSelectedUser} isSuperAdmin={isSuperAdmin} onViewPerformance={onViewEmployeePerformance} />}
            {view === 'bankAccounts' && isSuperAdmin && <BankAccountManagement bankAccounts={bankAccounts} setBankAccounts={setBankAccounts} addActivity={addActivity} />}
            
            {selectedUser && (
                <UserManagementModal 
                    user={selectedUser} 
                    onClose={() => setSelectedUser(null)}
                    onUpdate={handleUserUpdate}
                    onDelete={handleUserDelete}
                    isSuperAdmin={isSuperAdmin}
                    currentUser={currentUser}
                    showPrintPreview={showPrintPreview}
                    setMessages={setMessages}
                    users={users}
                />
            )}
        </div>
    );
};

const MyProfile = ({ currentUser, setCurrentUser, setUsers, addActivity }: Omit<SettingsPageProps, 'users'| 'initialTab' | 'bankAccounts' | 'setBankAccounts' | 'showPrintPreview' | 'messages' | 'setMessages' | 'onViewEmployeePerformance'>) => {
    const [form, setForm] = useState({ fullName: currentUser.fullName, email: currentUser.email, whatsapp: currentUser.whatsapp, bio: currentUser.bio || '', profilePictureUrl: currentUser.profilePictureUrl });
    const { addToast } = useToast();

    const handleProfileUpdate = () => {
        const updatedUser = { ...currentUser, ...form };
        setCurrentUser(updatedUser);
        // FIX: Renamed state updater parameter to 'prevUsers' to avoid potential scope conflicts.
        setUsers(prevUsers => prevUsers.map(u => u.uid === currentUser.uid ? updatedUser : u));
        addActivity('Manajemen Akun', 'Memperbarui profil pribadi');
        addToast({ title: 'Profil Diperbarui', message: 'Informasi profil Anda telah berhasil disimpan.', type: 'success' });
    };
    
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 1024 * 1024) { // 1MB limit
            addToast({ title: 'File Terlalu Besar', message: 'Ukuran file tidak boleh melebihi 1MB.', type: 'error' });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            if (typeof reader.result === 'string') {
                try {
                    const response = await fetch('/api/upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image: reader.result }),
                    });
                    if (!response.ok) throw new Error('Upload failed');
                    const data = await response.json();
                    setForm(prevForm => ({ ...prevForm, profilePictureUrl: data.url }));
                    addToast({ title: 'Gambar Terunggah', message: 'Gambar profil siap disimpan.', type: 'info' });
                } catch (error) {
                    console.error("Image upload error:", error);
                    addToast({ title: 'Upload Gagal', message: 'Tidak dapat mengunggah gambar ke server.', type: 'error' });
                }
            }
        };
        reader.onerror = () => {
            addToast({ title: 'Error', message: 'Gagal membaca file.', type: 'error' });
        };
        reader.readAsDataURL(file);
    };

    return (
        <Card>
            <h2 className="text-xl font-bold text-slate-700 mb-4">Edit Profil</h2>
             <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <img src={form.profilePictureUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${form.fullName}`} alt="Preview" className="w-20 h-20 rounded-full bg-slate-200 object-cover" onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/8.x/initials/svg?seed=${form.fullName}`; }}/>
                    <div className="flex-grow">
                        <label className="block text-sm font-medium text-slate-600 mb-1">Ubah Foto Profil</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                id="profilePictureUpload"
                                className="hidden"
                                accept="image/png, image/jpeg, image/webp"
                                onChange={handleImageUpload}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById('profilePictureUpload')?.click()}
                            >
                                Pilih File...
                            </Button>
                            <p className="text-xs text-slate-500">Maks 1MB.</p>
                        </div>
                    </div>
                </div>
                <CustomInput label="Nama Lengkap" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} />
                <CustomInput label="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                <CustomInput label="WhatsApp" value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} />
                <label className="block text-sm font-medium text-slate-600 mb-1">Bio</label>
                <textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} rows={3} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900" />
                <Button onClick={handleProfileUpdate}>Simpan Perubahan</Button>
            </div>
        </Card>
    );
}

const StatusBadge = ({ status }: { status: UserData['status'] }) => {
    if (status === 'pending_termination') {
        return <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Menunggu Konfirmasi</span>;
    }
    if (status === 'terminated') {
        return <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Dihentikan</span>;
    }
    return null;
};

// Sub-component for rendering the user table to keep code DRY
const UserTable = ({ users, onSelectUser, showPoints = false, showStatus = false, onViewPerformance }: { users: UserData[], onSelectUser: (user: UserData) => void, showPoints?: boolean, showStatus?: boolean, onViewPerformance?: (userId: string) => void }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[700px]">
            <thead className="bg-slate-50 border-y">
                <tr className="text-slate-600">
                    <th className="p-4 font-semibold">Pengguna</th>
                    <th className="p-4 font-semibold">Role</th>
                    <th className="p-4 font-semibold">Terdaftar</th>
                    {showPoints && <th className="p-4 font-semibold text-center">Poin</th>}
                    {showStatus && <th className="p-4 font-semibold">Status</th>}
                    <th className="p-4 font-semibold"></th>
                </tr>
            </thead>
            <tbody>
                {users.map(user => (
                    <tr key={user.uid} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                            <div className="flex items-center">
                                <img src={user.profilePictureUrl} alt={user.fullName} className="w-8 h-8 rounded-full mr-3 object-cover" />
                                <div>
                                    <p className="font-semibold">{user.fullName}</p>
                                    <p className="text-xs text-slate-500 font-normal">@{user.username}</p>
                                </div>
                            </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                            {formatRole(user.role)}
                            <br />
                            <span className="text-xs text-slate-500">{formatDepartment(user.department)}</span>
                        </td>
                        <td className="p-4 text-slate-500 whitespace-nowrap">{formatDate(user.createdAt)}</td>
                        {showPoints && (
                            <td className="p-4">
                                <div className="flex items-center justify-center">
                                {user.performanceScore ? (
                                    <div className={`flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm text-white ${
                                        (user.performanceScore.totalPoints ?? 0) >= 80 ? 'bg-green-500' :
                                        (user.performanceScore.totalPoints ?? 0) >= 60 ? 'bg-blue-500' :
                                        (user.performanceScore.totalPoints ?? 0) >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}>
                                        {Math.round(user.performanceScore.totalPoints ?? 0)}
                                    </div>
                                ) : (
                                    <span className="text-slate-400">-</span>
                                )}
                                </div>
                            </td>
                        )}
                        {showStatus && (
                            <td className="p-4">
                                <StatusBadge status={user.status} />
                            </td>
                        )}
                        <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                                {showPoints && onViewPerformance && (
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="!p-2"
                                        onClick={() => onViewPerformance(user.uid)} 
                                        title="Lihat Detail Kinerja"
                                    >
                                        <TrendingUp size={16} />
                                    </Button>
                                )}
                                <Button size="sm" variant="outline" onClick={() => onSelectUser(user)}>Kelola</Button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        {users.length === 0 && <p className="text-center text-slate-500 py-8">Tidak ada pengguna dalam kategori ini.</p>}
    </div>
);


const AccountManagement = ({ users, onSelectUser, isSuperAdmin, onViewPerformance }: { users: UserData[], onSelectUser: (user: UserData) => void, isSuperAdmin: boolean, onViewPerformance: (userId: string) => void }) => {
    const [activeTab, setActiveTab] = useState<'staff' | 'customers' | 'termination'>('staff');

    const getStatus = (u: UserData) => u.status ?? 'active';

    const staffUsers = users.filter(u => ['member', 'admin', 'super_admin'].includes(u.role) && getStatus(u) === 'active');
    const customerUsers = users.filter(u => u.role === 'customer' && getStatus(u) === 'active');
    const pendingUsers = users.filter(u => u.role === 'pending');
    
    const terminationProcessUsers = users
        .filter(u => ['pending_termination', 'terminated'].includes(getStatus(u)))
        .sort((a, b) => {
            if (a.status === 'pending_termination' && b.status !== 'pending_termination') return -1;
            if (a.status !== 'pending_termination' && b.status === 'pending_termination') return 1;
            return 0;
        });


    return (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200/80 overflow-hidden">
            <div className="p-4 border-b">
                <h2 className="text-xl font-bold text-slate-700">Manajemen Akun</h2>
            </div>
            <div className="flex border-b">
                <button
                    onClick={() => setActiveTab('staff')}
                    className={`flex-1 p-3 font-semibold text-center transition-colors duration-300 relative flex items-center justify-center gap-2 ${activeTab === 'staff' ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`}
                >
                    Staf ({staffUsers.length})
                    {activeTab === 'staff' && <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" layoutId="am-tab" />}
                </button>
                <button
                    onClick={() => setActiveTab('customers')}
                    className={`flex-1 p-3 font-semibold text-center transition-colors duration-300 relative flex items-center justify-center gap-2 ${activeTab === 'customers' ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`}
                >
                    Pelanggan ({customerUsers.length})
                    {pendingUsers.length > 0 && <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">{pendingUsers.length}</span>}
                    {activeTab === 'customers' && <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" layoutId="am-tab" />}
                </button>
                {isSuperAdmin && (
                     <button
                        onClick={() => setActiveTab('termination')}
                        className={`flex-1 p-3 font-semibold text-center transition-colors duration-300 relative flex items-center justify-center gap-2 ${activeTab === 'termination' ? 'text-red-600' : 'text-slate-500 hover:text-red-600'}`}
                    >
                        <UserX size={16}/> Pemberhentian ({terminationProcessUsers.length})
                        {activeTab === 'termination' && <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" layoutId="am-tab" />}
                    </button>
                )}
            </div>
            
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-0 sm:p-4"
                >
                    {activeTab === 'staff' && (
                        <UserTable users={staffUsers} onSelectUser={onSelectUser} showPoints={true} onViewPerformance={onViewPerformance} />
                    )}
                    {activeTab === 'customers' && (
                        <div className="space-y-6">
                            {pendingUsers.length > 0 && (
                                <div className="bg-white p-4 rounded-xl border border-yellow-300 shadow-sm">
                                    <h3 className="text-lg font-bold text-slate-700 mb-2 flex items-center">
                                        <UserPlus size={20} className="mr-2 text-yellow-500"/> Akun Menunggu Persetujuan
                                    </h3>
                                    <div className="space-y-2">
                                        {pendingUsers.map(user => (
                                            <div key={user.uid} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                                                <div>
                                                    <p className="font-semibold">{user.fullName} <span className="text-slate-500 font-normal">(@{user.username})</span></p>
                                                    <p className="text-sm text-slate-600">Calon Pelanggan</p>
                                                </div>
                                                <Button size="sm" onClick={() => onSelectUser(user)}>Tinjau</Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                             <div className="bg-white p-4 rounded-xl border shadow-sm">
                                <h3 className="text-lg font-bold text-slate-700 mb-2">Pelanggan Terdaftar</h3>
                                <UserTable users={customerUsers} onSelectUser={onSelectUser} />
                            </div>
                        </div>
                    )}
                    {activeTab === 'termination' && isSuperAdmin && (
                        <div className="bg-white p-4 rounded-xl border border-red-200 shadow-sm">
                            <h3 className="text-lg font-bold text-red-700 mb-2">Proses & Arsip Pemberhentian</h3>
                            <UserTable users={terminationProcessUsers} onSelectUser={onSelectUser} showStatus={true} />
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

const NEGATIVE_ASSESSMENTS = [
    "Kinerja Menurun",
    "Pelanggaran Disiplin",
    "Absensi Buruk",
    "Tidak Mencapai Target",
    "Pelanggaran SOP",
];

const UserManagementModal = ({ user, onClose, onUpdate, onDelete, isSuperAdmin, currentUser, showPrintPreview, setMessages, users }: { user: UserData, onClose: () => void, onUpdate: (uid: string, updates: Partial<UserData>, silent?: boolean) => void, onDelete: (uid: string) => void, isSuperAdmin: boolean, currentUser: UserData, showPrintPreview: (html: string, title: string) => void, setMessages: React.Dispatch<React.SetStateAction<Message[]>>, users: UserData[] }) => {
    const [tab, setTab] = useState('general');
    const [isConfirmingTermination, setIsConfirmingTermination] = useState(false);
    const [pendingSanction, setPendingSanction] = useState<Sanction | null>(null);

    const [form, setForm] = useState({
        role: user.role,
        department: user.department,
        baseSalary: user.baseSalary || 0
    });
    const [newReview, setNewReview] = useState({ rating: 0, comment: '' });
    const [newSanction, setNewSanction] = useState({ type: 'warning' as Sanction['type'], reason: '', checklistItems: [] as string[] });
    const [newPoint, setNewPoint] = useState({ points: 10, category: 'initiative' as PointLogEntry['category'], reason: '' });

    const { addToast } = useToast();

    const handleResetPassword = () => {
        if(window.confirm(`Anda yakin ingin mereset password untuk ${user.username}? Password akan diubah menjadi 'password123'.`)) {
            onUpdate(user.uid, { password: 'password123' }, true);
            addToast({ title: 'Password Direset', message: `Password untuk ${user.username} telah direset.`, type: 'success' });
        }
    };
    
    const handleApprove = () => {
        onClose();
        const newRole = user.department ? 'member' : 'customer';
        onUpdate(user.uid, { isApproved: true, role: newRole, status: 'active' });
    };

    const handleSaveGeneral = () => {
        onClose();
        onUpdate(user.uid, { role: form.role, department: form.department, baseSalary: form.baseSalary });
    };

    const handleSaveReview = () => {
        if (newReview.rating === 0 || !newReview.comment.trim()) {
            addToast({ title: 'Error', message: 'Peringkat dan komentar harus diisi.', type: 'error' });
            return;
        }
        const review: PerformanceReview = {
            id: crypto.randomUUID(),
            reviewerId: currentUser.uid,
            reviewerName: currentUser.fullName,
            date: new Date().toISOString(),
            rating: newReview.rating,
            comment: newReview.comment
        };
        const updatedReviews = [...(user.performanceReviews || []), review];
        onUpdate(user.uid, { performanceReviews: updatedReviews });
        setNewReview({ rating: 0, comment: '' }); // Reset form
    };

    const handleIssueSanction = () => {
        if (!newSanction.reason.trim() && newSanction.checklistItems.length === 0) {
            addToast({ title: 'Error', message: 'Pilih minimal satu penilaian negatif atau isi alasan sanksi.', type: 'error' });
            return;
        }

        const sanction: Sanction = {
            id: crypto.randomUUID(),
            issuedById: currentUser.uid,
            date: new Date().toISOString(),
            type: newSanction.type,
            reason: newSanction.reason,
            checklistItems: newSanction.checklistItems,
        };

        if (sanction.type === 'termination') {
            setPendingSanction(sanction);
            setIsConfirmingTermination(true);
        } else {
            onClose();
            const updatedSanctions = [...(user.sanctions || []), sanction];
            onUpdate(user.uid, { sanctions: updatedSanctions }, true);
            addToast({ title: 'Sanksi Diberikan', message: `Sanksi ${sanction.type} telah diberikan kepada ${user.fullName}.`, type: 'success' });
            setNewSanction({ type: 'warning', reason: '', checklistItems: [] });
        }
    };

    const handleConfirmTermination = () => {
        if (!pendingSanction) return;

        // 1. Close the current modal FIRST to prevent UI lock.
        onClose();

        // 2. Create messages
        const terminationNotice: Message = {
            id: `term-notice-${user.uid}`,
            timestamp: new Date().toISOString(),
            authorId: currentUser.uid,
            recipientId: user.uid,
            title: `PEMBERITAHUAN: Pemutusan Hubungan Kerja`,
            content: `Dengan hormat Sdr/i. ${user.fullName},\n\nMelalui surat ini, kami memberitahukan bahwa setelah melalui proses evaluasi dan pertimbangan yang mendalam, manajemen memutuskan untuk mengakhiri hubungan kerja dengan Anda, efektif per tanggal ${formatDate(pendingSanction.date).split(',')[0]}.\n\nKami memahami bahwa ini adalah berita yang sulit diterima. Keputusan ini diambil berdasarkan tinjauan kinerja dan catatan kedisiplinan yang ada. Kami ingin mengucapkan terima kasih yang tulus atas semua kontribusi dan dedikasi yang telah Anda berikan kepada perusahaan selama ini.\n\nUntuk menyelesaikan proses administrasi, mohon konfirmasi penerimaan pemberitahuan ini dengan menekan tombol di bawah. Setelah konfirmasi, akses Anda ke sistem akan dihentikan secara permanen.\n\nKami mendoakan yang terbaik untuk langkah karir Anda selanjutnya.`,
            action: {
                type: 'CONFIRM_TERMINATION',
                payload: { userIdToDeactivate: user.uid, userName: user.fullName },
            },
            actionCompleted: false,
        };

        const adminConfirmation: Message = {
            id: `admin-confirm-${user.uid}`,
            timestamp: new Date().toISOString(),
            authorId: 'system',
            recipientId: currentUser.uid,
            title: `Konfirmasi Tindakan: Pemberhentian ${user.fullName}`,
            content: `Anda telah mengirimkan pemberitahuan pemutusan hubungan kerja kepada ${user.fullName} pada ${formatDate(new Date())}.\n\nAkun pengguna tersebut akan dihapus secara otomatis setelah mereka mengonfirmasi pemberitahuan ini.`,
        };
        
        // 3. Send messages and update user status and sanctions
        const updatedSanctions = [...(user.sanctions || []), pendingSanction];
        setMessages(prev => [...prev.filter(m => m.id !== terminationNotice.id && m.id !== adminConfirmation.id), terminationNotice, adminConfirmation]);
        onUpdate(user.uid, { status: 'pending_termination', sanctions: updatedSanctions }, true);
                
        addToast({ 
            title: 'Pemberitahuan Terkirim', 
            message: `Pemberitahuan pemecatan telah dikirim. Akun akan dinonaktifkan setelah dikonfirmasi oleh ${user.fullName}.`, 
            type: 'success', 
            duration: 6000 
        });
    };


    const handleChecklistChange = (item: string) => {
        setNewSanction(prev => {
            const checklistItems = prev.checklistItems.includes(item)
                ? prev.checklistItems.filter(i => i !== item)
                : [...prev.checklistItems, item];
            return { ...prev, checklistItems };
        });
    };

    const getSanctionBadgeColor = (type: Sanction['type']) => {
        switch (type) {
            case 'warning': return 'bg-yellow-100 text-yellow-800';
            case 'suspension': return 'bg-orange-100 text-orange-800';
            case 'termination': return 'bg-red-200 text-red-900 font-bold';
            default: return 'bg-slate-100 text-slate-800';
        }
    };
    
    const handleAddPoints = () => {
        if (!newPoint.reason.trim()) {
            addToast({ title: 'Error', message: 'Alasan pemberian poin harus diisi.', type: 'error' });
            return;
        }
        const newEntry: PointLogEntry = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            points: Number(newPoint.points),
            category: newPoint.category,
            reason: newPoint.reason,
            grantedBy: currentUser.uid
        };
        const updatedHistory = [...(user.pointHistory || []), newEntry];
        onUpdate(user.uid, { pointHistory: updatedHistory }, true); // silent = true
        addToast({ title: 'Poin Ditambahkan', message: `${newPoint.points} poin diberikan kepada ${user.fullName}.`, type: 'success' });
        setNewPoint({ points: 10, category: 'initiative', reason: '' }); // Reset form
    };
    
    if (user.status === 'pending_termination') {
        const handleCancelTermination = () => {
            if (window.confirm(`Anda yakin ingin membatalkan proses pemberhentian untuk ${user.fullName}?`)) {
                onUpdate(user.uid, { status: 'active' });

                const terminationNoticeId = `term-notice-${user.uid}`;
                setMessages(prev => prev.map(msg =>
                    msg.id === terminationNoticeId
                        ? { ...msg, actionCompleted: true }
                        : msg
                ));
                
                const cancellationNotice: Message = {
                    id: crypto.randomUUID(),
                    timestamp: new Date().toISOString(),
                    authorId: 'system',
                    recipientId: user.uid,
                    title: `PEMBATALAN: Pemberitahuan Pemutusan Hubungan Kerja`,
                    content: `Pemberitahuan pemutusan hubungan kerja yang sebelumnya dikirimkan kepada Anda telah dibatalkan oleh manajemen. Status akun Anda telah dipulihkan.`,
                };
                setMessages(prev => [...prev, cancellationNotice]);

                addToast({ title: 'Proses Dibatalkan', message: `Pemberhentian untuk ${user.fullName} telah dibatalkan.`, type: 'success' });
                onClose();
            }
        };

        return (
            <Modal isOpen={true} onClose={onClose} title={`Kelola Pengguna: ${user.username}`}>
                <div className="text-center">
                    <Clock size={48} className="mx-auto text-orange-500 mb-4" />
                    <h2 className="text-xl font-bold text-slate-800">{user.fullName}</h2>
                    <p className="text-slate-600 mt-2 mb-6">
                        Pengguna ini sedang dalam proses pemberhentian dan menunggu konfirmasi dari yang bersangkutan.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Button variant="secondary" onClick={onClose}>
                            Tutup
                        </Button>
                        <Button variant="danger" onClick={handleCancelTermination}>
                            Batalkan Proses Pemberhentian
                        </Button>
                    </div>
                </div>
            </Modal>
        );
    }

    if (user.status === 'terminated') {
        const handlePrintTerminatedLetter = () => {
            const terminationSanction = user.sanctions?.slice().reverse().find(s => s.type === 'termination');
            
            if (terminationSanction) {
                // FIX: The 'users' array was not available in this component's scope. It is now passed as a prop.
                const issuer = users.find(u => u.uid === terminationSanction.issuedById) || currentUser;
                printTerminationLetter(user, terminationSanction, issuer, showPrintPreview);
            } else {
                addToast({ title: 'Data Tidak Ditemukan', message: 'Tidak dapat menemukan data sanksi pemberhentian untuk mencetak surat.', type: 'error' });
            }
        };

        return (
            <Modal isOpen={true} onClose={onClose} title={`Arsip Pengguna: ${user.username}`}>
                <div className="text-center">
                    <UserX size={48} className="mx-auto text-slate-500 mb-4" />
                    <h2 className="text-xl font-bold text-slate-800">{user.fullName}</h2>
                    <p className="text-slate-600 mt-2">
                        Akun pengguna ini telah dihentikan dan dinonaktifkan. Data pengguna disimpan sebagai arsip.
                    </p>
                    <div className="bg-slate-50 p-3 mt-4 rounded-lg text-left text-sm space-y-1 border">
                        <p><strong>Nama Lengkap:</strong> {user.fullName}</p>
                        <p><strong>User ID:</strong> {user.username}</p>
                        <p><strong>Email:</strong> {user.email}</p>
                        <p><strong>Role Terakhir:</strong> {formatRole(user.role)}</p>
                        <p><strong>Departemen Terakhir:</strong> {formatDepartment(user.department)}</p>
                        <p><strong>Terdaftar Sejak:</strong> {formatDate(user.createdAt)}</p>
                    </div>
                    <div className="flex justify-center flex-wrap gap-4 mt-6">
                        <Button variant="secondary" onClick={onClose}>
                            Tutup
                        </Button>
                        <Button variant="outline" onClick={handlePrintTerminatedLetter}>
                            <Printer size={16} /> Cetak Surat Pemberhentian
                        </Button>
                        {isSuperAdmin && (
                             <Button variant="danger" onClick={() => onDelete(user.uid)}>
                                <Trash2 size={16} /> Hapus Permanen
                            </Button>
                        )}
                    </div>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={true} onClose={onClose} title={`Kelola Pengguna: ${user.username}`}>
            {isConfirmingTermination ? (
                 <div className="text-center">
                    <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
                    <h2 className="text-xl font-bold text-slate-800">Konfirmasi Pemecatan</h2>
                    <p className="text-slate-600 mt-2 mb-6">
                        Anda yakin ingin memecat <strong>{user.fullName}</strong>? Sebuah pemberitahuan akan dikirim ke akun pengguna untuk konfirmasi akhir. Akun akan dinonaktifkan setelah mereka mengonfirmasi.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Button variant="secondary" onClick={() => {
                            setIsConfirmingTermination(false);
                            setPendingSanction(null);
                            setNewSanction({ type: 'warning', reason: '', checklistItems: [] });
                        }}>
                            Batal
                        </Button>
                        <Button variant="danger" onClick={handleConfirmTermination}>
                           <Send size={16}/> Kirim Pemberitahuan
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                <div className="border-b border-gray-200 mb-4">
                    <nav className="flex space-x-1 sm:space-x-4" aria-label="Tabs">
                        <button onClick={() => setTab('general')} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${tab === 'general' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Umum</button>
                        {isSuperAdmin && user.role !== 'customer' && user.role !== 'super_admin' && <button onClick={() => setTab('performance')} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${tab === 'performance' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Kinerja</button>}
                        {isSuperAdmin && user.role !== 'super_admin' && <button onClick={() => setTab('points')} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${tab === 'points' ? 'border-b-2 border-purple-500 text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}>Poin Kinerja</button>}
                        {isSuperAdmin && user.role !== 'super_admin' && <button onClick={() => setTab('sanction')} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${tab === 'sanction' ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-500 hover:text-gray-700'}`}>Sanksi & Tindakan</button>}
                    </nav>
                </div>
            
            {tab === 'general' && (
                 <div className="space-y-4">
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Terdaftar:</strong> {formatDate(user.createdAt)}</p>
                    <CustomSelect label="Role" value={form.role} onChange={e => setForm({...form, role: e.target.value as Role})} disabled={!isSuperAdmin}>
                        <option value="customer">Pelanggan</option>
                        <option value="member">Anggota</option>
                        <option value="admin">Wakil CEO</option>
                        <option value="super_admin">CEO</option>
                    </CustomSelect>
                    <CustomSelect label="Departemen" value={form.department || ''} onChange={e => setForm({...form, department: e.target.value as Department})} disabled={form.role === 'admin' || form.role === 'super_admin' || form.role === 'customer'}>
                        <option value="">-- Pilih Departemen --</option>
                        <option value="produksi">Produksi</option>
                        <option value="gudang">Gudang</option>
                        <option value="penjualan">Penjualan</option>
                    </CustomSelect>
                     {isSuperAdmin && user.role !== 'customer' && <CustomInput label="Gaji Pokok" type="number" value={form.baseSalary} onChange={e => setForm({...form, baseSalary: Number(e.target.value)})} />}

                    {isSuperAdmin && <Button variant="outline" size="sm" onClick={handleResetPassword}><KeyRound size={16}/> Reset Password</Button>}
                    
                    <div className="flex justify-between items-center pt-4 border-t mt-4">
                        <div>
                            {user.role === 'pending' && <Button variant="primary" className="bg-green-600 hover:bg-green-700" onClick={handleApprove}><CheckCircle size={16} /> Setujui</Button>}
                            {isSuperAdmin && user.role !== 'super_admin' && (user.status ?? 'active') === 'active' && (
                                <Button variant="danger" onClick={() => { onClose(); onUpdate(user.uid, { isApproved: false }); }}>
                                    <UserX size={16} /> Nonaktifkan Akun
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={onClose}>Tutup</Button>
                            <Button onClick={handleSaveGeneral}>Simpan</Button>
                        </div>
                    </div>
                </div>
            )}
            
            {tab === 'performance' && isSuperAdmin && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800">Tambah Penilaian Baru</h3>
                    <div className="space-y-2 p-3 bg-slate-50 rounded-lg">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Peringkat Kinerja</label>
                            <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button type="button" key={star} onClick={() => setNewReview({...newReview, rating: star})}>
                                        <Star className={`w-6 h-6 transition-colors ${newReview.rating >= star ? 'text-yellow-400 fill-current' : 'text-slate-300'}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Komentar</label>
                            <textarea value={newReview.comment} onChange={e => setNewReview({...newReview, comment: e.target.value})} rows={3} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <Button size="sm" onClick={handleSaveReview} disabled={!newReview.comment || newReview.rating === 0}>Simpan Penilaian</Button>
                    </div>

                    <div className="pt-4 border-t">
                         <h3 className="text-lg font-semibold text-slate-800 mb-2">Riwayat Penilaian</h3>
                         <div className="space-y-3 max-h-48 overflow-y-auto">
                            {user.performanceReviews && user.performanceReviews.length > 0 ? (
                                user.performanceReviews.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(review => (
                                    <div key={review.id} className="p-3 border rounded-lg">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center">
                                                {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-slate-300'}`} />)}
                                            </div>
                                            <p className="text-xs text-slate-500">{formatDate(review.date)} oleh {review.reviewerName}</p>
                                        </div>
                                        <p className="text-sm text-slate-700">{review.comment}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-center text-slate-500 py-4">Belum ada riwayat penilaian.</p>
                            )}
                         </div>
                    </div>
                </div>
            )}
            
            {tab === 'points' && isSuperAdmin && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-purple-700">Beri Poin Kinerja Manual</h3>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                             <CustomInput label="Jumlah Poin" type="number" value={newPoint.points} onChange={e => setNewPoint({...newPoint, points: Number(e.target.value)})} />
                             <CustomSelect label="Kategori Poin" value={newPoint.category} onChange={e => setNewPoint({...newPoint, category: e.target.value as PointLogEntry['category']})}>
                                <option value="initiative">Inisiatif</option>
                                <option value="productivity">Produktivitas</option>
                                <option value="adjustment">Penyesuaian Lain</option>
                            </CustomSelect>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-600 mb-1">Alasan Pemberian Poin</label>
                            <textarea value={newPoint.reason} onChange={e => setNewPoint({...newPoint, reason: e.target.value})} rows={3} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Contoh: Menyelesaikan proyek lebih cepat, memberikan ide bagus, dll."/>
                        </div>
                        <Button size="sm" variant="primary" className="bg-purple-600 hover:bg-purple-700" onClick={handleAddPoints}>
                            <Award size={16} /> Berikan Poin
                        </Button>
                    </div>
                </div>
            )}

            {tab === 'sanction' && isSuperAdmin && user.role !== 'super_admin' && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-red-700">Berikan Sanksi</h3>
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200 space-y-4">
                         <CustomSelect label="Jenis Sanksi" value={newSanction.type} onChange={e => setNewSanction({...newSanction, type: e.target.value as Sanction['type']})}>
                            <option value="warning">Peringatan</option>
                            <option value="suspension">Skorsing</option>
                            <option value="termination">Pemecatan</option>
                        </CustomSelect>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Penilaian Negatif (Checklist)</label>
                            <div className="space-y-2">
                                {NEGATIVE_ASSESSMENTS.map(item => (
                                    <label key={item} className="flex items-center text-sm">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            checked={newSanction.checklistItems.includes(item)}
                                            onChange={() => handleChecklistChange(item)}
                                        />
                                        <span className="ml-2 text-slate-700">{item}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                             <label className="block text-sm font-medium text-slate-600 mb-1">Alasan Rinci</label>
                            <textarea value={newSanction.reason} onChange={e => setNewSanction({...newSanction, reason: e.target.value})} rows={3} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Jelaskan detail pelanggaran atau alasan pemberian sanksi..."/>
                        </div>
                        <Button size="sm" variant="danger" onClick={handleIssueSanction} className="w-full">
                            <ShieldAlert size={16} /> Berikan Sanksi
                        </Button>
                    </div>

                    <div className="pt-4 border-t">
                         <h3 className="text-lg font-semibold text-slate-800 mb-2">Riwayat Sanksi</h3>
                         <div className="space-y-3 max-h-48 overflow-y-auto">
                            {user.sanctions && user.sanctions.length > 0 ? (
                                user.sanctions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(s => (
                                    <div key={s.id} className="p-3 border rounded-lg">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getSanctionBadgeColor(s.type)}`}>{s.type.charAt(0).toUpperCase() + s.type.slice(1)}</span>
                                            <p className="text-xs text-slate-500">{formatDate(s.date)}</p>
                                        </div>
                                        {s.checklistItems.length > 0 && (
                                            <ul className="list-disc list-inside text-sm text-slate-600 mt-1">
                                                {s.checklistItems.map(item => <li key={item}>{item}</li>)}
                                            </ul>
                                        )}
                                        <p className="text-sm text-slate-700 mt-1">{s.reason}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-center text-slate-500 py-4">Tidak ada riwayat sanksi.</p>
                            )}
                         </div>
                    </div>
                </div>
            )}
            </>
            )}
        </Modal>
    );
}

// FIX: Removed 'onViewEmployeePerformance' from the props type of BankAccountManagement as it is not used by the component.
const BankAccountManagement = ({ bankAccounts, setBankAccounts, addActivity }: Pick<SettingsPageProps, 'bankAccounts' | 'setBankAccounts' | 'addActivity'>) => {
    const [form, setForm] = useState({ bankName: '', accountNumber: '', accountHolderName: '' });
    const { addToast } = useToast();

    const handleAddAccount = () => {
        if (!form.bankName.trim() || !form.accountNumber.trim() || !form.accountHolderName.trim()) {
            addToast({ title: 'Error', message: 'Semua field harus diisi.', type: 'error' });
            return;
        }
        const newAccount: BankAccount = { id: crypto.randomUUID(), ...form };
        setBankAccounts(prev => [...prev, newAccount]);
        addActivity('Pengaturan', `Menambahkan rekening bank baru: ${form.bankName}`);
        addToast({ title: 'Sukses', message: 'Rekening bank berhasil ditambahkan.', type: 'success' });
        setForm({ bankName: '', accountNumber: '', accountHolderName: '' }); // Reset form
    };

    const handleDeleteAccount = (id: string) => {
        const account = bankAccounts.find(acc => acc.id === id);
        if (account && window.confirm(`Anda yakin ingin menghapus rekening ${account.bankName} (${account.accountNumber})?`)) {
            setBankAccounts(prev => prev.filter(acc => acc.id !== id));
            addActivity('Pengaturan', `Menghapus rekening bank: ${account.bankName}`);
            addToast({ title: 'Sukses', message: 'Rekening bank telah dihapus.', type: 'info' });
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
                <h2 className="text-xl font-bold text-slate-700 mb-4">Tambah Rekening Baru</h2>
                <div className="space-y-4">
                    <CustomInput label="Nama Bank" placeholder="Contoh: BCA" value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})} />
                    <CustomInput label="Nomor Rekening" placeholder="1234567890" value={form.accountNumber} onChange={e => setForm({...form, accountNumber: e.target.value})} />
                    <CustomInput label="Atas Nama" placeholder="Nama Pemilik" value={form.accountHolderName} onChange={e => setForm({...form, accountHolderName: e.target.value})} />
                    <Button onClick={handleAddAccount} className="w-full">Tambah Rekening</Button>
                </div>
            </Card>
            <Card className="md:col-span-2">
                <h2 className="text-xl font-bold text-slate-700 mb-4">Daftar Rekening</h2>
                <div className="space-y-3">
                    {bankAccounts.length > 0 ? bankAccounts.map(acc => (
                        <div key={acc.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border">
                            <div>
                                <p className="font-semibold text-slate-800 flex items-center gap-2"><CreditCard size={16} /> {acc.bankName}</p>
                                <p className="text-sm text-slate-600">{acc.accountNumber} <span className="text-slate-400">-</span> {acc.accountHolderName}</p>
                            </div>
                            <Button variant="ghost" size="sm" className="!p-2 text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleDeleteAccount(acc.id)}>
                                <Trash2 size={16}/>
                            </Button>
                        </div>
                    )) : (
                        <p className="text-center text-slate-500 py-4">Belum ada rekening yang ditambahkan.</p>
                    )}
                </div>
            </Card>
        </div>
    );
};