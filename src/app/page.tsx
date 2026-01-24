'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import Image from 'next/image';
import { CloudSun, Shirt, Sparkles, Camera, Trash2, X, Check, Footprints, Layers, RefreshCw, Palette, Tag, Edit3, Link as LinkIcon, UploadCloud, MapPin, Thermometer, Heart, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, User, LogOut, PieChart, TrendingUp, AlertCircle, Briefcase, Search, ArrowRight, Droplets, Banknote, ShoppingBag, ArrowUpDown, Filter, Star, Snowflake, Sun, CloudRain, ShoppingCart, Gem, Coins, RotateCcw, Wand2, Watch } from 'lucide-react';

// --- FIREBASE ---
import { db, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp, getDocs, updateDoc, arrayUnion, arrayRemove, writeBatch } from 'firebase/firestore';

// --- USUARIOS ---
const USERS = ['Maria', 'Jorge', 'Marta'];

// --- TIPOS ---
type Estilo = 'sport' | 'casual' | 'elegant' | 'party';
type Season = 'primavera' | 'verano' | 'otono' | 'invierno';

const SEASONS: {value: Season, label: string, icon: any}[] = [
    {value: 'primavera', label: 'Primavera', icon: <CloudRain size={12}/>},
    {value: 'verano', label: 'Verano', icon: <Sun size={12}/>},
    {value: 'otono', label: 'Otoño', icon: <CloudSun size={12}/>},
    {value: 'invierno', label: 'Invierno', icon: <Snowflake size={12}/>},
];

const COLOR_REFERENCES = [
    {value: 'black', label: 'Negro', hex: '#000000', rgb: [0,0,0], group: 'neutral'},
    {value: 'white', label: 'Blanco', hex: '#ffffff', rgb: [255,255,255], group: 'neutral'},
    {value: 'gray', label: 'Gris', hex: '#808080', rgb: [128,128,128], group: 'neutral'},
    {value: 'beige', label: 'Beige', hex: '#F5F5DC', rgb: [245,245,220], group: 'neutral'},
    {value: 'camel', label: 'Camel', hex: '#C19A6B', rgb: [193,154,107], group: 'neutral'},
    {value: 'brown', label: 'Marrón', hex: '#8B4513', rgb: [139,69,19], group: 'neutral'},
    {value: 'navy', label: 'Azul Marino', hex: '#000080', rgb: [0,0,128], group: 'neutral'},
    {value: 'blue', label: 'Azul Real', hex: '#0000FF', rgb: [0,0,255], group: 'cool'},
    {value: 'sky', label: 'Celeste', hex: '#87CEEB', rgb: [135,206,235], group: 'cool'},
    {value: 'teal', label: 'Verde Azulado', hex: '#008080', rgb: [0,128,128], group: 'cool'},
    {value: 'denim', label: 'Jeans', hex: '#3b5998', rgb: [59,89,152], group: 'neutral'},
    {value: 'green', label: 'Verde', hex: '#008000', rgb: [0,128,0], group: 'cool'},
    {value: 'olive', label: 'Oliva', hex: '#808000', rgb: [128,128,0], group: 'earth'},
    {value: 'red', label: 'Rojo', hex: '#FF0000', rgb: [255,0,0], group: 'warm'},
    {value: 'maroon', label: 'Granate', hex: '#800000', rgb: [128,0,0], group: 'warm'},
    {value: 'pink', label: 'Rosa', hex: '#FFC0CB', rgb: [255,192,203], group: 'warm'},
    {value: 'fuchsia', label: 'Fucsia', hex: '#FF00FF', rgb: [255,0,255], group: 'warm'},
    {value: 'purple', label: 'Morado', hex: '#800080', rgb: [128,0,128], group: 'cool'},
    {value: 'yellow', label: 'Amarillo', hex: '#FFFF00', rgb: [255,255,0], group: 'warm'},
    {value: 'orange', label: 'Naranja', hex: '#FFA500', rgb: [255,165,0], group: 'warm'},
    {value: 'gold', label: 'Dorado', hex: '#FFD700', rgb: [255,215,0], group: 'warm'},
    {value: 'silver', label: 'Plateado', hex: '#C0C0C0', rgb: [192,192,192], group: 'cool'},
];

interface ColorInfo { name: string; hex: string; }

interface Prenda { 
  id: string; 
  owner?: string;
  name: string; 
  brand?: string;
  price?: number;
  category: 'top' | 'bottom' | 'shoes' | 'body' | 'accessories';
  subCategory: string;
  estilos: Estilo[]; 
  primaryColor: ColorInfo;
  secondaryColors?: ColorInfo[];
  seasons: Season[];
  isWishlist: boolean;
  forSale?: boolean; 
  image: string; 
  dirty?: boolean;
  createdAt?: any;
}

interface Outfit {
    id?: string;
    owner?: string;
    type?: '2-piece' | '1-piece';
    top?: Prenda | null;
    bottom?: Prenda | null;
    body?: Prenda | null;
    outerwear?: Prenda | null;
    accessories?: Prenda[];
    shoes: Prenda | null;
    matchScore?: number;
    date?: any;
}

interface PlannedDay {
    id: string;
    owner?: string;
    date: string;
    outfit: Outfit;
}

interface Trip {
    id: string;
    owner?: string;
    name: string;
    items: string[];
    createdAt: any;
}

const SUB_CATEGORIES = {
    top: ['Camiseta', 'Camisa', 'Sudadera', 'Chaqueta', 'Abrigo', 'Top', 'Blusa', 'Jersey', 'Chaleco'],
    bottom: ['Pantalón', 'Jeans', 'Falda', 'Shorts', 'Leggins'],
    body: ['Vestido', 'Mono', 'Peto', 'Traje'],
    shoes: ['Deportivas', 'Botas', 'Zapatos', 'Sandalias', 'Tacones', 'Mocasines'],
    accessories: ['Bolso', 'Cinturón', 'Gafas', 'Pendientes', 'Collar', 'Anillo', 'Pulsera', 'Gorro', 'Guantes', 'Bufanda', 'Charm']
};

// Helper para saber si es capa exterior
const isOuterwear = (subCategory: string) => {
    return ['Abrigo', 'Chaqueta', 'Gabardina', 'Chaleco', 'Sudadera'].includes(subCategory);
}

const STYLES: {value: Estilo, label: string}[] = [
    {value: 'sport', label: 'Deporte 🏃'},
    {value: 'casual', label: 'Casual 🧢'},
    {value: 'elegant', label: 'Elegante 👔'},
    {value: 'party', label: 'Fiesta 🎉'},
];

// --- HELPERS ---
const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject("Canvas error"); return; }
            const MAX_WIDTH = 1080;
            let width = img.width; let height = img.height;
            if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
            canvas.width = width; canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
                if (!blob) { reject("Compression error"); return; }
                const compressedFile = new File([blob], file.name || "image.jpg", { type: 'image/jpeg', lastModified: Date.now() });
                resolve(compressedFile);
            }, 'image/jpeg', 0.7);
        };
        img.onerror = (err) => reject(err);
    });
};

const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0,0,0];
}

const findClosestColorName = (r: number, g: number, b: number) => {
    let minDistance = Infinity;
    let closest = COLOR_REFERENCES[0];
    COLOR_REFERENCES.forEach(c => {
        const rgb = c.rgb || [0,0,0];
        if(!c.rgb) { const h = hexToRgb(c.hex); rgb[0]=h[0]; rgb[1]=h[1]; rgb[2]=h[2]; }
        const dist = Math.sqrt(Math.pow(rgb[0]-r,2) + Math.pow(rgb[1]-g,2) + Math.pow(rgb[2]-b,2));
        if (dist < minDistance) { minDistance = dist; closest = c; }
    });
    return closest;
};

// --- COMPONENTE PRINCIPAL ---
export default function Page() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ArmarioContent />
    </Suspense>
  );
}

