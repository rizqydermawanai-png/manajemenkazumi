// pages/CatalogPage.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Minus, Trash2, X, LogOut, Send, User, ChevronLeft, Shirt, Wind, HandPlatter, Package, UploadCloud, Image as ImageIcon, Loader2, History, MapPin, Truck as TruckIcon, CheckCircle, Check, Tag, Search, Ruler, ShieldAlert, Building2, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CustomInput } from '../components/ui/CustomInput';
import { CustomSelect } from '../components/ui/CustomSelect';
import { useToast } from '../hooks/useToast';
import { formatCurrency, formatDate } from '../lib/utils';
import type { FinishedGood, SaleItem, UserData, Address, OnlineOrder, OnlineOrderStatus, BankAccount, PromoCode, GarmentPattern, AllSizingStandards, WarrantyClaim, WarrantyClaimReason } from '../types';
import { getShippingCosts, trackPackage, ShippingOption, TrackingHistory } from '../lib/expeditionApi';
import { Modal } from '../components/ui/Modal';
import { useAppContext } from '../context/AppContext';
import { ChatPopup } from '../components/ChatPopup';
import { CompanyInfoModal } from '../components/CompanyInfoModal';


type CustomerView = 'catalog' | 'cart' | 'checkout' | 'profile' | 'detail' | 'orders' | 'po_checkout';

interface CatalogPageProps {
    products: FinishedGood[];
    onPlaceOrder: (orderInfo: { customerName: string; shippingAddress: Address; notes: string; paymentMethod: string; shippingMethod: string; shippingCost: number; paymentProofUrl: string; }, cart: SaleItem[]) => void;
    onLogout: () => void;
    currentUser: UserData;
    onUpdateProfile: (updates: Partial<UserData>) => void;
    cart: SaleItem[];
    setCart: React.Dispatch<React.SetStateAction<SaleItem[]>>;
    poCart: SaleItem[];
    setPoCart: React.Dispatch<React.SetStateAction<SaleItem[]>>;
    onlineOrders: OnlineOrder[];
    bankAccounts: BankAccount[];
    promoCodes: PromoCode[];
    sizingStandards: AllSizingStandards;
    warrantyClaims: WarrantyClaim[];
    garmentPatterns: { [key: string]: GarmentPattern };
}

interface ProductGroup {
    name: string;
    colorName: string;
    imageUrls: string[];
    variants: FinishedGood[];
    basePrice: number;
}


// Sub-component: Product Card
const ProductCard: React.FC<{ group: ProductGroup, onCardClick: (group: ProductGroup) => void }> = ({ group, onCardClick }) => {
    const hasSale = group.variants.some(v => v.salePrice && v.salePrice < v.sellingPrice);

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => onCardClick(group)}
            className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200/50 flex flex-col group cursor-pointer"
        >
            <div className="relative">
                <img 
                    src={group.imageUrls?.[0] || `https://placehold.co/400x400/e2e8f0/64748b?text=KZM`} 
                    alt={group.name} 
                    className="w-full h-56 object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {hasSale && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        SALE
                    </div>
                )}
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <h3 className="font-bold text-slate-800">{group.name}</h3>
                <p className="text-sm text-slate-500">{group.colorName}</p>
                <div className="mt-auto pt-2">
                     <p className="text-sm text-slate-500">Mulai dari</p>
                    <p className="text-lg font-bold text-indigo-600">{formatCurrency(group.basePrice)}</p>
                </div>
            </div>
        </motion.div>
    );
};


