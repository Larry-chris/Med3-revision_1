import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2, BookOpen, ChevronDown, ChevronUp,
  BarChart3, Search, User, Loader2, Cloud, WifiOff, Wifi
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot
} from 'firebase/firestore';

// --- Configuration Firebase sécurisée ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialisation sécurisée
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.log("En attente de configuration Firebase...");
}

const appId = 'med-revision-uac';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [progress, setProgress] = useState(() => {
    // Récupération initiale locale pour rapidité (Hors ligne)
    const saved = localStorage.getItem(`med_progress_${appId}`);
    return saved ? JSON.parse(saved) : {};
  });
  const [expandedUE, setExpandedUE] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  // Données du programme (MG3 S5)
  const initialData = [
    {
      ue: "UE 4 - Pathologie Médicale",
      ecues: [
        { nom: "Cardiologie", chapitres: ["Syndrome coronarien aigu", "Syndrome coronarien chronique", "Dissection aortique", "Hypertension artérielle", "Crise hypertensive", "Artériopathie oblitérante des membres inférieurs / Ischémie aiguë", "Insuffisance mitrale", "Rétrécissement mitral", "Insuffisance aortique", "Rétrécissement aortique / Endocardites", "Péricardites aiguës", "Péricardites chroniques constrictives", "Cardites rhumatismales", "Thrombose veineuse profonde", "Embolie pulmonaire", "Tachyarythmies", "Bradyarythmies", "Insuffisance cardiaque", "ECG"] },
        { nom: "Pneumologie", chapitres: ["Généralités sur la tuberculose", "Primo-infection tuberculeuse", "Tuberculose pulmonaire commune", "Tuberculose extra-pulmonaire / Traitement", "Diagnostic et Traitement de l'asthme", "Cancer broncho-pulmonaire primitif", "Épanchements liquidiens de la plèvre", "Pneumothorax", "Pneumopathies aiguës virales", "Pneumopathies aiguës bactériennes", "Affections respiratoires et VIH", "Sarcoïdose", "Tabagisme", "Troubles respiratoires du sommeil"] }
      ]
    },
    {
      ue: "UE 5 - Pathologie Chirurgicale",
      ecues: [
        { nom: "Chirurgie Viscérale", chapitres: ["Lésions de la rate", "Lésions du foie", "Lésions du bloc duodéno-pancréatique", "Hématomes rétropéritonéaux", "Contusions pulmonaires", "Traumatismes vasculaires périphériques", "Rupture de l'aorte", "Lésions contusives du cœur", "Hémopneumothorax"] },
        { nom: "Anesthésie - Réanimation", chapitres: ["Le polytraumatisé", "Brûlures étendues"] },
        { nom: "Imagerie Chirurgicale", chapitres: ["Imagerie des traumatismes abdominaux"] },
        { nom: "Traumatologie - Orthopédie", chapitres: ["Luxation de l'épaule", "Fracture de la clavicule", "Fracture de l'humérus proximal", "Fracture de la diaphyse humérale", "Fracture du fémur proximal", "Fracture du fémur : diaphyse et épiphyse", "Traumatismes du poignet et de la main", "Fractures des plateaux tibiaux", "Fractures du bassin et du cotyle", "Écrasement des membres / Contusion", "Luxation de la hanche", "Traumatismes des nerfs périphériques", "Traumatismes du coude (adulte)", "Fracture des os de l'avant-bras", "Fracture des os de la jambe", "Traumatismes de la cheville", "Contention externe"] }
      ]
    },
    {
      ue: "UE 1 - Bactériologie & Virologie",
      ecues: [
        { nom: "Bactériologie", chapitres: ["Place des bactéries", "La cellule bactérienne", "Génétique bactérienne", "Physiologie bactérienne", "Interaction hôte-bactérie", "Les antibiotiques", "Les staphylocoques", "Les streptocoques", "Les entérocoques", "Neisseria", "Généralités sur les entérobactéries", "Escherichia coli", "Shigella / Salmonella", "Vibrio Cholerae", "Mycobactéries / Treponema", "Bactéries anaérobies strictes"] },
        { nom: "Virologie", chapitres: ["Structure des virus", "Multiplication virale", "Diagnostic virologique", "Virus des Hépatites", "VIH"] }
      ]
    },
    {
      ue: "UE 2 - Immunologie",
      ecues: [
        { nom: "Immunologie 1", chapitres: ["Les Composantes du SI", "Les antigènes", "Les anticorps", "Mode de reconnaissance", "Les lymphocytes B", "Système du complément", "Cytokines", "La phagocytose", "Lymphocytes T helpers", "Le CMH", "Réponse humorale", "La cellule NK", "Les Ac monoclonaux"] }
      ]
    },
    {
      ue: "UE 7 - Parasitologie & Mycologie",
      ecues: [
        { nom: "Parasitologie", chapitres: ["Généralités", "Entomologie médicale", "Ascaridiose", "Trichocéphalose", "Oxyurose", "Ankylostomes", "Anguillulose", "Giardiase", "Trichomonose urogénitale", "Amibiase", "Trypanosomiase", "Toxoplasmose", "Coccidioses", "Paludisme", "Filarioses lymphatiques", "Onchocercose", "La loase", "Bilharziose", "Taeniasis", "Cysticercose"] },
        { nom: "Mycologie", chapitres: ["Introduction", "Candidose", "Cryptococcoses / Malassezioses", "Dermatophytoses"] }
      ]
    }
  ];

  // Gestion de l'état de la connexion
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

  // Initialisation Auth
  useEffect(() => {
    const initAuth = async () => {
      if (!auth) {
        setLoading(false);
        return;
      }
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth error", err);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, setUser);
      return () => unsubscribe();
    }
  }, []);

  // Synchro Firestore -> Local
  useEffect(() => {
    if (!user || !isOnline || !db) return;
    const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'progress');
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const cloudData = docSnap.data().data || {};
        setProgress(cloudData);
        localStorage.setItem(`med_progress_${appId}`, JSON.stringify(cloudData));
      }
    }, (err) => console.error("Firestore read error", err));
    return () => unsubscribe();
  }, [user, isOnline]);

  // Sauvegarde (Local d'abord, Cloud si online)
  const saveProgress = async (newProgress) => {
    setProgress(newProgress);
    localStorage.setItem(`med_progress_${appId}`, JSON.stringify(newProgress));

    if (user && isOnline && db) {
      setSyncing(true);
      try {
        const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'progress');
        await setDoc(userDocRef, { data: newProgress, lastUpdated: new Date().toISOString() }, { merge: true });
      } catch (err) {
        console.error("Cloud save failed", err);
      } finally {
        setTimeout(() => setSyncing(false), 500);
      }
    }
  };

  const toggleCheck = (chapitreId, type) => {
    const newProgress = {
      ...progress,
      [chapitreId]: {
        ...(progress[chapitreId] || { appris: false, rev1: false, rev2: false }),
        [type]: !progress[chapitreId]?.[type]
      }
    };
    saveProgress(newProgress);
  };

  const calculateStats = useMemo(() => {
    let totalItems = 0;
    let checkedCount = 0;
    let chapitresAppris = 0;
    let totalChapitres = 0;

    initialData.forEach(ue => {
      ue.ecues.forEach(ecue => {
        ecue.chapitres.forEach(chap => {
          totalChapitres++;
          const id = `${ecue.nom}-${chap}`;
          const state = progress[id] || {};
          if (state.appris) { checkedCount++; chapitresAppris++; }
          if (state.rev1) checkedCount++;
          if (state.rev2) checkedCount++;
          totalItems += 3;
        });
      });
    });

    return {
      percent: Math.round((checkedCount / totalItems) * 100) || 0,
      appris: chapitresAppris,
      total: totalChapitres
    };
  }, [progress]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600 size-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      {/* Barre de Status de Connexion */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-[10px] font-bold py-1 px-4 flex items-center justify-center gap-2">
          <WifiOff size={12} /> MODE HORS LIGNE - Sauvegarde locale active
        </div>
      )}

      <nav className="bg-white border-b sticky top-0 z-50 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <BookOpen size={20} />
            </div>
            <span className="font-bold text-slate-800">MémoFSS</span>
          </div>

          <div className="flex items-center gap-3">
            {syncing && <Cloud size={16} className="text-blue-500 animate-pulse" />}
            {isOnline ? <Wifi size={16} className="text-green-500" /> : <WifiOff size={16} className="text-slate-400" />}
            {user && (
              <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-mono text-slate-500">
                ID: {user.uid.substring(0, 4)}
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Header avec progression */}
        <header className="mb-8 bg-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold">Session MG3 - S5</h1>
            <p className="text-slate-400 text-sm">Faculté des Sciences de la Santé, Bénin</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-black">{calculateStats.appris}/{calculateStats.total}</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Chapitres lus</div>
            </div>
            <div className="relative size-16 flex items-center justify-center">
              <svg className="size-full -rotate-90">
                <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.1)" strokeWidth="4" fill="transparent" />
                <circle cx="32" cy="32" r="28" stroke="#3b82f6" strokeWidth="4" fill="transparent"
                  strokeDasharray={175.8}
                  strokeDashoffset={175.8 - (175.8 * calculateStats.percent) / 100}
                  strokeLinecap="round" className="transition-all duration-500" />
              </svg>
              <span className="absolute text-xs font-bold">{calculateStats.percent}%</span>
            </div>
          </div>
        </header>

        {/* Recherche */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
          <input
            type="text"
            placeholder="Rechercher une pathologie..."
            className="w-full pl-12 pr-4 py-4 rounded-2xl border-none bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
            onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
          />
        </div>

        {/* Liste des matières */}
        <div className="space-y-4">
          {initialData.map((ue) => (
            <div key={ue.ue} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <button
                onClick={() => setExpandedUE(prev => ({ ...prev, [ue.ue]: !prev[ue.ue] }))}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                    <User size={18} />
                  </div>
                  <span className="font-bold text-slate-700">{ue.ue}</span>
                </div>
                {expandedUE[ue.ue] ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
              </button>

              {expandedUE[ue.ue] && (
                <div className="p-4 bg-slate-50/50 space-y-6">
                  {ue.ecues.map((ecue) => {
                    const filtered = ecue.chapitres.filter(c => c.toLowerCase().includes(searchTerm));
                    if (filtered.length === 0) return null;

                    return (
                      <div key={ecue.nom} className="bg-white rounded-xl border p-4 shadow-sm">
                        <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">{ecue.nom}</h3>
                        <div className="space-y-1">
                          {filtered.map((chap) => {
                            const id = `${ecue.nom}-${chap}`;
                            const state = progress[id] || { appris: false, rev1: false, rev2: false };
                            return (
                              <div key={chap} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-lg hover:bg-slate-50 gap-2">
                                <span className="text-sm text-slate-600 font-medium">{chap}</span>
                                <div className="flex gap-4 self-end">
                                  <button onClick={() => toggleCheck(id, 'appris')} className={`flex flex-col items-center gap-0.5 ${state.appris ? 'text-green-600' : 'text-slate-200'}`}>
                                    <CheckCircle2 size={18} />
                                    <span className="text-[8px] font-bold">LU</span>
                                  </button>
                                  <button onClick={() => toggleCheck(id, 'rev1')} className={`flex flex-col items-center gap-0.5 ${state.rev1 ? 'text-orange-500' : 'text-slate-200'}`}>
                                    <BarChart3 size={18} />
                                    <span className="text-[8px] font-bold">R1</span>
                                  </button>
                                  <button onClick={() => toggleCheck(id, 'rev2')} className={`flex flex-col items-center gap-0.5 ${state.rev2 ? 'text-blue-600' : 'text-slate-200'}`}>
                                    <CheckCircle2 size={18} />
                                    <span className="text-[8px] font-bold">R2</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;