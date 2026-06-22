import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { plantApi } from '../api/plant.api';
import { offlineCache } from '../utils/offlineCache';
import {
  Camera,
  Wifi,
  WifiOff,
  ArrowRight,
  ShieldAlert,
  Check,
  Cpu,
  History,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

export const FieldScanner: React.FC = () => {
  const navigate = useNavigate();
  const [tagInput, setTagInput] = useState('');
  const [assetData, setAssetData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Offline simulation states
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [forceOffline, setForceOffline] = useState(false);
  const [isOfflineCached, setIsOfflineCached] = useState(false);

  // Camera mock stream
  const [cameraActive, setCameraActive] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success'>('idle');

  // History list of locally cached assets
  const [cachedTags, setCachedTags] = useState<string[]>([]);

  // Update browser online state
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

  // Fetch cached list of equipment from IndexedDB
  const fetchCachedTags = async () => {
    try {
      // IndexedDB store lists all cached items
      // We can query what equipment records exist in IndexedDB store
      // Since our offlineCache.ts doesn't expose a listEquipment method directly,
      // we can do a quick check in the idb store or list some default mock tags we cached
      const db = await (async () => {
        const { openDB } = await import('idb');
        return openDB('ikip_offline_db', 1);
      })();
      const store = db.transaction('equipment_passport_cache').objectStore('equipment_passport_cache');
      const allKeys = await store.getAllKeys();
      setCachedTags(allKeys.map(String));
    } catch (err) {
      console.error('Failed to read IDB store list:', err);
    }
  };

  useEffect(() => {
    fetchCachedTags();
  }, [assetData]);

  const activeOnlineState = isOnline && !forceOffline;

  // Search/Lookup Tag
  const handleLookupTag = async (tagToSearch: string) => {
    if (!tagToSearch.trim()) return;
    const cleanTag = tagToSearch.trim().toUpperCase();
    setLoading(true);
    setAssetData(null);
    setIsOfflineCached(false);

    if (activeOnlineState) {
      // ONLINE MODE: Fetch from API and save to IndexedDB
      try {
        const res = await plantApi.getEquipmentPassport(cleanTag);
        if (res.success && res.data) {
          setAssetData(res.data);
          // Cache in IndexedDB
          await offlineCache.cacheEquipment(cleanTag, res.data);
          setIsOfflineCached(false);
          toast.success(`Asset loaded online & cached locally!`);
        } else {
          toast.error('Asset not found');
        }
      } catch (err) {
        console.error(err);
        // Fallback to IndexedDB if network request failed
        toast.error('Network request failed. Falling back to local cache.');
        await readFromCache(cleanTag);
      } finally {
        setLoading(false);
      }
    } else {
      // OFFLINE MODE: Fetch strictly from IndexedDB
      await readFromCache(cleanTag);
      setLoading(false);
    }
  };

  const readFromCache = async (cleanTag: string) => {
    const data = await offlineCache.getCachedEquipment(cleanTag);
    if (data) {
      setAssetData(data);
      setIsOfflineCached(true);
      toast.success(`Loaded offline cached details for ${cleanTag}`);
    } else {
      toast.error(`Asset ${cleanTag} is not cached in local memory. Connect online to fetch.`);
    }
  };

  // Mock scan trigger
  const triggerCameraScan = () => {
    setCameraActive(true);
    setScanStatus('scanning');
    
    // Simulate finding a tag after 2.5s
    setTimeout(() => {
      // Toggle random tags
      const mockTags = ['P-101', 'K-202', 'V-102'];
      const scannedTag = mockTags[Math.floor(Math.random() * mockTags.length)];
      
      setTagInput(scannedTag);
      setScanStatus('success');
      toast.success(`QR Matched: "${scannedTag}"`, { id: 'qr-scan' });
      
      setTimeout(() => {
        setCameraActive(false);
        setScanStatus('idle');
        handleLookupTag(scannedTag);
      }, 500);

    }, 2500);
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-5 pb-24">
      {/* Background Highlight */}
      <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-sky-500/5 to-transparent pointer-events-none" />

      {/* State Indicators & Mock Switches */}
      <div className="flex items-center justify-between p-3.5 rounded-xl glass-panel text-xs">
        <div className="flex items-center gap-2">
          {activeOnlineState ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <Wifi size={14} /> Network Active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-rose-400 font-bold animate-pulse">
              <WifiOff size={14} /> Offline Mode
            </span>
          )}
        </div>

        <button
          onClick={() => {
            setForceOffline(!forceOffline);
            toast(
              !forceOffline 
                ? 'Simulating Offline State. Platform will only search IndexedDB.' 
                : 'Simulating Online State. Connected to Plant Services.',
              { icon: !forceOffline ? '🔌' : '🌐' }
            );
          }}
          className={`px-3 py-1 rounded-lg border text-[10px] font-bold uppercase transition-all ${
            forceOffline 
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          {forceOffline ? 'Resume Online' : 'Force Offline'}
        </button>
      </div>

      {/* QR Code Scanner Canvas Box */}
      <div className="p-5 rounded-2xl glass-panel relative overflow-hidden flex flex-col gap-4 text-center">
        {cameraActive ? (
          <div className="aspect-square bg-black rounded-xl relative overflow-hidden flex flex-col items-center justify-center border border-slate-800">
            {/* Pulsing Scan Guide Grid */}
            <div className="absolute inset-8 border border-sky-400/40 rounded-lg flex items-center justify-center">
              <div className="w-full h-[1px] bg-sky-400 animate-[bounce_2s_infinite] shadow-lg shadow-sky-400" />
            </div>
            
            <Loader2 size={24} className="animate-spin text-sky-400 mb-2 relative z-10" />
            <span className="text-[10px] text-slate-400 relative z-10">
              {scanStatus === 'scanning' ? 'Align asset QR code in target box' : 'Scan successful!'}
            </span>
            
            <button
              onClick={() => { setCameraActive(false); setScanStatus('idle'); }}
              className="absolute bottom-3 text-[10px] text-red-400 hover:underline"
            >
              Cancel Scan
            </button>
          </div>
        ) : (
          <div 
            onClick={triggerCameraScan}
            className="aspect-square bg-slate-950/40 border border-slate-800 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-900/20 hover:border-slate-700 transition-all group"
          >
            <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20 group-hover:scale-105 transition-transform">
              <Camera size={24} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Tap to Scan QR Tag</h4>
              <p className="text-[9px] text-slate-500 mt-1">Open camera to identify asset barcodes</p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Enter tag (e.g. P-101)..."
            className="flex-1 glass-input text-xs bg-slate-950/60 uppercase"
            onKeyDown={(e) => e.key === 'Enter' && handleLookupTag(tagInput)}
          />
          <button
            onClick={() => handleLookupTag(tagInput)}
            disabled={loading}
            className="p-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg transition-colors shadow-lg disabled:opacity-40"
          >
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* --- Lookup Results Display --- */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-8 rounded-2xl glass-panel text-slate-500 text-[10px] gap-1.5">
          <Loader2 size={16} className="animate-spin text-sky-400" />
          Accessing passport file registry...
        </div>
      ) : assetData ? (
        <div className="p-5 rounded-2xl glass-panel space-y-4">
          {/* Offline Cached Banner */}
          {isOfflineCached && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400 flex items-center gap-1.5 font-bold uppercase tracking-wider animate-pulse">
              <ShieldAlert size={12} />
              Viewing Offline Cache (Local Memory)
            </div>
          )}

          <div className="flex justify-between items-start">
            <div>
              <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 bg-slate-800 text-slate-400 border border-slate-700/60 rounded">
                {assetData.equipment?.equipmentClass || 'EQUIPMENT'}
              </span>
              <h4 className="text-lg font-black text-slate-100 mt-1 font-mono">{assetData.equipment?.tag}</h4>
            </div>
            
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
              assetData.equipment?.operationalStatus === 'Operating'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
            }`}>
              {assetData.equipment?.operationalStatus}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed font-sans">{assetData.equipment?.description}</p>

          {/* Quick Specifications */}
          <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/20 text-[11px]">
            <table className="w-full text-left border-collapse">
              <tbody>
                <tr className="border-b border-slate-900">
                  <td className="p-2 px-3 text-slate-500 uppercase tracking-wider text-[8px] w-24">Location</td>
                  <td className="p-2 px-3 text-slate-300 font-semibold">{assetData.equipment?.location}</td>
                </tr>
                <tr className="border-b border-slate-900">
                  <td className="p-2 px-3 text-slate-500 uppercase tracking-wider text-[8px] w-24">MTBF (Hrs)</td>
                  <td className="p-2 px-3 text-slate-300 font-mono">
                    {assetData.equipment?.mtbf ? `${Math.round(assetData.equipment.mtbf)}h` : 'No failures'}
                  </td>
                </tr>
                <tr className="border-b border-slate-900">
                  <td className="p-2 px-3 text-slate-500 uppercase tracking-wider text-[8px] w-24">Design Cap</td>
                  <td className="p-2 px-3 text-slate-300">{assetData.equipment?.designCapacity || 'N/A'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* safety Checklist instruction strip */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-850 space-y-2">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">Operation Safety Rules</span>
            <div className="space-y-1">
              <div className="flex gap-2 text-[10px] text-slate-400">
                <Check size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                Ensure ground connection is securely clamped before startup.
              </div>
              <div className="flex gap-2 text-[10px] text-slate-400">
                <Check size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                Verify line pressure does not exceed 12.5 kg/cm².
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate(`/maintenance?tag=${assetData.equipment?.tag}`)}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-lg transition-colors border border-slate-700 flex items-center justify-center gap-1.5"
          >
            <Cpu size={12} />
            Full Maintenance Passport
          </button>
        </div>
      ) : null}

      {/* --- Recently Cached History (IDB keys) --- */}
      {cachedTags.length > 0 && (
        <div className="p-5 rounded-2xl glass-panel space-y-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block flex items-center gap-1">
            <History size={12} />
            Offline Synced Storage ({cachedTags.length})
          </span>
          <div className="flex flex-wrap gap-2">
            {cachedTags.map((cachedTag) => (
              <button
                key={cachedTag}
                onClick={() => {
                  setTagInput(cachedTag);
                  handleLookupTag(cachedTag);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-950/65 hover:bg-slate-900 border border-slate-850 hover:border-slate-700 text-xs font-mono font-bold text-slate-300 hover:text-sky-400 transition-colors"
              >
                {cachedTag}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
export default FieldScanner;
