// pages/AuthPage.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Users, ShoppingBag, Loader2, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CustomInput } from '../components/ui/CustomInput';
import { CustomSelect } from '../components/ui/CustomSelect';
import type { UserData, Department } from '../types';

interface AuthPageProps {
    onLogin: (user: UserData) => void;
    onRegister: (newUser: Omit<UserData, 'uid' | 'role' | 'isApproved' | 'createdAt' | 'department' | 'profilePictureUrl' | 'sanctions' | 'status' | 'pointHistory' | 'performanceScore'>) => Promise<{ success: boolean; message: string }>;
    onStaffRegister: (newUser: Omit<UserData, 'uid' | 'role' | 'isApproved' | 'createdAt' | 'profilePictureUrl' | 'sanctions' | 'status' | 'pointHistory' | 'performanceScore'> & { department: Department }) => Promise<{ success: boolean; message: string }>;
    users: UserData[];
    lastLoggedInUsers: { uid: string, username: string }[];
}

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
        {active && <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" layoutId="auth-tab-underline" />}
    </button>
);

export const AuthPage = ({ onLogin, onRegister, onStaffRegister, users, lastLoggedInUsers }: AuthPageProps) => {
    const [view, setView] = useState<'staff' | 'customer'>('staff');
    const [customerAuthMode, setCustomerAuthMode] = useState<'login' | 'register'>('login');
    const [staffAuthMode, setStaffAuthMode] = useState<'login' | 'register'>('login');
    
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const [registrationSuccessMessage, setRegistrationSuccessMessage] = useState<string | null>(null);

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

    const handleLoginAttempt = (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);
        setError('');

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
                    onLogin(user);
                }
            } else {
                setError('User ID atau password salah.');
                setPassword('');
                setIsLoading(false);
            }
        }, 500);
    };

    const handleRegisterAttempt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);
        setError('');

        if (!registerForm.fullName || !registerForm.username || !registerForm.password) {
             setError('Nama Lengkap, User ID, dan Password harus diisi.');
             setIsLoading(false);
             return;
        }

        try {
            const result = await onRegister(registerForm);
            if (result.success) {
                setRegistrationSuccessMessage(result.message);
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError('Terjadi kesalahan saat registrasi. Silakan coba lagi.');
        } finally {
            setIsLoading(false);
        }
    };

     const handleStaffRegisterAttempt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);
        setError('');

        if (!staffRegisterForm.fullName || !staffRegisterForm.username || !staffRegisterForm.password) {
             setError('Nama Lengkap, User ID, dan Password harus diisi.');
             setIsLoading(false);
             return;
        }

        try {
            const result = await onStaffRegister(staffRegisterForm);
            if (result.success) {
                setRegistrationSuccessMessage(result.message);
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError('Terjadi kesalahan saat registrasi. Silakan coba lagi.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegisterInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setRegisterForm(prev => ({ ...prev, [name]: value }));
    };

    const handleStaffRegisterInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setStaffRegisterForm(prev => ({ ...prev, [name]: value }));
    };

    const renderStaffLogin = () => (
         <motion.div key="staff-login" initial={{opacity: 0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}>
            <h3 className="text-2xl font-bold text-slate-800 mb-1">Login Staf</h3>
            <p className="text-slate-500 mb-6">Akses dasbor internal perusahaan.</p>
            <form className="space-y-4" onSubmit={handleLoginAttempt}>
                <CustomInput label="User ID" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" disabled={isLoading} />
                <div className="relative">
                    <CustomInput label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" disabled={isLoading} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-slate-500 hover:text-slate-700 transition-colors" disabled={isLoading}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                </div>
                 {lastLoggedInUsers.length > 0 && (
                    <div className="pt-2">
                        <label className="block text-sm font-medium text-slate-600 mb-1">Akun Terakhir:</label>
                        <div className="flex flex-wrap gap-2">
                            {lastLoggedInUsers.map(user => (
                                <button key={user.uid} type="button" onClick={() => {setUsername(user.username); setPassword('');}} className="text-sm py-1 px-3 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={isLoading}>{user.username}</button>
                            ))}
                        </div>
                    </div>
                )}
                <Button type="submit" className="w-full !mt-6" disabled={isLoading}>
                    {isLoading && <Loader2 size={20} className="animate-spin" />}
                    {isLoading ? 'Memproses...' : 'Login'}
                </Button>
            </form>
             <p className="text-center text-sm text-slate-500 mt-6">
                Pegawai baru?{' '}
                <button onClick={() => setStaffAuthMode('register')} className="font-semibold text-indigo-600 hover:underline">
                    Daftar di sini
                </button>
            </p>
         </motion.div>
    );

    const renderStaffRegister = () => (
        <motion.div key="staff-register" initial={{opacity: 0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}>
            <h3 className="text-2xl font-bold text-slate-800 mb-1">Daftar Akun Pegawai</h3>
            <p className="text-slate-500 mb-6">Akun akan memerlukan persetujuan dari admin.</p>
            <form className="space-y-4" onSubmit={handleStaffRegisterAttempt}>
                <CustomInput label="Nama Lengkap" name="fullName" type="text" value={staffRegisterForm.fullName} onChange={handleStaffRegisterInputChange} required disabled={isLoading} />
                <CustomInput label="User ID" name="username" type="text" value={staffRegisterForm.username} onChange={handleStaffRegisterInputChange} required disabled={isLoading} />
                 <div className="relative">
                    <CustomInput label="Password" name="password" type={showPassword ? 'text' : 'password'} value={staffRegisterForm.password} onChange={handleStaffRegisterInputChange} required disabled={isLoading} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-slate-500 hover:text-slate-700 transition-colors" disabled={isLoading}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                </div>
                <CustomInput label="Email" name="email" type="email" value={staffRegisterForm.email} onChange={handleStaffRegisterInputChange} required disabled={isLoading} />
                <CustomInput label="Nomor WhatsApp" name="whatsapp" type="tel" value={staffRegisterForm.whatsapp} onChange={handleStaffRegisterInputChange} required disabled={isLoading} />
                 <CustomSelect label="Departemen" name="department" value={staffRegisterForm.department || ''} onChange={handleStaffRegisterInputChange} required disabled={isLoading}>
                    <option value="produksi">Produksi</option>
                    <option value="gudang">Gudang</option>
                    <option value="penjualan">Penjualan</option>
                </CustomSelect>
                <Button type="submit" className="w-full !mt-6" disabled={isLoading}>
                    {isLoading && <Loader2 size={20} className="animate-spin" />}
                    {isLoading ? 'Mendaftar...' : <> <UserPlus size={18}/> Daftar Akun Pegawai </>}
                </Button>
            </form>
             <p className="text-center text-sm text-slate-500 mt-6">
                Sudah punya akun?{' '}
                <button onClick={() => setStaffAuthMode('login')} className="font-semibold text-indigo-600 hover:underline">
                    Login di sini
                </button>
            </p>
        </motion.div>
    );

    const renderCustomerLogin = () => (
        <motion.div key="customer-login" initial={{opacity: 0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}>
            <h3 className="text-2xl font-bold text-slate-800 mb-1">Selamat Datang Kembali</h3>
            <p className="text-slate-500 mb-6">Login untuk melanjutkan belanja.</p>
            <form className="space-y-4" onSubmit={handleLoginAttempt}>
                <CustomInput label="User ID" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" disabled={isLoading} />
                <div className="relative">
                    <CustomInput label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" disabled={isLoading} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-slate-500 hover:text-slate-700 transition-colors" disabled={isLoading}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                </div>
                <Button type="submit" className="w-full !mt-6" disabled={isLoading}>
                    {isLoading && <Loader2 size={20} className="animate-spin" />}
                    {isLoading ? 'Memproses...' : 'Login'}
                </Button>
            </form>
             <p className="text-center text-sm text-slate-500 mt-6">
                Belum punya akun?{' '}
                <button onClick={() => setCustomerAuthMode('register')} className="font-semibold text-indigo-600 hover:underline">
                    Daftar di sini
                </button>
            </p>
        </motion.div>
    );

    const renderCustomerRegister = () => (
        <motion.div key="customer-register" initial={{opacity: 0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}>
            <h3 className="text-2xl font-bold text-slate-800 mb-1">Buat Akun Baru</h3>
            <p className="text-slate-500 mb-6">Daftar untuk pengalaman belanja yang lebih baik.</p>
            <form className="space-y-4" onSubmit={handleRegisterAttempt}>
                <CustomInput label="Nama Lengkap" name="fullName" type="text" value={registerForm.fullName} onChange={handleRegisterInputChange} required disabled={isLoading} />
                <CustomInput label="User ID" name="username" type="text" value={registerForm.username} onChange={handleRegisterInputChange} required disabled={isLoading} />
                 <div className="relative">
                    <CustomInput label="Password" name="password" type={showPassword ? 'text' : 'password'} value={registerForm.password} onChange={handleRegisterInputChange} required disabled={isLoading} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-slate-500 hover:text-slate-700 transition-colors" disabled={isLoading}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                </div>
                <CustomInput label="Email" name="email" type="email" value={registerForm.email} onChange={handleRegisterInputChange} required disabled={isLoading} />
                <CustomInput label="Nomor WhatsApp" name="whatsapp" type="tel" value={registerForm.whatsapp} onChange={handleRegisterInputChange} required disabled={isLoading} />
                
                <Button type="submit" className="w-full !mt-6" disabled={isLoading}>
                    {isLoading && <Loader2 size={20} className="animate-spin" />}
                    {isLoading ? 'Mendaftar...' : <> <UserPlus size={18}/> Daftar Akun Baru </>}
                </Button>
            </form>
             <p className="text-center text-sm text-slate-500 mt-6">
                Sudah punya akun?{' '}
                <button onClick={() => setCustomerAuthMode('login')} className="font-semibold text-indigo-600 hover:underline">
                    Login di sini
                </button>
            </p>
        </motion.div>
    );

    const renderRegistrationSuccess = () => (
        <motion.div key="register-success" initial={{opacity: 0}} animate={{opacity:1}}>
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
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 lg:p-0">
             <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className="w-full max-w-4xl mx-auto grid lg:grid-cols-2 shadow-2xl shadow-slate-300/30 rounded-2xl overflow-hidden"
             >
                 <motion.div 
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.7, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    className="hidden lg:flex relative flex-col items-center justify-center p-12 text-white bg-cover bg-center" style={{backgroundImage: 'url(https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3)'}}
                >
                    <motion.div 
                        className="w-full h-full bg-gradient-to-br from-indigo-700/80 to-violet-900/80 absolute top-0 left-0"
                        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        style={{ backgroundSize: '200% 200%' }}
                    ></motion.div>
                    <div className="relative z-10 text-center space-y-4">
                        <motion.h1 
                             initial={{ y: 30, opacity: 0 }}
                             animate={{ y: 0, opacity: 1 }}
                             transition={{ duration: 0.7, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
                            className="text-5xl font-bold tracking-tighter"
                        >KAZUMI</motion.h1>
                        <motion.p 
                             initial={{ y: 30, opacity: 0 }}
                             animate={{ y: 0, opacity: 1 }}
                             transition={{ duration: 0.7, delay: 0.6, ease: [0.4, 0, 0.2, 1] }}
                            className="text-indigo-200 text-lg"
                        >Your Complete Business Dashboard.</motion.p>
                    </div>
                 </motion.div>
                 <div className="bg-white flex flex-col">
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
                        <AnimatePresence>
                            {error && <motion.div initial={{opacity: 0, y: -10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: 10}} className="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm mb-4" role="alert">{error}</motion.div>}
                        </AnimatePresence>
                         <AnimatePresence mode="wait">
                            {registrationSuccessMessage
                                ? renderRegistrationSuccess()
                                : view === 'staff'
                                    ? (staffAuthMode === 'login' ? renderStaffLogin() : renderStaffRegister())
                                    : (customerAuthMode === 'login' ? renderCustomerLogin() : renderCustomerRegister())
                            }
                         </AnimatePresence>
                     </div>
                 </div>
             </motion.div>
        </div>
    );
};