// pages/CatalogPage.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Minus, Trash2, X, LogOut, Send, User, ChevronLeft, Shirt, Wind, HandPlatter, Package, UploadCloud, Image as ImageIcon, Loader2, History, MapPin, Truck as TruckIcon, CheckCircle, Check, Tag } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CustomInput } from '../components/ui/CustomInput';
import { CustomSelect } from '../components/ui/CustomSelect';
import { useToast } from '../hooks/useToast';
import { formatCurrency, formatDate } from '../lib/utils';
import type { FinishedGood, SaleItem, UserData, Address, OnlineOrder, OnlineOrderStatus, BankAccount, PromoCode } from '../types';
import { GARMENT_PATTERNS } from '../lib/data';
import { getShippingCosts, trackPackage, ShippingOption, TrackingHistory } from '../lib/expeditionApi';
import { Modal } from '../components/ui/Modal';


type CustomerView = 'catalog' | 'cart' | 'checkout' | 'profile' | 'detail' | 'orders';

interface CatalogPageProps {
    products: FinishedGood[];
    onPlaceOrder: (orderInfo: { customerName: string; shippingAddress: Address; notes: string; paymentMethod: string; shippingMethod: string; shippingCost: number; paymentProofUrl: string; }, cart: SaleItem[]) => void;
    onLogout: () => void;
    currentUser: UserData;
    onUpdateProfile: (updates: Partial<UserData>) => void;
    cart: SaleItem[];
    setCart: React.Dispatch<React.SetStateAction<SaleItem[]>>;
    onlineOrders: OnlineOrder[];
    bankAccounts: BankAccount[];
    promoCodes: PromoCode[];
}

// FIX: Defined a named type for props to improve type safety and avoid potential linter errors.
type ProductCardProps = {
    product: FinishedGood;
    onCardClick: (product: FinishedGood) => void;
};

// Sub-component: Product Card
// FIX: Changed component to use React.FC<ProductCardProps> to correctly type it as a React component,
// resolving errors where the 'key' prop was not recognized when mapping over products.
const ProductCard: React.FC<ProductCardProps> = ({ product, onCardClick }) => (
    <motion.div 
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onClick={() => onCardClick(product)}
        className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200/50 flex flex-col group cursor-pointer"
    >
        <div className="relative">
            <img 
                src={product.imageUrl || `https://placehold.co/400x400/e2e8f0/64748b?text=KZM`} 
                alt={product.name} 
                className="w-full h-56 object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {product.salePrice && (
                <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    SALE
                </div>
            )}
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>
        <div className="p-4 flex flex-col flex-grow">
            <h3 className="font-bold text-slate-800">{product.name}</h3>
            <p className="text-sm text-slate-500">{product.size} - {product.colorName}</p>
            <div className="mt-auto pt-2">
                {product.salePrice ? (
                    <div>
                        <p className="text-sm text-slate-400 line-through">{formatCurrency(product.sellingPrice)}</p>
                        <p className="text-lg font-bold text-red-600">{formatCurrency(product.salePrice)}</p>
                    </div>
                ) : (
                    <p className="text-lg font-bold text-indigo-600">{formatCurrency(product.sellingPrice)}</p>
                )}
            </div>
        </div>
    </motion.div>
);

