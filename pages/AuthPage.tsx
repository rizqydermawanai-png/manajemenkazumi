// pages/AuthPage.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// FIX: Imported the missing `CheckCircle` icon component from `lucide-react` to resolve the "Cannot find name" error.
import { Eye, EyeOff, Users, ShoppingBag, Loader2, UserPlus, HelpCircle, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CustomInput } from '../components/ui/CustomInput';
import { CustomSelect } from '../components/ui/CustomSelect';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../hooks/useToast';
import { Modal } from '../components/ui/Modal';
import type { UserData, Department, AccountChangeRequest } from '../types';

type TabButtonProps = React.PropsWithChildren<{
    active: boolean;
    onClick: () => void;
}>;

const TabButton = ({ active, onClick, children }: TabButtonProps) => (
    <button
        onClick={onClick}
        className={`flex-1 p-3 font-semibold text-center transition-colors duration-300 relative flex items-center justify-center gap-2 ${
            active ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-600'
        }`}
    >
        {children}
        {active && <motion.div className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-600" layoutId="auth-tab-underline" />}
    </button>
);

const ForgotPasswordModal = ({ isOpen, onClose, onForgotPassword }: { isOpen: boolean, onClose: () => void, onForgotPassword: (username: string) => void }) => {
    const [inputUsername, setInputUsername] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onForgotPassword(inputUsername);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Lupa Password">
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-slate-600">Masukkan User ID Anda untuk meminta reset password. Permintaan akan ditinjau oleh administrator.</p>
                <CustomInput
                    label="User ID"
                    value={inputUsername}
                    onChange={(e) => setInputUsername(e.target.value)}
                    required
                />
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                    <Button type="submit">Kirim Permintaan</Button>
                </div>
            </form>
        </Modal>
    );
};

const formVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: i * 0.05,
            type: 'spring',
            stiffness: 120,
            damping: 15,
        },
    }),
    exit: { opacity: 0, y: -10, transition: { duration: 0.15 } }
};

