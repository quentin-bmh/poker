import React, { useState, useMemo, useEffect } from 'react';
import { generateDeck, calculateEquity, analyzeSituation, generateExpertCommentary } from './util/pokerLogic';
import { RefreshCw, Play, TrendingUp, AlertTriangle, Target, Info, BarChart3, Coins, Cpu } from 'lucide-react';

const CardSlot = ({ card, onClick, label }) => (
  <div 
    onClick={onClick}
    className={`h-24 w-16 border-2 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${
      card ? 'bg-white text-black border-slate-300 shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'bg-slate-800/50 border-slate-600 border-dashed hover:border-blue-400'
    }`}
  >
    {card ? (
      <>
        <span className={`text-xl font-bold ${['♥️','♦️'].includes(card.suit) ? 'text-red-600' : 'text-slate-900'}`}>{card.rank}</span>
        <span className={`text-2xl ${['♥️','♦️'].includes(card.suit) ? 'text-red-600' : 'text-slate-900'}`}>{card.suit}</span>
      </>
    ) : (
      <span className="text-xs text-slate-400 font-mono">{label}</span>
    )}
  </div>
);

const HAND_ORDER = ["Quinte Flush", "Carré", "Full House", "Couleur", "Quinte", "Brelan", "Double Paire", "Paire", "Carte Haute"];
const STRATEGIES = ["GTO (Théorie Optimale)", "LAG (Loose Aggressive)", "TAG (Tight Aggressive)"];