// Sub-component: Product Detail Modal
const ProductDetailModal = ({ product, onClose, onAddToCart }: { product: FinishedGood, onClose: () => void, onAddToCart: (product: FinishedGood, quantity: number) => void }) => {
    const [quantity, setQuantity] = useState(1);
    
    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: -20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-xl shadow-lg w-full max-w-4xl flex flex-col md:flex-row"
                onClick={e => e.stopPropagation()}
            >
                <img src={product.imageUrl || `https://placehold.co/600x600/e2e8f0/64748b?text=KZM`} alt={product.name} className="w-full md:w-1/2 h-64 md:h-auto object-cover rounded-t-xl md:rounded-l-xl md:rounded-tr-none"/>
                <div className="p-6 flex flex-col">
                    <h2 className="text-2xl font-bold">{product.name}</h2>
                    <p className="text-md text-slate-500">{product.size} - {product.colorName}</p>
                    <div className="my-4">
                        {product.salePrice ? (
                            <div>
                                <p className="text-xl text-slate-400 line-through">{formatCurrency(product.sellingPrice)}</p>
                                <p className="text-4xl font-bold text-red-600">{formatCurrency(product.salePrice)}</p>
                            </div>
                        ) : (
                            <p className="text-4xl font-bold text-indigo-600">{formatCurrency(product.sellingPrice)}</p>
                        )}
                    </div>
                    <p className="text-sm text-slate-600 flex-grow">Stok tersedia: {product.stock}</p>
                    <div className="flex items-center gap-3 mt-4">
                        <CustomInput type="number" value={quantity} onChange={e => setQuantity(Math.max(1, Number(e.target.value)))} className="w-20 text-center"/>
                        <Button className="flex-grow" onClick={() => onAddToCart(product, quantity)}>
                            <ShoppingCart size={16} /> Tambah ke Keranjang
                        </Button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

// Sub-component: Profile View
const ProfileView = ({ currentUser, onUpdateProfile, onBack }: { currentUser: UserData, onUpdateProfile: (updates: Partial<UserData>) => void, onBack: () => void }) => {
    const [form, setForm] = useState({
        fullName: currentUser.fullName,
        email: currentUser.email,
        whatsapp: currentUser.whatsapp,
        profilePictureUrl: currentUser.profilePictureUrl,
        address: currentUser.address || { streetAndBuilding: '', houseNumber: '', rt: '', rw: '', subdistrict: '', district: '', city: '', province: '', postalCode: '', country: 'Indonesia' }
    });
    const { addToast } = useToast();

    const handleProfileUpdate = () => {
        onUpdateProfile(form);
        addToast({ title: 'Profil Diperbarui', message: 'Informasi profil Anda telah berhasil disimpan.', type: 'success' });
        onBack();
    };
    
    const handleAddressChange = (field: keyof Address, value: string) => {
        setForm(prev => ({
            ...prev,
            address: {
                ...prev.address,
                [field]: value,
            }
        }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 1024 * 1024) { addToast({ title: 'File Terlalu Besar', message: 'Ukuran file tidak boleh melebihi 1MB.', type: 'error' }); return; }
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
                    addToast({ title: 'Upload Gagal', message: 'Gagal mengunggah gambar.', type: 'error' });
                }
            }
        };
        reader.readAsDataURL(file);
    };
    
    return (
         <main className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-3xl">
            <Button variant="ghost" onClick={onBack} className="mb-4"><ChevronLeft size={16}/> Kembali ke Katalog</Button>
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-slate-700 mb-6">Edit Profil</h2>
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <img src={form.profilePictureUrl} alt="Preview" className="w-20 h-20 rounded-full bg-slate-200 object-cover" />
                        <div>
                            <input type="file" id="profilePic" className="hidden" accept="image/*" onChange={handleImageUpload}/>
                            <Button type="button" variant="outline" onClick={() => document.getElementById('profilePic')?.click()}>Ubah Foto</Button>
                        </div>
                    </div>
                    <CustomInput label="Nama Lengkap" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} />
                    <CustomInput label="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                    <CustomInput label="WhatsApp" value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} />
                    
                    <div className="pt-4 border-t">
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">Alamat Pengiriman Utama</h3>
                        <CustomInput label="Jalan / Nama Gedung" value={form.address.streetAndBuilding} onChange={e => handleAddressChange('streetAndBuilding', e.target.value)} />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                             <CustomInput label="Nomor Rumah" value={form.address.houseNumber} onChange={e => handleAddressChange('houseNumber', e.target.value)} />
                             <CustomInput label="RT" value={form.address.rt} onChange={e => handleAddressChange('rt', e.target.value)} />
                             <CustomInput label="RW" value={form.address.rw} onChange={e => handleAddressChange('rw', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <CustomInput label="Kelurahan" value={form.address.subdistrict} onChange={e => handleAddressChange('subdistrict', e.target.value)} />
                            <CustomInput label="Kecamatan" value={form.address.district} onChange={e => handleAddressChange('district', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <CustomInput label="Kota / Kabupaten" value={form.address.city} onChange={e => handleAddressChange('city', e.target.value)} />
                            <CustomInput label="Provinsi" value={form.address.province} onChange={e => handleAddressChange('province', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <CustomInput label="Kode Pos" value={form.address.postalCode} onChange={e => handleAddressChange('postalCode', e.target.value)} />
                             <CustomInput label="Negara" value={form.address.country} onChange={e => handleAddressChange('country', e.target.value)} />
                        </div>
                    </div>

                    <Button onClick={handleProfileUpdate} className="w-full !mt-6">Simpan Perubahan</Button>
                </div>
            </div>
        </main>
    );
};


// Main Component
export const CatalogPage = ({ products, onPlaceOrder, onLogout, currentUser, onUpdateProfile, cart, setCart, onlineOrders, bankAccounts, promoCodes }: CatalogPageProps) => {
    const [view, setView] = useState<CustomerView>('catalog');
    const [selectedProduct, setSelectedProduct] = useState<FinishedGood | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [paymentProof, setPaymentProof] = useState<string | null>(null);
    const [checkoutForm, setCheckoutForm] = useState({ 
        customerName: currentUser.fullName, 
        address: currentUser.address || { streetAndBuilding: '', houseNumber: '', rt: '', rw: '', subdistrict: '', district: '', city: '', province: '', postalCode: '', country: 'Indonesia' },
        notes: '',
        shippingMethodId: '',
        paymentMethodId: bankAccounts.length > 0 ? bankAccounts[0].id : '',
    });
    
    const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
    const [isFetchingShipping, setIsFetchingShipping] = useState(false);
    const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<OnlineOrder | null>(null);
    const [promoCodeInput, setPromoCodeInput] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);

    const { addToast } = useToast();
    
    const activePromos = useMemo(() => {
        const now = new Date();
        return promoCodes.filter(p => p.status === 'active' && new Date(p.startDate) <= now && new Date(p.endDate) >= now);
    }, [promoCodes]);

    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

    // Effect to fetch shipping costs when checkout view is active and address is complete
    useEffect(() => {
        const fetchCosts = async () => {
            if (view === 'checkout' && checkoutForm.address.district && checkoutForm.address.city) {
                setIsFetchingShipping(true);
                setShippingOptions([]);
                setCheckoutForm(prev => ({ ...prev, shippingMethodId: '' }));

                const dummyWeight = cart.reduce((sum, item) => sum + item.quantity, 0) * 250; // Assume 250g per item
                try {
                    const options = await getShippingCosts(checkoutForm.address, dummyWeight);
                    setShippingOptions(options);
                    if (options.length > 0) {
                        setCheckoutForm(prev => ({ ...prev, shippingMethodId: `${options[0].code}-${options[0].service}` }));
                    }
                } catch (error) {
                    addToast({ title: 'Gagal Ambil Ongkir', message: 'Tidak dapat mengambil data ongkos kirim.', type: 'error' });
                } finally {
                    setIsFetchingShipping(false);
                }
            }
        };
        fetchCosts();
    }, [view, checkoutForm.address.district, checkoutForm.address.city, cart]);

    // Effect to re-validate applied promo code if cart/subtotal changes
    useEffect(() => {
        if (appliedPromo && subtotal < (appliedPromo.minPurchase || 0)) {
            setAppliedPromo(null);
            setPromoCodeInput('');
            addToast({
                title: 'Promo Dihapus',
                message: `Promo ${appliedPromo.code} tidak lagi berlaku karena total belanja kurang dari minimum.`,
                type: 'warning'
            });
        }
    }, [subtotal, appliedPromo, addToast]);


    const handleAddToCart = (product: FinishedGood, quantity: number) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            const totalQuantity = (existing?.quantity || 0) + quantity;
            
            if (totalQuantity > product.stock) {
                addToast({ title: 'Stok Tidak Cukup', message: `Maksimal pembelian untuk ${product.name} adalah ${product.stock} buah.`, type: 'warning' });
                return prev;
            }

            addToast({ title: 'Berhasil', message: `${quantity}x ${product.name} ditambahkan ke keranjang.`, type: 'success' });
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: totalQuantity } : item);
            }
            return [...prev, { id: product.id, name: `${product.name} ${product.size} (${product.colorName})`, price: product.salePrice ?? product.sellingPrice, originalPrice: product.sellingPrice, quantity: quantity, imageUrl: product.imageUrl }];
        });
    };

    const handleUpdateCart = (id: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            handleRemoveFromCart(id);
            return;
        }
        const originalProduct = products.find(p => p.id === id);
        if (originalProduct && newQuantity > originalProduct.stock) {
            addToast({ title: 'Stok Maksimal', message: `Stok untuk produk ini hanya ${originalProduct.stock} buah.`, type: 'warning' });
            return;
        }
        setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: newQuantity } : item));
    };

    const handleRemoveFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };
    
    const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            addToast({ title: 'Tipe File Salah', message: 'Hanya file JPG, PNG, atau WebP yang diizinkan.', type: 'error' });
            return;
        }

        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            addToast({ title: 'File Terlalu Besar', message: 'Ukuran file maksimal adalah 2MB.', type: 'error' });
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
                    setPaymentProof(data.url);
                    addToast({ title: 'Unggah Berhasil', message: 'Bukti transfer telah diunggah.', type: 'success' });
                } catch (error) {
                    addToast({ title: 'Upload Gagal', message: 'Tidak dapat mengunggah bukti transfer.', type: 'error' });
                }
            }
        };
        reader.onerror = () => {
             addToast({ title: 'Error', message: 'Gagal membaca file.', type: 'error' });
        };
        reader.readAsDataURL(file);
    };
    
    const handleApplyPromo = (code?: string) => {
        const codeToApply = (code || promoCodeInput).trim().toUpperCase();
        if (!codeToApply) return;
        
        const promo = activePromos.find(p => p.code.toUpperCase() === codeToApply);
        if (!promo) {
            addToast({ title: 'Kode Tidak Valid', message: 'Kode promo tidak ditemukan atau sudah tidak aktif.', type: 'error' });
            setAppliedPromo(null);
            return;
        }

        if (subtotal < (promo.minPurchase || 0)) {
            addToast({ title: 'Belanja Kurang', message: `Minimal belanja ${formatCurrency(promo.minPurchase || 0)} untuk menggunakan kode ini.`, type: 'warning' });
            return;
        }

        setAppliedPromo(promo);
        setPromoCodeInput(codeToApply);
        addToast({ title: 'Promo Diterapkan', message: `Kode ${promo.code} berhasil digunakan!`, type: 'success' });
    };

    const handleConfirmOrder = (e: React.FormEvent) => {
        e.preventDefault();
        const { customerName, address, paymentMethodId, shippingMethodId } = checkoutForm;
        const requiredAddressFields: (keyof Address)[] = ['streetAndBuilding', 'city', 'province', 'postalCode', 'district', 'subdistrict'];
        const isAddressIncomplete = requiredAddressFields.some(field => !address[field]?.trim());

        if (!customerName.trim() || isAddressIncomplete) {
            addToast({ title: 'Data Tidak Lengkap', message: 'Harap isi nama penerima dan semua field alamat pengiriman.', type: 'error' });
            return;
        }

        if (!shippingMethodId) {
            addToast({ title: 'Pilih Pengiriman', message: 'Harap pilih metode pengiriman.', type: 'error' });
            return;
        }
        
        const selectedBankAccount = bankAccounts.find(acc => acc.id === paymentMethodId);

        if (selectedBankAccount && !paymentProof) {
            addToast({ title: 'Bukti Transfer', message: 'Harap unggah bukti transfer Anda.', type: 'error' });
            return;
        }
        
        const [courierCode, service] = shippingMethodId.split('-');
        const shippingMethod = shippingOptions.find(s => s.code === courierCode && s.service === service);
        
        if (!shippingMethod || !selectedBankAccount) {
             addToast({ title: 'Error Internal', message: 'Metode pengiriman atau pembayaran tidak valid.', type: 'error' });
            return;
        }

        onPlaceOrder({
            customerName,
            shippingAddress: address,
            notes: checkoutForm.notes,
            paymentMethod: `Transfer Bank ${selectedBankAccount.bankName}`,
            shippingMethod: `${shippingMethod.code.toUpperCase()} - ${shippingMethod.service}`,
            shippingCost: shippingMethod.cost,
            paymentProofUrl: paymentProof || '',
        }, cart);
        
        setPaymentProof(null);
        setView('catalog');
    };

    const openDetail = (product: FinishedGood) => {
        setSelectedProduct(product);
        setView('detail');
    };
    
    const filteredProducts = useMemo(() => {
        if (!selectedCategory) return products.filter(p => p.stock > 0);
        const categoryTitle = GARMENT_PATTERNS[selectedCategory]?.title;
        if (!categoryTitle) return products.filter(p => p.stock > 0);
        return products.filter(p => p.name.toLowerCase().includes(categoryTitle.toLowerCase()) && p.stock > 0);
    }, [products, selectedCategory]);

    // --- Render Functions (without hooks) ---
    const renderHeader = () => (
        <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-30 shadow-sm">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4">
                    <h1 className="text-2xl font-bold text-indigo-600 cursor-pointer" onClick={() => setView('catalog')}>KAZUMI</h1>
                    <div className="flex items-center gap-1 sm:gap-2">
                         <button onClick={() => setView('orders')} className="p-2 rounded-full hover:bg-slate-100 text-slate-600">
                            <History size={22}/>
                        </button>
                         <div className="relative group">
                            <button className="p-2 rounded-full hover:bg-slate-100 text-slate-600"><User/></button>
                            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                                <button onClick={() => setView('profile')} className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Profil Saya</button>
                                <button onClick={onLogout} className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Logout</button>
                            </div>
                        </div>
                        <button onClick={() => setView('cart')} className="relative p-2 rounded-full hover:bg-slate-100 text-slate-600">
                            <ShoppingCart />
                            {cart.length > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>}
                        </button>
                    </div>
                </div>
                {view === 'catalog' && (
                    <div className="flex items-center gap-2 sm:gap-4 pb-3 justify-center">
                       <Button size="sm" variant={!selectedCategory ? 'primary' : 'ghost'} onClick={() => setSelectedCategory(null)}>Semua</Button>
                        {Object.entries(GARMENT_PATTERNS).map(([key, { title, icon: Icon }]) => (
                            <Button key={key} size="sm" variant={selectedCategory === key ? 'primary' : 'ghost'} onClick={() => setSelectedCategory(key)}>
                                <Icon size={16}/> <span className="hidden sm:inline ml-2">{title}</span>
                            </Button>
                        ))}
                    </div>
                )}
            </div>
        </header>
    );
    
    const renderCatalog = () => (
        <main className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <AnimatePresence>
                    {filteredProducts.map(product => (
                        <ProductCard key={product.id} product={product} onCardClick={openDetail} />
                    ))}
                </AnimatePresence>
            </div>
            {filteredProducts.length === 0 && (
                <div className="text-center py-20 text-slate-500 bg-white rounded-xl shadow-md">
                    <Package size={48} className="mx-auto text-slate-400 mb-4" />
                    <p className="font-semibold">Tidak ada produk ditemukan</p>
                    <p className="text-sm">Coba ubah filter kategori atau cek kembali nanti.</p>
                </div>
            )}
        </main>
    );

    const renderCart = () => {
        return (
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                 <Button variant="ghost" onClick={() => setView('catalog')} className="mb-4"><ChevronLeft size={16}/> Lanjut Belanja</Button>
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold mb-4">Keranjang Belanja</h2>
                    {cart.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-4">
                                {cart.map(item => (
                                    <div key={item.id} className="flex gap-4 border-b pb-4 last:border-0 last:pb-0">
                                        <img src={item.imageUrl || `https://placehold.co/80x80/e2e8f0/64748b?text=KZM`} alt={item.name} className="w-20 h-20 rounded-lg object-cover" />
                                        <div className="flex-grow">
                                            <p className="font-semibold">{item.name}</p>
                                            <p className="text-sm text-indigo-600">{formatCurrency(item.price)}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Button variant="outline" size="sm" className="!p-1 h-7 w-7" onClick={() => handleUpdateCart(item.id, item.quantity - 1)}><Minus size={14}/></Button>
                                                <span className="w-8 text-center">{item.quantity}</span>
                                                <Button variant="outline" size="sm" className="!p-1 h-7 w-7" onClick={() => handleUpdateCart(item.id, item.quantity + 1)}><Plus size={14}/></Button>
                                            </div>
                                        </div>
                                        <div className="flex flex-col justify-between items-end">
                                            <p className="font-bold text-slate-800">{formatCurrency(item.price * item.quantity)}</p>
                                            <Button variant="ghost" size="sm" className="!p-1 h-auto text-slate-400 hover:text-red-500" onClick={() => handleRemoveFromCart(item.id)}><Trash2 size={16}/></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="lg:col-span-1 bg-slate-50 p-4 rounded-lg self-start">
                                <h3 className="font-bold text-lg mb-4">Ringkasan Pesanan</h3>
                                <div className="flex justify-between mb-4">
                                    <span>Subtotal</span>
                                    <span className="font-semibold">{formatCurrency(subtotal)}</span>
                                </div>
                                <Button className="w-full" onClick={() => setView('checkout')}>Lanjut ke Checkout</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 text-slate-500">
                            <ShoppingCart size={48} className="mx-auto mb-2"/>
                            <p>Keranjang Anda kosong.</p>
                        </div>
                    )}
                </div>
            </main>
        );
    };
    
    const renderCheckout = () => {
        const [courierCode, service] = checkoutForm.shippingMethodId.split('-');
        const selectedShipping = shippingOptions.find(s => s.code === courierCode && s.service === service);
        const shippingCost = selectedShipping?.cost || 0;
        
        let promoDiscountAmount = 0;
        if (appliedPromo && subtotal >= (appliedPromo.minPurchase || 0)) {
             promoDiscountAmount = appliedPromo.type === 'fixed'
                ? Math.min(appliedPromo.value, subtotal)
                : subtotal * (appliedPromo.value / 100);
        }

        const grandTotal = subtotal - promoDiscountAmount + shippingCost;
        const selectedBankAccount = bankAccounts.find(acc => acc.id === checkoutForm.paymentMethodId);
        
        const handleAddressChange = (field: keyof Address, value: string) => {
            setCheckoutForm(prev => ({
                ...prev,
                address: { ...prev.address, [field]: value }
            }));
        };
        
        const applicablePromos = activePromos.filter(p => subtotal >= (p.minPurchase || 0));

        return (
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                 <Button variant="ghost" onClick={() => setView('cart')} className="mb-4"><ChevronLeft size={16}/> Kembali ke Keranjang</Button>
                <form onSubmit={handleConfirmOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg space-y-4">
                         <h2 className="text-2xl font-bold mb-4">Checkout</h2>
                         <CustomInput label="Nama Lengkap Penerima" value={checkoutForm.customerName} onChange={e => setCheckoutForm({...checkoutForm, customerName: e.target.value})} required/>
                         
                         <div className="pt-2">
                             <h3 className="text-lg font-semibold text-slate-700 mb-2">Alamat Pengiriman</h3>
                            <CustomInput label="Jalan / Nama Gedung" value={checkoutForm.address.streetAndBuilding} onChange={e => handleAddressChange('streetAndBuilding', e.target.value)} required/>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                                <CustomInput label="Nomor Rumah" value={checkoutForm.address.houseNumber} onChange={e => handleAddressChange('houseNumber', e.target.value)} />
                                <CustomInput label="RT" value={checkoutForm.address.rt} onChange={e => handleAddressChange('rt', e.target.value)} />
                                <CustomInput label="RW" value={checkoutForm.address.rw} onChange={e => handleAddressChange('rw', e.target.value)} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <CustomInput label="Kelurahan" value={checkoutForm.address.subdistrict} onChange={e => handleAddressChange('subdistrict', e.target.value)} required/>
                                <CustomInput label="Kecamatan" value={checkoutForm.address.district} onChange={e => handleAddressChange('district', e.target.value)} required/>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <CustomInput label="Kota / Kabupaten" value={checkoutForm.address.city} onChange={e => handleAddressChange('city', e.target.value)} required/>
                                <CustomInput label="Provinsi" value={checkoutForm.address.province} onChange={e => handleAddressChange('province', e.target.value)} required/>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <CustomInput label="Kode Pos" value={checkoutForm.address.postalCode} onChange={e => handleAddressChange('postalCode', e.target.value)} required/>
                                <CustomInput label="Negara" value={checkoutForm.address.country} onChange={e => handleAddressChange('country', e.target.value)} required/>
                            </div>
                         </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Pilih Ekspedisi</label>
                            {isFetchingShipping ? (
                                <div className="w-full h-10 flex items-center justify-center bg-slate-100 rounded-lg"><Loader2 className="animate-spin text-slate-500"/></div>
                            ) : (
                                <CustomSelect value={checkoutForm.shippingMethodId} onChange={e => setCheckoutForm({...checkoutForm, shippingMethodId: e.target.value})} disabled={shippingOptions.length === 0}>
                                    {shippingOptions.length === 0 && <option>Lengkapi alamat untuk melihat ongkir</option>}
                                    {shippingOptions.map(opt => <option key={`${opt.code}-${opt.service}`} value={`${opt.code}-${opt.service}`}>{opt.code.toUpperCase()} {opt.service} - {formatCurrency(opt.cost)} ({opt.etd})</option>)}
                                </CustomSelect>
                            )}
                        </div>
                        <CustomSelect label="Metode Pembayaran" value={checkoutForm.paymentMethodId} onChange={e => setCheckoutForm({...checkoutForm, paymentMethodId: e.target.value})}>
                             {bankAccounts.map(acc => <option key={acc.id} value={acc.id}>Transfer Bank {acc.bankName}</option>)}
                        </CustomSelect>
                        
                        {selectedBankAccount && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 space-y-1">
                                <p className="font-semibold">Silakan transfer ke rekening berikut:</p>
                                <p><strong>Bank:</strong> {selectedBankAccount.bankName}</p>
                                <p><strong>No. Rekening:</strong> {selectedBankAccount.accountNumber}</p>
                                <p><strong>Atas Nama:</strong> {selectedBankAccount.accountHolderName}</p>
                            </div>
                        )}
                        
                        {selectedBankAccount && (
                            <div className="pt-2">
                                <label className="block text-sm font-medium text-slate-600 mb-2">Unggah Bukti Transfer</label>
                                <div className="flex items-center gap-4">
                                    <div className="flex-grow">
                                        <label htmlFor="payment-proof-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 border border-slate-300 p-2 text-center flex items-center justify-center">
                                            <UploadCloud size={18} className="mr-2"/>
                                            <span>{paymentProof ? 'Ganti File' : 'Pilih File'}</span>
                                            <input id="payment-proof-upload" name="payment-proof-upload" type="file" className="sr-only" accept="image/png, image/jpeg, image/webp" onChange={handleProofUpload} />
                                        </label>
                                        <p className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP. Maks 2MB.</p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        {paymentProof ? (
                                            <img src={paymentProof} alt="Preview Bukti Transfer" className="h-16 w-16 rounded-md object-cover bg-slate-100" />
                                        ) : (
                                            <div className="h-16 w-16 rounded-md bg-slate-100 flex items-center justify-center">
                                                <ImageIcon size={24} className="text-slate-400"/>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                         <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Catatan (Opsional)</label>
                            <textarea value={checkoutForm.notes} onChange={e => setCheckoutForm({...checkoutForm, notes: e.target.value})} rows={2} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                    </div>
                     <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg self-start space-y-3">
                        <h3 className="font-bold text-lg mb-2">Ringkasan Pesanan</h3>
                        <div className="flex justify-between text-sm"><span>Subtotal</span> <span className="font-medium">{formatCurrency(subtotal)}</span></div>
                        <div className="flex justify-between text-sm"><span>Ongkos Kirim</span> <span className="font-medium">{formatCurrency(shippingCost)}</span></div>
                        
                        <div className="pt-2">
                            <label className="block text-sm font-medium text-slate-600 mb-1">Kode Promo</label>
                            <div className="flex gap-2">
                                <CustomInput value={promoCodeInput} onChange={e => setPromoCodeInput(e.target.value)} placeholder="Masukkan kode"/>
                                <Button type="button" variant="outline" onClick={() => handleApplyPromo()}>Pakai</Button>
                            </div>
                            {applicablePromos.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    <p className="text-xs font-semibold text-slate-600">Promo yang bisa dipakai:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {applicablePromos.map(promo => (
                                            <button
                                                key={promo.id}
                                                type="button"
                                                onClick={() => handleApplyPromo(promo.code)}
                                                className="flex items-center gap-2 text-xs bg-green-100 text-green-800 font-semibold px-3 py-1 rounded-full hover:bg-green-200 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
                                            >
                                                <Tag size={12} />
                                                {promo.code}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {appliedPromo && (
                             <div className="flex justify-between text-sm text-green-600">
                                <span>Diskon ({appliedPromo.code})</span> 
                                <span className="font-medium">-{formatCurrency(promoDiscountAmount)}</span>
                            </div>
                        )}

                        <div className="border-t pt-3 mt-2 flex justify-between font-bold text-lg"><span>Total</span> <span>{formatCurrency(grandTotal)}</span></div>
                        <Button type="submit" className="w-full !mt-6"><Send size={16}/> Buat Pesanan</Button>
                    </div>
                </form>
            </main>
        );
    };

    const renderMyOrders = () => {
        const myOrders = onlineOrders.filter(o => o.customerName === currentUser.fullName).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return (
             <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                 <Button variant="ghost" onClick={() => setView('catalog')} className="mb-4"><ChevronLeft size={16}/> Kembali ke Katalog</Button>
                 <div className="space-y-4">
                     {myOrders.length > 0 ? myOrders.map(order => (
                         <OrderHistoryCard key={order.id} order={order} onTrackClick={() => setSelectedOrderForTracking(order)} />
                     )) : (
                        <div className="text-center py-20 text-slate-500 bg-white rounded-xl shadow-md">
                            <History size={48} className="mx-auto text-slate-400 mb-4" />
                            <p className="font-semibold">Anda belum memiliki riwayat pesanan.</p>
                        </div>
                     )}
                 </div>
            </main>
        );
    }
    
    const renderCurrentView = () => {
        switch (view) {
            case 'catalog': return renderCatalog();
            case 'cart': return renderCart();
            case 'checkout': return renderCheckout();
            case 'profile': return <ProfileView currentUser={currentUser} onUpdateProfile={onUpdateProfile} onBack={() => setView('catalog')} />;
            case 'orders': return renderMyOrders();
            case 'detail': 
                if (!selectedProduct) return renderCatalog(); // Fallback
                return <ProductDetailModal 
                            product={selectedProduct} 
                            onClose={() => setView('catalog')} 
                            onAddToCart={(product, quantity) => { 
                                handleAddToCart(product, quantity); 
                                setView('catalog'); 
                            }} 
                        />;
            default: return renderCatalog();
        }
    }

    return (
        <div className="bg-slate-100 min-h-screen">
            {renderHeader()}
            <AnimatePresence mode="wait">
                <motion.div
                    key={view === 'detail' ? 'background_view' : view}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {view !== 'detail' && renderCurrentView()}
                </motion.div>
            </AnimatePresence>
            
            <AnimatePresence>
                {view === 'detail' && renderCurrentView()}
            </AnimatePresence>
            <AnimatePresence>
                {selectedOrderForTracking && <TrackingModal order={selectedOrderForTracking} onClose={() => setSelectedOrderForTracking(null)} />}
            </AnimatePresence>
        </div>
    );
};

// Sub-component: Order History Card
const getStatusInfo = (status: OnlineOrderStatus) => {
    const info: {[key in OnlineOrderStatus]: {text: string, color: string, icon: React.ReactNode}} = {
        'pending_payment': { text: 'Menunggu Pembayaran', color: 'bg-orange-100 text-orange-800', icon: <History size={14}/> },
        'pending_gudang': { text: 'Diproses', color: 'bg-yellow-100 text-yellow-800', icon: <Package size={14}/> },
        'approved_gudang': { text: 'Sedang Disiapkan', color: 'bg-blue-100 text-blue-800', icon: <Package size={14}/> },
        'siap_kirim': { text: 'Dikirim', color: 'bg-indigo-100 text-indigo-800', icon: <TruckIcon size={14}/> },
        'diterima_kurir': { text: 'Diserahkan ke Kurir', color: 'bg-purple-100 text-purple-800', icon: <TruckIcon size={14}/> },
        'selesai': { text: 'Selesai', color: 'bg-green-100 text-green-800', icon: <CheckCircle size={14}/> },
        'dibatalkan': { text: 'Dibatalkan', color: 'bg-red-100 text-red-800', icon: <X size={14}/> },
    };
    return info[status] || info['pending_gudang'];
};

// FIX: Defined a named type for props to improve type safety and avoid potential linter errors.
type OrderHistoryCardProps = {
    order: OnlineOrder;
    onTrackClick: () => void;
};

// FIX: Changed component to use React.FC<OrderHistoryCardProps> to correctly type it as a React component,
// resolving errors where the 'key' prop was not recognized when mapping over orders.
const OrderHistoryCard: React.FC<OrderHistoryCardProps> = ({ order, onTrackClick }) => {
    const total = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0) + order.shippingCost;
    const statusInfo = getStatusInfo(order.status);
    
    return (
        <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="bg-white p-4 rounded-xl shadow-lg border">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b pb-2 mb-2">
                <div>
                    <p className="font-bold text-slate-800">Order #{order.id}</p>
                    <p className="text-xs text-slate-500">{formatDate(order.timestamp)}</p>
                </div>
                <div className={`flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-full ${statusInfo.color}`}>
                    {statusInfo.icon}
                    <span>{statusInfo.text}</span>
                </div>
            </div>
            <div className="flex gap-4">
                <div className="flex-grow space-y-1 text-sm">
                    {order.items.map(item => <p key={item.id} className="text-slate-600">{item.quantity}x {item.name}</p>)}
                </div>
                <div className="text-right">
                    <p className="text-sm text-slate-500">Total Belanja</p>
                    <p className="font-bold text-lg text-indigo-600">{formatCurrency(total)}</p>
                </div>
            </div>
            {order.trackingNumber && (
                <div className="border-t pt-2 mt-2 flex justify-end">
                    <Button size="sm" onClick={onTrackClick}><TruckIcon size={16}/> Lacak Paket</Button>
                </div>
            )}
        </motion.div>
    );
};

// Sub-component: Tracking Modal
const TrackingModal = ({ order, onClose }: { order: OnlineOrder, onClose: () => void }) => {
    const [history, setHistory] = useState<TrackingHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTracking = async () => {
            if (order.trackingNumber) {
                setIsLoading(true);
                const courierCode = order.shippingMethod.split(' ')[0].toLowerCase();
                const data = await trackPackage(order.trackingNumber, courierCode);
                setHistory(data);
                setIsLoading(false);
            }
        };
        fetchTracking();
    }, [order]);

    return (
        <Modal isOpen={true} onClose={onClose} title="Lacak Pengiriman">
             <div className="bg-slate-50 p-3 rounded-lg text-sm mb-4">
                <p><strong>Kurir:</strong> {order.shippingMethod}</p>
                <p><strong>No. Resi:</strong> {order.trackingNumber}</p>
            </div>
            {isLoading ? (
                <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>
            ) : (
                <ul className="space-y-4">
                    {history.map((item, index) => (
                        <li key={index} className="flex gap-3">
                            <div className="flex flex-col items-center">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${index === 0 ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                    {index === 0 && <Check size={12} className="text-white"/>}
                                </div>
                                {index < history.length - 1 && <div className="w-0.5 flex-grow bg-slate-300"></div>}
                            </div>
                            <div>
                                <p className={`font-semibold ${index === 0 ? 'text-indigo-700' : 'text-slate-800'}`}>{item.status}</p>
                                <p className="text-xs text-slate-500">{formatDate(item.timestamp)} - {item.location}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Modal>
    );
};