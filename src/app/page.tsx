'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import Image from 'next/image';
import { CloudSun, Shirt, Sparkles, Camera, Trash2, X, Check, Footprints, Layers, RefreshCw, Palette, Tag, Edit3, Link as LinkIcon, UploadCloud, MapPin, Thermometer } from 'lucide-react';

// --- FIREBASE ---
import { db, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

// --- TIPOS ---
type Estilo = 'sport' | 'casual' | 'elegant' | 'party';

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

interface Prenda { 
  id: string; 
  name: string; 
  category: 'top' | 'bottom' | 'shoes'; 
  subCategory: string;
  estilo: Estilo;
  colorName: string;
  colorHex: string;
  image: string; 
}

interface Outfit {
    top: Prenda | null;
    bottom: Prenda | null;
    shoes: Prenda | null;
    matchScore: number;
}

const SUB_CATEGORIES = {
    top: ['Camiseta', 'Camisa', 'Sudadera', 'Chaqueta', 'Abrigo', 'Top'],
    bottom: ['Pantalón', 'Jeans', 'Falda', 'Shorts', 'Leggins'],
    shoes: ['Deportivas', 'Botas', 'Zapatos', 'Sandalias', 'Tacones']
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
        img.crossOrigin = "Anonymous";
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
        const dist = Math.sqrt(Math.pow(c.rgb[0]-r,2) + Math.pow(c.rgb[1]-g,2) + Math.pow(c.rgb[2]-b,2));
        if (dist < minDistance) { minDistance = dist; closest = c; }
    });
    return closest;
};

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ArmarioContent />
    </Suspense>
  );
}

function ArmarioContent() {
  const [activeTab, setActiveTab] = useState<'outfit' | 'armario'>('outfit');
  const [clothes, setClothes] = useState<Prenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<{temp: number, city: string, code: number} | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'clothes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => {
            const d = doc.data();
            return { 
                id: doc.id, ...d, 
                estilo: d.estilo || 'casual', 
                colorName: d.colorName || d.color || 'black',
                colorHex: d.colorHex || '#000000'
            };
        }) as Prenda[];
        setClothes(data);
        setLoading(false);
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
                const data = await res.json();
                setWeather({
                    temp: Math.round(data.current_weather.temperature),
                    city: "Tu Ubicación",
                    code: data.current_weather.weathercode
                });
            } catch (e) { console.error("Error clima", e); }
        });
    }

    return () => unsubscribe();
  }, []);
  
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
        <header style={{ marginBottom: '30px', paddingTop: '20px' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1.5px', margin: '0 0 5px 0', lineHeight: '1' }}>
                Hola, María <span style={{fontSize:'2rem'}}>✨</span>
            </h1>
            <p style={{ color: '#666', fontSize: '1rem', fontWeight: '500' }}>
                {activeTab === 'outfit' ? '¿Qué nos ponemos hoy?' : 'Tu colección personal'}
            </p>
        </header>

        <div style={{ display: 'flex', background: '#f4f4f5', padding: '5px', borderRadius: '16px', marginBottom: '30px' }}>
            <TabButton label="Generar Outfit" active={activeTab === 'outfit'} onClick={() => setActiveTab('outfit')} icon={<Sparkles size={16} />} />
            <TabButton label="Mi Armario" active={activeTab === 'armario'} onClick={() => setActiveTab('armario')} icon={<Shirt size={16} />} />
        </div>

        {activeTab === 'outfit' ? <OutfitView clothes={clothes} weather={weather} /> : <ArmarioView clothes={clothes} loading={loading} />}
      </div>
    </div>
  );
}