function ArmarioContent() {
  const [currentUser, setCurrentUser] = useState<string>('Maria');
  const [activeTab, setActiveTab] = useState<'outfit' | 'armario' | 'wishlist' | 'sales' | 'favoritos' | 'calendario' | 'stats' | 'maleta'>('outfit');
  const [clothes, setClothes] = useState<Prenda[]>([]);
  const [plannedDays, setPlannedDays] = useState<PlannedDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<{temp: number, city: string, code: number} | null>(null);

  // --- TEMAS DE USUARIO ---
  const USER_THEMES: Record<string, { bg: string, text: string }> = {
      'Maria': { bg: '#cf62ab', text: '#111111' }, // Rosa clarito sutil
      'Jorge': { bg: '#00954C', text: '#ffffff' }, // Verde Betis potente (texto blanco para contraste)
      'Marta': { bg: '#5ab4a1', text: '#111111' }, // Default
  };

  const currentTheme = USER_THEMES[currentUser] || USER_THEMES['Marta'];

  useEffect(() => {
    const q = query(collection(db, 'clothes'), orderBy('createdAt', 'desc'));
    const unsubscribeClothes = onSnapshot(q, (snapshot) => {
        const allData = snapshot.docs.map(doc => {
            const d = doc.data();
            const primaryColor = d.primaryColor || { name: d.colorName || 'black', hex: d.colorHex || '#000000' };
            const estilos = d.estilos || (d.estilo ? [d.estilo] : ['casual']);
            const seasons = d.seasons || ['primavera', 'verano', 'otono', 'invierno'];
            
            return { 
                id: doc.id, ...d, 
                estilos: estilos, 
                primaryColor: primaryColor,
                secondaryColors: d.secondaryColors || [],
                seasons: seasons,
                isWishlist: d.isWishlist || false,
                forSale: d.forSale || false, 
                dirty: d.dirty || false,
                brand: d.brand || '',
                price: d.price || 0
            };
        }) as Prenda[];
        const myClothes = allData.filter(item => !item.owner || item.owner === currentUser);
        setClothes(myClothes);
        setLoading(false);
    });

    const qPlan = query(collection(db, 'planning'));
    const unsubscribePlan = onSnapshot(qPlan, (snapshot) => {
        const data = snapshot.docs.map(doc => {
            const d = doc.data();
            return { id: doc.id, ...d } as PlannedDay;
        });
        setPlannedDays(data.filter(p => !p.owner || p.owner === currentUser));
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
                const data = await res.json();
                setWeather({ temp: Math.round(data.current_weather.temperature), city: "Tu Ubicación", code: data.current_weather.weathercode });
            } catch (e) { console.error("Error clima", e); }
        });
    }

    return () => { unsubscribeClothes(); unsubscribePlan(); };
  }, [currentUser]);

  const renderView = () => {
    switch(activeTab) {
        case 'outfit': return <OutfitView clothes={clothes} weather={weather} currentUser={currentUser} />;
        case 'armario': return <ArmarioView clothes={clothes.filter(c => !c.isWishlist && !c.forSale)} loading={loading} currentUser={currentUser} viewMode='wardrobe' />;
        case 'wishlist': return <ArmarioView clothes={clothes.filter(c => c.isWishlist)} loading={loading} currentUser={currentUser} viewMode='wishlist' />;
        case 'sales': return <ArmarioView clothes={clothes.filter(c => c.forSale)} loading={loading} currentUser={currentUser} viewMode='sales' />;
        case 'favoritos': return <FavoritesView clothes={clothes} currentUser={currentUser} />;
        case 'calendario': return <CalendarView currentUser={currentUser} plannedDays={plannedDays} />;
        case 'stats': return <StatsView clothes={clothes.filter(c => !c.isWishlist && !c.forSale)} plannedDays={plannedDays} sales={clothes.filter(c => c.forSale)} />;
        case 'maleta': return <TripView clothes={clothes.filter(c => !c.forSale)} currentUser={currentUser} />;
    }
  };
  
  return (
    // APLICAMOS EL TEMA DINÁMICO AQUÍ
    <div style={{ fontFamily: 'var(--font-inter), sans-serif', background: currentTheme.bg, minHeight: '100vh', color: currentTheme.text, transition: 'background 0.3s, color 0.3s' }}>
      <style dangerouslySetInnerHTML={{__html: `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800;900&display=swap');
            .fade-in { animation: fadeIn 0.4s ease-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
            .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
            .modal-content { background: white; padding: 25px; borderRadius: 24px; width: 90%; max-width: 450px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 50px rgba(0,0,0,0.2); color: #111; } /* Forzamos color negro en modales */
            .no-scrollbar::-webkit-scrollbar { display: none; }
            input[type="color"] { -webkit-appearance: none; border: none; width: 100%; height: 100%; padding: 0; overflow: hidden; opacity: 0; position: absolute; top:0; left:0; cursor: pointer; }
        `}} />

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 20px 100px 20px' }}>
        
        <header style={{ marginBottom: '20px', paddingTop: '20px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1.5px', margin: '0 0 5px 0', lineHeight: '1' }}>
                    Hola, {currentUser} <span style={{fontSize:'2rem'}}>✨</span>
                </h1>
                <p style={{ opacity: 0.8, fontSize: '1rem', fontWeight: '500' }}>
                      {activeTab === 'outfit' && '¿Qué nos ponemos hoy?'}
                      {activeTab === 'armario' && 'Tu colección'}
                      {activeTab === 'wishlist' && 'Lista de deseos'}
                      {activeTab === 'sales' && 'En Venta / Vinted'}
                      {activeTab === 'favoritos' && 'Tus favoritos'}
                      {activeTab === 'calendario' && 'Tu semana'}
                      {activeTab === 'maleta' && 'Viajes y Maletas'}
                      {activeTab === 'stats' && 'Estadísticas & Valor'}
                </p>
            </div>
            
            <div style={{position:'relative', display:'flex', gap:'5px', background: currentUser === 'Jorge' ? 'rgba(255,255,255,0.2)' : '#f0f0f0', padding:'4px', borderRadius:'20px'}}>
                {USERS.map(u => (
                    <button key={u} onClick={() => setCurrentUser(u)} style={{padding:'8px 12px', borderRadius:'16px', border:'none', background: currentUser === u ? (currentUser === 'Jorge' ? 'white' : '#111') : 'transparent', color: currentUser === u ? (currentUser === 'Jorge' ? '#00954C' : 'white') : (currentUser === 'Jorge' ? 'white' : '#888'), fontWeight:'700', fontSize:'0.8rem', cursor:'pointer', transition:'all 0.2s'}}>{u}</button>
                ))}
            </div>
        </header>

        <div className="no-scrollbar" style={{ display: 'flex', background: currentUser === 'Jorge' ? 'rgba(255,255,255,0.1)' : '#f4f4f5', padding: '5px', borderRadius: '16px', marginBottom: '30px', overflowX:'auto' }}>
            <TabButton label="Outfit" active={activeTab === 'outfit'} onClick={() => setActiveTab('outfit')} icon={<Sparkles size={16} />} currentUser={currentUser} />
            <TabButton label="Armario" active={activeTab === 'armario'} onClick={() => setActiveTab('armario')} icon={<Shirt size={16} />} currentUser={currentUser} />
            <TabButton label="Vender" active={activeTab === 'sales'} onClick={() => setActiveTab('sales')} icon={<Coins size={16} />} currentUser={currentUser} />
            <TabButton label="Deseos" active={activeTab === 'wishlist'} onClick={() => setActiveTab('wishlist')} icon={<Star size={16} />} currentUser={currentUser} />
            <TabButton label="Favs" active={activeTab === 'favoritos'} onClick={() => setActiveTab('favoritos')} icon={<Heart size={16} />} currentUser={currentUser} />
            <TabButton label="Agenda" active={activeTab === 'calendario'} onClick={() => setActiveTab('calendario')} icon={<CalendarIcon size={16} />} currentUser={currentUser} />
            <TabButton label="Maleta" active={activeTab === 'maleta'} onClick={() => setActiveTab('maleta')} icon={<Briefcase size={16} />} currentUser={currentUser} />
            <TabButton label="Stats" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<PieChart size={16} />} currentUser={currentUser} />
        </div>

        {renderView()}

      </div>
    </div>
  );
}