// Sub-component: Product Detail Modal
const ProductDetailModal = ({ group, onClose, onAddToCart, onAddToPoCart, sizingStandards, garmentPatterns }: { group: ProductGroup, onClose: () => void, onAddToCart: (product: FinishedGood, quantity: number) => void, onAddToPoCart: (product: FinishedGood, quantity: number) => void, sizingStandards: AllSizingStandards, garmentPatterns: { [key: string]: GarmentPattern } }) => {
    const [quantity, setQuantity] = useState(1);
    const [selectedSize, setSelectedSize] = useState<string | null>(group.variants.length === 1 ? group.variants[0].size : null);
    const [showSizeChart, setShowSizeChart] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isZoomed, setIsZoomed] = useState(false);

    const selectedVariant = useMemo(() => {
        if (!selectedSize) return null;
        return group.variants.find(v => v.size === selectedSize);
    }, [selectedSize, group.variants]);

    const isPreOrderMode = useMemo(() => {
        if (!selectedVariant) return false;
        // PO if stock is 0 OR requested quantity > available stock.
        return quantity > selectedVariant.stock;
    }, [selectedVariant, quantity]);

    const handleActionClick = () => {
        if (isPreOrderMode && selectedVariant) {
            onAddToPoCart(selectedVariant, quantity);
        } else if (selectedVariant) {
            onAddToCart(selectedVariant, quantity);
        }
    };
    
    const displayPrice = selectedVariant ? (selectedVariant.salePrice ?? selectedVariant.sellingPrice) : group.basePrice;
    const originalDisplayPrice = selectedVariant?.sellingPrice;
    const isSale = selectedVariant && selectedVariant.salePrice && selectedVariant.salePrice < selectedVariant.sellingPrice;
    
    const sizeChartData = useMemo(() => {
        if (!group || !sizingStandards || !group.variants[0]?.model) return null;

        const garmentTypeEntry = Object.entries(garmentPatterns).find(([_, value]) => value.title === group.name);
        if (!garmentTypeEntry) return null;
        const garmentTypeKey = garmentTypeEntry[0];

        const model = group.variants[0].model;
        const compositeKey = `${garmentTypeKey}-${model.replace(/\s+/g, '-')}`;
        const standard = sizingStandards[compositeKey];

        if (!standard || Object.keys(standard).length === 0) return null;

        const sizes = Object.keys(standard).sort((a, b) => {
            const order = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
            return order.indexOf(a) - order.indexOf(b);
        });
        const parameters = Object.keys(standard[sizes[0]] || {});
        
        return { standard, sizes, parameters };
    }, [group, sizingStandards, garmentPatterns]);

    const mainImage = group.imageUrls?.[activeImageIndex] || `https://placehold.co/600x600/e2e8f0/64748b?text=KZM`;


    return (
        <>
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
                <div className="w-full md:w-1/2 p-4 flex flex-col items-center">
                    <img src={mainImage} alt={group.name} className="w-full h-64 md:h-80 object-cover rounded-lg cursor-pointer" onClick={() => setIsZoomed(true)} />
                    <div className="flex gap-2 mt-2">
                        {group.imageUrls?.map((url, index) => (
                            <img 
                                key={index} 
                                src={url}
                                alt={`Thumbnail ${index + 1}`}
                                onClick={() => setActiveImageIndex(index)}
                                className={`w-16 h-16 object-cover rounded-md cursor-pointer border-2 transition-all ${activeImageIndex === index ? 'border-indigo-500' : 'border-transparent hover:border-slate-300'}`}
                            />
                        ))}
                    </div>
                </div>
                <div className="p-6 flex flex-col flex-grow">
                    <h2 className="text-2xl font-bold">{group.name}</h2>
                    <p className="text-md text-slate-500">{group.colorName}</p>
                    <div className="my-4">
                        {isSale ? (
                            <div>
                                <p className="text-xl text-slate-400 line-through">{formatCurrency(originalDisplayPrice)}</p>
                                <p className="text-4xl font-bold text-red-600">{formatCurrency(displayPrice)}</p>
                            </div>
                        ) : (
                            <p className="text-4xl font-bold text-indigo-600">{formatCurrency(displayPrice)}</p>
                        )}
                    </div>
                    
                    <div className="mt-4">
                        <p className="text-sm font-semibold text-slate-600 mb-2">Pilih Ukuran:</p>
                        <div className="flex flex-wrap gap-2">
                            {group.variants.map(variant => (
                                <button
                                    key={variant.id}
                                    onClick={() => setSelectedSize(variant.size)}
                                    className={`px-4 py-2 border rounded-lg font-semibold transition-colors relative ${
                                        selectedSize === variant.size
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                    }`}
                                >
                                    {variant.size}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {sizeChartData && (
                        <div className="mt-4">
                            <button onClick={() => setShowSizeChart(!showSizeChart)} className="text-sm font-semibold text-indigo-600 hover:underline flex items-center gap-2">
                                <Ruler size={16} /> Panduan Ukuran {showSizeChart ? '▲' : '▼'}
                            </button>
                            <AnimatePresence>
                                {showSizeChart && (
                                    <motion.div initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: '1rem' }} exit={{ height: 0, opacity: 0, marginTop: 0 }} className="overflow-hidden">
                                        <div className="overflow-x-auto border rounded-lg">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-slate-50">
                                                    <tr className="text-slate-600">
                                                        <th className="p-2 font-semibold">Ukuran</th>
                                                        {sizeChartData.parameters.map(param => <th key={param} className="p-2 font-semibold text-center">{param} (cm)</th>)}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sizeChartData.sizes.map(size => (
                                                        <tr key={size} className="border-t">
                                                            <td className="p-2 font-semibold">{size}</td>
                                                            {sizeChartData.parameters.map(param => <td key={param} className="p-2 text-center">{sizeChartData.standard[size]?.[param] || '-'}</td>)}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}


                    <div className="mt-auto pt-4">
                        {selectedVariant ? (
                            <p className="text-sm text-slate-600 flex-grow mb-2">
                                Stok tersedia: {selectedVariant.stock}
                                {isPreOrderMode && (
                                    <span className="text-blue-600 font-semibold ml-2">(Akan diproses sebagai Pre-Order)</span>
                                )}
                            </p>
                        ) : (
                            <p className="text-sm text-slate-600 flex-grow mb-2">Pilih ukuran untuk melihat stok</p>
                        )}

                        <div className="flex items-center gap-3">
                            <CustomInput type="number" value={quantity} onChange={e => setQuantity(Math.max(1, Number(e.target.value)))} min="1" className="w-20 text-center"/>
                             <Button 
                                className="flex-grow" 
                                onClick={handleActionClick}
                                disabled={!selectedVariant}
                            >
                                {isPreOrderMode ? <Clock size={16} /> : <ShoppingCart size={16} />}
                                {isPreOrderMode ? `Pre-Order (${quantity} pcs)` : 'Tambah ke Keranjang'}
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
        <AnimatePresence>
            {isZoomed && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
                onClick={() => setIsZoomed(false)}
            >
                <motion.img
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                src={mainImage}
                alt={`Zoomed ${group.name}`}
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
                />
                <button
                    onClick={() => setIsZoomed(false)}
                    className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full"
                    >
                    <X size={24} />
                </button>
            </motion.div>
            )}
        </AnimatePresence>
      </>
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
        const { address } = form;
        const requiredFields: (keyof Address)[] = ['streetAndBuilding', 'subdistrict', 'district', 'city', 'province', 'postalCode', 'country'];
        const missingField = requiredFields.find(field => !address[field]?.trim());
        
        if(missingField) {
            addToast({
                title: "Data Tidak Lengkap",
                message: "Harap isi semua kolom alamat yang wajib diisi (ditandai dengan *).",
                type: "error"
            });
            return;
        }

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

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 1024 * 1024) { addToast({ title: 'File Terlalu Besar', message: 'Ukuran file tidak boleh melebihi 1MB.', type: 'error' }); return; }
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                setForm(prevForm => ({ ...prevForm, profilePictureUrl: reader.result as string }));
                addToast({ title: 'Gambar Siap', message: 'Klik "Simpan Perubahan" untuk menerapkan foto profil baru.', type: 'info' });
            }
        };
        reader.readAsDataURL(file);
    };
    
    return (
         <main className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-3xl">
            <Button variant="ghost" onClick={onBack} className="mb-4"><ChevronLeft size={16}/> Kembali ke Katalog</Button>
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-slate-700 mb-6">Edit Profil</h2>
                <form onSubmit={(e) => { e.preventDefault(); handleProfileUpdate(); }} className="space-y-4">
                    <div className="flex items-center gap-4">
                        <img src={form.profilePictureUrl} alt="Preview" className="w-20 h-20 rounded-full bg-slate-200 object-cover" />
                        <div>
                            <input type="file" id="profilePic" className="hidden" accept="image/*" onChange={handleImageUpload}/>
                            <Button type="button" variant="outline" onClick={() => document.getElementById('profilePic')?.click()}>Ubah Foto</Button>
                        </div>
                    </div>
                    <CustomInput label="Nama Lengkap" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} required />
                    <CustomInput label="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
                    <CustomInput label="WhatsApp" value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} required />
                    
                    <div className="pt-4 border-t">
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">Alamat Pengiriman Utama</h3>
                        <p className="text-sm text-slate-500 mb-4">Alamat ini akan digunakan untuk pengiriman pesanan Anda. Pastikan semua kolom yang ditandai (*) terisi.</p>
                        <CustomInput label="Jalan / Nama Gedung *" value={form.address.streetAndBuilding} onChange={e => handleAddressChange('streetAndBuilding', e.target.value)} required />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                             <CustomInput label="Nomor Rumah" value={form.address.houseNumber || ''} onChange={e => handleAddressChange('houseNumber', e.target.value)} />
                             <CustomInput label="RT" value={form.address.rt || ''} onChange={e => handleAddressChange('rt', e.target.value)} />
                             <CustomInput label="RW" value={form.address.rw || ''} onChange={e => handleAddressChange('rw', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <CustomInput label="Kelurahan *" value={form.address.subdistrict} onChange={e => handleAddressChange('subdistrict', e.target.value)} required />
                            <CustomInput label="Kecamatan *" value={form.address.district} onChange={e => handleAddressChange('district', e.target.value)} required />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <CustomInput label="Kota / Kabupaten *" value={form.address.city} onChange={e => handleAddressChange('city', e.target.value)} required />
                            <CustomInput label="Provinsi *" value={form.address.province} onChange={e => handleAddressChange('province', e.target.value)} required />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <CustomInput label="Kode Pos *" value={form.address.postalCode} onChange={e => handleAddressChange('postalCode', e.target.value)} required />
                             <CustomInput label="Negara *" value={form.address.country} onChange={e => handleAddressChange('country', e.target.value)} required />
                        </div>
                    </div>

                    <Button type="submit" className="w-full !mt-6">Simpan Perubahan</Button>
                </form>
            </div>
        </main>
    );
};


// Main Component
export const CatalogPage = ({ products, onPlaceOrder, onLogout, currentUser, onUpdateProfile, cart, setCart, poCart, setPoCart, onlineOrders, bankAccounts, promoCodes, sizingStandards, warrantyClaims, garmentPatterns }: CatalogPageProps) => {
    const { state, dispatch } = useAppContext();
    const [view, setView] = useState<CustomerView>('catalog');
    const [selectedProductGroup, setSelectedProductGroup] = useState<ProductGroup | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentProof, setPaymentProof] = useState<string | null>(null);
    const [checkoutForm, setCheckoutForm] = useState({ 
        customerName: currentUser.fullName, 
        address: currentUser.address || { streetAndBuilding: '', houseNumber: '', rt: '', rw: '', subdistrict: '', district: '', city: '', province: '', postalCode: '', country: 'Indonesia' },
        notes: '',
        shippingMethodId: '',
        paymentMethodId: bankAccounts.length > 0 ? bankAccounts[0].id : '',
    });
    
    const [poCheckoutForm, setPoCheckoutForm] = useState({
        deliveryType: 'delivery' as 'delivery' | 'pickup',
    });
    
    const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
    const [isFetchingShipping, setIsFetchingShipping] = useState(false);
    const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<OnlineOrder | null>(null);
    const [promoCodeInput, setPromoCodeInput] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);

    const [isWarrantyModalOpen, setIsWarrantyModalOpen] = useState(false);
    const [selectedOrderForClaim, setSelectedOrderForClaim] = useState<OnlineOrder | null>(null);
    const [isCompanyInfoModalOpen, setIsCompanyInfoModalOpen] = useState(false);


    const { addToast } = useToast();
    
    // Automatically update checkout form with latest profile data when entering checkout view
    useEffect(() => {
        if (view === 'checkout' || view === 'po_checkout') {
            const commonFields = {
                customerName: currentUser.fullName,
                address: currentUser.address || { streetAndBuilding: '', houseNumber: '', rt: '', rw: '', subdistrict: '', district: '', city: '', province: '', postalCode: '', country: 'Indonesia' }
            };
            setCheckoutForm(prev => ({ ...prev, ...commonFields }));
        }
    }, [view, currentUser]);


    const activePromos = useMemo(() => {
        const now = new Date();
        return promoCodes.filter(p => p.status === 'active' && new Date(p.startDate) <= now && new Date(p.endDate) >= now);
    }, [promoCodes]);

    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
    const poSubtotal = useMemo(() => poCart.reduce((sum, item) => sum + item.price * item.quantity, 0), [poCart]);


    // Effect to fetch shipping costs when checkout view is active and address is complete
    useEffect(() => {
        const fetchCosts = async () => {
            const isDeliveryCheckout = (view === 'checkout' || (view === 'po_checkout' && poCheckoutForm.deliveryType === 'delivery'));
            if (isDeliveryCheckout && checkoutForm.address.district && checkoutForm.address.city) {
                setIsFetchingShipping(true);
                setShippingOptions([]);
                setCheckoutForm(prev => ({ ...prev, shippingMethodId: '' }));

                const itemsForShipping = view === 'checkout' ? cart : poCart;
                const dummyWeight = itemsForShipping.reduce((sum, item) => sum + item.quantity, 0) * 250; // Assume 250g per item
                
                if(dummyWeight === 0) {
                    setIsFetchingShipping(false);
                    return;
                }

                try {
                    const options = await getShippingCosts(checkoutForm.address, dummyWeight);
                    setShippingOptions(options);
                } catch (error) {
                    addToast({ title: 'Gagal Ambil Ongkir', message: 'Tidak dapat mengambil data ongkos kirim.', type: 'error' });
                } finally {
                    setIsFetchingShipping(false);
                }
            }
        };
        fetchCosts();
    }, [view, checkoutForm.address.district, checkoutForm.address.city, cart, poCart, poCheckoutForm.deliveryType, addToast]);

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

    const productGroups = useMemo<ProductGroup[]>(() => {
        const groups: { [key: string]: { name: string; colorName: string; imageUrls: string[]; variants: FinishedGood[] } } = {};
    
        const findGarmentBaseName = (productName: string): string => {
            const sortedPatterns = Object.values(garmentPatterns).sort((a, b) => b.title.length - a.title.length);
            const pattern = sortedPatterns.find(p => productName.startsWith(p.title));
            return pattern ? pattern.title : productName;
        };
    
        products.forEach(product => {
            // PO logic: all products are available, not just those with stock > 0
            const baseName = findGarmentBaseName(product.name);
            const groupKey = `${baseName}-${product.colorName}`;
            if (!groups[groupKey]) {
                groups[groupKey] = {
                    name: baseName,
                    colorName: product.colorName,
                    imageUrls: product.imageUrls,
                    variants: [],
                };
            }
            groups[groupKey].variants.push(product);
        });
    
        return Object.values(groups).map(group => {
            const sizeOrder = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
            group.variants.sort((a, b) => sizeOrder.indexOf(a.size) - sizeOrder.indexOf(b.size));
            
            const basePrice = Math.min(...group.variants.map(v => v.salePrice ?? v.sellingPrice));
    
            return { ...group, basePrice };
        });
    }, [products, garmentPatterns]);

    const filteredGroups = useMemo(() => {
        let tempGroups = productGroups;

        if (selectedCategory) {
            const categoryTitle = garmentPatterns[selectedCategory]?.title;
            if (categoryTitle) {
                tempGroups = tempGroups.filter(g => g.name.toLowerCase().includes(categoryTitle.toLowerCase()));
            }
        }
        
        if (searchTerm) {
            tempGroups = tempGroups.filter(g =>
                g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                g.colorName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return tempGroups;
    }, [productGroups, selectedCategory, searchTerm, garmentPatterns]);


    const handleAddToCart = (product: FinishedGood, quantity: number) => {
        const existing = cart.find(item => item.id === product.id);
        const totalQuantity = (existing?.quantity || 0) + quantity;
        
        if (totalQuantity > product.stock) {
            addToast({ title: 'Stok Tidak Cukup', message: `Maksimal pembelian untuk ${product.name} adalah ${product.stock} buah.`, type: 'warning' });
            return;
        }

        addToast({ title: 'Berhasil', message: `${quantity}x ${product.name} ${product.size} ditambahkan ke keranjang.`, type: 'success' });
        
        let newCart;
        if (existing) {
            newCart = cart.map(item => item.id === product.id ? { ...item, quantity: totalQuantity } : item);
        } else {
            const newItem: SaleItem = { id: product.id, name: `${product.name} ${product.size} (${product.colorName})`, price: product.salePrice ?? product.sellingPrice, originalPrice: product.sellingPrice, quantity: quantity, imageUrl: product.imageUrls?.[0] };
            newCart = [...cart, newItem];
        }
        setCart(newCart);
    };

    const handleAddToPoCart = (product: FinishedGood, quantity: number) => {
        addToast({ title: 'Pre-Order Ditambahkan', message: `${quantity}x ${product.name} ${product.size} ditambahkan ke keranjang Pre-Order.`, type: 'success' });

        const existing = poCart.find(item => item.id === product.id);
        let newPoCart;

        if (existing) {
            newPoCart = poCart.map(item =>
                item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
            );
        } else {
            const newItem: SaleItem = {
                id: product.id,
                name: `${product.name} ${product.size} (${product.colorName})`,
                price: product.sellingPrice, // POs use standard selling price
                originalPrice: product.sellingPrice,
                quantity: quantity,
                imageUrl: product.imageUrls?.[0]
            };
            newPoCart = [...poCart, newItem];
        }
        setPoCart(newPoCart);
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

    const handleUpdatePoCart = (id: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            handleRemoveFromPoCart(id);
            return;
        }
        setPoCart(prev => prev.map(item => item.id === id ? { ...item, quantity: newQuantity } : item));
    };
    
    const handleRemoveFromPoCart = (id: string) => {
        setPoCart(prev => prev.filter(item => item.id !== id));
    };

    
    const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                setPaymentProof(reader.result as string);
                addToast({ title: 'Unggah Berhasil', message: 'Bukti transfer telah diunggah.', type: 'success' });
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
        const { customerName, address, paymentMethodId, shippingMethodId, notes } = checkoutForm;
        const isPickup = shippingMethodId === 'pickup';

        if (!customerName.trim()) {
            addToast({ title: 'Data Tidak Lengkap', message: 'Harap isi nama penerima.', type: 'error' });
            return;
        }

        if (!isPickup) {
            const requiredAddressFields: (keyof Address)[] = ['streetAndBuilding', 'city', 'province', 'postalCode', 'district', 'subdistrict'];
            const isAddressIncomplete = requiredAddressFields.some(field => !address[field]?.trim());
            if (isAddressIncomplete) {
                addToast({ title: 'Alamat Tidak Lengkap', message: 'Untuk pengiriman, harap isi semua field alamat.', type: 'error' });
                return;
            }
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

        let shippingMethodName = 'Ambil di Toko';
        let shippingCostValue = 0;

        if (!isPickup) {
            const [courierCode, service] = shippingMethodId.split('-');
            const shippingMethodApi = shippingOptions.find(s => s.code === courierCode && s.service === service);
            if (!shippingMethodApi) {
                addToast({ title: 'Error Pengiriman', message: 'Metode pengiriman yang dipilih tidak valid.', type: 'error' });
                return;
            }
            shippingMethodName = `${shippingMethodApi.code.toUpperCase()} - ${shippingMethodApi.service}`;
            shippingCostValue = shippingMethodApi.cost;
        }

        onPlaceOrder({
            customerName,
            shippingAddress: address,
            notes: notes,
            paymentMethod: `Transfer Bank ${selectedBankAccount?.bankName || 'N/A'}`,
            shippingMethod: shippingMethodName,
            shippingCost: shippingCostValue,
            paymentProofUrl: paymentProof || '',
        }, cart);
        
        setPaymentProof(null);
        setView('catalog');
    };

    const handleConfirmPoOrder = (e: React.FormEvent) => {
        e.preventDefault();
        const { customerName, address, notes, paymentMethodId, shippingMethodId } = checkoutForm;
        const { deliveryType } = poCheckoutForm;
        
        if (deliveryType === 'delivery') {
            const requiredAddressFields: (keyof Address)[] = ['streetAndBuilding', 'city', 'province', 'postalCode', 'district', 'subdistrict'];
            if (requiredAddressFields.some(field => !address[field]?.trim())) {
                addToast({ title: 'Alamat Tidak Lengkap', message: 'Harap lengkapi alamat pengiriman.', type: 'error' });
                return;
            }
            if (!shippingMethodId) {
                addToast({ title: 'Pilih Pengiriman', message: 'Harap pilih metode pengiriman.', type: 'error' });
                return;
            }
        }

        if (!paymentProof) {
            addToast({ title: 'Bukti DP', message: 'Harap unggah bukti pembayaran DP.', type: 'error' });
            return;
        }

        let shippingMethodName = 'Ambil di Toko';
        let shippingCostValue = 0;

        if (deliveryType === 'delivery') {
            const [courierCode, service] = shippingMethodId.split('-');
            const shippingMethodApi = shippingOptions.find(s => s.code === courierCode && s.service === service);
            if (!shippingMethodApi) {
                addToast({ title: 'Error Pengiriman', message: 'Metode pengiriman tidak valid.', type: 'error' });
                return;
            }
            shippingMethodName = `${shippingMethodApi.code.toUpperCase()} - ${shippingMethodApi.service}`;
            shippingCostValue = shippingMethodApi.cost;
        }
        
        const selectedBankAccount = bankAccounts.find(acc => acc.id === paymentMethodId);

        dispatch({
            type: 'PLACE_PO_ORDER',
            payload: {
                orderInfo: {
                    customerName,
                    shippingAddress: deliveryType === 'delivery' ? address : {},
                    notes,
                    paymentMethod: `Transfer Bank ${selectedBankAccount?.bankName || 'N/A'}`,
                    shippingMethod: shippingMethodName,
                    shippingCost: shippingCostValue,
                    paymentProofUrl: paymentProof,
                },
                poCart: poCart,
            }
        });
        
        addToast({ title: 'Pre-Order Dibuat', message: 'Pesanan Anda akan diproses setelah DP diverifikasi.', type: 'success' });
        setPaymentProof(null);
        setView('catalog');
    };

    const openDetail = (group: ProductGroup) => {
        setSelectedProductGroup(group);
        setView('detail');
    };
    
    const handleOpenWarrantyModal = (order: OnlineOrder) => {
        setSelectedOrderForClaim(order);
        setIsWarrantyModalOpen(true);
    };

    const handleWarrantySubmit = (claimData: Omit<WarrantyClaim, 'id' | 'submittedAt' | 'customerId' | 'customerName' | 'status'>) => {
        if (!currentUser) return;
        const newClaim: WarrantyClaim = {
            ...claimData,
            id: `WARR-${Date.now()}`,
            submittedAt: new Date().toISOString(),
            customerId: currentUser.uid,
            customerName: currentUser.fullName,
            status: 'pending',
        };
        dispatch({ type: 'SUBMIT_WARRANTY_CLAIM', payload: newClaim });
        addToast({ title: 'Klaim Terkirim', message: 'Klaim garansi Anda telah diajukan dan akan segera ditinjau.', type: 'success' });
        setIsWarrantyModalOpen(false);
    };
    
    const MarqueeBanner = ({ promoCodes }: { promoCodes: PromoCode[] }) => {
        const bannerText = useMemo(() => {
            const activePromos = promoCodes
                .filter(p => p.status === 'active')
                .map(p => `Gunakan kode: ${p.code}!`)
                .join(' • ');
            
            return `Selamat Datang di Kazumi Store! • ${activePromos} • Cek Produk Terbaru Kami! • `;
        }, [promoCodes]);
        
        return (
            <div className="bg-slate-800 text-white text-sm font-semibold overflow-hidden whitespace-nowrap w-full">
                <motion.div
                    className="flex"
                    animate={{ x: ['0%', '-50%'] }}
                    transition={{
                        ease: 'linear',
                        duration: 40,
                        repeat: Infinity,
                    }}
                >
                    <span className="py-2 px-4 shrink-0">{bannerText}</span>
                    <span className="py-2 px-4 shrink-0">{bannerText}</span>
                    <span className="py-2 px-4 shrink-0">{bannerText}</span>
                    <span className="py-2 px-4 shrink-0">{bannerText}</span>
                </motion.div>
            </div>
        );
    };

    // --- Render Functions (without hooks) ---
    const renderHeader = () => (
        <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-30 shadow-sm flex-shrink-0">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4">
                    <h1 className="text-2xl font-bold text-indigo-600 cursor-pointer" onClick={() => setView('catalog')}>KAZUMI</h1>
                    <div className="flex items-center gap-1 sm:gap-2">
                         <button onClick={() => setView('orders')} title="Riwayat Pesanan" className="p-2 rounded-full hover:bg-slate-100 text-slate-600">
                            <History size={22}/>
                        </button>
                        <button onClick={() => setIsCompanyInfoModalOpen(true)} title="Tentang Kami" className="p-2 rounded-full hover:bg-slate-100 text-slate-600">
                            <Building2 size={22}/>
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
                            {(cart.length > 0 || poCart.length > 0) && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">{cart.reduce((s,i)=>s+i.quantity,0) + poCart.reduce((s,i)=>s+i.quantity,0)}</span>}
                        </button>
                    </div>
                </div>
                {view === 'catalog' && (
                    <div className="pb-3">
                        <div className="flex items-center gap-2 sm:gap-4 pb-3 justify-center">
                           <Button size="sm" variant={!selectedCategory ? 'primary' : 'ghost'} onClick={() => setSelectedCategory(null)}>Semua</Button>
                            {Object.entries(garmentPatterns).map(([key, value]) => {
                                const { title, icon: Icon } = value as GarmentPattern;
                                return (
                                    <Button key={key} size="sm" variant={selectedCategory === key ? 'primary' : 'ghost'} onClick={() => setSelectedCategory(key)}>
                                        <Icon size={16}/> <span className="hidden sm:inline ml-2">{title}</span>
                                    </Button>
                                );
                            })}
                        </div>
                        <div className="relative max-w-md mx-auto">
                             <CustomInput 
                                placeholder="Cari nama produk..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
    
    const renderCatalog = () => (
        <main className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <AnimatePresence>
                    {filteredGroups.map(group => (
                        <ProductCard key={`${group.name}-${group.colorName}`} group={group} onCardClick={openDetail} />
                    ))}
                </AnimatePresence>
            </div>
            {filteredGroups.length === 0 && (
                <div className="text-center py-20 text-slate-500 bg-white rounded-xl shadow-md">
                    <Package size={48} className="mx-auto text-slate-400 mb-4" />
                    <p className="font-semibold">Tidak ada produk ditemukan</p>
                    <p className="text-sm">Coba ubah filter atau kata kunci pencarian Anda.</p>
                </div>
            )}
        </main>
    );

    const renderCart = () => {
        return (
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                 <Button variant="ghost" onClick={() => setView('catalog')} className="mb-4"><ChevronLeft size={16}/> Lanjut Belanja</Button>
                
                {cart.length === 0 && poCart.length === 0 && (
                     <div className="bg-white p-6 rounded-xl shadow-lg text-center py-20 text-slate-500">
                        <ShoppingCart size={48} className="mx-auto mb-2"/>
                        <p>Keranjang Anda kosong.</p>
                    </div>
                )}

                {cart.length > 0 && (
                    <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
                        <h2 className="text-2xl font-bold mb-4">Keranjang Belanja (Ready Stock)</h2>
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
                                <h3 className="font-bold text-lg mb-4">Ringkasan Belanja</h3>
                                <div className="flex justify-between mb-4">
                                    <span>Subtotal</span>
                                    <span className="font-semibold">{formatCurrency(subtotal)}</span>
                                </div>
                                <Button className="w-full" onClick={() => setView('checkout')}>Lanjut ke Checkout</Button>
                            </div>
                        </div>
                    </div>
                )}

                 {poCart.length > 0 && (
                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-bold mb-4 text-blue-600">Keranjang Pre-Order</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-4">
                                {poCart.map(item => (
                                    <div key={item.id} className="flex gap-4 border-b pb-4 last:border-0 last:pb-0">
                                        <img src={item.imageUrl || `https://placehold.co/80x80/e2e8f0/64748b?text=KZM`} alt={item.name} className="w-20 h-20 rounded-lg object-cover" />
                                        <div className="flex-grow">
                                            <p className="font-semibold">{item.name}</p>
                                            <p className="text-sm text-indigo-600">{formatCurrency(item.price)}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Button variant="outline" size="sm" className="!p-1 h-7 w-7" onClick={() => handleUpdatePoCart(item.id, item.quantity - 1)}><Minus size={14}/></Button>
                                                <span className="w-8 text-center">{item.quantity}</span>
                                                <Button variant="outline" size="sm" className="!p-1 h-7 w-7" onClick={() => handleUpdatePoCart(item.id, item.quantity + 1)}><Plus size={14}/></Button>
                                            </div>
                                        </div>
                                        <div className="flex flex-col justify-between items-end">
                                            <p className="font-bold text-slate-800">{formatCurrency(item.price * item.quantity)}</p>
                                            <Button variant="ghost" size="sm" className="!p-1 h-auto text-slate-400 hover:text-red-500" onClick={() => handleRemoveFromPoCart(item.id)}><Trash2 size={16}/></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="lg:col-span-1 bg-blue-50 p-4 rounded-lg self-start">
                                <h3 className="font-bold text-lg mb-4">Ringkasan Pre-Order</h3>
                                <div className="flex justify-between mb-2">
                                    <span>Subtotal</span>
                                    <span className="font-semibold">{formatCurrency(poSubtotal)}</span>
                                </div>
                                <div className="flex justify-between mb-4 text-blue-700">
                                    <span className="font-semibold">DP (50%)</span>
                                    <span className="font-bold text-xl">{formatCurrency(poSubtotal * 0.5)}</span>
                                </div>
                                <Button className="w-full" onClick={() => setView('po_checkout')}>Lanjut ke Checkout PO</Button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        );
    };
    
    const renderCheckout = () => {
        const isPickup = checkoutForm.shippingMethodId === 'pickup';
        let shippingCost = 0;
        if (!isPickup && checkoutForm.shippingMethodId) {
            const [courierCode, service] = checkoutForm.shippingMethodId.split('-');
            const selectedShippingApi = shippingOptions.find(s => s.code === courierCode && s.service === service);
            shippingCost = selectedShippingApi?.cost || 0;
        }
        
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
                            <CustomInput label="Jalan / Nama Gedung" value={checkoutForm.address.streetAndBuilding} onChange={e => handleAddressChange('streetAndBuilding', e.target.value)} required disabled={isPickup}/>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                                <CustomInput label="Nomor Rumah" value={checkoutForm.address.houseNumber} onChange={e => handleAddressChange('houseNumber', e.target.value)} disabled={isPickup}/>
                                <CustomInput label="RT" value={checkoutForm.address.rt} onChange={e => handleAddressChange('rt', e.target.value)} disabled={isPickup}/>
                                <CustomInput label="RW" value={checkoutForm.address.rw} onChange={e => handleAddressChange('rw', e.target.value)} disabled={isPickup}/>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <CustomInput label="Kelurahan" value={checkoutForm.address.subdistrict} onChange={e => handleAddressChange('subdistrict', e.target.value)} required disabled={isPickup}/>
                                <CustomInput label="Kecamatan" value={checkoutForm.address.district} onChange={e => handleAddressChange('district', e.target.value)} required disabled={isPickup}/>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <CustomInput label="Kota / Kabupaten" value={checkoutForm.address.city} onChange={e => handleAddressChange('city', e.target.value)} required disabled={isPickup}/>
                                <CustomInput label="Provinsi" value={checkoutForm.address.province} onChange={e => handleAddressChange('province', e.target.value)} required disabled={isPickup}/>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <CustomInput label="Kode Pos" value={checkoutForm.address.postalCode} onChange={e => handleAddressChange('postalCode', e.target.value)} required disabled={isPickup}/>
                                <CustomInput label="Negara" value={checkoutForm.address.country} onChange={e => handleAddressChange('country', e.target.value)} required disabled={isPickup}/>
                            </div>
                         </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Pilih Metode Pengiriman</label>
                            <CustomSelect value={checkoutForm.shippingMethodId} onChange={e => setCheckoutForm({...checkoutForm, shippingMethodId: e.target.value})} required>
                                <option value="">-- Pilih --</option>
                                <option value="pickup">Ambil di Toko - Rp 0</option>
                                {isFetchingShipping && <option disabled>Memuat opsi pengiriman...</option>}
                                {!isFetchingShipping && shippingOptions.map(opt => <option key={`${opt.code}-${opt.service}`} value={`${opt.code}-${opt.service}`}>{opt.code.toUpperCase()} {opt.service} - {formatCurrency(opt.cost)} ({opt.etd})</option>)}
                            </CustomSelect>
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
                         <OrderHistoryCard key={order.id} order={order} onTrackClick={() => setSelectedOrderForTracking(order)} onClaimClick={handleOpenWarrantyModal} warrantyClaims={warrantyClaims} />
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
            case 'po_checkout': return renderPoCheckout();
            case 'profile': return <ProfileView currentUser={currentUser} onUpdateProfile={onUpdateProfile} onBack={() => setView('catalog')} />;
            case 'orders': return renderMyOrders();
            case 'detail': 
                if (!selectedProductGroup) return renderCatalog(); // Fallback
                return <ProductDetailModal 
                            group={selectedProductGroup} 
                            onClose={() => setView('catalog')} 
                            onAddToCart={(product, quantity) => { 
                                handleAddToCart(product, quantity); 
                                setView('catalog'); 
                            }}
                            onAddToPoCart={(product, quantity) => {
                                handleAddToPoCart(product, quantity);
                                setView('catalog');
                            }}
                            sizingStandards={sizingStandards}
                            garmentPatterns={garmentPatterns}
                        />;
            default: return renderCatalog();
        }
    }
    
    const renderPoCheckout = () => {
        const { deliveryType } = poCheckoutForm;
        const isDelivery = deliveryType === 'delivery';

        let shippingCost = 0;
        if (isDelivery && checkoutForm.shippingMethodId) {
            const [courierCode, service] = checkoutForm.shippingMethodId.split('-');
            const selectedShippingApi = shippingOptions.find(s => s.code === courierCode && s.service === service);
            shippingCost = selectedShippingApi?.cost || 0;
        }

        const downPayment = poSubtotal * 0.5;
        const grandTotal = downPayment + (isDelivery ? shippingCost : 0);
        const selectedBankAccount = bankAccounts.find(acc => acc.id === checkoutForm.paymentMethodId);

        const handleAddressChange = (field: keyof Address, value: string) => {
            setCheckoutForm(prev => ({ ...prev, address: { ...prev.address, [field]: value } }));
        };
        
        return (
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <Button variant="ghost" onClick={() => setView('cart')} className="mb-4"><ChevronLeft size={16}/> Kembali ke Keranjang</Button>
                <form onSubmit={handleConfirmPoOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg space-y-4">
                        <h2 className="text-2xl font-bold mb-4 text-blue-600">Checkout Pre-Order</h2>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Opsi Pengambilan</label>
                            <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                                <Button type="button" className="flex-1" variant={deliveryType === 'delivery' ? 'primary' : 'ghost'} onClick={() => setPoCheckoutForm({deliveryType: 'delivery'})}>Kirim ke Alamat</Button>
                                <Button type="button" className="flex-1" variant={deliveryType === 'pickup' ? 'primary' : 'ghost'} onClick={() => setPoCheckoutForm({deliveryType: 'pickup'})}>Ambil di Toko</Button>
                            </div>
                        </div>

                        <AnimatePresence>
                        {isDelivery && (
                            <motion.div initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}} exit={{opacity: 0, height: 0}} className="overflow-hidden space-y-4">
                                <CustomInput label="Nama Lengkap Penerima" value={checkoutForm.customerName} onChange={e => setCheckoutForm({...checkoutForm, customerName: e.target.value})} required/>
                                <div className="pt-2">
                                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Alamat Pengiriman</h3>
                                    <CustomInput label="Jalan / Nama Gedung" value={checkoutForm.address.streetAndBuilding} onChange={e => handleAddressChange('streetAndBuilding', e.target.value)} required />
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                                        <CustomInput label="Nomor Rumah" value={checkoutForm.address.houseNumber} onChange={e => handleAddressChange('houseNumber', e.target.value)} />
                                        <CustomInput label="RT" value={checkoutForm.address.rt} onChange={e => handleAddressChange('rt', e.target.value)} />
                                        <CustomInput label="RW" value={checkoutForm.address.rw} onChange={e => handleAddressChange('rw', e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                        <CustomInput label="Kelurahan" value={checkoutForm.address.subdistrict} onChange={e => handleAddressChange('subdistrict', e.target.value)} required />
                                        <CustomInput label="Kecamatan" value={checkoutForm.address.district} onChange={e => handleAddressChange('district', e.target.value)} required />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                        <CustomInput label="Kota / Kabupaten" value={checkoutForm.address.city} onChange={e => handleAddressChange('city', e.target.value)} required />
                                        <CustomInput label="Provinsi" value={checkoutForm.address.province} onChange={e => handleAddressChange('province', e.target.value)} required />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                        <CustomInput label="Kode Pos" value={checkoutForm.address.postalCode} onChange={e => handleAddressChange('postalCode', e.target.value)} required />
                                        <CustomInput label="Negara" value={checkoutForm.address.country} onChange={e => handleAddressChange('country', e.target.value)} required />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Pilih Metode Pengiriman</label>
                                    <CustomSelect value={checkoutForm.shippingMethodId} onChange={e => setCheckoutForm({...checkoutForm, shippingMethodId: e.target.value})} required>
                                        <option value="">-- Pilih --</option>
                                        {isFetchingShipping && <option disabled>Memuat...</option>}
                                        {!isFetchingShipping && shippingOptions.map(opt => <option key={`${opt.code}-${opt.service}`} value={`${opt.code}-${opt.service}`}>{opt.code.toUpperCase()} {opt.service} - {formatCurrency(opt.cost)}</option>)}
                                    </CustomSelect>
                                </div>
                            </motion.div>
                        )}
                        </AnimatePresence>
                        
                        <CustomSelect label="Metode Pembayaran" value={checkoutForm.paymentMethodId} onChange={e => setCheckoutForm({...checkoutForm, paymentMethodId: e.target.value})}>
                            {bankAccounts.map(acc => <option key={acc.id} value={acc.id}>Transfer Bank {acc.bankName}</option>)}
                        </CustomSelect>
                        
                        {selectedBankAccount && (
                            <div className="pt-2">
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 space-y-1">
                                    <p className="font-semibold">Silakan transfer DP ke rekening:</p>
                                    <p><strong>Bank:</strong> {selectedBankAccount.bankName}</p>
                                    <p><strong>No. Rek:</strong> {selectedBankAccount.accountNumber}</p>
                                    <p><strong>A/N:</strong> {selectedBankAccount.accountHolderName}</p>
                                </div>

                                <label className="block text-sm font-medium text-slate-600 mt-4 mb-2">Unggah Bukti Transfer DP</label>
                                <div className="flex items-center gap-4">
                                    <input id="po-payment-proof" type="file" className="sr-only" accept="image/*" onChange={handleProofUpload} />
                                    <label htmlFor="po-payment-proof" className="w-full relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 border border-slate-300 p-2 flex items-center justify-center">
                                        <UploadCloud size={18} className="mr-2"/> <span>{paymentProof ? 'Ganti File' : 'Pilih File'}</span>
                                    </label>
                                    {paymentProof && <img src={paymentProof} className="h-12 w-12 rounded-md object-cover" />}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg self-start space-y-3">
                        <h3 className="font-bold text-lg mb-2">Ringkasan PO</h3>
                        <div className="flex justify-between text-sm"><span>Subtotal Barang</span> <span className="font-medium">{formatCurrency(poSubtotal)}</span></div>
                        <div className="flex justify-between text-sm"><span>Uang Muka (50%)</span> <span className="font-medium">{formatCurrency(downPayment)}</span></div>
                        {isDelivery && <div className="flex justify-between text-sm"><span>Ongkos Kirim</span> <span className="font-medium">{formatCurrency(shippingCost)}</span></div>}
                        <div className="border-t pt-3 mt-2 flex justify-between font-bold text-lg text-blue-700"><span>Total Bayar DP</span> <span>{formatCurrency(grandTotal)}</span></div>
                        <Button type="submit" className="w-full !mt-6"><Send size={16}/> Buat Pesanan PO</Button>
                    </div>
                </form>
            </main>
        );
    }

    return (
        <div className="bg-slate-100 h-screen flex flex-col">
            {renderHeader()}
            <MarqueeBanner promoCodes={activePromos} />
            
            <div className="flex-grow overflow-y-auto">
                {view !== 'detail' && renderCurrentView()}
            </div>
            
            <ChatPopup />

            <AnimatePresence>
                {view === 'detail' && renderCurrentView()}
            </AnimatePresence>
            <AnimatePresence>
                {selectedOrderForTracking && <TrackingModal order={selectedOrderForTracking} onClose={() => setSelectedOrderForTracking(null)} />}
            </AnimatePresence>
            <AnimatePresence>
                {isWarrantyModalOpen && selectedOrderForClaim && (
                    <WarrantyClaimModal
                        order={selectedOrderForClaim}
                        onClose={() => setIsWarrantyModalOpen(false)}
                        onSubmit={handleWarrantySubmit}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isCompanyInfoModalOpen && (
                    <CompanyInfoModal
                        onClose={() => setIsCompanyInfoModalOpen(false)}
                        companyInfo={state.companyInfo}
                    />
                )}
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
        'pending_dp': { text: 'Menunggu DP', color: 'bg-orange-100 text-orange-800', icon: <History size={14}/> },
        'in_production': { text: 'Dalam Produksi', color: 'bg-cyan-100 text-cyan-800', icon: <Shirt size={14}/> },
        'pending_payment_remaining': { text: 'Menunggu Pelunasan', color: 'bg-orange-100 text-orange-800', icon: <History size={14}/> },
        'ready_for_pickup': { text: 'Siap Diambil', color: 'bg-lime-100 text-lime-800', icon: <Package size={14}/> },
        'ready_to_ship': { text: 'Siap Kirim (PO)', color: 'bg-indigo-100 text-indigo-800', icon: <TruckIcon size={14}/> },
    };
    return info[status] || info['pending_gudang'];
};

type OrderHistoryCardProps = {
    order: OnlineOrder;
    onTrackClick: () => void;
    onClaimClick: (order: OnlineOrder) => void;
    warrantyClaims: WarrantyClaim[];
};

const OrderHistoryCard: React.FC<OrderHistoryCardProps> = ({ order, onTrackClick, onClaimClick, warrantyClaims }) => {
    const total = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0) + order.shippingCost;
    const statusInfo = getStatusInfo(order.status);
    const hasClaim = warrantyClaims.some(claim => claim.orderId === order.id);

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
                    {order.estimatedCompletionDate && (
                        <p className="text-xs text-blue-600 font-semibold pt-1">Estimasi Selesai: {new Date(order.estimatedCompletionDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    )}
                </div>
                <div className="text-right">
                    <p className="text-sm text-slate-500">Total Belanja</p>
                    <p className="font-bold text-lg text-indigo-600">{formatCurrency(total)}</p>
                </div>
            </div>
            <div className="border-t pt-2 mt-2 flex justify-end gap-2">
                {order.trackingNumber && (
                    <Button size="sm" variant="outline" onClick={onTrackClick}><TruckIcon size={16}/> Lacak Paket</Button>
                )}
                 {order.status === 'selesai' && (
                    <Button size="sm" variant={hasClaim ? "ghost" : "primary"} onClick={() => onClaimClick(order)} disabled={hasClaim}>
                        <ShieldAlert size={16}/> {hasClaim ? 'Klaim Diajukan' : 'Ajukan Klaim Garansi'}
                    </Button>
                )}
            </div>
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
                                {index < history.length - 1 && <div className="w-0.5 flex-grow bg-slate-200"></div>}
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

// Sub-component: Warranty Claim Modal
const WarrantyClaimModal = ({ order, onClose, onSubmit }: { order: OnlineOrder, onClose: () => void, onSubmit: (claimData: Omit<WarrantyClaim, 'id' | 'submittedAt' | 'customerId' | 'customerName' | 'status'>) => void }) => {
    const [formState, setFormState] = useState({
        productId: order.items.length > 0 ? order.items[0].id : '',
        reason: 'defective' as WarrantyClaimReason,
        description: '',
        photoProofUrl: '',
    });
    const { addToast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            addToast({ title: 'File Terlalu Besar', message: 'Ukuran foto maksimal 2MB.', type: 'error' });
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                setFormState(prev => ({ ...prev, photoProofUrl: reader.result as string }));
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.productId || !formState.description.trim() || !formState.photoProofUrl) {
            addToast({ title: 'Form Tidak Lengkap', message: 'Harap lengkapi semua field, termasuk foto bukti.', type: 'error' });
            return;
        }
        const selectedProduct = order.items.find(item => item.id === formState.productId);
        onSubmit({
            ...formState,
            orderId: order.id,
            productName: selectedProduct?.name || 'Produk tidak ditemukan',
        });
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Ajukan Klaim Garansi untuk Order #${order.id}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <CustomSelect label="Produk yang Diklaim" value={formState.productId} onChange={e => setFormState(prev => ({ ...prev, productId: e.target.value }))}>
                    {order.items.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                </CustomSelect>

                <CustomSelect label="Alasan Klaim" value={formState.reason} onChange={e => setFormState(prev => ({ ...prev, reason: e.target.value as WarrantyClaimReason }))}>
                    <option value="defective">Produk Cacat</option>
                    <option value="wrong_size">Salah Ukuran</option>
                    <option value="wrong_item">Salah Kirim Barang</option>
                    <option value="not_as_described">Tidak Sesuai Deskripsi</option>
                    <option value="other">Lainnya</option>
                </CustomSelect>

                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Deskripsi Masalah</label>
                    <textarea value={formState.description} onChange={e => setFormState(prev => ({ ...prev, description: e.target.value }))} rows={4} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Jelaskan detail masalah pada produk Anda..."></textarea>
                </div>
                
                <div>
                     <label className="block text-sm font-medium text-slate-600 mb-1">Foto Bukti</label>
                     <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/>
                     {formState.photoProofUrl && <img src={formState.photoProofUrl} alt="Preview" className="mt-2 rounded-lg max-h-40" />}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                    <Button type="submit">Kirim Klaim</Button>
                </div>
            </form>
        </Modal>
    );
};