function OutfitView({ clothes, weather }: { clothes: Prenda[], weather: any }) {
    const [outfit, setOutfit] = useState<Outfit | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [message, setMessage] = useState('');

    const generateSmartOutfit = () => {
        setIsAnimating(true);
        setMessage('');
        const tops = clothes.filter(c => c.category === 'top');
        const bottoms = clothes.filter(c => c.category === 'bottom');
        const shoes = clothes.filter(c => c.category === 'shoes');

        if (tops.length === 0 || bottoms.length === 0) {
            alert("¡Falta ropa! Sube partes de arriba y abajo.");
            setIsAnimating(false);
            return;
        }

        setTimeout(() => {
            // --- CEREBRO TÉRMICO Y DE ESTILO 🧠 ---
            let availableTops = tops;
            let tempWarning = '';

            // 1. FILTRO DE TEMPERATURA
            if (weather) {
                if (weather.temp < 15) {
                    // FRÍO: Prioridad a Sudaderas, Chaquetas, Abrigos
                    const winterTops = tops.filter(t => ['Sudadera', 'Chaqueta', 'Abrigo'].includes(t.subCategory));
                    if (winterTops.length > 0) {
                        availableTops = winterTops;
                        tempWarning = '❄️ Modo Invierno activado.';
                    } else {
                        tempWarning = '❄️ Hace frío, pero no tienes abrigos subidos.';
                    }
                } else if (weather.temp > 25) {
                    // CALOR: Prioridad a Camisetas, Tops
                    const summerTops = tops.filter(t => ['Camiseta', 'Top', 'Camisa'].includes(t.subCategory));
                    if (summerTops.length > 0) {
                        availableTops = summerTops;
                        tempWarning = '☀️ Modo Verano activado.';
                    }
                }
            }

            // 2. SELECCIÓN DE TOP
            const selectedTop = availableTops[Math.floor(Math.random() * availableTops.length)];
            const topColorInfo = COLOR_REFERENCES.find(c => c.value === selectedTop.colorName);
            const topGroup = topColorInfo?.group || 'neutral';

            // 3. FILTRO DE BOTTOMS COMPATIBLES
            let compatibleBottoms = bottoms.filter(b => {
                // A. Regla de Estilo
                if (selectedTop.estilo === 'sport' && b.estilo === 'elegant') return false;
                if (selectedTop.estilo === 'elegant' && b.estilo === 'sport') return false;
                return true; 
            });
            if (compatibleBottoms.length === 0) compatibleBottoms = bottoms;

            // B. Regla de Color (Si top no es neutro, buscar bottoms neutros)
            let bestBottoms = compatibleBottoms;
            if (topGroup !== 'neutral') {
                const neutralBottoms = compatibleBottoms.filter(b => {
                    const bColor = COLOR_REFERENCES.find(c => c.value === b.colorName);
                    return bColor?.group === 'neutral' || b.colorName === 'denim' || b.colorName === 'navy';
                });
                if (neutralBottoms.length > 0) bestBottoms = neutralBottoms;
            }

            const selectedBottom = bestBottoms[Math.floor(Math.random() * bestBottoms.length)];
            const selectedShoes = shoes.length > 0 ? shoes[Math.floor(Math.random() * shoes.length)] : null;

            setOutfit({ top: selectedTop, bottom: selectedBottom, shoes: selectedShoes, matchScore: 95 });
            
            // MENSAJE FINAL
            if (tempWarning) {
                setMessage(tempWarning);
            } else {
                if (selectedTop.estilo === selectedBottom.estilo) setMessage(`Un look ${selectedTop.estilo} impecable.`);
                else setMessage(`Mix & Match: ${selectedTop.estilo} con toque casual.`);
            }

            setIsAnimating(false);
        }, 600);
    };

    return (
        <div className="fade-in">
            {/* Widget Clima REAL */}
            <div style={{ background: '#111', color: 'white', padding: '30px', borderRadius: '24px', marginBottom: '30px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                {weather ? (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', opacity: 0.8 }}>
                            {weather.temp > 20 ? <CloudSun size={24} /> : <Thermometer size={24} />}
                            <span style={{ fontSize: '0.9rem', fontWeight: '600', textTransform:'uppercase' }}>{weather.city}</span>
                        </div>
                        <div style={{ fontSize: '4rem', fontWeight: '900', lineHeight: '0.9', marginBottom: '10px' }}>{weather.temp}°</div>
                        <p style={{ fontSize: '1.1rem', fontWeight: '500', color: '#ccc' }}>
                            {weather.temp < 15 ? '¡Hora de abrigarse!' : weather.temp < 25 ? 'Temperatura agradable' : '¡Qué calor!'}
                        </p>
                    </>
                ) : (
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <div style={{width:'20px', height:'20px', border:'2px solid white', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite'}}></div>
                        <span>Detectando clima...</span>
                    </div>
                )}
            </div>

            {outfit && (
                <div className="fade-in" style={{ marginBottom: '30px' }}>
                    <div style={{ textAlign:'center', marginBottom:'15px', color:'#666', fontSize:'0.9rem', fontWeight:'600' }}>{message}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', gridTemplateRows: 'auto auto' }}>
                        <div style={{ gridColumn: '1 / -1', aspectRatio: '16/9', position: 'relative', borderRadius: '20px', overflow: 'hidden', background:'#f4f4f5' }}>
                            <Image src={outfit.top!.image} alt="top" fill style={{ objectFit: 'contain', padding:'10px' }} />
                            <div style={{position:'absolute', bottom:'10px', left:'10px', display:'flex', gap:'5px'}}>
                                <Badge text={outfit.top!.subCategory} />
                                <Badge text={COLOR_REFERENCES.find(c=>c.value===outfit.top!.colorName)?.label || ''} color="#fff" />
                            </div>
                        </div>
                        <div style={{ aspectRatio: '1/1', position: 'relative', borderRadius: '20px', overflow: 'hidden', background:'#f4f4f5' }}>
                            <Image src={outfit.bottom!.image} alt="bottom" fill style={{ objectFit: 'contain', padding:'10px' }} />
                        </div>
                        <div style={{ aspectRatio: '1/1', position: 'relative', borderRadius: '20px', overflow: 'hidden', background:'#f4f4f5', display:'flex', alignItems:'center', justifyContent:'center', color:'#ccc' }}>
                            {outfit.shoes ? (
                                <Image src={outfit.shoes.image} alt="shoes" fill style={{ objectFit: 'contain', padding:'10px' }} />
                            ) : <Footprints size={40} />}
                        </div>
                    </div>
                </div>
            )}

            <div style={{ textAlign: 'center' }}>
                <button 
                    onClick={generateSmartOutfit}
                    disabled={isAnimating}
                    style={{ width: '100%', background: isAnimating ? '#333' : 'white', color: isAnimating ? '#ccc' : '#111', border: '2px solid #111', padding: '20px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: '800', cursor: isAnimating ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', transition: 'all 0.2s', transform: isAnimating ? 'scale(0.98)' : 'scale(1)' }}>
                    {isAnimating ? <RefreshCw className="spin" size={20} /> : <Sparkles size={20} />}
                    {outfit ? '¡Otra combinación!' : 'Generar Outfit Inteligente'}
                </button>
                <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );
}