// --- VISTAS ---
function StatsView({ clothes, sales, plannedDays }: { clothes: Prenda[], sales: Prenda[], plannedDays: PlannedDay[] }) {
    const cleanClothes = clothes.filter(c => !c.dirty);
    const totalValue = clothes.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    const salesValue = sales.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    
    const brandCounts = clothes.reduce((acc, curr) => { const b = curr.brand || 'Sin Marca'; acc[b] = (acc[b] || 0) + 1; return acc; }, {} as Record<string, number>);
    const topBrand = Object.entries(brandCounts).sort(([,a], [,b]) => b - a)[0];
    const colorCounts = clothes.reduce((acc, curr) => { const hex = curr.primaryColor?.hex || '#000000'; acc[hex] = (acc[hex] || 0) + 1; return acc; }, {} as Record<string, number>);
    const sortedColors = Object.entries(colorCounts).sort(([,a], [,b]) => b - a).slice(0, 5);

    const usageMap = new Map<string, number>();
    (plannedDays || []).forEach(day => {
        if(day.outfit?.top?.id) usageMap.set(day.outfit.top.id, (usageMap.get(day.outfit.top.id) || 0) + 1);
        if(day.outfit?.bottom?.id) usageMap.set(day.outfit.bottom.id, (usageMap.get(day.outfit.bottom.id) || 0) + 1);
        if(day.outfit?.body?.id) usageMap.set(day.outfit.body.id, (usageMap.get(day.outfit.body.id) || 0) + 1);
        if(day.outfit?.shoes?.id) usageMap.set(day.outfit.shoes.id, (usageMap.get(day.outfit.shoes.id) || 0) + 1);
    });

    const clothesWithCost = clothes.map(c => {
        const uses = usageMap.get(c.id) || 0;
        const costPerWear = c.price ? (c.price / (uses + 1)) : 0; 
        return { ...c, uses, costPerWear };
    }).sort((a,b) => b.costPerWear - a.costPerWear);

    const bestAmortized = [...clothesWithCost].reverse().slice(0, 3).filter(c => c.price && c.price > 0);
    
    if (clothes.length === 0 && sales.length === 0) return <div style={{textAlign:'center', padding:'40px', opacity:0.6}}>Sube ropa para ver tus estadísticas.</div>;

    return (
        <div className="fade-in">
            <div style={{background:'linear-gradient(135deg, #111 0%, #333 100%)', color:'white', padding:'25px', borderRadius:'24px', marginBottom:'20px', boxShadow:'0 10px 30px rgba(0,0,0,0.2)'}}>
                <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'5px', opacity:0.8}}>
                    <Banknote size={20}/> <span style={{fontWeight:'600', textTransform:'uppercase', fontSize:'0.8rem'}}>Valor del Armario</span>
                </div>
                <div style={{fontSize:'3rem', fontWeight:'900', lineHeight:'1'}}>{totalValue}€</div>
                <div style={{marginTop:'15px', display:'flex', gap:'20px'}}>
                    <div><div style={{fontSize:'0.7rem', opacity:0.7, textTransform:'uppercase'}}>Marca Top</div><div style={{fontWeight:'700', fontSize:'1.1rem'}}>{topBrand ? topBrand[0] : '-'}</div></div>
                    <div><div style={{fontSize:'0.7rem', opacity:0.7, textTransform:'uppercase'}}>Prendas</div><div style={{fontWeight:'700', fontSize:'1.1rem'}}>{clothes.length}</div></div>
                </div>
            </div>
            
            {sales.length > 0 && (
                <div style={{background:'#f0fff4', color:'#166534', padding:'15px', borderRadius:'16px', marginBottom:'20px', border:'1px solid #dcfce7', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <Coins size={20}/> <span style={{fontWeight:'700'}}>Potencial en Vinted</span>
                    </div>
                    <div style={{fontSize:'1.5rem', fontWeight:'900'}}>{salesValue}€</div>
                </div>
            )}

            {bestAmortized.length > 0 && (
                <div style={{marginBottom:'20px'}}>
                      <h3 style={{fontSize:'1rem', fontWeight:'800', marginBottom:'10px'}}>🌟 ¡Bien Amortizados!</h3>
                      <div style={{display:'flex', gap:'10px', overflowX:'auto'}} className="no-scrollbar">
                        {bestAmortized.map(c => (
                            <div key={c.id} style={{minWidth:'120px', background:'#f9f9f9', padding:'10px', borderRadius:'12px', border:'1px solid #eee', color:'#111'}}>
                                <div style={{width:'40px', height:'40px', position:'relative', borderRadius:'8px', overflow:'hidden', marginBottom:'5px'}}>
                                    <Image src={c.image} fill style={{objectFit:'cover'}} alt={c.name} />
                                </div>
                                <div style={{fontWeight:'700', fontSize:'0.8rem'}}>{c.name}</div>
                                <div style={{fontSize:'0.7rem', color:'#666'}}>{c.costPerWear.toFixed(2)}€ / uso</div>
                            </div>
                        ))}
                      </div>
                </div>
            )}
            
             <div style={{marginBottom:'30px'}}>
                <h3 style={{display:'flex', alignItems:'center', gap:'10px', fontSize:'1.1rem', fontWeight:'800', marginBottom:'15px'}}><Palette size={20}/> Tu Paleta Top 5</h3>
                <div style={{display:'flex', gap:'15px'}}>
                    {sortedColors.map(([hex, count]) => (
                        <div key={hex} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center'}}>
                            <div style={{width:'100%', aspectRatio:'1/1', background: hex, borderRadius:'12px', marginBottom:'5px', border:'1px solid rgba(0,0,0,0.1)', boxShadow:'0 4px 10px rgba(0,0,0,0.05)'}}></div>
                            <span style={{fontSize:'0.75rem', fontWeight:'600'}}>{count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function OutfitView({ clothes, weather, currentUser }: { clothes: Prenda[], weather: any, currentUser: string }) {
    const [outfit, setOutfit] = useState<Outfit | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [filterStyle, setFilterStyle] = useState<Estilo | 'all'>('all');

    const generateSmartOutfit = () => {
        setIsAnimating(true); setMessage('');
        
        // FILTRO: No sucia, No wishlist, No en venta
        const cleanClothes = clothes.filter(c => !c.dirty && !c.isWishlist && !c.forSale);
        
        let seasonFilter: Season[] = ['primavera', 'verano', 'otono', 'invierno'];
        let tempWarning = '';
        let needsCoat = false;
        
        if (weather) {
            if (weather.temp < 12) { seasonFilter = ['invierno', 'otono']; tempWarning = '❄️ Hace frío. Buscando abrigo.'; needsCoat = true; } 
            else if (weather.temp < 20) { seasonFilter = ['primavera', 'otono']; tempWarning = '☁️ Tiempo fresco.'; needsCoat = Math.random() > 0.5; } 
            else if (weather.temp >= 20) { seasonFilter = ['verano', 'primavera']; tempWarning = '☀️ Hace bueno.'; }
        }

        const seasonalClothes = cleanClothes.filter(c => c.seasons?.some(s => seasonFilter.includes(s)));
        const pool = seasonalClothes.length > 5 ? seasonalClothes : cleanClothes;

        // SEPARAR TOPS DE ABRIGOS
        let tops = pool.filter(c => c.category === 'top' && !isOuterwear(c.subCategory));
        let outerwears = pool.filter(c => c.category === 'top' && isOuterwear(c.subCategory));
        let bottoms = pool.filter(c => c.category === 'bottom');
        let bodies = pool.filter(c => c.category === 'body'); 
        let shoes = pool.filter(c => c.category === 'shoes');
        let accessories = pool.filter(c => c.category === 'accessories');

        if (filterStyle !== 'all') {
            tops = tops.filter(c => c.estilos?.includes(filterStyle));
            bottoms = bottoms.filter(c => c.estilos?.includes(filterStyle));
            bodies = bodies.filter(c => c.estilos?.includes(filterStyle));
            shoes = shoes.filter(c => c.estilos?.includes(filterStyle));
            outerwears = outerwears.filter(c => c.estilos?.includes(filterStyle));
        }
        
        let mode: '2-piece' | '1-piece' = '2-piece';
        if (bodies.length > 0 && (tops.length === 0 || bottoms.length === 0)) mode = '1-piece';
        else if (bodies.length > 0 && Math.random() > 0.7) mode = '1-piece';

        if (mode === '2-piece' && (tops.length === 0 || bottoms.length === 0)) {
             alert("Falta ropa limpia para este clima o estilo.");
             setIsAnimating(false); return;
        }

        setTimeout(() => {
            let selectedShoes = shoes.length > 0 ? shoes[Math.floor(Math.random() * shoes.length)] : null;
            let selectedOuter = (needsCoat && outerwears.length > 0) ? outerwears[Math.floor(Math.random() * outerwears.length)] : null;
            
            // Accesorios aleatorios (0 a 2)
            let selectedAcc = [];
            if (accessories.length > 0 && Math.random() > 0.3) {
                selectedAcc.push(accessories[Math.floor(Math.random() * accessories.length)]);
                if (accessories.length > 1 && Math.random() > 0.6) {
                     const second = accessories[Math.floor(Math.random() * accessories.length)];
                     if(second.id !== selectedAcc[0].id) selectedAcc.push(second);
                }
            }

            if (mode === '1-piece') {
                const selectedBody = bodies[Math.floor(Math.random() * bodies.length)];
                setOutfit({ type: '1-piece', body: selectedBody, shoes: selectedShoes, outerwear: selectedOuter, accessories: selectedAcc, matchScore: 95 });
                setMessage(tempWarning || `Look de una pieza: ${selectedBody.estilos[0]}`);
            } else {
                const selectedTop = tops[Math.floor(Math.random() * tops.length)];
                let compatibleBottoms = bottoms.filter(b => b.estilos?.some(style => selectedTop.estilos?.includes(style)));
                if (compatibleBottoms.length === 0) compatibleBottoms = bottoms;
                const selectedBottom = compatibleBottoms[Math.floor(Math.random() * compatibleBottoms.length)];
                setOutfit({ type: '2-piece', top: selectedTop, bottom: selectedBottom, shoes: selectedShoes, outerwear: selectedOuter, accessories: selectedAcc, matchScore: 95 });
                setMessage(tempWarning || `Look listo.`);
            }
            setIsAnimating(false);
        }, 600);
    };

    const saveToFavorites = async () => {
        if (!outfit) return; setIsSaving(true);
        try { await addDoc(collection(db, 'favorites'), { ...outfit, owner: currentUser, createdAt: serverTimestamp() }); alert("¡Guardado! ❤️"); } catch (e) { console.error(e); }
        setIsSaving(false);
    }

    return (
        <div className="fade-in">
            <div style={{ background: '#111', color: 'white', padding: '30px', borderRadius: '24px', marginBottom: '30px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                {weather ? (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', opacity: 0.8 }}>
                            {weather.temp > 20 ? <CloudSun size={24} /> : <Thermometer size={24} />}
                            <span style={{ fontSize: '0.9rem', fontWeight: '600', textTransform:'uppercase' }}>{weather.city}</span>
                        </div>
                        <div style={{ fontSize: '4rem', fontWeight: '900', lineHeight: '0.9', marginBottom: '10px' }}>{weather.temp}°</div>
                        <p style={{ fontSize: '1.1rem', fontWeight: '500', color: '#ccc' }}>{weather.temp < 15 ? '¡Hora de abrigarse!' : weather.temp < 25 ? 'Temperatura agradable' : '¡Qué calor!'}</p>
                    </>
                ) : ( <div style={{display:'flex', alignItems:'center', gap:'10px'}}>Detectando clima...</div> )}
            </div>
            
            <div style={{marginBottom:'20px'}}>
                <div style={{fontSize:'0.8rem', fontWeight:'700', opacity:0.6, marginBottom:'10px', textAlign:'center', textTransform:'uppercase', letterSpacing:'1px'}}>¿Qué te apetece hoy?</div>
                <div style={{display:'flex', justifyContent:'center', gap:'8px', flexWrap:'wrap'}}>
                    <button onClick={() => setFilterStyle('all')} style={{padding:'8px 16px', borderRadius:'20px', border: filterStyle === 'all' ? '2px solid #111' : '1px solid #eee', background: filterStyle === 'all' ? '#111' : 'white', color: filterStyle === 'all' ? 'white' : '#666', fontWeight:'600', fontSize:'0.85rem', cursor:'pointer'}}>🎲 Sorpréndeme</button>
                    {STYLES.map(s => (
                        <button key={s.value} onClick={() => setFilterStyle(s.value)} style={{padding:'8px 16px', borderRadius:'20px', border: filterStyle === s.value ? '2px solid #111' : '1px solid #eee', background: filterStyle === s.value ? '#111' : 'white', color: filterStyle === s.value ? 'white' : '#666', fontWeight:'600', fontSize:'0.85rem', cursor:'pointer'}}>{s.label}</button>
                    ))}
                </div>
            </div>

            {outfit && (
                <div className="fade-in" style={{ marginBottom: '30px', position:'relative' }}>
                    <button onClick={saveToFavorites} disabled={isSaving} style={{position:'absolute', top:'-10px', right:'-5px', zIndex:10, background:'white', border:'none', borderRadius:'50%', width:'50px', height:'50px', boxShadow:'0 5px 15px rgba(0,0,0,0.1)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color: isSaving ? '#ccc' : '#e0245e', transition:'transform 0.2s'}}><Heart size={24} fill={isSaving ? "none" : "#e0245e"} /></button>
                    <div style={{ textAlign:'center', marginBottom:'15px', opacity:0.7, fontSize:'0.9rem', fontWeight:'600' }}>{message}</div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', gridTemplateRows: 'auto auto' }}>
                        
                        {/* ABRIGO (Si hay) */}
                        {outfit.outerwear && (
                            <div style={{ gridColumn: '1 / -1', background: '#eef', borderRadius: '16px', padding: '10px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom:'5px', color:'#111' }}>
                                <div style={{width:'50px', height:'50px', position:'relative', borderRadius:'8px', overflow:'hidden', background:'white'}}>
                                    <Image src={outfit.outerwear.image} alt="coat" fill style={{objectFit:'contain'}}/>
                                </div>
                                <div style={{fontSize:'0.9rem', fontWeight:'600'}}>+ {outfit.outerwear.name}</div>
                            </div>
                        )}

                        {outfit.type === '1-piece' ? (
                             <div style={{ gridColumn: '1 / -1', aspectRatio: '3/4', position: 'relative', borderRadius: '20px', overflow: 'hidden', background:'#f4f4f5' }}>
                                <Image src={outfit.body!.image} alt="body" fill style={{ objectFit: 'contain', padding:'10px' }} />
                             </div>
                        ) : (
                            <>
                                <div style={{ gridColumn: '1 / -1', aspectRatio: '16/9', position: 'relative', borderRadius: '20px', overflow: 'hidden', background:'#f4f4f5' }}>
                                    <Image src={outfit.top!.image} alt="top" fill style={{ objectFit: 'contain', padding:'10px' }} />
                                </div>
                                <div style={{ aspectRatio: '1/1', position: 'relative', borderRadius: '20px', overflow: 'hidden', background:'#f4f4f5' }}><Image src={outfit.bottom!.image} alt="bottom" fill style={{ objectFit: 'contain', padding:'10px' }} /></div>
                            </>
                        )}
                        <div style={{ aspectRatio: '1/1', position: 'relative', borderRadius: '20px', overflow: 'hidden', background:'#f4f4f5', display:'flex', alignItems:'center', justifyContent:'center', color:'#ccc' }}>{outfit.shoes ? <Image src={outfit.shoes.image} alt="shoes" fill style={{ objectFit: 'contain', padding:'10px' }} /> : <Footprints size={40} />}</div>
                        
                        {/* ACCESORIOS */}
                        {outfit.accessories && outfit.accessories.length > 0 && (
                            <div style={{gridColumn:'1/-1', display:'flex', gap:'5px', marginTop:'5px', overflowX:'auto'}}>
                                {outfit.accessories.map((acc, i) => (
                                    <div key={i} style={{width:'50px', height:'50px', borderRadius:'12px', background:'#f9f9f9', position:'relative', overflow:'hidden', border:'1px solid #eee', flexShrink:0}}>
                                        <Image src={acc.image} alt="acc" fill style={{objectFit:'contain', padding:'5px'}}/>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
            <div style={{ textAlign: 'center' }}>
                <button onClick={generateSmartOutfit} disabled={isAnimating} style={{ width: '100%', background: isAnimating ? '#333' : 'white', color: isAnimating ? '#ccc' : '#111', border: '2px solid #111', padding: '20px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: '800', cursor: isAnimating ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', transition: 'all 0.2s', transform: isAnimating ? 'scale(0.98)' : 'scale(1)' }}>
                    {isAnimating ? <RefreshCw className="spin" size={20} /> : <Sparkles size={20} />}
                    {outfit ? '¡Otra combinación!' : 'Generar Outfit Inteligente'}
                </button>
                <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );
}

function TripView({ clothes, currentUser }: { clothes: Prenda[], currentUser: string }) {
    const [trips, setTrips] = useState<Trip[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newTripName, setNewTripName] = useState('');
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

    useEffect(() => {
        const q = query(collection(db, 'trips'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Trip[];
            setTrips(data.filter(t => !t.owner || t.owner === currentUser));
        });
        return () => unsubscribe();
    }, [currentUser]);

    const createTrip = async () => {
        if (!newTripName) return;
        await addDoc(collection(db, 'trips'), { name: newTripName, items: [], owner: currentUser, createdAt: serverTimestamp() });
        setNewTripName(''); setIsCreating(false);
    };

    const deleteTrip = async (id: string) => { if(confirm("¿Borrar maleta?")) await deleteDoc(doc(db, 'trips', id)); setSelectedTrip(null); };

    const toggleItemInTrip = async (tripId: string, itemId: string, isAdded: boolean) => {
        const tripRef = doc(db, 'trips', tripId);
        if (isAdded) await updateDoc(tripRef, { items: arrayRemove(itemId) });
        else await updateDoc(tripRef, { items: arrayUnion(itemId) });
    };

    if (selectedTrip) {
        const tripItems = clothes.filter(c => selectedTrip.items?.includes(c.id));
        const tops = tripItems.filter(c => c.category === 'top').length;
        const bottoms = tripItems.filter(c => c.category === 'bottom').length;
        const bodies = tripItems.filter(c => c.category === 'body').length;
        const shoes = tripItems.filter(c => c.category === 'shoes').length;

        return (
            <div className="fade-in">
                <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px'}}>
                    <button onClick={() => setSelectedTrip(null)} style={{background:'#f0f0f0', border:'none', borderRadius:'50%', width:'35px', height:'35px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#111'}}><ChevronLeft/></button>
                    <h2 style={{fontSize:'1.5rem', fontWeight:'800', margin:0}}>{selectedTrip.name}</h2>
                </div>
                <div style={{background:'#111', color:'white', padding:'20px', borderRadius:'16px', marginBottom:'20px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div><div style={{fontSize:'2rem', fontWeight:'900', lineHeight:'1'}}>{tripItems.length}</div><div style={{fontSize:'0.8rem', opacity:0.8}}>Prendas</div></div>
                    <div style={{textAlign:'right'}}>
                        <div style={{fontSize:'0.8rem', opacity:0.8}}>{tops} Tops · {bottoms} Bajos</div>
                        <div style={{fontSize:'0.8rem', opacity:0.8}}>{bodies} Cuerpo · {shoes} Calzado</div>
                    </div>
                </div>
                <h3 style={{fontSize:'1rem', fontWeight:'700', marginBottom:'10px'}}>¿Qué te llevas?</h3>
                <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'10px'}}>
                    {clothes.map(prenda => {
                        const isSelected = selectedTrip.items?.includes(prenda.id);
                        if (!prenda.image) return null;
                        
                        return (
                            <div key={prenda.id} onClick={() => toggleItemInTrip(selectedTrip.id, prenda.id, isSelected)} style={{position:'relative', opacity: isSelected ? 1 : 0.6, transform: isSelected ? 'scale(1)' : 'scale(0.95)', transition:'all 0.2s', cursor:'pointer'}}>
                                <div style={{aspectRatio:'3/4', background:'#f9f9f9', borderRadius:'12px', overflow:'hidden', position:'relative', border: isSelected ? '3px solid #111' : '1px solid #eee'}}>
                                    <Image src={prenda.image} alt={prenda.name} fill style={{objectFit:'cover'}} />
                                    {isSelected && <div style={{position:'absolute', top:'5px', right:'5px', background:'#111', color:'white', borderRadius:'50%', padding:'2px'}}><Check size={12}/></div>}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="fade-in">
            {isCreating ? (
                <div style={{background:'#f9f9f9', padding:'20px', borderRadius:'16px', marginBottom:'20px', color:'#111'}}>
                    <h3 style={{marginTop:0}}>Nueva Maleta</h3>
                    <input type="text" placeholder="Ej: Fin de semana rural" value={newTripName} onChange={e => setNewTripName(e.target.value)} style={{width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #ddd', marginBottom:'10px'}} />
                    <div style={{display:'flex', gap:'10px'}}>
                        <button onClick={createTrip} style={{flex:1, background:'#111', color:'white', border:'none', padding:'10px', borderRadius:'10px', fontWeight:'700'}}>Crear</button>
                        <button onClick={() => setIsCreating(false)} style={{flex:1, background:'transparent', color:'#666', border:'1px solid #ddd', padding:'10px', borderRadius:'10px'}}>Cancelar</button>
                    </div>
                </div>
            ) : (
                <button onClick={() => setIsCreating(true)} style={{width:'100%', padding:'15px', background:'rgba(255,255,255,0.5)', border:'2px dashed #ddd', borderRadius:'16px', color: currentUser==='Jorge'?'white':'#666', fontWeight:'600', marginBottom:'20px', cursor:'pointer'}}>+ Crear nuevo viaje</button>
            )}
            <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                {trips.map(trip => (
                    <div key={trip.id} onClick={() => setSelectedTrip(trip)} style={{background:'white', border:'1px solid #eee', borderRadius:'16px', padding:'15px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', boxShadow:'0 2px 5px rgba(0,0,0,0.02)', color:'#111'}}>
                        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                            <div style={{background:'#eef', padding:'10px', borderRadius:'12px'}}><Briefcase size={20} color="#333"/></div>
                            <div><div style={{fontWeight:'700', fontSize:'1rem'}}>{trip.name}</div><div style={{fontSize:'0.8rem', color:'#888'}}>{trip.items?.length || 0} prendas</div></div>
                        </div>
                        <div style={{display:'flex', alignItems:'center', gap:'10px'}}><button onClick={(e) => {e.stopPropagation(); deleteTrip(trip.id)}} style={{background:'none', border:'none', color:'#faa', cursor:'pointer'}}><Trash2 size={16}/></button><ArrowRight size={16} color="#ccc"/></div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function CalendarView({currentUser, plannedDays}: {currentUser: string, plannedDays: PlannedDay[]}) {
    const [weekStart, setWeekStart] = useState(new Date());
    const [selectedDateForAdd, setSelectedDateForAdd] = useState<string | null>(null);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [favorites, setFavorites] = useState<Outfit[]>([]);

    useEffect(() => {
        const qFav = query(collection(db, 'favorites'), orderBy('createdAt', 'desc'));
        getDocs(qFav).then(snap => {
            const favData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Outfit[];
            setFavorites(favData.filter(f => !f.owner || f.owner === currentUser));
        });
    }, [currentUser]);

    const getDaysOfWeek = (start: Date) => {
        const days = [];
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1); 
        const monday = new Date(start.setDate(diff));
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday); d.setDate(monday.getDate() + i); days.push(d);
        }
        return days;
    };

    const days = getDaysOfWeek(new Date(weekStart));
    const formatDateKey = (date: Date) => date.toISOString().split('T')[0];

    const handleAddClick = (dateStr: string) => { setSelectedDateForAdd(dateStr); setIsSelectorOpen(true); };

    const confirmPlan = async (outfit: Outfit) => {
        if (!selectedDateForAdd) return;
        const existing = (plannedDays || []).find(p => p.date === selectedDateForAdd);
        if (existing) await deleteDoc(doc(db, 'planning', existing.id));
        await addDoc(collection(db, 'planning'), { date: selectedDateForAdd, outfit: outfit, owner: currentUser, createdAt: serverTimestamp() });
        setIsSelectorOpen(false); setSelectedDateForAdd(null);
    };

    const deletePlan = async (id: string) => { if(confirm("¿Quitar outfit de este día?")) await deleteDoc(doc(db, 'planning', id)); };
    const changeWeek = (offset: number) => {
        const newDate = new Date(weekStart); newDate.setDate(newDate.getDate() + (offset * 7)); setWeekStart(newDate);
    };

    return (
        <div className="fade-in">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                <button onClick={() => changeWeek(-1)} style={{background:'none', border:'none', cursor:'pointer', color:'inherit'}}><ChevronLeft size={24}/></button>
                <h3 style={{fontSize:'1.1rem', fontWeight:'700', textTransform:'capitalize'}}>{weekStart.toLocaleString('es-ES', { month: 'long' })} {weekStart.getFullYear()}</h3>
                <button onClick={() => changeWeek(1)} style={{background:'none', border:'none', cursor:'pointer', color:'inherit'}}><ChevronRight size={24}/></button>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                {days.map((day) => {
                    const dateKey = formatDateKey(day);
                    const plan = (plannedDays || []).find(p => p.date === dateKey);
                    const isToday = formatDateKey(new Date()) === dateKey;
                    
                    return (
                        <div key={dateKey} style={{background: isToday ? 'white' : 'rgba(255,255,255,0.8)', border: isToday ? `2px solid ${currentUser==='Jorge'?'#00954C':'#111'}` : '1px solid #eee', borderRadius:'16px', padding:'15px', color:'#111'}}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                                <div style={{display:'flex', flexDirection:'column'}}>
                                    <span style={{fontSize:'0.8rem', color:'#666', textTransform:'uppercase', fontWeight:'600'}}>{day.toLocaleString('es-ES', { weekday: 'long' })}</span>
                                    <span style={{fontSize:'1.2rem', fontWeight:'800'}}>{day.getDate()}</span>
                                </div>
                                {plan ? (
                                    <button onClick={() => deletePlan(plan.id)} style={{background:'#ffebee', color:'red', border:'none', borderRadius:'50%', width:'30px', height:'30px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}><Trash2 size={14}/></button>
                                ) : (
                                    <button onClick={() => handleAddClick(dateKey)} style={{background:currentUser==='Jorge'?'#00954C':'#111', color:'white', border:'none', borderRadius:'20px', padding:'5px 15px', fontSize:'0.8rem', fontWeight:'600', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px'}}><Plus size={14}/> Añadir</button>
                                )}
                            </div>
                            {plan && plan.outfit ? (
                                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'5px', opacity:0.9}}>
                                     {plan.outfit.outerwear && (
                                        <div style={{gridColumn:'1/-1', display:'flex', gap:'5px', alignItems:'center', fontSize:'0.7rem', background:'#eee', padding:'3px 6px', borderRadius:'6px', width:'fit-content', marginBottom:'2px'}}>
                                            <Layers size={10}/> {plan.outfit.outerwear.name}
                                        </div>
                                     )}
                                    {plan.outfit.type === '1-piece' || (!plan.outfit.top && plan.outfit.body) ? (
                                        <div style={{aspectRatio:'2/1', background:'white', borderRadius:'8px', overflow:'hidden', position:'relative', gridColumn: 'span 2'}}>
                                            {plan.outfit.body?.image ? <Image src={plan.outfit.body.image} alt="body" fill style={{objectFit:'contain', padding:'2px'}}/> : null}
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{aspectRatio:'1/1', background:'white', borderRadius:'8px', overflow:'hidden', position:'relative'}}>
                                                {plan.outfit.top?.image ? <Image src={plan.outfit.top.image} alt="t" fill style={{objectFit:'contain', padding:'2px'}}/> : null}
                                            </div>
                                            <div style={{aspectRatio:'1/1', background:'white', borderRadius:'8px', overflow:'hidden', position:'relative'}}>
                                                {plan.outfit.bottom?.image ? <Image src={plan.outfit.bottom.image} alt="b" fill style={{objectFit:'contain', padding:'2px'}}/> : null}
                                            </div>
                                        </>
                                    )}
                                    <div style={{aspectRatio:'1/1', background:'white', borderRadius:'8px', overflow:'hidden', position:'relative', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                        {plan.outfit.shoes?.image ? <Image src={plan.outfit.shoes.image} alt="s" fill style={{objectFit:'contain', padding:'2px'}}/> : <Footprints size={16} color="#ccc"/>}
                                    </div>
                                </div>
                            ) : (
                                <div style={{height:'60px', border:'2px dashed #e0e0e0', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', color:'#ccc', fontSize:'0.8rem'}}>Sin planificar</div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {isSelectorOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}><h3 style={{margin:0}}>Elige un outfit</h3><button onClick={() => setIsSelectorOpen(false)} style={{background:'none', border:'none'}}><X/></button></div>
                        {favorites.length === 0 ? <p>No tienes favoritos guardados.</p> : (
                            <div style={{display:'grid', gap:'10px'}}>
                                {favorites.map(fav => (
                                    <div key={fav.id} onClick={() => confirmPlan(fav)} style={{border:'1px solid #eee', borderRadius:'12px', padding:'10px', display:'flex', alignItems:'center', gap:'10px', cursor:'pointer'}}>
                                         {fav.type === '1-piece' ? (
                                            <div style={{width:'40px', height:'40px', position:'relative'}}>{fav.body?.image && <Image src={fav.body.image} alt="body" fill style={{objectFit:'contain'}}/>}</div>
                                        ) : (
                                            <>
                                                <div style={{width:'40px', height:'40px', position:'relative'}}>{fav.top?.image && <Image src={fav.top.image} alt="t" fill style={{objectFit:'contain'}}/>}</div>
                                                <div style={{width:'40px', height:'40px', position:'relative'}}>{fav.bottom?.image && <Image src={fav.bottom.image} alt="b" fill style={{objectFit:'contain'}}/>}</div>
                                            </>
                                        )}
                                        <div style={{flex:1}}><p style={{margin:0, fontSize:'0.8rem', fontWeight:'600'}}>Look guardado</p></div>
                                        <Check size={16} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// --- CREADOR MANUAL MEJORADO ---
function ManualOutfitCreator({ clothes, onSave, onClose }: { clothes: Prenda[], onSave: (o: Outfit) => void, onClose: () => void }) {
    const [mode, setMode] = useState<'2-piece' | '1-piece'>('2-piece');
    
    // Slots principales
    const [top, setTop] = useState<Prenda | null>(null);
    const [bottom, setBottom] = useState<Prenda | null>(null);
    const [body, setBody] = useState<Prenda | null>(null);
    const [shoes, setShoes] = useState<Prenda | null>(null);
    
    // Slots añadidos (Capas y Accesorios)
    const [outerwear, setOuterwear] = useState<Prenda | null>(null);
    const [accessories, setAccessories] = useState<Prenda[]>([]);

    const [selectingFor, setSelectingFor] = useState<'top' | 'bottom' | 'body' | 'shoes' | 'outerwear' | 'accessories' | null>(null);

    // FILTRO MANUAL: No mostrar cosas en venta
    const validClothes = clothes.filter(c => !c.forSale);

    const handleSelect = (p: Prenda) => {
        if (selectingFor === 'top') setTop(p);
        if (selectingFor === 'bottom') setBottom(p);
        if (selectingFor === 'body') setBody(p);
        if (selectingFor === 'shoes') setShoes(p);
        if (selectingFor === 'outerwear') setOuterwear(p);
        if (selectingFor === 'accessories') {
            // Evitar duplicados
            if (!accessories.some(a => a.id === p.id)) {
                setAccessories([...accessories, p]);
            }
        }
        setSelectingFor(null);
    }

    const removeAccessory = (id: string) => {
        setAccessories(accessories.filter(a => a.id !== id));
    }

    const handleSave = () => {
        let outfit: Outfit = { shoes, outerwear, accessories };
        
        if (mode === '2-piece' && top && bottom && shoes) {
            outfit = { ...outfit, type: '2-piece', top, bottom, matchScore: 100 };
            onSave(outfit);
        } else if (mode === '1-piece' && body && shoes) {
            outfit = { ...outfit, type: '1-piece', body, matchScore: 100 };
            onSave(outfit);
        }
    }

    const isReady = mode === '2-piece' ? (top && bottom && shoes) : (body && shoes);

    // Lógica para filtrar qué ropa mostrar en el selector
    const getFilteredOptions = () => {
        if (!selectingFor) return [];
        
        return validClothes.filter(c => {
            if (selectingFor === 'outerwear') {
                return c.category === 'top' && isOuterwear(c.subCategory);
            }
            if (selectingFor === 'top') {
                return c.category === 'top' && !isOuterwear(c.subCategory);
            }
            return c.category === selectingFor;
        });
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{height: '90vh', display:'flex', flexDirection:'column'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                    <h3 style={{margin:0}}>Crear Outfit Manual</h3>
                    <button onClick={onClose}><X/></button>
                </div>
                
                {/* SELECTOR MODO */}
                <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
                    <button onClick={()=>setMode('2-piece')} style={{flex:1, padding:'10px', border: mode==='2-piece'?'2px solid #111':'1px solid #eee', borderRadius:'10px', fontWeight:'600', background: mode==='2-piece'?'#111':'white', color: mode==='2-piece'?'white':'#111'}}>2 Piezas</button>
                    <button onClick={()=>setMode('1-piece')} style={{flex:1, padding:'10px', border: mode==='1-piece'?'2px solid #111':'1px solid #eee', borderRadius:'10px', fontWeight:'600', background: mode==='1-piece'?'#111':'white', color: mode==='1-piece'?'white':'#111'}}>1 Pieza</button>
                </div>

                <div style={{flex:1, display:'flex', flexDirection:'column', gap:'15px', overflowY:'auto', paddingBottom:'20px'}}>
                    
                    {/* CAPA EXTERIOR (Opcional) */}
                    <div style={{display:'flex', gap:'10px', overflowX:'auto'}} className="no-scrollbar">
                        <SelectionSlot label="Abrigo / Chaqueta (Opcional)" item={outerwear} onClick={() => setSelectingFor('outerwear')} onRemove={() => setOuterwear(null)} isWide />
                    </div>

                    {/* CAPA BASE */}
                    <div style={{display:'flex', gap:'10px'}}>
                        {mode === '2-piece' ? (
                            <>
                                <div style={{flex:1}}><SelectionSlot label="Parte de Arriba (Base)" item={top} onClick={() => setSelectingFor('top')} /></div>
                                <div style={{flex:1}}><SelectionSlot label="Parte de Abajo" item={bottom} onClick={() => setSelectingFor('bottom')} /></div>
                            </>
                        ) : (
                            <div style={{flex:1}}><SelectionSlot label="Cuerpo (Vestido/Mono)" item={body} onClick={() => setSelectingFor('body')} /></div>
                        )}
                    </div>

                    {/* CALZADO */}
                    <div style={{display:'flex', justifyContent:'center'}}>
                        <div style={{width:'50%'}}>
                            <SelectionSlot label="Calzado" item={shoes} onClick={() => setSelectingFor('shoes')} />
                        </div>
                    </div>

                    {/* ACCESORIOS */}
                    <div style={{borderTop:'1px dashed #eee', paddingTop:'15px'}}>
                        <div style={{fontSize:'0.8rem', fontWeight:'700', marginBottom:'10px', color:'#888'}}>ACCESORIOS</div>
                        <div style={{display:'flex', flexWrap:'wrap', gap:'10px'}}>
                            {accessories.map(acc => (
                                <div key={acc.id} style={{width:'60px', height:'60px', borderRadius:'10px', overflow:'hidden', position:'relative', border:'1px solid #eee'}}>
                                    <Image src={acc.image} fill style={{objectFit:'contain'}} alt="acc"/>
                                    <button onClick={()=>removeAccessory(acc.id)} style={{position:'absolute', top:0, right:0, background:'rgba(0,0,0,0.5)', color:'white', border:'none', width:'20px', height:'20px', display:'flex', alignItems:'center', justifyContent:'center'}}><X size={12}/></button>
                                </div>
                            ))}
                            <button onClick={() => setSelectingFor('accessories')} style={{width:'60px', height:'60px', borderRadius:'10px', border:'1px dashed #ccc', display:'flex', alignItems:'center', justifyContent:'center', color:'#888'}}>
                                <Plus size={20}/>
                            </button>
                        </div>
                    </div>

                </div>
                <button disabled={!isReady} onClick={handleSave} style={{marginTop:'10px', width:'100%', padding:'15px', background: isReady?'#111':'#ccc', color:'white', borderRadius:'15px', border:'none', fontWeight:'700', fontSize:'1rem'}}>Guardar en Favoritos</button>

                {selectingFor && (
                    <div style={{position:'absolute', inset:0, background:'white', zIndex:20, display:'flex', flexDirection:'column'}}>
                        <div style={{padding:'15px', borderBottom:'1px solid #eee', display:'flex', alignItems:'center', gap:'10px'}}>
                            <button onClick={()=>setSelectingFor(null)}><ChevronLeft/></button>
                            <h4 style={{margin:0, textTransform:'capitalize'}}>Elige {selectingFor === 'outerwear' ? 'Capa Exterior' : selectingFor === 'top' ? 'Parte de Arriba' : selectingFor}</h4>
                        </div>
                        <div style={{flex:1, overflowY:'auto', padding:'15px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                            {getFilteredOptions().map(c => (
                                <div key={c.id} onClick={() => handleSelect(c)} style={{cursor:'pointer', position:'relative'}}>
                                    <div style={{aspectRatio:'3/4', position:'relative', borderRadius:'10px', overflow:'hidden', border: c.isWishlist ? '2px solid #fbbf24' : '1px solid #eee'}}>
                                        <Image src={c.image} alt="img" fill style={{objectFit:'cover'}}/>
                                        {c.isWishlist && <div style={{position:'absolute', top:5, right:5, background:'rgba(255,255,255,0.8)', borderRadius:'50%', padding:'2px'}}><Star size={10} color="#fbbf24" fill="#fbbf24"/></div>}
                                        <div style={{position:'absolute', bottom:0, left:0, right:0, background:'rgba(255,255,255,0.9)', padding:'5px', fontSize:'0.7rem', fontWeight:'600', textAlign:'center'}}>{c.name}</div>
                                    </div>
                                </div>
                            ))}
                            {getFilteredOptions().length === 0 && <div style={{gridColumn:'1/-1', textAlign:'center', padding:'20px', color:'#999'}}>No hay prendas de este tipo disponibles.</div>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function SelectionSlot({ label, item, onClick, onRemove, isWide }: any) {
    return (
        <div style={{border:'2px dashed #ddd', borderRadius:'15px', padding:'5px', minHeight: isWide ? '80px' : '120px', width: isWide ? '100%' : 'auto', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative', overflow:'hidden', background:'#fafafa'}} onClick={!item ? onClick : undefined}>
            {item ? (
                <>
                    <Image src={item.image} alt="selected" fill style={{objectFit:'contain', padding:'5px'}} />
                    {onRemove && (
                        <button onClick={(e) => {e.stopPropagation(); onRemove()}} style={{position:'absolute', top:5, right:5, background:'white', borderRadius:'50%', width:'24px', height:'24px', border:'1px solid #eee', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10}}>
                            <X size={14} color="#333"/>
                        </button>
                    )}
                    <div style={{position:'absolute', bottom:5, left:5, background:'rgba(255,255,255,0.8)', padding:'2px 6px', borderRadius:'10px', fontSize:'0.7rem', fontWeight:'600'}}>{item.subCategory}</div>
                </>
            ) : (
                <div style={{color:'#999', fontSize:'0.8rem', fontWeight:'600', textAlign:'center', padding:'10px'}} onClick={onClick}>{label}</div>
            )}
        </div>
    )
}

function FavoritesView({ clothes, currentUser }: { clothes: Prenda[], currentUser: string }) {
    const [favorites, setFavorites] = useState<Outfit[]>([]);
    const [loading, setLoading] = useState(true);
    const [isManualOpen, setIsManualOpen] = useState(false); 

    useEffect(() => {
        const q = query(collection(db, 'favorites'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Outfit[];
            setFavorites(data.filter(f => !f.owner || f.owner === currentUser));
            setLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser]);

    const handleSaveManual = async (outfit: Outfit) => {
        try {
            await addDoc(collection(db, 'favorites'), { ...outfit, owner: currentUser, createdAt: serverTimestamp() });
            setIsManualOpen(false);
        } catch (e) { alert("Error"); }
    }

    const deleteFav = async (id: string) => { if(confirm("¿Olvidar este look?")) await deleteDoc(doc(db, 'favorites', id)); }
    if(loading) return <p>Cargando favoritos...</p>;

    return (
        <div className="fade-in">
            <button onClick={() => setIsManualOpen(true)} style={{width:'100%', padding:'15px', background:'rgba(255,255,255,0.5)', border:'2px dashed #ccc', borderRadius:'15px', marginBottom:'20px', fontWeight:'700', color:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', cursor:'pointer'}}>
                <Plus size={20}/> Crear mi propio Outfit
            </button>

            {favorites.length === 0 ? (
                 <div style={{textAlign:'center', padding:'40px 20px', opacity:0.6}}><Heart size={40} style={{marginBottom:'10px', opacity:0.3}} /><p>Todavía no has guardado ningún look.</p></div>
            ) : (
                <div style={{display:'grid', gap:'20px'}}>
                    {favorites.map(fav => (
                        <div key={fav.id} style={{background:'white', borderRadius:'20px', padding:'15px', boxShadow:'0 4px 15px rgba(0,0,0,0.05)', border:'1px solid #f0f0f0', position:'relative', color:'#111'}}>
                            <button onClick={() => deleteFav(fav.id!)} style={{position:'absolute', top:'10px', right:'10px', zIndex:5, background:'white', border:'1px solid #eee', borderRadius:'50%', width:'28px', height:'28px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}><Trash2 size={14} color="#999"/></button>
                            
                            {/* Mostrar Abrigo si tiene */}
                            {fav.outerwear && (
                                <div style={{marginBottom:'5px', display:'flex', alignItems:'center', gap:'5px', fontSize:'0.75rem', color:'#666', background:'#f9f9f9', padding:'5px', borderRadius:'8px', width:'fit-content'}}>
                                    <Layers size={12}/> + {fav.outerwear.name}
                                </div>
                            )}

                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'5px'}}>
                                {fav.type === '1-piece' ? (
                                    <div style={{gridColumn: 'span 2', aspectRatio:'2/1', background:'#f9f9f9', borderRadius:'10px', overflow:'hidden', position:'relative'}}>
                                        {fav.body?.image && <Image src={fav.body.image} alt="body" fill style={{objectFit:'contain', padding:'5px'}}/>}
                                    </div>
                                ) : (
                                    <>
                                        <div style={{aspectRatio:'1/1', background:'#f9f9f9', borderRadius:'10px', overflow:'hidden', position:'relative'}}>{fav.top?.image && <Image src={fav.top.image} alt="t" fill style={{objectFit:'contain', padding:'5px'}}/>}</div>
                                        <div style={{aspectRatio:'1/1', background:'#f9f9f9', borderRadius:'10px', overflow:'hidden', position:'relative'}}>{fav.bottom?.image && <Image src={fav.bottom.image} alt="b" fill style={{objectFit:'contain', padding:'5px'}}/>}</div>
                                    </>
                                )}
                                <div style={{aspectRatio:'1/1', background:'#f9f9f9', borderRadius:'10px', overflow:'hidden', position:'relative', display:'flex', alignItems:'center', justifyContent:'center'}}>{fav.shoes ? <Image src={fav.shoes.image} alt="s" fill style={{objectFit:'contain', padding:'5px'}}/> : <Footprints size={20} color="#ccc"/>}</div>
                            </div>

                            {/* Iconos de accesorios pequeños debajo */}
                            {fav.accessories && fav.accessories.length > 0 && (
                                <div style={{marginTop:'8px', display:'flex', gap:'5px'}}>
                                    {fav.accessories.map((acc, i) => (
                                        <div key={i} style={{width:'30px', height:'30px', borderRadius:'50%', background:'#f0f0f0', overflow:'hidden', position:'relative', border:'1px solid white'}}>
                                            <Image src={acc.image} fill style={{objectFit:'cover'}} alt="acc"/>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            
            {isManualOpen && <ManualOutfitCreator clothes={clothes} onSave={handleSaveManual} onClose={() => setIsManualOpen(false)} />}
        </div>
    )
}

// --- ARMARIO VIEW (ACTUALIZADO CON MODOS) ---
function ArmarioView({ clothes, loading, currentUser, viewMode }: { clothes: Prenda[], loading: boolean, currentUser: string, viewMode: 'wardrobe' | 'wishlist' | 'sales' }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'color' | 'category'>('date'); 
    const [editingPrenda, setEditingPrenda] = useState<Prenda | null>(null);

    let filteredClothes = clothes.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        c.subCategory.toLowerCase().includes(search.toLowerCase()) ||
        c.estilos.some(s => s.toLowerCase().includes(search.toLowerCase())) ||
        (c.brand && c.brand.toLowerCase().includes(search.toLowerCase()))
    );

    filteredClothes.sort((a, b) => {
        if (sortBy === 'date') return (b.createdAt || 0) - (a.createdAt || 0);
        else if (sortBy === 'color') return a.primaryColor.name.localeCompare(b.primaryColor.name);
        else if (sortBy === 'category') {
            if (a.category !== b.category) return a.category.localeCompare(b.category);
            return a.subCategory.localeCompare(b.subCategory);
        }
        return 0;
    });

    const dirtyCount = clothes.filter(c => c.dirty).length;

    const handleSavePrenda = async (data: any, file?: File) => {
        try {
            const { id, ...dataToSave } = data;
            let imageUrl = dataToSave.image;
            if (file) {
                const compressedFile = await compressImage(file);
                const storageRef = ref(storage, `armario/${Date.now()}-${compressedFile.name}`);
                await uploadBytes(storageRef, compressedFile);
                imageUrl = await getDownloadURL(storageRef);
            }
            dataToSave.image = imageUrl;
            // Forzamos el modo correcto al crear
            dataToSave.isWishlist = viewMode === 'wishlist';
            dataToSave.forSale = viewMode === 'sales';

            if (id) {
                const docRef = doc(db, 'clothes', id);
                await updateDoc(docRef, dataToSave);
            } else {
                await addDoc(collection(db, 'clothes'), { ...dataToSave, owner: currentUser, dirty: false, createdAt: serverTimestamp() });
            }
            setEditingPrenda(null); 
        } catch (error) { console.error("ERROR REAL:", error); alert("Error al guardar: " + (error as any).message); }
    };

    const handleDelete = async (id: string) => { if(confirm("¿Borrar definitivamente?")) await deleteDoc(doc(db, 'clothes', id)); };
    const toggleDirty = async (id: string, currentDirty: boolean) => { await updateDoc(doc(db, 'clothes', id), { dirty: !currentDirty }); };
    
    // Mover de Wishlist -> Armario
    const moveToWardrobe = async (id: string) => {
        if(confirm("¿Ya tienes esta prenda? ¡Genial! La movemos a tu armario.")) {
            await updateDoc(doc(db, 'clothes', id), { isWishlist: false, forSale: false, createdAt: serverTimestamp() });
        }
    }

    // Mover de Armario -> Ventas
    const sellItem = async (id: string) => {
        if(confirm("¿Poner a la venta? Desaparecerá de tu armario y outfits.")) {
            await updateDoc(doc(db, 'clothes', id), { forSale: true, isWishlist: false, dirty: false });
        }
    }

    // Mover de Ventas -> Armario
    const returnToWardrobe = async (id: string) => {
        if(confirm("¿Recuperar al armario?")) {
            await updateDoc(doc(db, 'clothes', id), { forSale: false });
        }
    }

    const cleanAll = async () => {
        if(!confirm(`¿Lavar ${dirtyCount} prendas?`)) return;
        const batch = writeBatch(db);
        clothes.filter(c => c.dirty).forEach(c => { batch.update(doc(db, 'clothes', c.id), { dirty: false }); });
        await batch.commit();
        alert("¡Lavadora puesta! 🫧");
    };

    const openEdit = (prenda: Prenda) => { setEditingPrenda(prenda); setIsModalOpen(true); };
    const openNew = () => { setEditingPrenda(null); setIsModalOpen(true); }

    const getPlaceholder = () => {
        if (viewMode === 'wishlist') return 'Tu lista de deseos está vacía.';
        if (viewMode === 'sales') return 'No tienes nada a la venta.';
        return '¡Sube ropa para empezar!';
    }

    return (
        <div className="fade-in">
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection:'column', gap:'10px' }}>
                <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                    <div style={{flex:1, position:'relative', color:'#111'}}>
                        <Search size={18} style={{position:'absolute', left:'12px', top:'12px', color:'#999'}}/>
                        <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} style={{width:'100%', padding:'12px 12px 12px 40px', borderRadius:'12px', border:'1px solid #eee', background:'#f9f9f9', fontSize:'0.9rem'}} />
                    </div>
                     <button onClick={() => openNew()} style={{ background: '#111', color: 'white', border: 'none', width: '45px', height: '45px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', flexShrink:0 }}><Camera size={24} /></button>
                </div>
                
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'5px', background: currentUser==='Jorge'?'rgba(255,255,255,0.2)':'#f5f5f5', padding:'5px 10px', borderRadius:'10px'}}>
                        <ArrowUpDown size={14} color={currentUser==='Jorge'?'white':'#666'}/>
                        <select value={sortBy} onChange={(e:any) => setSortBy(e.target.value)} style={{background:'transparent', border:'none', fontSize:'0.85rem', fontWeight:'600', color:currentUser==='Jorge'?'white':'#444'}}>
                            <option value="date">Más recientes</option>
                            <option value="color">Por Color</option>
                            <option value="category">Por Tipo</option>
                        </select>
                    </div>

                    {viewMode === 'wardrobe' && dirtyCount > 0 && (
                        <button onClick={cleanAll} style={{ background: '#E3F2FD', color: '#2196F3', border: 'none', padding:'0 15px', height: '35px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap:'5px', cursor: 'pointer', fontWeight:'700', fontSize:'0.8rem' }}>
                            <Droplets size={18} /> {dirtyCount}
                        </button>
                    )}
                </div>
            </div>

            {loading ? <p>Cargando...</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                    {filteredClothes.map((prenda) => (
                        <div key={prenda.id} style={{ position: 'relative', color:'#111' }}>
                            <div style={{ aspectRatio: '3/4', background: '#f4f4f5', borderRadius: '20px', overflow: 'hidden', marginBottom: '8px', position: 'relative' }}>
                                 {prenda.dirty && viewMode === 'wardrobe' && (
                                     <div style={{position:'absolute', top:0, left:0, right:0, bottom:0, background:'rgba(255,255,255,0.7)', zIndex:2, display:'flex', alignItems:'center', justifyContent:'center'}}>
                                         <div style={{background:'white', padding:'8px', borderRadius:'50%', boxShadow:'0 4px 10px rgba(0,0,0,0.1)'}}><Droplets size={24} color="#ccc"/></div>
                                     </div>
                                 )}
                                 <Image src={prenda.image} alt={prenda.name} fill style={{ objectFit: 'cover' }} />
                                 
                                 {/* BOTONES DE ACCION EN LA TARJETA */}
                                 <div style={{position:'absolute', top:'8px', right:'8px', zIndex:5, display:'flex', gap:'5px'}}>
                                     
                                     {/* Modo Wishlist: Mover a Armario */}
                                     {viewMode === 'wishlist' && (
                                         <button onClick={() => moveToWardrobe(prenda.id)} style={{background:'white', border:'none', borderRadius:'50%', width:'28px', height:'28px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}><ShoppingBag size={14} color="#4CAF50"/></button>
                                     )}

                                     {/* Modo Armario: Vender */}
                                     {viewMode === 'wardrobe' && (
                                         <button onClick={() => sellItem(prenda.id)} style={{background:'white', border:'none', borderRadius:'50%', width:'28px', height:'28px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}><Coins size={14} color="#F59E0B"/></button>
                                     )}

                                     {/* Modo Ventas: Recuperar */}
                                     {viewMode === 'sales' && (
                                         <button onClick={() => returnToWardrobe(prenda.id)} style={{background:'white', border:'none', borderRadius:'50%', width:'28px', height:'28px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}><RotateCcw size={14} color="#10B981"/></button>
                                     )}

                                     <button onClick={() => openEdit(prenda)} style={{background:'white', border:'none', borderRadius:'50%', width:'28px', height:'28px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}><Edit3 size={14} color="#333"/></button>
                                     
                                     {viewMode === 'wardrobe' && <button onClick={() => toggleDirty(prenda.id, prenda.dirty || false)} style={{background:'white', border:'none', borderRadius:'50%', width:'28px', height:'28px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}><Droplets size={14} color={prenda.dirty ? '#2196F3' : '#ccc'}/></button>}
                                     
                                     <button onClick={() => handleDelete(prenda.id)} style={{background:'white', border:'none', borderRadius:'50%', width:'28px', height:'28px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}><Trash2 size={14} color="#ff6b6b"/></button>
                                 </div>
                            </div>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: '700', margin: '0 0 5px 0', color: prenda.dirty ? '#ccc' : (currentUser==='Jorge'?'white':'#111') }}>{prenda.name}</h3>
                                {prenda.price ? <span style={{fontSize:'0.75rem', fontWeight:'600', color:'#4CAF50'}}>{prenda.price}€</span> : null}
                            </div>
                            <div style={{display:'flex', gap:'5px', flexWrap:'wrap', opacity: prenda.dirty ? 0.5 : 1}}>
                                <Badge text={prenda.subCategory} />
                                {prenda.estilos.length > 0 && <Badge text={prenda.estilos[0]} color="#fff" />}
                            </div>
                            <div style={{display:'flex', gap:'3px', marginTop:'5px'}}>
                                <div style={{width:'10px', height:'10px', borderRadius:'50%', background: prenda.primaryColor.hex, border:'1px solid #ddd'}}></div>
                                {prenda.secondaryColors?.map((sc, idx) => (
                                    <div key={idx} style={{width:'10px', height:'10px', borderRadius:'50%', background: sc.hex, border:'1px solid #ddd'}}></div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {clothes.length === 0 && <p style={{color:'inherit', opacity:0.6, gridColumn:'1/-1', textAlign:'center', marginTop:'50px'}}>{getPlaceholder()}</p>}
                </div>
            )}
            {isModalOpen && <UploadModal initialData={editingPrenda} onClose={() => setIsModalOpen(false)} onSave={handleSavePrenda} isWishlistDefault={viewMode === 'wishlist'} />}
        </div>
    );
}

// --- MODAL ---
function UploadModal({ initialData, onClose, onSave, isWishlistDefault }: { initialData?: Prenda | null, onClose: any, onSave: any, isWishlistDefault?: boolean }) {
    const [mode, setMode] = useState<'upload' | 'url'>('upload'); 
    const [file, setFile] = useState<File | null>(null);
    const [urlInput, setUrlInput] = useState('');
    const [loadingUrl, setLoadingUrl] = useState(false);
    
    // CAMPOS DE DATOS
    const [name, setName] = useState(initialData?.name || '');
    const [brand, setBrand] = useState(initialData?.brand || '');
    const [price, setPrice] = useState(initialData?.price?.toString() || '');
    const [category, setCategory] = useState<'top' | 'bottom' | 'shoes' | 'body' | 'accessories'>(initialData?.category || 'top');
    const [subCategory, setSubCategory] = useState(initialData?.subCategory || '');
    
    const [selectedStyles, setSelectedStyles] = useState<Estilo[]>(initialData?.estilos || ['casual']);
    const [selectedSeasons, setSelectedSeasons] = useState<Season[]>(initialData?.seasons || ['primavera', 'verano']);

    const [primaryColor, setPrimaryColor] = useState<ColorInfo>(initialData?.primaryColor || { name: 'white', hex: '#ffffff' });
    const [secondaryColors, setSecondaryColors] = useState<ColorInfo[]>(initialData?.secondaryColors || []);

    const [isUploading, setIsUploading] = useState(false);
    const [preview, setPreview] = useState(initialData?.image || '');
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleColorPick = (hex: string, type: 'primary' | 'secondary', index?: number) => {
        const rgb = hexToRgb(hex);
        const closest = findClosestColorName(rgb[0], rgb[1], rgb[2]);
        const colorInfo: ColorInfo = { name: closest.value, hex: hex }; 

        if (type === 'primary') {
            setPrimaryColor(colorInfo);
        } else if (type === 'secondary') {
            if (index === -1) setSecondaryColors([...secondaryColors, colorInfo]);
            else if (index !== undefined) {
                const newSecs = [...secondaryColors];
                newSecs[index] = colorInfo;
                setSecondaryColors(newSecs);
            }
        }
    };

    const removeSecondaryColor = (index: number) => {
        const newSecs = [...secondaryColors];
        newSecs.splice(index, 1);
        setSecondaryColors(newSecs);
    }

    const toggleStyle = (style: Estilo) => {
        if (selectedStyles.includes(style)) setSelectedStyles(selectedStyles.filter(s => s !== style));
        else setSelectedStyles([...selectedStyles, style]);
    }

    const toggleSeason = (season: Season) => {
        if (selectedSeasons.includes(season)) setSelectedSeasons(selectedSeasons.filter(s => s !== season));
        else setSelectedSeasons([...selectedSeasons, season]);
    }

    const handleUrlFetch = async () => {
        if (!urlInput) return; 
        setLoadingUrl(true);
        try {
            const res = await fetch(`/api/extract?url=${encodeURIComponent(urlInput)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.image) setPreview(data.image);
                if (data.title) setName(data.title);
                if (data.price) setPrice(data.price.toString());
                setFile(null);
            } else {
                 // Fallback simple si falla la API
                const resImg = await fetch(urlInput);
                const blob = await resImg.blob();
                const fetchedFile = new File([blob], "downloaded.jpg", { type: "image/jpeg" });
                setFile(fetchedFile);
            }
        } catch (e) { 
            console.log("Error extracción, usando valor directo:", e);
            setPreview(urlInput); // Si todo falla, intentamos usar la URL como imagen directa
        }
        setLoadingUrl(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) setFile(e.target.files[0]);
    };

    useEffect(() => {
        if (!file) return;
        const url = URL.createObjectURL(file);
        setPreview(url);
        
        const img = new window.Image();
        img.src = url;
        img.crossOrigin = "Anonymous";
        img.onload = () => { detectColor(img); };
        
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const detectColor = (img: HTMLImageElement) => {
        try {
            const canvas = canvasRef.current; if (!canvas) return;
            const ctx = canvas.getContext('2d'); if (!ctx) return;
            canvas.width = 50; canvas.height = 50;
            ctx.clearRect(0, 0, 50, 50);
            ctx.drawImage(img, 0, 0, 50, 50);
            const imageData = ctx.getImageData(10, 10, 30, 30);
            const data = imageData.data;
            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3];
                if (alpha > 128) { r += data[i]; g += data[i+1]; b += data[i+2]; count++; }
            }
            if (count > 0) { r = Math.floor(r / count); g = Math.floor(g / count); b = Math.floor(b / count); } 
            else { r = 255; g = 255; b = 255; }
            
            const detectedHex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            const closest = findClosestColorName(r,g,b);
            setPrimaryColor({ name: closest.value, hex: detectedHex });
        } catch(e) { console.log("No se pudo detectar color auto."); }
    };

    const handleConfirm = async () => {
        if (!name) return alert("Por favor, ponle un nombre a la prenda.");
        if (!subCategory) return alert("Selecciona un tipo específico (haz click en las etiquetas grises, ej: 'Camiseta').");
        if (!file && !initialData && !preview) return alert("Por favor sube una imagen o pon una URL.");
        
        setIsUploading(true);
        
        const finalData = {
            id: initialData?.id,
            name, brand, price: Number(price), category, subCategory, 
            estilos: selectedStyles, 
            seasons: selectedSeasons,
            primaryColor, secondaryColors,
            image: preview, 
            isWishlist: initialData ? initialData.isWishlist : isWishlistDefault,
            forSale: initialData ? initialData.forSale : false
        };

        await onSave(finalData, file); 
        setIsUploading(false); onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                    <h3 style={{margin:0, fontSize:'1.2rem', fontWeight:'800'}}>{initialData ? 'Editar' : 'Añadir'}</h3>
                    <button onClick={onClose} style={{background:'none', border:'none', cursor:'pointer'}}><X size={20}/></button>
                </div>
                
                <div style={{width:'100%', height:'180px', background:'repeating-conic-gradient(#f0f0f0 0% 25%, #ffffff 0% 50%) 50% / 20px 20px', borderRadius:'12px', overflow:'hidden', marginBottom:'15px', position:'relative', boxShadow:'inset 0 0 10px rgba(0,0,0,0.05)'}}>
                    {preview ? ( <Image src={preview} alt="Preview" fill style={{objectFit:'contain', padding:'10px'}} unoptimized /> ) : ( <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#ccc'}}>Sin imagen</div> )}
                    <canvas ref={canvasRef} style={{display:'none'}}></canvas>
                    {!initialData && !file && (
                         <div style={{position:'absolute', inset:0, background:'rgba(255,255,255,0.8)', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', gap:'10px'}}>
                             <button onClick={()=>setMode('upload')} style={{padding:'8px 15px', background:'#111', color:'white', borderRadius:'8px', border:'none', cursor:'pointer'}}>Subir Foto</button>
                             <button onClick={()=>setMode('url')} style={{padding:'8px 15px', background:'white', border:'1px solid #111', borderRadius:'8px', cursor:'pointer'}}>Enlace URL</button>
                         </div>
                    )}
                    {(initialData || file || preview) && (
                        <label style={{position:'absolute', bottom:'10px', right:'10px', background:'rgba(0,0,0,0.6)', color:'white', padding:'5px 10px', borderRadius:'20px', fontSize:'0.7rem', cursor:'pointer', display:'flex', gap:'5px', alignItems:'center'}}>
                            <Edit3 size={12}/> Cambiar foto
                            <input type="file" onChange={handleFileChange} style={{display:'none'}} accept="image/*" />
                        </label>
                    )}
                </div>

                {mode === 'url' && !file && !initialData && (
                     <div style={{marginBottom:'15px', display:'flex', gap:'5px'}}>
                        <input type="text" placeholder="Pega el enlace..." value={urlInput} onChange={(e)=>setUrlInput(e.target.value)} style={{flex:1, padding:'10px', borderRadius:'8px', border:'1px solid #ddd'}} />
                        <button onClick={handleUrlFetch} disabled={!urlInput} style={{background:'#111', color:'white', border:'none', borderRadius:'8px', padding:'0 15px', display:'flex', alignItems:'center', gap:'5px'}}>
                            {loadingUrl ? <RefreshCw className="spin" size={14}/> : <Wand2 size={14}/>} Magic Import
                        </button>
                     </div>
                )}

                <SectionLabel icon={<Layers size={14}/>} label="TIPO" />
                <div style={{display:'flex', gap:'5px', marginBottom:'15px', flexWrap:'wrap'}}>
                    <CategoryBtn label="Arriba" active={category==='top'} onClick={()=>{setCategory('top'); setSubCategory('')}} />
                    <CategoryBtn label="Abajo" active={category==='bottom'} onClick={()=>{setCategory('bottom'); setSubCategory('')}} />
                    <CategoryBtn label="Cuerpo" active={category==='body'} onClick={()=>{setCategory('body'); setSubCategory('')}} />
                    <CategoryBtn label="Pies" active={category==='shoes'} onClick={()=>{setCategory('shoes'); setSubCategory('')}} />
                    <CategoryBtn label="Accesorios" active={category==='accessories'} onClick={()=>{setCategory('accessories'); setSubCategory('')}} />
                </div>
                
                <div className="no-scrollbar" style={{display:'flex', gap:'5px', overflowX:'auto', padding:'5px', marginBottom:'15px', border: !subCategory ? '1px dashed red' : '1px solid transparent', borderRadius:'8px'}}>
                    {SUB_CATEGORIES[category] ? SUB_CATEGORIES[category].map((sub) => <Chip key={sub} label={sub} active={subCategory === sub} onClick={() => setSubCategory(sub)} />) : null}
                </div>
                {!subCategory && <div style={{fontSize:'0.7rem', color:'red', marginTop:'-10px', marginBottom:'10px'}}>* Selecciona una opción</div>}
                
                <SectionLabel icon={<CloudSun size={14}/>} label="TEMPORADA" />
                <div style={{display:'flex', flexWrap:'wrap', gap:'8px', marginBottom:'20px'}}>
                    {SEASONS.map(s => ( <Chip key={s.value} label={s.label} active={selectedSeasons.includes(s.value)} onClick={()=>toggleSeason(s.value)} /> ))}
                </div>

                <SectionLabel icon={<Tag size={14}/>} label="ESTILOS" />
                <div style={{display:'flex', flexWrap:'wrap', gap:'8px', marginBottom:'20px'}}>
                    {STYLES.map(s => ( <Chip key={s.value} label={s.label} active={selectedStyles.includes(s.value)} onClick={()=>toggleStyle(s.value)} /> ))}
                </div>

                <SectionLabel icon={<Palette size={14}/>} label="COLORES" />
                <div style={{background:'#f9f9f9', padding:'15px', borderRadius:'12px', marginBottom:'20px'}}>
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px'}}>
                        <span style={{fontSize:'0.8rem', fontWeight:'600'}}>Principal:</span>
                        <div style={{position:'relative', width:'40px', height:'40px', borderRadius:'50%', overflow:'hidden', border:'2px solid #fff', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
                            <input type="color" value={primaryColor.hex} onChange={(e) => handleColorPick(e.target.value, 'primary')} style={{opacity:0, width:'100%', height:'100%', cursor:'pointer'}} />
                            <div style={{position:'absolute', inset:0, background:primaryColor.hex, pointerEvents:'none'}}></div>
                        </div>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
                        <span style={{fontSize:'0.8rem', fontWeight:'600'}}>Secundarios:</span>
                        {secondaryColors.map((sc, idx) => (
                             <div key={idx} style={{position:'relative', width:'30px', height:'30px', borderRadius:'50%', overflow:'hidden', border:'1px solid #ddd'}}>
                                <div style={{position:'absolute', inset:0, background:sc.hex}}></div>
                                <button onClick={()=>removeSecondaryColor(idx)} style={{position:'absolute', top:0, right:0, bottom:0, left:0, background:'rgba(0,0,0,0.3)', border:'none', color:'white', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', opacity:0, transition:'opacity 0.2s'}} className="hover-show"><X size={12}/></button>
                                <style>{`.hover-show:hover { opacity: 1 !important; }`}</style>
                             </div>
                        ))}
                        <label style={{width:'30px', height:'30px', borderRadius:'50%', border:'1px dashed #999', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', background:'white'}}>
                            <Plus size={14} color="#666"/>
                            <input type="color" onChange={(e) => handleColorPick(e.target.value, 'secondary', -1)} style={{display:'none'}} />
                        </label>
                    </div>
                </div>
                
                <SectionLabel icon={<ShoppingBag size={14}/>} label="DETALLES (Opcional)" />
                <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
                    <input type="text" placeholder="Marca (ej. Zara)" value={brand} onChange={e => setBrand(e.target.value)} style={{flex:1, padding:'12px', borderRadius:'12px', border:'1px solid #eee', background:'#f9f9f9'}} />
                    <input type="number" placeholder="Precio (€)" value={price} onChange={e => setPrice(e.target.value)} style={{width:'100px', padding:'12px', borderRadius:'12px', border:'1px solid #eee', background:'#f9f9f9'}} />
                </div>

                <input type="text" placeholder="Nombre (ej. Mi favorita)" value={name} onChange={e => setName(e.target.value)} style={{width:'100%', padding:'12px', borderRadius:'12px', border:'1px solid #eee', marginBottom:'15px', background:'#f9f9f9'}} />
                
                <button onClick={handleConfirm} disabled={isUploading} style={{width:'100%', padding:'15px', background: '#111', color:'white', border:'none', borderRadius:'14px', fontWeight:'700', cursor:'pointer', opacity: isUploading ? 0.5 : 1}}>{isUploading ? 'Guardando...' : 'Guardar'}</button>
            </div>
        </div>
    );
}

function Badge({text, color='#eef', textColor='#444'}:any) { return <span style={{fontSize:'0.85rem', background:color, padding:'4px 8px', borderRadius:'6px', fontWeight:'600', color:textColor}}>{text}</span> }
function SectionLabel({icon, label}:any) { return <div style={{display:'flex', alignItems:'center', gap:'5px', fontSize:'0.75rem', fontWeight:'700', color:'#888', marginBottom:'8px', letterSpacing:'0.5px'}}>{icon} {label}</div> }
function CategoryBtn({label, active, onClick}:any) { return <button onClick={onClick} style={{flex:1, padding:'10px 5px', border: active?'2px solid #111':'1px solid #eee', background: active?'white':'#f9f9f9', borderRadius:'8px', fontSize:'0.9rem', fontWeight:'600', cursor:'pointer', minWidth:'70px'}}>{label}</button> }
function Chip({label, active, onClick}:any) { return <button onClick={onClick} style={{padding:'6px 14px', border: active?'2px solid #111':'1px solid #ddd', background: active?'#111':'white', color: active?'white':'#666', borderRadius:'20px', fontSize:'0.85rem', fontWeight:'600', cursor:'pointer', whiteSpace:'nowrap'}}>{label}</button> }
function TabButton({ label, active, onClick, icon, currentUser }: any) { return <button onClick={onClick} style={{ flex: 1, padding: '12px', background: 'transparent', border:'none', color: active ? (currentUser==='Jorge'?'white':'#111') : (currentUser==='Jorge'?'rgba(255,255,255,0.6)':'#888'), fontWeight: active ? '800' : '600', display: 'flex', justifyContent: 'center', gap: '8px', cursor:'pointer', transition:'all 0.2s', transform: active ? 'scale(1.05)' : 'scale(1)', minWidth: '70px' }}>{icon} {label}</button>; }