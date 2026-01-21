'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import Image from 'next/image';
import { CloudSun, Shirt, Sparkles, Camera, Trash2, X, Check, Footprints, Layers, RefreshCw, Palette, Tag, Edit3, Link as LinkIcon, UploadCloud, MapPin, Thermometer, Heart, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, User, LogOut, PieChart, TrendingUp, AlertCircle, Briefcase, Search, ArrowRight, Droplets, Banknote, ShoppingBag, ArrowUpDown, Filter, Star, Snowflake, Sun, CloudRain, ShoppingCart } from 'lucide-react';

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
];

interface ColorInfo { name: string; hex: string; }

interface Prenda { 
  id: string; 
  owner?: string;
  name: string; 
  brand?: string;
  price?: number;
  category: 'top' | 'bottom' | 'shoes' | 'body';
  subCategory: string;
  estilos: Estilo[]; 
  primaryColor: ColorInfo;
  secondaryColors?: ColorInfo[];
  seasons: Season[]; // NUEVO: Temporadas
  isWishlist: boolean; // NUEVO: Wishlist flag
  image: string; 
  dirty?: boolean;
  createdAt?: any;
}

interface Outfit {
    id?: string;
    owner?: string;
    type: '2-piece' | '1-piece';
    top?: Prenda | null;
    bottom?: Prenda | null;
    body?: Prenda | null;
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
    top: ['Camiseta', 'Camisa', 'Sudadera', 'Chaqueta', 'Abrigo', 'Top', 'Blusa', 'Jersey'],
    bottom: ['Pantalón', 'Jeans', 'Falda', 'Shorts', 'Leggins'],
    body: ['Vestido', 'Mono', 'Peto', 'Traje'],
    shoes: ['Deportivas', 'Botas', 'Zapatos', 'Sandalias', 'Tacones', 'Mocasines']
};

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
  const [activeTab, setActiveTab] = useState<'outfit' | 'armario' | 'wishlist' | 'favoritos' | 'calendario' | 'stats' | 'maleta'>('outfit');
  const [clothes, setClothes] = useState<Prenda[]>([]);
  const [plannedDays, setPlannedDays] = useState<PlannedDay[]>([]); // Elevamos el estado para Stats
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<{temp: number, city: string, code: number} | null>(null);

  useEffect(() => {
    // 1. Cargar Ropa
    const q = query(collection(db, 'clothes'), orderBy('createdAt', 'desc'));
    const unsubscribeClothes = onSnapshot(q, (snapshot) => {
        const allData = snapshot.docs.map(doc => {
            const d = doc.data();
            const primaryColor = d.primaryColor || { name: d.colorName || 'black', hex: d.colorHex || '#000000' };
            const estilos = d.estilos || (d.estilo ? [d.estilo] : ['casual']);
            const seasons = d.seasons || ['primavera', 'verano', 'otono', 'invierno']; // Default to all if missing
            
            return { 
                id: doc.id, ...d, 
                estilos: estilos, 
                primaryColor: primaryColor,
                secondaryColors: d.secondaryColors || [],
                seasons: seasons,
                isWishlist: d.isWishlist || false,
                dirty: d.dirty || false,
                brand: d.brand || '',
                price: d.price || 0
            };
        }) as Prenda[];
        const myClothes = allData.filter(item => !item.owner || item.owner === currentUser);
        setClothes(myClothes);
        setLoading(false);
    });

    // 2. Cargar Calendario (para Stats de coste por uso)
    const qPlan = query(collection(db, 'planning'));
    const unsubscribePlan = onSnapshot(qPlan, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PlannedDay[];
        setPlannedDays(data.filter(p => !p.owner || p.owner === currentUser));
    });

    // 3. Cargar Clima
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
        case 'armario': return <ArmarioView clothes={clothes.filter(c => !c.isWishlist)} loading={loading} currentUser={currentUser} isWishlistMode={false} />;
        case 'wishlist': return <ArmarioView clothes={clothes.filter(c => c.isWishlist)} loading={loading} currentUser={currentUser} isWishlistMode={true} />;
        case 'favoritos': return <FavoritesView clothes={clothes} currentUser={currentUser} />;
        case 'calendario': return <CalendarView currentUser={currentUser} plannedDays={plannedDays} />;
        case 'stats': return <StatsView clothes={clothes.filter(c => !c.isWishlist)} plannedDays={plannedDays} />;
        case 'maleta': return <TripView clothes={clothes} currentUser={currentUser} />;
    }
  };
  
  return (
    <div style={{ fontFamily: 'var(--font-inter), sans-serif', background: '#ffffff', minHeight: '100vh', color: '#111111' }}>
        <style dangerouslySetInnerHTML={{__html: `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800;900&display=swap');
            .fade-in { animation: fadeIn 0.4s ease-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
            .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
            .modal-content { background: white; padding: 25px; borderRadius: 24px; width: 90%; max-width: 450px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 50px rgba(0,0,0,0.2); }
            .no-scrollbar::-webkit-scrollbar { display: none; }
            input[type="color"] { -webkit-appearance: none; border: none; width: 100%; height: 100%; padding: 0; overflow: hidden; opacity: 0; position: absolute; top:0; left:0; cursor: pointer; }
        `}} />

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 20px 100px 20px' }}>
        
        <header style={{ marginBottom: '20px', paddingTop: '20px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1.5px', margin: '0 0 5px 0', lineHeight: '1' }}>
                    Hola, {currentUser} <span style={{fontSize:'2rem'}}>✨</span>
                </h1>
                <p style={{ color: '#666', fontSize: '1rem', fontWeight: '500' }}>
                     {activeTab === 'outfit' && '¿Qué nos ponemos hoy?'}
                     {activeTab === 'armario' && 'Tu colección'}
                     {activeTab === 'wishlist' && 'Lista de deseos'}
                     {activeTab === 'favoritos' && 'Tus favoritos'}
                     {activeTab === 'calendario' && 'Tu semana'}
                     {activeTab === 'maleta' && 'Viajes y Maletas'}
                     {activeTab === 'stats' && 'Estadísticas & Valor'}
                </p>
            </div>
            
            <div style={{position:'relative', display:'flex', gap:'5px', background:'#f0f0f0', padding:'4px', borderRadius:'20px'}}>
                {USERS.map(u => (
                    <button key={u} onClick={() => setCurrentUser(u)} style={{padding:'8px 12px', borderRadius:'16px', border:'none', background: currentUser === u ? '#111' : 'transparent', color: currentUser === u ? 'white' : '#888', fontWeight:'700', fontSize:'0.8rem', cursor:'pointer', transition:'all 0.2s'}}>{u}</button>
                ))}
            </div>
        </header>

        <div className="no-scrollbar" style={{ display: 'flex', background: '#f4f4f5', padding: '5px', borderRadius: '16px', marginBottom: '30px', overflowX:'auto' }}>
            <TabButton label="Outfit" active={activeTab === 'outfit'} onClick={() => setActiveTab('outfit')} icon={<Sparkles size={16} />} />
            <TabButton label="Armario" active={activeTab === 'armario'} onClick={() => setActiveTab('armario')} icon={<Shirt size={16} />} />
            <TabButton label="Deseos" active={activeTab === 'wishlist'} onClick={() => setActiveTab('wishlist')} icon={<Star size={16} />} />
            <TabButton label="Favs" active={activeTab === 'favoritos'} onClick={() => setActiveTab('favoritos')} icon={<Heart size={16} />} />
            <TabButton label="Agenda" active={activeTab === 'calendario'} onClick={() => setActiveTab('calendario')} icon={<CalendarIcon size={16} />} />
            <TabButton label="Maleta" active={activeTab === 'maleta'} onClick={() => setActiveTab('maleta')} icon={<Briefcase size={16} />} />
            <TabButton label="Stats" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<PieChart size={16} />} />
        </div>

        {renderView()}

      </div>
    </div>
  );
}