export default function App() {
  const [heroCards, setHeroCards] = useState([]);
  const [communityCards, setCommunityCards] = useState([]);
  const [potSize, setPotSize] = useState(100);
  const [currentBet, setCurrentBet] = useState(0);
  
  // États de l'expert IA
  const [strategy, setStrategy] = useState(STRATEGIES[0]);
  const [expertAdvice, setExpertAdvice] = useState("En attente des données de la main...");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const deck = useMemo(() => generateDeck(), []);

  const handleCardClick = (card) => {
    if (heroCards.some(c => c.id === card.id) || communityCards.some(c => c.id === card.id)) {
      setHeroCards(prev => prev.filter(c => c.id !== card.id));
      setCommunityCards(prev => prev.filter(c => c.id !== card.id));
      return;
    }
    if (heroCards.length < 2) setHeroCards([...heroCards, card]);
    else if (communityCards.length < 5) setCommunityCards([...communityCards, card]);
  };

  const equityData = useMemo(() => {
    if (heroCards.length === 2) return calculateEquity(heroCards, communityCards);
    return { win: 0, tie: 0, loss: 0, equity: 0, probabilities: HAND_ORDER.reduce((acc, hand) => ({ ...acc, [hand]: 0 }), {}) };
  }, [heroCards, communityCards]);

  const handAnalysis = useMemo(() => analyzeSituation(heroCards, communityCards), [heroCards, communityCards]);

  // Hook réactif : Déclenche l'évaluation de l'IA à chaque mutation pertinente
  useEffect(() => {
    let isCancelled = false;
    
    if (heroCards.length < 2) {
      setExpertAdvice("En attente de vos cartes (Hero)...");
      return;
    }

    setIsAnalyzing(true);
    
    const context = {
      heroCards,
      communityCards,
      equity: equityData,
      analysis: handAnalysis,
      potSize,
      currentBet
    };

    generateExpertCommentary(context, strategy).then(advice => {
      if (!isCancelled) {
        setExpertAdvice(advice);
        setIsAnalyzing(false);
      }
    });

    return () => { isCancelled = true; };
  }, [heroCards, communityCards, potSize, currentBet, strategy, equityData, handAnalysis]);

  const resetBoard = () => {
    setHeroCards([]);
    setCommunityCards([]);
    setCurrentBet(0);
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-950 p-6 font-sans text-slate-100 flex justify-center">
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
        
        {/* Section Interactive (Gauche) */}
        <div className="lg:col-span-8 flex flex-col gap-6 h-full">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex-shrink-0">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Play className="w-5 h-5 text-blue-400" /> State Virtuel
              </h2>
              <button onClick={resetBoard} className="text-slate-400 hover:text-white transition-colors">
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-center justify-center mb-8">
              <div className="flex flex-col items-center gap-2">
                <span className="text-sm text-slate-400 uppercase tracking-widest">Hero</span>
                <div className="flex gap-2">
                  <CardSlot card={heroCards[0]} onClick={() => heroCards[0] && handleCardClick(heroCards[0])} label="C1" />
                  <CardSlot card={heroCards[1]} onClick={() => heroCards[1] && handleCardClick(heroCards[1])} label="C2" />
                </div>
              </div>
              <div className="w-px h-24 bg-slate-800 hidden md:block"></div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-sm text-slate-400 uppercase tracking-widest">Board</span>
                <div className="flex gap-2">
                  {[...Array(5)].map((_, i) => (
                    <CardSlot key={`comm-${i}`} card={communityCards[i]} onClick={() => communityCards[i] && handleCardClick(communityCards[i])} label={i < 3 ? 'Flop' : i === 3 ? 'Turn' : 'River'} />
                  ))}
                </div>
              </div>
            </div>

            {/* Inputs Dynamiques (Pot / Mise) */}
            <div className="grid grid-cols-2 gap-6 p-4 bg-slate-950/50 rounded-lg border border-slate-800">
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-yellow-500" /> Pot Actuel ($)
                </label>
                <input 
                  type="number" 
                  value={potSize} 
                  onChange={(e) => setPotSize(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" /> Mise Adverse ($)
                </label>
                <input 
                  type="number" 
                  value={currentBet} 
                  onChange={(e) => setCurrentBet(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-red-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex-grow overflow-hidden flex flex-col">
            <h3 className="text-sm text-slate-400 uppercase tracking-widest mb-4">Matrice d'entrée (Deck)</h3>
            <div className="grid grid-cols-13 gap-1 overflow-y-auto pr-2 custom-scrollbar">
              {deck.map(card => {
                const isSelected = heroCards.some(c => c.id === card.id) || communityCards.some(c => c.id === card.id);
                const isRed = ['♥️','♦️'].includes(card.suit);
                return (
                  <button key={card.id} onClick={() => handleCardClick(card)} disabled={isSelected} className={`p-2 rounded font-mono text-sm border transition-all ${isSelected ? 'opacity-20 border-slate-800 bg-slate-900 cursor-not-allowed' : `border-slate-700 hover:-translate-y-1 ${isRed ? 'text-red-400 hover:border-red-500/50' : 'text-slate-300 hover:border-blue-500/50'}`}`}>
                    {card.rank}{card.suit}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panneau Analytique (Droite) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl">
          
          {/* Module : Expert IA */}
          <div className="p-4 border-b border-slate-800 bg-slate-950 flex-shrink-0">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-widest flex items-center gap-2 text-blue-400">
                <Cpu className="w-4 h-4" /> Décision IA
              </h2>
              <select 
                value={strategy} 
                onChange={(e) => setStrategy(e.target.value)} 
                className="bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded p-1 outline-none focus:border-blue-500 cursor-pointer uppercase"
              >
                {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            
            <div className={`p-4 rounded-lg border transition-all duration-300 relative overflow-hidden ${isAnalyzing ? 'border-blue-500/50 bg-blue-900/10' : 'border-slate-700 bg-slate-900'}`}>
              {isAnalyzing && (
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/20">
                  <div className="h-full bg-blue-500 w-1/3 animate-pulse rounded"></div>
                </div>
              )}
              <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                {expertAdvice}
              </p>
            </div>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar flex-grow space-y-8">
            {/* Équité */}
            <div>
              <h3 className="text-xs text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" /> Équité Globale
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1"><span className="text-green-400">WIN</span><span>{equityData.win.toFixed(1)}%</span></div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full"><div className="h-full bg-green-500 transition-all" style={{ width: `${equityData.win}%` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1"><span className="text-red-400">LOSS</span><span>{equityData.loss.toFixed(1)}%</span></div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full"><div className="h-full bg-red-500 transition-all" style={{ width: `${equityData.loss}%` }}></div></div>
                </div>
              </div>
            </div>

            {/* Distribution River */}
            <div>
              <h3 className="text-xs text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Probabilités (River)
              </h3>
              <div className="space-y-2">
                {HAND_ORDER.map(hand => {
                  const prob = equityData.probabilities[hand] || 0;
                  if (prob === 0 && heroCards.length < 2) return null;
                  return (
                    <div key={hand} className={`flex flex-col ${prob === 0 ? 'opacity-30' : ''}`}>
                      <div className="flex justify-between text-[11px] mb-1 text-slate-300 uppercase"><span>{hand}</span><span className="font-mono">{prob.toFixed(1)}%</span></div>
                      <div className="h-1 w-full bg-slate-950 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-300 ${prob > 20 ? 'bg-blue-500' : prob > 5 ? 'bg-blue-400' : 'bg-blue-800'}`} style={{ width: `${Math.min(prob, 100)}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Analyse Technique */}
            {handAnalysis && (
              <div className="space-y-4">
                <h3 className="text-xs text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Info className="w-4 h-4" /> Détails Techniques</h3>
                <div className="bg-slate-950 p-3 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Main Constituée</span>
                  <span className="text-sm font-semibold text-blue-100">{handAnalysis.current}</span>
                </div>
                {handAnalysis.draws.length > 0 && (
                  <div className="bg-slate-950 p-3 rounded border border-blue-900/50">
                    <span className="text-[10px] text-blue-400 uppercase tracking-wider block mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> Outs</span>
                    <ul className="text-xs list-disc list-inside text-slate-300">
                      {handAnalysis.draws.map((draw, idx) => <li key={idx}>{draw}</li>)}
                    </ul>
                  </div>
                )}
                {handAnalysis.vulnerabilities.length > 0 && (
                  <div className="bg-slate-950 p-3 rounded border border-red-900/50">
                    <span className="text-[10px] text-red-400 uppercase tracking-wider block mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Menaces</span>
                    <ul className="text-xs list-disc list-inside text-slate-300">
                      {handAnalysis.vulnerabilities.map((vuln, idx) => <li key={idx}>{vuln}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}