export const AuthPage = () => {
    const { state, dispatch } = useAppContext();
    const { users, lastLoggedInUsers, accountChangeRequests } = state;
    const { addToast } = useToast();

    const [view, setView] = useState<'staff' | 'customer'>('staff');
    const [customerAuthMode, setCustomerAuthMode] = useState<'login' | 'register'>('login');
    const [staffAuthMode, setStaffAuthMode] = useState<'login' | 'register'>('login');
    
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const [registrationSuccessMessage, setRegistrationSuccessMessage] = useState<string | null>(null);
    const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);

    const [registerForm, setRegisterForm] = useState({
        fullName: '',
        username: '',
        password: '',
        email: '',
        whatsapp: ''
    });

    const [staffRegisterForm, setStaffRegisterForm] = useState({
        fullName: '',
        username: '',
        password: '',
        email: '',
        whatsapp: '',
        department: 'produksi' as Department
    });
    
    useEffect(() => {
        setIsLoading(false);
        setError('');
        setUsername('');
        setPassword('');
    }, []);

    const handleLoginAttempt = (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);
        setError('');

        const existingResetRequest = accountChangeRequests.find(req => 
            req.username.toLowerCase() === username.toLowerCase() &&
            req.type === 'password_reset' &&
            req.status === 'pending'
        );

        if (existingResetRequest) {
            setError('Anda memiliki permintaan reset password yang sedang diproses. Harap tunggu persetujuan admin.');
            setIsLoading(false);
            return;
        }

        setTimeout(() => {
            const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
            
            if (user) {
                if (view === 'customer' && user.role !== 'customer' && user.role !== 'pending') {
                    setError('Akun staf tidak dapat login di area pelanggan. Silakan gunakan Login Staf.');
                    setPassword('');
                    setIsLoading(false);
                    return;
                }

                if (view === 'staff' && user.role === 'customer') {
                    setError('Akun pelanggan tidak dapat login di area staf. Silakan gunakan Area Pelanggan.');
                    setPassword('');
                    setIsLoading(false);
                    return;
                }
                
                if (user.role === 'pending' || !user.isApproved) {
                    setError('Akun Anda sedang menunggu persetujuan admin. Silakan cek kembali nanti.');
                    setPassword('');
                    setIsLoading(false);
                } else {
                    dispatch({ type: 'LOGIN', payload: user });
                    addToast({ title: 'Login Berhasil', message: `Selamat datang kembali, ${user.fullName}!`, type: 'success' });
                    setIsLoading(false);
                }
            } else {
                setError('User ID atau password salah.');
                setPassword('');
                setIsLoading(false);
            }
        }, 500);
    };

    const handleRegisterAttempt = (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);
        setError('');

        if (!registerForm.fullName || !registerForm.username || !registerForm.password) {
             setError('Nama Lengkap, User ID, dan Password harus diisi.');
             setIsLoading(false);
             return;
        }

        const existingUser = users.find(u => u.username.toLowerCase() === registerForm.username.toLowerCase());
        if (existingUser) {
            setError('User ID sudah digunakan.');
            setIsLoading(false);
            return;
        }

        const registeredUser: UserData = {
            ...registerForm,
            uid: `cust-${crypto.randomUUID()}`,
            role: 'pending',
            isApproved: false,
            createdAt: new Date().toISOString(),
            department: null,
            profilePictureUrl: `https://api.dicebear.com/8.x/initials/svg?seed=${registerForm.fullName}`,
            sanctions: []
        };
        
        dispatch({ type: 'REGISTER_CUSTOMER', payload: { user: registeredUser } });
        setRegistrationSuccessMessage('Registrasi berhasil! Akun Anda akan segera diverifikasi oleh admin.');
        setIsLoading(false);
    };

     const handleStaffRegisterAttempt = (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);
        setError('');

        if (!staffRegisterForm.fullName || !staffRegisterForm.username || !staffRegisterForm.password) {
             setError('Nama Lengkap, User ID, dan Password harus diisi.');
             setIsLoading(false);
             return;
        }

        const existingUser = users.find(u => u.username.toLowerCase() === staffRegisterForm.username.toLowerCase());
        if (existingUser) {
            setError('User ID sudah digunakan.');
            setIsLoading(false);
            return;
        }
        
        const registeredUser: UserData = {
            ...staffRegisterForm,
            uid: `staff-${crypto.randomUUID()}`,
            role: 'pending',
            isApproved: false,
            createdAt: new Date().toISOString(),
            profilePictureUrl: `https://api.dicebear.com/8.x/initials/svg?seed=${staffRegisterForm.fullName}`,
            sanctions: [],
            baseSalary: 3000000,
        };
        
        dispatch({ type: 'REGISTER_STAFF', payload: { user: registeredUser } });
        setRegistrationSuccessMessage('Registrasi berhasil! Akun Anda akan segera diverifikasi oleh admin.');
        setIsLoading(false);
    };

    const handleRegisterInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setRegisterForm(prev => ({ ...prev, [name]: value }));
    };

    const handleStaffRegisterInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setStaffRegisterForm(prev => ({ ...prev, [name]: value }));
    };

    const handleForgotPassword = (inputUsername: string) => {
        const user = users.find(u => u.username.toLowerCase() === inputUsername.toLowerCase());
        if (!user) {
            addToast({ title: 'User ID Tidak Ditemukan', message: 'Pastikan User ID yang Anda masukkan benar.', type: 'error' });
            return;
        }

        const existingRequest = accountChangeRequests.find(req => req.userId === user.uid && req.status === 'pending');
        if (existingRequest) {
            addToast({ title: 'Permintaan Sudah Ada', message: `Anda sudah memiliki permintaan perubahan akun yang sedang diproses.`, type: 'warning' });
            return;
        }

        const newRequest: AccountChangeRequest = {
            id: crypto.randomUUID(),
            userId: user.uid,
            username: user.username,
            type: 'password_reset',
            newValue: '',
            status: 'pending',
            requestedAt: new Date().toISOString(),
        };

        dispatch({ type: 'SET_ACCOUNT_CHANGE_REQUESTS', payload: prev => [...prev, newRequest] });
        addToast({ title: 'Permintaan Terkirim', message: 'Permintaan reset password telah dikirim ke admin untuk persetujuan.', type: 'success' });
        setIsForgotPasswordModalOpen(false);
    };

    const renderStaffLogin = () => (
         <motion.div key="staff-login" className="space-y-4">
            <motion.div custom={0} variants={formVariants}><h3 className="text-2xl font-bold text-slate-800 mb-1">Login Staf</h3></motion.div>
            <motion.div custom={1} variants={formVariants}><p className="text-slate-500 mb-6">Akses dasbor internal perusahaan.</p></motion.div>
            <form className="space-y-4" onSubmit={handleLoginAttempt}>
                <motion.div custom={2} variants={formVariants}><CustomInput label="User ID" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" disabled={isLoading} /></motion.div>
                <motion.div custom={3} variants={formVariants} className="relative">
                    <CustomInput label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" disabled={isLoading} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-slate-500 hover:text-slate-700 transition-colors" disabled={isLoading}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                </motion.div>
                 <motion.div custom={4} variants={formVariants} className="text-right text-sm">
                    <button type="button" onClick={() => setIsForgotPasswordModalOpen(true)} className="font-semibold text-indigo-600 hover:underline">
                        Lupa Password?
                    </button>
                </motion.div>
                 {lastLoggedInUsers.length > 0 && (
                    <motion.div custom={5} variants={formVariants} className="pt-2">
                        <label className="block text-sm font-medium text-slate-600 mb-1">Akun Terakhir:</label>
                        <div className="flex flex-wrap gap-2">
                            {lastLoggedInUsers.map(user => (
                                <button key={user.uid} type="button" onClick={() => {setUsername(user.username); setPassword('');}} className="text-sm py-1 px-3 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={isLoading}>{user.username}</button>
                            ))}
                        </div>
                    </motion.div>
                )}
                <motion.div custom={6} variants={formVariants}>
                    <Button type="submit" className="w-full !mt-6" disabled={isLoading}>
                        {isLoading && <Loader2 size={20} className="animate-spin" />}
                        {isLoading ? 'Memproses...' : 'Login'}
                    </Button>
                </motion.div>
            </form>
             <motion.p custom={7} variants={formVariants} className="text-center text-sm text-slate-500 mt-6">
                Pegawai baru?{' '}
                <button onClick={() => setStaffAuthMode('register')} className="font-semibold text-indigo-600 hover:underline">
                    Daftar di sini
                </button>
            </motion.p>
         </motion.div>
    );

    const renderStaffRegister = () => (
        <motion.div key="staff-register" className="space-y-4">
            <motion.div custom={0} variants={formVariants}><h3 className="text-2xl font-bold text-slate-800 mb-1">Daftar Akun Pegawai</h3></motion.div>
            <motion.div custom={1} variants={formVariants}><p className="text-slate-500 mb-6">Akun akan memerlukan persetujuan dari admin.</p></motion.div>
            <form className="space-y-4" onSubmit={handleStaffRegisterAttempt}>
                <motion.div custom={2} variants={formVariants}><CustomInput label="Nama Lengkap" name="fullName" type="text" value={staffRegisterForm.fullName} onChange={handleStaffRegisterInputChange} required disabled={isLoading} /></motion.div>
                <motion.div custom={3} variants={formVariants}><CustomInput label="User ID" name="username" type="text" value={staffRegisterForm.username} onChange={handleStaffRegisterInputChange} required disabled={isLoading} /></motion.div>
                 <motion.div custom={4} variants={formVariants} className="relative">
                    <CustomInput label="Password" name="password" type={showPassword ? 'text' : 'password'} value={staffRegisterForm.password} onChange={handleStaffRegisterInputChange} required disabled={isLoading} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-slate-500 hover:text-slate-700 transition-colors" disabled={isLoading}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                </motion.div>
                <motion.div custom={5} variants={formVariants}><CustomInput label="Email" name="email" type="email" value={staffRegisterForm.email} onChange={handleStaffRegisterInputChange} required disabled={isLoading} /></motion.div>
                <motion.div custom={6} variants={formVariants}><CustomInput label="Nomor WhatsApp" name="whatsapp" type="tel" value={staffRegisterForm.whatsapp} onChange={handleStaffRegisterInputChange} required disabled={isLoading} /></motion.div>
                 <motion.div custom={7} variants={formVariants}><CustomSelect label="Departemen" name="department" value={staffRegisterForm.department || ''} onChange={handleStaffRegisterInputChange} required disabled={isLoading}>
                    <option value="produksi">Produksi</option>
                    <option value="gudang">Gudang</option>
                    <option value="penjualan">Penjualan</option>
                </CustomSelect></motion.div>
                <motion.div custom={8} variants={formVariants}>
                    <Button type="submit" className="w-full !mt-6" disabled={isLoading}>
                        {isLoading && <Loader2 size={20} className="animate-spin" />}
                        {isLoading ? 'Mendaftar...' : <> <UserPlus size={18}/> Daftar Akun Pegawai </>}
                    </Button>
                </motion.div>
            </form>
             <motion.p custom={9} variants={formVariants} className="text-center text-sm text-slate-500 mt-6">
                Sudah punya akun?{' '}
                <button onClick={() => setStaffAuthMode('login')} className="font-semibold text-indigo-600 hover:underline">
                    Login di sini
                </button>
            </motion.p>
        </motion.div>
    );

    const renderCustomerLogin = () => (
        <motion.div key="customer-login" className="space-y-4">
            <motion.div custom={0} variants={formVariants}><h3 className="text-2xl font-bold text-slate-800 mb-1">Selamat Datang Kembali</h3></motion.div>
            <motion.div custom={1} variants={formVariants}><p className="text-slate-500 mb-6">Login untuk melanjutkan belanja.</p></motion.div>
            <form className="space-y-4" onSubmit={handleLoginAttempt}>
                <motion.div custom={2} variants={formVariants}><CustomInput label="User ID" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" disabled={isLoading} /></motion.div>
                <motion.div custom={3} variants={formVariants} className="relative">
                    <CustomInput label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" disabled={isLoading} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-slate-500 hover:text-slate-700 transition-colors" disabled={isLoading}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                </motion.div>
                 <motion.div custom={4} variants={formVariants} className="text-right text-sm">
                    <button type="button" onClick={() => setIsForgotPasswordModalOpen(true)} className="font-semibold text-indigo-600 hover:underline">
                        Lupa Password?
                    </button>
                </motion.div>
                <motion.div custom={5} variants={formVariants}>
                    <Button type="submit" className="w-full !mt-6" disabled={isLoading}>
                        {isLoading && <Loader2 size={20} className="animate-spin" />}
                        {isLoading ? 'Memproses...' : 'Login'}
                    </Button>
                </motion.div>
            </form>
             <motion.p custom={6} variants={formVariants} className="text-center text-sm text-slate-500 mt-6">
                Belum punya akun?{' '}
                <button onClick={() => setCustomerAuthMode('register')} className="font-semibold text-indigo-600 hover:underline">
                    Daftar di sini
                </button>
            </motion.p>
        </motion.div>
    );

    const renderCustomerRegister = () => (
        <motion.div key="customer-register" className="space-y-4">
            <motion.div custom={0} variants={formVariants}><h3 className="text-2xl font-bold text-slate-800 mb-1">Buat Akun Baru</h3></motion.div>
            <motion.div custom={1} variants={formVariants}><p className="text-slate-500 mb-6">Daftar untuk pengalaman belanja yang lebih baik.</p></motion.div>
            <form className="space-y-4" onSubmit={handleRegisterAttempt}>
                <motion.div custom={2} variants={formVariants}><CustomInput label="Nama Lengkap" name="fullName" type="text" value={registerForm.fullName} onChange={handleRegisterInputChange} required disabled={isLoading} /></motion.div>
                <motion.div custom={3} variants={formVariants}><CustomInput label="User ID" name="username" type="text" value={registerForm.username} onChange={handleRegisterInputChange} required disabled={isLoading} /></motion.div>
                 <motion.div custom={4} variants={formVariants} className="relative">
                    <CustomInput label="Password" name="password" type={showPassword ? 'text' : 'password'} value={registerForm.password} onChange={handleRegisterInputChange} required disabled={isLoading} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-slate-500 hover:text-slate-700 transition-colors" disabled={isLoading}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                </motion.div>
                <motion.div custom={5} variants={formVariants}><CustomInput label="Email" name="email" type="email" value={registerForm.email} onChange={handleRegisterInputChange} required disabled={isLoading} /></motion.div>
                <motion.div custom={6} variants={formVariants}><CustomInput label="Nomor WhatsApp" name="whatsapp" type="tel" value={registerForm.whatsapp} onChange={handleRegisterInputChange} required disabled={isLoading} /></motion.div>
                
                <motion.div custom={7} variants={formVariants}>
                    <Button type="submit" className="w-full !mt-6" disabled={isLoading}>
                        {isLoading && <Loader2 size={20} className="animate-spin" />}
                        {isLoading ? 'Mendaftar...' : <> <UserPlus size={18}/> Daftar Akun Baru </>}
                    </Button>
                </motion.div>
            </form>
             <motion.p custom={8} variants={formVariants} className="text-center text-sm text-slate-500 mt-6">
                Sudah punya akun?{' '}
                <button onClick={() => setCustomerAuthMode('login')} className="font-semibold text-indigo-600 hover:underline">
                    Login di sini
                </button>
            </motion.p>
        </motion.div>
    );

    const renderRegistrationSuccess = () => (
        <motion.div key="register-success" initial={{opacity: 0}} animate={{opacity:1}} className="text-center">
            <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type: 'spring', delay: 0.2}} className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32}/>
            </motion.div>
            <h3 className="text-2xl font-bold text-green-600 mb-2">Registrasi Berhasil!</h3>
            <p className="text-slate-600 mb-6">{registrationSuccessMessage}</p>
            <p className="text-slate-500 mb-6 text-sm">Proses verifikasi biasanya memakan waktu 1-2 jam kerja. Anda akan bisa login setelah akun disetujui.</p>
            <Button className="w-full" onClick={() => { setRegistrationSuccessMessage(null); setCustomerAuthMode('login'); setStaffAuthMode('login'); }}>
                Kembali ke Halaman Login
            </Button>
        </motion.div>
    );

    const handleViewChange = (newView: 'staff' | 'customer') => {
        setView(newView);
        setError('');
        setRegistrationSuccessMessage(null);
        setCustomerAuthMode('login');
        setStaffAuthMode('login');
        setUsername('');
        setPassword('');
    };
    
    return (
        <motion.div 
            className="min-h-screen bg-slate-100 flex items-center justify-center p-4 lg:p-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
             <div 
                className="w-full max-w-4xl mx-auto grid lg:grid-cols-2 shadow-2xl shadow-slate-300/30 rounded-2xl overflow-hidden bg-white"
             >
                 <div className="hidden lg:flex relative flex-col items-center justify-center p-12 text-white overflow-hidden">
                    <motion.div
                        className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
                        style={{
                            backgroundImage: `url(${
                                view === 'staff'
                                    ? 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?q=80&w=2070&auto=format&fit=crop'
                                    : 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop'
                            })`,
                        }}
                        key={view}
                        initial={{ opacity: 0, scale: 1.2 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1]}}
                    />
                    <motion.div 
                        className="absolute inset-0 bg-gradient-to-br from-indigo-700/80 to-violet-900/80"
                        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        style={{ backgroundSize: '200% 200%' }}
                    ></motion.div>
                    <div className="relative z-10 text-center space-y-4">
                        <motion.h1 
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.7, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
                            className="text-5xl font-bold tracking-tighter"
                        >KAZUMI</motion.h1>
                        <motion.p 
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.7, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
                            className="text-indigo-200 text-lg"
                        >
                            {view === 'staff' ? 'Your Complete Business Dashboard.' : 'Discover Your Perfect Style.'}
                        </motion.p>
                    </div>
                 </div>
                 <div className="flex flex-col">
                    <div className="flex border-b">
                        <TabButton active={view === 'staff'} onClick={() => handleViewChange('staff')}>
                            <Users size={18}/>
                            <span>Login Staf</span>
                        </TabButton>
                        <TabButton active={view === 'customer'} onClick={() => handleViewChange('customer')}>
                            <ShoppingBag size={18}/>
                            <span>Area Pelanggan</span>
                        </TabButton>
                    </div>
                     <div className="p-8 md:p-10 flex-grow flex flex-col justify-center">
                        <AnimatePresence mode='wait'>
                            {error && <motion.div initial={{opacity: 0, y: -10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: 10}} className="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm mb-4" role="alert">{error}</motion.div>}
                        </AnimatePresence>
                         <AnimatePresence mode="wait">
                            <motion.div
                                key={`${view}-${staffAuthMode}-${customerAuthMode}-${!!registrationSuccessMessage}`}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                variants={{
                                    hidden: { opacity: 0, y: 20 },
                                    visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.05 } },
                                    exit: { opacity: 0, y: -20 },
                                }}
                            >
                                {registrationSuccessMessage
                                    ? renderRegistrationSuccess()
                                    : view === 'staff'
                                        ? (staffAuthMode === 'login' ? renderStaffLogin() : renderStaffRegister())
                                        : (customerAuthMode === 'login' ? renderCustomerLogin() : renderCustomerRegister())
                                }
                            </motion.div>
                         </AnimatePresence>
                     </div>
                 </div>
             </div>
             <ForgotPasswordModal
                isOpen={isForgotPasswordModalOpen}
                onClose={() => setIsForgotPasswordModalOpen(false)}
                onForgotPassword={handleForgotPassword}
             />
        </motion.div>
    );
};