// --- VISTA ESTADÍSTICAS & DINERO (MEJORADA CON COSTE POR USO) ---
function StatsView({ clothes, plannedDays }: { clothes: Prenda[], plannedDays: PlannedDay[] }) {
    const cleanClothes = clothes.filter(c => !c.dirty);
    const dirtyClothes = clothes.filter(c => c.dirty);

    const totalValue = clothes.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    const brandCounts = clothes.reduce((acc, curr) => { const b = curr.brand || 'Sin Marca'; acc[b] = (acc[b] || 0) + 1; return acc; }, {} as Record<string, number>);
    const topBrand = Object.entries(brandCounts).sort(([,a], [,b]) => b - a)[0];
    const colorCounts = clothes.reduce((acc, curr) => { const hex = curr.primaryColor.hex; acc[hex] = (acc[hex] || 0) + 1; return acc; }, {} as Record<string, number>);
    const sortedColors = Object.entries(colorCounts).sort(([,a], [,b]) => b - a).slice(0, 5);

    // CÁLCULO DE COSTE POR USO
    const usageMap = new Map<string, number>();
    plannedDays.forEach(day => {
        if(day.outfit.top) usageMap.set(day.outfit.top.id, (usageMap.get(day.outfit.top.id) || 0) + 1);
        if(day.outfit.bottom) usageMap.set(day.outfit.bottom.id, (usageMap.get(day.outfit.bottom.id) || 0) + 1);
        if(day.outfit.body) usageMap.set(day.outfit.body.id, (usageMap.get(day.outfit.body.id) || 0) + 1);
        if(day.outfit.shoes) usageMap.set(day.outfit.shoes.id, (usageMap.get(day.outfit.shoes.id) || 0) + 1);
    });

    const clothesWithCost = clothes.map(c => {
        const uses = usageMap.get(c.id) || 0;
        const costPerWear = c.price ? (c.price / (uses + 1)) : 0; // +1 para evitar infinito
        return { ...c, uses, costPerWear };
    }).sort((a,b) => b.costPerWear - a.costPerWear); // Ordenar por más caros de amortizar

    const bestAmortized = [...clothesWithCost].reverse().slice(0, 3).filter(c => c.price && c.price > 0);
    const worstAmortized = clothesWithCost.slice(0, 3).filter(c => c.price && c.price > 0 && c.uses < 3);

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

            {bestAmortized.length > 0 && (
                <div style={{marginBottom:'20px'}}>
                     <h3 style={{fontSize:'1rem', fontWeight:'800', marginBottom:'10px'}}>🌟 ¡Bien Amortizados!</h3>
                     <div style={{display:'flex', gap:'10px', overflowX:'auto'}} className="no-scrollbar">
                        {bestAmortized.map(c => (
                            <div key={c.id} style={{minWidth:'120px', background:'#f0fff4', padding:'10px', borderRadius:'12px', border:'1px solid #dcfce7'}}>
                                <div style={{width:'40px', height:'40px', position:'relative', borderRadius:'8px', overflow:'hidden', marginBottom:'5px'}}>
                                    <Image src={c.image} fill style={{objectFit:'cover'}} alt={c.name} />
                                </div>
                                <div style={{fontWeight:'700', fontSize:'0.8rem'}}>{c.name}</div>
                                <div style={{fontSize:'0.7rem', color:'#166534'}}>{c.costPerWear.toFixed(2)}€ / uso</div>
                            </div>
                        ))}
                     </div>
                </div>
            )}

            <div style={{background:'#eef', padding:'15px 20px', borderRadius:'16px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'15px'}}>
                <div style={{background:'white', padding:'10px', borderRadius:'50%'}}><Droplets size={20} color="#2196F3"/></div>
                <div><div style={{fontWeight:'700', fontSize:'0.9rem'}}>Estado Limpieza</div><div style={{fontSize:'0.8rem', color:'#666'}}>{dirtyClothes.length} sucias / {cleanClothes.length} limpias</div></div>
            </div>

            <div>
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

// --- VISTA OUTFIT MEJORADA CON TEMPORADA ---
function OutfitView({ clothes, weather, currentUser }: { clothes: Prenda[], weather: any, currentUser: string }) {
    const [outfit, setOutfit] = useState<Outfit | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [filterStyle, setFilterStyle] = useState<Estilo | 'all'>('all');

    const generateSmartOutfit = () => {
        setIsAnimating(true); setMessage('');
        
        // FILTRO 1: SOLO ROPA LIMPIA Y QUE NO SEA WISHLIST
        const cleanClothes = clothes.filter(c => !c.dirty && !c.isWishlist);
        
        // FILTRO 2: TEMPORADA (Según temperatura)
        let seasonFilter: Season[] = ['primavera', 'verano', 'otono', 'invierno']; // Por defecto todo
        let tempWarning = '';
        
        if (weather) {
            if (weather.temp < 12) {
                seasonFilter = ['invierno', 'otono'];
                tempWarning = '❄️ Hace frío. Buscando abrigo.';
            } else if (weather.temp < 20) {
                seasonFilter = ['primavera', 'otono'];
                tempWarning = '☁️ Tiempo fresco.';
            } else if (weather.temp >= 20) {
                seasonFilter = ['verano', 'primavera'];
                tempWarning = '☀️ Hace bueno.';
            }
        }

        const seasonalClothes = cleanClothes.filter(c => c.seasons.some(s => seasonFilter.includes(s)));
        // Si nos quedamos sin ropa por el filtro de clima, usamos todo lo limpio como fallback
        const pool = seasonalClothes.length > 5 ? seasonalClothes : cleanClothes;

        let tops = pool.filter(c => c.category === 'top');
        let bottoms = pool.filter(c => c.category === 'bottom');
        let bodies = pool.filter(c => c.category === 'body'); 
        let shoes = pool.filter(c => c.category === 'shoes');

        // FILTRO 3: ESTILO (Usuario)
        if (filterStyle !== 'all') {
            tops = tops.filter(c => c.estilos.includes(filterStyle));
            bottoms = bottoms.filter(c => c.estilos.includes(filterStyle));
            bodies = bodies.filter(c => c.estilos.includes(filterStyle));
            shoes = shoes.filter(c => c.estilos.includes(filterStyle));
        }
        
        // DECISIÓN: ¿2 PIEZAS O 1 PIEZA?
        let mode: '2-piece' | '1-piece' = '2-piece';
        if (bodies.length > 0 && (tops.length === 0 || bottoms.length === 0)) mode = '1-piece';
        else if (bodies.length > 0 && Math.random() > 0.7) mode = '1-piece';

        if (mode === '2-piece' && (tops.length === 0 || bottoms.length === 0)) {
             alert(filterStyle !== 'all' ? `No hay look ${filterStyle} disponible.` : "Falta ropa limpia para este clima.");
             setIsAnimating(false); return;
        }

        setTimeout(() => {
            let selectedShoes = shoes.length > 0 ? shoes[Math.floor(Math.random() * shoes.length)] : null;
            
            if (mode === '1-piece') {
                const selectedBody = bodies[Math.floor(Math.random() * bodies.length)];
                setOutfit({ type: '1-piece', body: selectedBody, shoes: selectedShoes, matchScore: 95 });
                setMessage(tempWarning || `Look de una pieza: ${selectedBody.estilos[0]}`);
            } else {
                const selectedTop = tops[Math.floor(Math.random() * tops.length)];
                let compatibleBottoms = bottoms.filter(b => {
                    const sharedStyles = b.estilos.filter(style => selectedTop.estilos.includes(style));
                    return sharedStyles.length > 0;
                });
                if (compatibleBottoms.length === 0) compatibleBottoms = bottoms;
                const selectedBottom = compatibleBottoms[Math.floor(Math.random() * compatibleBottoms.length)];
                
                setOutfit({ type: '2-piece', top: selectedTop, bottom: selectedBottom, shoes: selectedShoes, matchScore: 95 });
                
                const commonStyles = selectedTop.estilos.filter(s => selectedBottom.estilos.includes(s));
                if (commonStyles.length > 0) setMessage(tempWarning || `Un look ${commonStyles[0]} ideal.`);
                else setMessage(tempWarning || `Mix & Match.`);
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
                <div style={{fontSize:'0.8rem', fontWeight:'700', color:'#666', marginBottom:'10px', textAlign:'center', textTransform:'uppercase', letterSpacing:'1px'}}>¿Qué te apetece hoy?</div>
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
                    <div style={{ textAlign:'center', marginBottom:'15px', color:'#666', fontSize:'0.9rem', fontWeight:'600' }}>{message}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', gridTemplateRows: 'auto auto' }}>
                        {outfit.type === '1-piece' ? (
                             <div style={{ gridColumn: '1 / -1', aspectRatio: '3/4', position: 'relative', borderRadius: '20px', overflow: 'hidden', background:'#f4f4f5' }}>
                                <Image src={outfit.body!.image} alt="body" fill style={{ objectFit: 'contain', padding:'10px' }} />
                                <div style={{position:'absolute', bottom:'10px', left:'10px', display:'flex', gap:'5px'}}>
                                    <Badge text={outfit.body!.subCategory} />
                                </div>
                             </div>
                        ) : (
                            <>
                                <div style={{ gridColumn: '1 / -1', aspectRatio: '16/9', position: 'relative', borderRadius: '20px', overflow: 'hidden', background:'#f4f4f5' }}>
                                    <Image src={outfit.top!.image} alt="top" fill style={{ objectFit: 'contain', padding:'10px' }} />
                                    <div style={{position:'absolute', bottom:'10px', left:'10px', display:'flex', gap:'5px'}}>
                                        <Badge text={outfit.top!.subCategory} />
                                    </div>
                                </div>
                                <div style={{ aspectRatio: '1/1', position: 'relative', borderRadius: '20px', overflow: 'hidden', background:'#f4f4f5' }}><Image src={outfit.bottom!.image} alt="bottom" fill style={{ objectFit: 'contain', padding:'10px' }} /></div>
                            </>
                        )}
                        <div style={{ aspectRatio: '1/1', position: 'relative', borderRadius: '20px', overflow: 'hidden', background:'#f4f4f5', display:'flex', alignItems:'center', justifyContent:'center', color:'#ccc' }}>{outfit.shoes ? <Image src={outfit.shoes.image} alt="shoes" fill style={{ objectFit: 'contain', padding:'10px' }} /> : <Footprints size={40} />}</div>
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

// --- CREADOR MANUAL DE OUTFITS ---
function ManualOutfitCreator({ clothes, onSave, onClose }: { clothes: Prenda[], onSave: (o: Outfit) => void, onClose: () => void }) {
    const [mode, setMode] = useState<'2-piece' | '1-piece'>('2-piece');
    const [top, setTop] = useState<Prenda | null>(null);
    const [bottom, setBottom] = useState<Prenda | null>(null);
    const [body, setBody] = useState<Prenda | null>(null);
    const [shoes, setShoes] = useState<Prenda | null>(null);
    const [selectingFor, setSelectingFor] = useState<'top' | 'bottom' | 'body' | 'shoes' | null>(null);

    const handleSelect = (p: Prenda) => {
        if (selectingFor === 'top') setTop(p);
        if (selectingFor === 'bottom') setBottom(p);
        if (selectingFor === 'body') setBody(p);
        if (selectingFor === 'shoes') setShoes(p);
        setSelectingFor(null);
    }

    const handleSave = () => {
        if (mode === '2-piece' && top && bottom && shoes) {
            onSave({ type: '2-piece', top, bottom, shoes, matchScore: 100 });
        } else if (mode === '1-piece' && body && shoes) {
            onSave({ type: '1-piece', body, shoes, matchScore: 100 });
        }
    }

    const isReady = mode === '2-piece' ? (top && bottom && shoes) : (body && shoes);

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{height: '90vh', display:'flex', flexDirection:'column'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                    <h3 style={{margin:0}}>Crear Outfit Manual</h3>
                    <button onClick={onClose}><X/></button>
                </div>
                <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
                    <button onClick={()=>setMode('2-piece')} style={{flex:1, padding:'10px', border: mode==='2-piece'?'2px solid #111':'1px solid #eee', borderRadius:'10px', fontWeight:'600', background: mode==='2-piece'?'#111':'white', color: mode==='2-piece'?'white':'#111'}}>2 Piezas</button>
                    <button onClick={()=>setMode('1-piece')} style={{flex:1, padding:'10px', border: mode==='1-piece'?'2px solid #111':'1px solid #eee', borderRadius:'10px', fontWeight:'600', background: mode==='1-piece'?'#111':'white', color: mode==='1-piece'?'white':'#111'}}>1 Pieza</button>
                </div>
                <div style={{flex:1, display:'flex', flexDirection:'column', gap:'15px', overflowY:'auto'}}>
                    {mode === '2-piece' ? (
                        <>
                            <SelectionSlot label="Parte de Arriba" item={top} onClick={() => setSelectingFor('top')} />
                            <SelectionSlot label="Parte de Abajo" item={bottom} onClick={() => setSelectingFor('bottom')} />
                        </>
                    ) : (
                        <SelectionSlot label="Cuerpo (Vestido/Mono)" item={body} onClick={() => setSelectingFor('body')} />
                    )}
                    <SelectionSlot label="Calzado" item={shoes} onClick={() => setSelectingFor('shoes')} />
                </div>
                <button disabled={!isReady} onClick={handleSave} style={{marginTop:'20px', width:'100%', padding:'15px', background: isReady?'#111':'#ccc', color:'white', borderRadius:'15px', border:'none', fontWeight:'700', fontSize:'1rem'}}>Guardar en Favoritos</button>

                {selectingFor && (
                    <div style={{position:'absolute', inset:0, background:'white', zIndex:20, display:'flex', flexDirection:'column'}}>
                        <div style={{padding:'15px', borderBottom:'1px solid #eee', display:'flex', alignItems:'center', gap:'10px'}}>
                            <button onClick={()=>setSelectingFor(null)}><ChevronLeft/></button>
                            <h4 style={{margin:0}}>Elige {selectingFor}</h4>
                        </div>
                        <div style={{flex:1, overflowY:'auto', padding:'15px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                            {/* Mostramos ropa del armario Y de la wishlist */}
                            {clothes.filter(c => c.category === selectingFor).map(c => (
                                <div key={c.id} onClick={() => handleSelect(c)} style={{cursor:'pointer', position:'relative'}}>
                                    <div style={{aspectRatio:'3/4', position:'relative', borderRadius:'10px', overflow:'hidden', border: c.isWishlist ? '2px solid #fbbf24' : '1px solid #eee'}}>
                                        <Image src={c.image} alt="img" fill style={{objectFit:'cover'}}/>
                                        {c.isWishlist && <div style={{position:'absolute', top:5, right:5, background:'rgba(255,255,255,0.8)', borderRadius:'50%', padding:'2px'}}><Star size={10} color="#fbbf24" fill="#fbbf24"/></div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function SelectionSlot({ label, item, onClick }: any) {
    return (
        <div onClick={onClick} style={{border:'2px dashed #ddd', borderRadius:'15px', padding:'5px', minHeight:'100px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative', overflow:'hidden', background:'#fafafa'}}>
            {item ? (
                <>
                    <Image src={item.image} alt="selected" fill style={{objectFit:'contain', padding:'5px'}} />
                    {item.isWishlist && <div style={{position:'absolute', top:5, right:5, background:'white', borderRadius:'50%', padding:'4px', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}><Star size={12} color="#fbbf24" fill="#fbbf24"/></div>}
                </>
            ) : (
                <div style={{color:'#999', fontSize:'0.9rem', fontWeight:'600'}}>{label}</div>
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
            <button onClick={() => setIsManualOpen(true)} style={{width:'100%', padding:'15px', background:'#f0f0f0', border:'2px dashed #ccc', borderRadius:'15px', marginBottom:'20px', fontWeight:'700', color:'#444', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', cursor:'pointer'}}>
                <Plus size={20}/> Crear mi propio Outfit
            </button>

            {favorites.length === 0 ? (
                 <div style={{textAlign:'center', padding:'40px 20px', color:'#999'}}><Heart size={40} style={{marginBottom:'10px', opacity:0.3}} /><p>Todavía no has guardado ningún look.</p></div>
            ) : (
                <div style={{display:'grid', gap:'20px'}}>
                    {favorites.map(fav => (
                        <div key={fav.id} style={{background:'white', borderRadius:'20px', padding:'15px', boxShadow:'0 4px 15px rgba(0,0,0,0.05)', border:'1px solid #f0f0f0', position:'relative'}}>
                            <button onClick={() => deleteFav(fav.id!)} style={{position:'absolute', top:'10px', right:'10px', zIndex:5, background:'white', border:'1px solid #eee', borderRadius:'50%', width:'28px', height:'28px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}><Trash2 size={14} color="#999"/></button>
                            
                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'5px'}}>
                                {fav.type === '1-piece' ? (
                                    <div style={{gridColumn: 'span 2', aspectRatio:'2/1', background:'#f9f9f9', borderRadius:'10px', overflow:'hidden', position:'relative'}}>
                                        <Image src={fav.body?.image || ''} alt="body" fill style={{objectFit:'contain', padding:'5px'}}/>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{aspectRatio:'1/1', background:'#f9f9f9', borderRadius:'10px', overflow:'hidden', position:'relative'}}><Image src={fav.top?.image || ''} alt="t" fill style={{objectFit:'contain', padding:'5px'}}/></div>
                                        <div style={{aspectRatio:'1/1', background:'#f9f9f9', borderRadius:'10px', overflow:'hidden', position:'relative'}}><Image src={fav.bottom?.image || ''} alt="b" fill style={{objectFit:'contain', padding:'5px'}}/></div>
                                    </>
                                )}
                                <div style={{aspectRatio:'1/1', background:'#f9f9f9', borderRadius:'10px', overflow:'hidden', position:'relative', display:'flex', alignItems:'center', justifyContent:'center'}}>{fav.shoes ? <Image src={fav.shoes.image} alt="s" fill style={{objectFit:'contain', padding:'5px'}}/> : <Footprints size={20} color="#ccc"/>}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {isManualOpen && <ManualOutfitCreator clothes={clothes} onSave={handleSaveManual} onClose={() => setIsManualOpen(false)} />}
        </div>
    )
}

function ArmarioView({ clothes, loading, currentUser, isWishlistMode }: { clothes: Prenda[], loading: boolean, currentUser: string, isWishlistMode: boolean }) {
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
            // Forzar isWishlist según el modo en que estemos
            dataToSave.isWishlist = isWishlistMode; 

            if (id) {
                const docRef = doc(db, 'clothes', id);
                await updateDoc(docRef, dataToSave);
            } else {
                await addDoc(collection(db, 'clothes'), { ...dataToSave, owner: currentUser, dirty: false, createdAt: serverTimestamp() });
            }
            setEditingPrenda(null); 
        } catch (error) { console.error("ERROR REAL:", error); alert("Error al guardar: " + (error as any).message); }
    };

    const handleDelete = async (id: string) => { if(confirm("¿Borrar?")) await deleteDoc(doc(db, 'clothes', id)); };
    const toggleDirty = async (id: string, currentDirty: boolean) => { await updateDoc(doc(db, 'clothes', id), { dirty: !currentDirty }); };
    
    // Función para MOVER de Wishlist a Armario
    const moveToWardrobe = async (id: string) => {
        if(confirm("¿Ya tienes esta prenda? ¡Genial! La movemos a tu armario.")) {
            await updateDoc(doc(db, 'clothes', id), { isWishlist: false, createdAt: serverTimestamp() });
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

    return (
        <div className="fade-in">
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection:'column', gap:'10px' }}>
                <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                    <div style={{flex:1, position:'relative'}}>
                        <Search size={18} style={{position:'absolute', left:'12px', top:'12px', color:'#999'}}/>
                        <input type="text" placeholder={isWishlistMode ? "Buscar en deseos..." : "Buscar en armario..."} value={search} onChange={e => setSearch(e.target.value)} style={{width:'100%', padding:'12px 12px 12px 40px', borderRadius:'12px', border:'1px solid #eee', background:'#f9f9f9', fontSize:'0.9rem'}} />
                    </div>
                     <button onClick={() => openNew()} style={{ background: '#111', color: 'white', border: 'none', width: '45px', height: '45px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', flexShrink:0 }}><Camera size={24} /></button>
                </div>
                
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'5px', background:'#f5f5f5', padding:'5px 10px', borderRadius:'10px'}}>
                        <ArrowUpDown size={14} color="#666"/>
                        <select value={sortBy} onChange={(e:any) => setSortBy(e.target.value)} style={{background:'transparent', border:'none', fontSize:'0.85rem', fontWeight:'600', color:'#444'}}>
                            <option value="date">Más recientes</option>
                            <option value="color">Por Color</option>
                            <option value="category">Por Tipo</option>
                        </select>
                    </div>

                    {!isWishlistMode && dirtyCount > 0 && (
                        <button onClick={cleanAll} style={{ background: '#E3F2FD', color: '#2196F3', border: 'none', padding:'0 15px', height: '35px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap:'5px', cursor: 'pointer', fontWeight:'700', fontSize:'0.8rem' }}>
                            <Droplets size={18} /> {dirtyCount}
                        </button>
                    )}
                </div>
            </div>

            {loading ? <p>Cargando...</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                    {filteredClothes.map((prenda) => (
                        <div key={prenda.id} style={{ position: 'relative' }}>
                            <div style={{ aspectRatio: '3/4', background: '#f4f4f5', borderRadius: '20px', overflow: 'hidden', marginBottom: '8px', position: 'relative' }}>
                                 {prenda.dirty && !isWishlistMode && (
                                     <div style={{position:'absolute', top:0, left:0, right:0, bottom:0, background:'rgba(255,255,255,0.7)', zIndex:2, display:'flex', alignItems:'center', justifyContent:'center'}}>
                                         <div style={{background:'white', padding:'8px', borderRadius:'50%', boxShadow:'0 4px 10px rgba(0,0,0,0.1)'}}><Droplets size={24} color="#ccc"/></div>
                                     </div>
                                 )}
                                 <Image src={prenda.image} alt={prenda.name} fill style={{ objectFit: 'cover' }} />
                                 <div style={{position:'absolute', top:'8px', right:'8px', zIndex:5, display:'flex', gap:'5px'}}>
                                     {isWishlistMode && (
                                         <button onClick={() => moveToWardrobe(prenda.id)} style={{background:'white', border:'none', borderRadius:'50%', width:'28px', height:'28px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}><ShoppingBag size={14} color="#4CAF50"/></button>
                                     )}
                                     <button onClick={() => openEdit(prenda)} style={{background:'white', border:'none', borderRadius:'50%', width:'28px', height:'28px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}><Edit3 size={14} color="#333"/></button>
                                     {!isWishlistMode && <button onClick={() => toggleDirty(prenda.id, prenda.dirty || false)} style={{background:'white', border:'none', borderRadius:'50%', width:'28px', height:'28px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}><Droplets size={14} color={prenda.dirty ? '#2196F3' : '#ccc'}/></button>}
                                     <button onClick={() => handleDelete(prenda.id)} style={{background:'white', border:'none', borderRadius:'50%', width:'28px', height:'28px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}><Trash2 size={14} color="#ff6b6b"/></button>
                                 </div>
                            </div>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: '700', margin: '0 0 5px 0', color: prenda.dirty ? '#ccc' : '#111' }}>{prenda.name}</h3>
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
                    {clothes.length === 0 && <p style={{color:'#888', gridColumn:'1/-1', textAlign:'center', marginTop:'50px'}}>{isWishlistMode ? 'Tu lista de deseos está vacía.' : '¡Sube ropa para empezar!'}</p>}
                </div>
            )}
            {isModalOpen && <UploadModal initialData={editingPrenda} onClose={() => setIsModalOpen(false)} onSave={handleSavePrenda} isWishlistDefault={isWishlistMode} />}
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
    const [category, setCategory] = useState<'top' | 'bottom' | 'shoes' | 'body'>(initialData?.category || 'top');
    const [subCategory, setSubCategory] = useState(initialData?.subCategory || '');
    
    const [selectedStyles, setSelectedStyles] = useState<Estilo[]>(initialData?.estilos || ['casual']);
    const [selectedSeasons, setSelectedSeasons] = useState<Season[]>(initialData?.seasons || ['primavera', 'verano']); // TEMPORADAS

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
        if (!urlInput) return; setLoadingUrl(true);
        try {
            const res = await fetch(`/api/proxy?url=${encodeURIComponent(urlInput)}`);
            if (!res.ok) throw new Error("Error proxy");
            const blob = await res.blob();
            const fetchedFile = new File([blob], "downloaded.jpg", { type: "image/jpeg" });
            setFile(fetchedFile);
        } catch (e) { alert("Error enlace"); }
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
    };

    const handleConfirm = async () => {
        if (!file && !initialData) return; 
        setIsUploading(true);
        
        const finalData = {
            id: initialData?.id,
            name, brand, price: Number(price), category, subCategory, 
            estilos: selectedStyles, 
            seasons: selectedSeasons, // Guardamos temporadas
            primaryColor, secondaryColors,
            image: preview,
            isWishlist: initialData ? initialData.isWishlist : isWishlistDefault 
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
                    {(initialData || file) && (
                        <label style={{position:'absolute', bottom:'10px', right:'10px', background:'rgba(0,0,0,0.6)', color:'white', padding:'5px 10px', borderRadius:'20px', fontSize:'0.7rem', cursor:'pointer', display:'flex', gap:'5px', alignItems:'center'}}>
                            <Edit3 size={12}/> Cambiar foto
                            <input type="file" onChange={handleFileChange} style={{display:'none'}} accept="image/*" />
                        </label>
                    )}
                </div>

                {mode === 'url' && !file && !initialData && (
                     <div style={{marginBottom:'15px', display:'flex', gap:'5px'}}>
                        <input type="text" placeholder="Pega el enlace..." value={urlInput} onChange={(e)=>setUrlInput(e.target.value)} style={{flex:1, padding:'10px', borderRadius:'8px', border:'1px solid #ddd'}} />
                        <button onClick={handleUrlFetch} disabled={!urlInput} style={{background:'#111', color:'white', border:'none', borderRadius:'8px', padding:'0 15px'}}>{loadingUrl ? '...' : 'OK'}</button>
                     </div>
                )}

                <SectionLabel icon={<Layers size={14}/>} label="TIPO" />
                <div style={{display:'flex', gap:'5px', marginBottom:'15px'}}>
                    <CategoryBtn label="Arriba" active={category==='top'} onClick={()=>{setCategory('top'); setSubCategory('')}} />
                    <CategoryBtn label="Abajo" active={category==='bottom'} onClick={()=>{setCategory('bottom'); setSubCategory('')}} />
                    <CategoryBtn label="Cuerpo" active={category==='body'} onClick={()=>{setCategory('body'); setSubCategory('')}} />
                    <CategoryBtn label="Pies" active={category==='shoes'} onClick={()=>{setCategory('shoes'); setSubCategory('')}} />
                </div>
                <div className="no-scrollbar" style={{display:'flex', gap:'5px', overflowX:'auto', paddingBottom:'5px', marginBottom:'15px'}}>{SUB_CATEGORIES[category].map((sub) => <Chip key={sub} label={sub} active={subCategory === sub} onClick={() => setSubCategory(sub)} />)}</div>
                
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
                    <input type="text" placeholder="Marca" value={brand} onChange={e => setBrand(e.target.value)} style={{flex:1, padding:'12px', borderRadius:'12px', border:'1px solid #eee', background:'#f9f9f9'}} />
                    <input type="number" placeholder="Precio (€)" value={price} onChange={e => setPrice(e.target.value)} style={{width:'100px', padding:'12px', borderRadius:'12px', border:'1px solid #eee', background:'#f9f9f9'}} />
                </div>

                <input type="text" placeholder="Nombre (ej. Mi favorita)" value={name} onChange={e => setName(e.target.value)} style={{width:'100%', padding:'12px', borderRadius:'12px', border:'1px solid #eee', marginBottom:'15px', background:'#f9f9f9'}} />
                <button disabled={isUploading || !name || !subCategory} onClick={handleConfirm} style={{width:'100%', padding:'15px', background: '#111', color:'white', border:'none', borderRadius:'14px', fontWeight:'700', cursor:'pointer', opacity: isUploading || !name || !subCategory ? 0.5 : 1}}>{isUploading ? 'Guardando...' : 'Guardar'}</button>
            </div>
        </div>
    );
}

function Badge({text, color='#eef', textColor='#444'}:any) { return <span style={{fontSize:'0.85rem', background:color, padding:'4px 8px', borderRadius:'6px', fontWeight:'600', color:textColor}}>{text}</span> }
function SectionLabel({icon, label}:any) { return <div style={{display:'flex', alignItems:'center', gap:'5px', fontSize:'0.75rem', fontWeight:'700', color:'#888', marginBottom:'8px', letterSpacing:'0.5px'}}>{icon} {label}</div> }
function CategoryBtn({label, active, onClick}:any) { return <button onClick={onClick} style={{flex:1, padding:'10px 5px', border: active?'2px solid #111':'1px solid #eee', background: active?'white':'#f9f9f9', borderRadius:'8px', fontSize:'0.9rem', fontWeight:'600', cursor:'pointer'}}>{label}</button> }
function Chip({label, active, onClick}:any) { return <button onClick={onClick} style={{padding:'6px 14px', border: active?'2px solid #111':'1px solid #ddd', background: active?'#111':'white', color: active?'white':'#666', borderRadius:'20px', fontSize:'0.85rem', fontWeight:'600', cursor:'pointer', whiteSpace:'nowrap'}}>{label}</button> }
function TabButton({ label, active, onClick, icon }: any) { return <button onClick={onClick} style={{ flex: 1, padding: '12px', background: 'transparent', border:'none', color: active ? '#111' : '#888', fontWeight: active ? '800' : '600', display: 'flex', justifyContent: 'center', gap: '8px', cursor:'pointer', transition:'all 0.2s', transform: active ? 'scale(1.05)' : 'scale(1)', minWidth: '70px' }}>{icon} {label}</button>; }