function ArmarioView({ clothes, loading }: { clothes: Prenda[], loading: boolean }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const handleSavePrenda = async (file: File, data: any) => {
        try {
            const compressedFile = await compressImage(file);
            const storageRef = ref(storage, `armario/${Date.now()}-${compressedFile.name}`);
            await uploadBytes(storageRef, compressedFile);
            const url = await getDownloadURL(storageRef);
            await addDoc(collection(db, 'clothes'), { ...data, image: url, createdAt: serverTimestamp() });
        } catch (error) { console.error(error); alert("Error al guardar"); }
    };

    const handleDelete = async (id: string) => { if(confirm("¿Borrar?")) await deleteDoc(doc(db, 'clothes', id)); };

    return (
        <div className="fade-in">
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>Tus prendas ({clothes.length})</h2>
                <button onClick={() => setIsModalOpen(true)} style={{ background: '#111', color: 'white', border: 'none', width: '45px', height: '45px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                    <Camera size={24} />
                </button>
            </div>

            {loading ? <p>Cargando...</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                    {clothes.map((prenda) => (
                        <div key={prenda.id} style={{ position: 'relative' }}>
                            <div style={{ aspectRatio: '3/4', background: '#f4f4f5', borderRadius: '20px', overflow: 'hidden', marginBottom: '8px', position: 'relative' }}>
                                 <Image src={prenda.image} alt={prenda.name} fill style={{ objectFit: 'cover' }} />
                                 <button onClick={() => handleDelete(prenda.id)} style={{position:'absolute', top:'8px', right:'8px', background:'white', border:'none', borderRadius:'50%', width:'24px', height:'24px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}><Trash2 size={12} color="red"/></button>
                            </div>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: '700', margin: '0 0 5px 0' }}>{prenda.name}</h3>
                            <div style={{display:'flex', gap:'5px', flexWrap:'wrap'}}>
                                <Badge text={prenda.subCategory} />
                                <div style={{width:'16px', height:'16px', borderRadius:'50%', background: prenda.colorHex, border:'1px solid #ddd'}}></div>
                            </div>
                        </div>
                    ))}
                    {clothes.length === 0 && <p style={{color:'#888'}}>¡Sube ropa para empezar!</p>}
                </div>
            )}

            {isModalOpen && (
                <UploadModal onClose={() => setIsModalOpen(false)} onSave={handleSavePrenda} />
            )}
        </div>
    );
}

function UploadModal({ onClose, onSave }: any) {
    const [mode, setMode] = useState<'upload' | 'url'>('upload'); 
    const [file, setFile] = useState<File | null>(null);
    const [urlInput, setUrlInput] = useState('');
    const [loadingUrl, setLoadingUrl] = useState(false);
    
    const [name, setName] = useState('');
    const [category, setCategory] = useState<'top' | 'bottom' | 'shoes'>('top');
    const [subCategory, setSubCategory] = useState('');
    const [estilo, setEstilo] = useState<Estilo>('casual');
    const [colorHex, setColorHex] = useState<string>('#ffffff');
    const [colorName, setColorName] = useState<string>('white');
    const [colorLabel, setColorLabel] = useState<string>('Blanco');
    
    const [isUploading, setIsUploading] = useState(false);
    const [preview, setPreview] = useState('');
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleUrlFetch = async () => {
        if (!urlInput) return;
        setLoadingUrl(true);
        try {
            const res = await fetch(`/api/proxy?url=${encodeURIComponent(urlInput)}`);
            if (!res.ok) throw new Error("Error proxy");
            const blob = await res.blob();
            const fetchedFile = new File([blob], "downloaded.jpg", { type: blob.type });
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
        ctx.drawImage(img, 0, 0, 50, 50);
        const imageData = ctx.getImageData(10, 10, 30, 30);
        const data = imageData.data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i+1]; b += data[i+2]; }
        const count = data.length / 4;
        r = Math.floor(r / count); g = Math.floor(g / count); b = Math.floor(b / count);

        const detectedHex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        setColorHex(detectedHex);
        const closest = findClosestColorName(r,g,b);
        setColorName(closest.value);
        setColorLabel(closest.label);
    };

    const handleManualColorChange = (hex: string) => {
        setColorHex(hex);
        const rgb = hexToRgb(hex);
        const closest = findClosestColorName(rgb[0], rgb[1], rgb[2]);
        setColorName(closest.value);
        setColorLabel(closest.label);
    };

    const handleConfirm = async () => {
        if (!file) return;
        setIsUploading(true);
        await onSave(file, { name, category, subCategory, estilo, colorName, colorHex });
        setIsUploading(false);
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                    <h3 style={{margin:0, fontSize:'1.2rem', fontWeight:'800'}}>Nueva Prenda</h3>
                    <button onClick={onClose} style={{background:'none', border:'none', cursor:'pointer'}}><X size={20}/></button>
                </div>

                {!file ? (
                    <div style={{marginBottom:'20px'}}>
                        <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
                            <button onClick={()=>setMode('upload')} style={{flex:1, padding:'10px', borderRadius:'10px', border: mode==='upload'?'2px solid #111':'1px solid #eee', fontWeight:'600', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px', cursor:'pointer'}}><UploadCloud size={20}/> Subir Foto</button>
                            <button onClick={()=>setMode('url')} style={{flex:1, padding:'10px', borderRadius:'10px', border: mode==='url'?'2px solid #111':'1px solid #eee', fontWeight:'600', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px', cursor:'pointer'}}><LinkIcon size={20}/> Enlace Web</button>
                        </div>
                        {mode === 'upload' ? (
                            <label style={{display:'block', padding:'40px', border:'2px dashed #ccc', borderRadius:'12px', textAlign:'center', cursor:'pointer'}}>
                                <p style={{fontWeight:'600', color:'#666'}}>Pulsa para subir imagen</p>
                                <input type="file" onChange={handleFileChange} style={{display:'none'}} accept="image/*" />
                            </label>
                        ) : (
                            <div>
                                <input type="text" placeholder="Pega el enlace..." value={urlInput} onChange={(e)=>setUrlInput(e.target.value)} style={{width:'100%', padding:'12px', borderRadius:'12px', border:'1px solid #eee', marginBottom:'10px', background:'#f9f9f9'}} />
                                <button onClick={handleUrlFetch} disabled={!urlInput || loadingUrl} style={{width:'100%', padding:'12px', background:'#111', color:'white', borderRadius:'12px', border:'none', cursor:'pointer', fontWeight:'600'}}>
                                    {loadingUrl ? 'Descargando...' : 'Obtener Imagen'}
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <div style={{width:'100%', height:'120px', background:'#f4f4f5', borderRadius:'12px', overflow:'hidden', marginBottom:'15px', position:'relative'}}>
                            <Image src={preview} alt="Preview" fill style={{objectFit:'contain'}} />
                            <canvas ref={canvasRef} style={{display:'none'}}></canvas>
                            <button onClick={()=>setFile(null)} style={{position:'absolute', top:'5px', right:'5px', background:'rgba(0,0,0,0.5)', color:'white', border:'none', borderRadius:'50%', padding:'5px', cursor:'pointer'}}><RefreshCw size={14}/></button>
                        </div>
                        
                        <SectionLabel icon={<Layers size={14}/>} label="TIPO" />
                        <div style={{display:'flex', gap:'5px', marginBottom:'15px'}}>
                            <CategoryBtn label="Arriba" active={category==='top'} onClick={()=>{setCategory('top'); setSubCategory('')}} />
                            <CategoryBtn label="Abajo" active={category==='bottom'} onClick={()=>{setCategory('bottom'); setSubCategory('')}} />
                            <CategoryBtn label="Pies" active={category==='shoes'} onClick={()=>{setCategory('shoes'); setSubCategory('')}} />
                        </div>
                        <div className="no-scrollbar" style={{display:'flex', gap:'5px', overflowX:'auto', paddingBottom:'5px', marginBottom:'15px'}}>
                            {SUB_CATEGORIES[category].map((sub) => <Chip key={sub} label={sub} active={subCategory === sub} onClick={() => setSubCategory(sub)} />)}
                        </div>

                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px', marginBottom:'15px'}}>
                            <div>
                                <SectionLabel icon={<Tag size={14}/>} label="ESTILO" />
                                <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                                    {STYLES.map(s => <Chip key={s.value} label={s.label} active={estilo===s.value} onClick={()=>setEstilo(s.value)} />)}
                                </div>
                            </div>
                            <div>
                                <SectionLabel icon={<Palette size={14}/>} label="COLOR" />
                                <div style={{position:'relative', width:'100%', height:'45px', borderRadius:'12px', background:'#f9f9f9', border:'1px solid #eee', display:'flex', alignItems:'center', padding:'0 10px', gap:'10px', cursor:'pointer', overflow:'hidden'}}>
                                    <input type="color" value={colorHex} onChange={(e) => handleManualColorChange(e.target.value)} />
                                    <div style={{width:'24px', height:'24px', borderRadius:'50%', background: colorHex, border:'1px solid rgba(0,0,0,0.1)', flexShrink:0, pointerEvents:'none'}}></div>
                                    <div style={{flex:1, display:'flex', flexDirection:'column', pointerEvents:'none'}}>
                                        <span style={{fontSize:'0.85rem', fontWeight:'700'}}>{colorLabel}</span>
                                        <span style={{fontSize:'0.65rem', color:'#888', textTransform:'uppercase'}}>{colorHex}</span>
                                    </div>
                                    <Edit3 size={14} color="#999" style={{pointerEvents:'none'}}/>
                                </div>
                            </div>
                        </div>

                        <input type="text" placeholder="Nombre (ej. Mi favorita)" value={name} onChange={e => setName(e.target.value)} style={{width:'100%', padding:'12px', borderRadius:'12px', border:'1px solid #eee', marginBottom:'15px', background:'#f9f9f9'}} />

                        <button disabled={isUploading || !name || !subCategory} onClick={handleConfirm} style={{width:'100%', padding:'15px', background: '#111', color:'white', border:'none', borderRadius:'14px', fontWeight:'700', cursor:'pointer', opacity: isUploading || !name || !subCategory ? 0.5 : 1}}>
                            {isUploading ? 'Guardando...' : 'Guardar Prenda'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

function Badge({text, color='#eef'}:any) { return <span style={{fontSize:'0.85rem', background:color, padding:'4px 8px', borderRadius:'6px', fontWeight:'600', color:'#444'}}>{text}</span> }
function SectionLabel({icon, label}:any) { return <div style={{display:'flex', alignItems:'center', gap:'5px', fontSize:'0.75rem', fontWeight:'700', color:'#888', marginBottom:'8px', letterSpacing:'0.5px'}}>{icon} {label}</div> }
function CategoryBtn({label, active, onClick}:any) { return <button onClick={onClick} style={{flex:1, padding:'10px 5px', border: active?'2px solid #111':'1px solid #eee', background: active?'white':'#f9f9f9', borderRadius:'8px', fontSize:'0.9rem', fontWeight:'600', cursor:'pointer'}}>{label}</button> }
function Chip({label, active, onClick}:any) { return <button onClick={onClick} style={{padding:'6px 14px', border: active?'2px solid #111':'1px solid #ddd', background: active?'#111':'white', color: active?'white':'#666', borderRadius:'20px', fontSize:'0.85rem', fontWeight:'600', cursor:'pointer', whiteSpace:'nowrap'}}>{label}</button> }
function TabButton({ label, active, onClick, icon }: any) { return <button onClick={onClick} style={{ flex: 1, padding: '12px', background: 'transparent', border:'none', color: active ? '#111' : '#888', fontWeight: active ? '800' : '600', display: 'flex', justifyContent: 'center', gap: '8px', cursor:'pointer' }}>{icon} {label}</button>; }