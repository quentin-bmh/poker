export const generateDeck = () => {
  const suits = ['♠️', '♥️', '♦️', '♣️'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  return suits.flatMap(suit => ranks.map(rank => ({ rank, suit, id: `${rank}${suit}` })));
};

const evaluateHandStrength = (cards) => {
  if (!cards || cards.length === 0) return { score: 0, name: "Carte Haute" };
  const rankValues = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
  const counts = {};
  const suits = {};
  let maxRank = 0;
  const uniqueVals = new Set();

  for (let i = 0; i < cards.length; i++) {
    const val = rankValues[cards[i].rank];
    counts[val] = (counts[val] || 0) + 1;
    suits[cards[i].suit] = (suits[cards[i].suit] || 0) + 1;
    if (val > maxRank) maxRank = val;
    uniqueVals.add(val);
  }

  let isFlush = false;
  for (const suit in suits) { if (suits[suit] >= 5) isFlush = true; }

  let isStraight = false;
  const sortedVals = Array.from(uniqueVals).sort((a, b) => a - b);
  if (sortedVals.includes(14)) sortedVals.unshift(1); 
  
  let consecutive = 1;
  for (let i = 0; i < sortedVals.length - 1; i++) {
    if (sortedVals[i + 1] - sortedVals[i] === 1) {
      consecutive++;
      if (consecutive >= 5) isStraight = true;
    } else {
      consecutive = 1;
    }
  }

  const frequencies = Object.values(counts).sort((a, b) => b - a);
  let score = maxRank;
  let name = "Carte Haute";

  if (isStraight && isFlush) { score += 8000; name = "Quinte Flush"; }
  else if (frequencies[0] === 4) { score += 7000; name = "Carré"; }
  else if (frequencies[0] === 3 && frequencies[1] >= 2) { score += 6000; name = "Full House"; }
  else if (isFlush) { score += 5000; name = "Couleur"; }
  else if (isStraight) { score += 4000; name = "Quinte"; }
  else if (frequencies[0] === 3) { score += 3000; name = "Brelan"; }
  else if (frequencies[0] === 2 && frequencies[1] === 2) { score += 2000; name = "Double Paire"; }
  else if (frequencies[0] === 2) { score += 1000; name = "Paire"; }

  return { score, name };
};

export const calculateEquity = (heroCards, communityCards, iterations = 2000) => {
  const defaultProbs = { "Quinte Flush": 0, "Carré": 0, "Full House": 0, "Couleur": 0, "Quinte": 0, "Brelan": 0, "Double Paire": 0, "Paire": 0, "Carte Haute": 0 };
  if (heroCards.length !== 2) return { win: 0, tie: 0, loss: 0, equity: 0, probabilities: defaultProbs };
  
  let wins = 0, ties = 0, losses = 0;
  const handStats = { ...defaultProbs };
  const deadCards = new Set([...heroCards, ...communityCards].map(c => c.id));
  const deck = generateDeck().filter(c => !deadCards.has(c.id));

  for (let i = 0; i < iterations; i++) {
    const currentDeck = [...deck];
    for (let j = 0; j < 7; j++) {
      const r = Math.floor(Math.random() * (currentDeck.length - j)) + j;
      [currentDeck[j], currentDeck[r]] = [currentDeck[r], currentDeck[j]];
    }
    const neededCommunity = 5 - communityCards.length;
    const simulatedCommunity = [...communityCards, ...currentDeck.slice(0, neededCommunity)];
    const villainHand = currentDeck.slice(neededCommunity, neededCommunity + 2);

    const heroEval = evaluateHandStrength([...heroCards, ...simulatedCommunity]);
    const villainEval = evaluateHandStrength([...villainHand, ...simulatedCommunity]);

    handStats[heroEval.name]++;
    if (heroEval.score > villainEval.score) wins++;
    else if (heroEval.score === villainEval.score) ties++;
    else losses++;
  }

  const probabilities = {};
  for (const hand in handStats) {
    probabilities[hand] = (handStats[hand] / iterations) * 100;
  }

  return {
    win: (wins / iterations) * 100, tie: (ties / iterations) * 100,
    loss: (losses / iterations) * 100, equity: ((wins + (ties / 2)) / iterations) * 100,
    probabilities
  };
};

export const analyzeSituation = (heroCards, communityCards) => {
  if (heroCards.length !== 2) return null;
  const analysis = { current: "Carte Haute", draws: [], vulnerabilities: [], directives: [] };
  const allCards = [...heroCards, ...communityCards];
  const suitsCount = { '♠️': 0, '♥️': 0, '♦️': 0, '♣️': 0 };
  const boardSuits = { '♠️': 0, '♥️': 0, '♦️': 0, '♣️': 0 };
  
  allCards.forEach(c => suitsCount[c.suit]++);
  communityCards.forEach(c => boardSuits[c.suit]++);
  const heroRanks = heroCards.map(c => c.rank);
  const boardRanks = communityCards.map(c => c.rank);

  let isStrongHand = false;
  const evalHand = evaluateHandStrength(allCards);
  analysis.current = evalHand.name;
  if (evalHand.score >= 3000) isStrongHand = true; 

  if (communityCards.length < 5) {
    const flushSuit = Object.keys(suitsCount).find(suit => suitsCount[suit] === 4);
    if (flushSuit) analysis.draws.push(`Tirage Couleur (${flushSuit})`);
    const uniqueRanksCount = new Set(allCards.map(c => c.rank)).size;
    if (uniqueRanksCount >= 4 && !flushSuit) analysis.draws.push("Possibilité Tirage Quinte");
  }

  if (communityCards.length >= 3) {
    const threatSuit = Object.keys(boardSuits).find(suit => boardSuits[suit] >= 3);
    if (threatSuit && suitsCount[threatSuit] < 5) {
      analysis.vulnerabilities.push(`Board coordonné (${threatSuit})`);
      if (isStrongHand) analysis.directives.push("Menace de couleur adverse. Restreindre la taille du pot en cas de relance.");
    }

    const rankValues = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
    let hasOvercards = false;
    
    if (heroRanks[0] === heroRanks[1]) {
      const heroVal = rankValues[heroRanks[0]];
      hasOvercards = boardRanks.some(r => rankValues[r] > heroVal);
      if (hasOvercards) {
        analysis.vulnerabilities.push("Overcards (Board > Pocket Pair)");
        analysis.directives.push("Main dévaluée (Bluff Catcher). Privilégier le Check. Fold sur agression lourde.");
      }
    }

    if (!isStrongHand && !hasOvercards && analysis.draws.length === 0) {
      analysis.directives.push("Aucune équité réalisable. Fold immédiat face à une mise.");
    }
  }

  if (isStrongHand && analysis.vulnerabilities.length === 0) {
    analysis.directives.push("Value Bet prioritaire. Maximiser l'extraction face aux tirages adverses.");
  }

  return analysis;
};
export const generateExpertCommentary = async (context, strategy) => {
  const { heroCards, communityCards, equity, analysis, potSize, currentBet } = context;
  
  if (heroCards.length < 2) return "En attente de la main de départ (Hero).";

  const numPot = Number(potSize) || 0;
  const numBet = Number(currentBet) || 0;
  const potOdds = numBet > 0 ? (numBet / (numPot + numBet)) * 100 : 0;
  const winEq = equity.win;

  // Simulation de latence d'API (Inférence LLM)
  await new Promise(resolve => setTimeout(resolve, 600));

  let action = "CHECK";
  let justification = "";

  // Logique décisionnelle stricte
  if (numBet === 0) {
    if (winEq > 60 || (analysis && analysis.directives.some(d => d.includes("Value")))) {
      action = "RAISE";
      justification = "Vous êtes favori. Misez pour valoriser votre main et faire payer les tirages.";
    } else if (winEq > 40) {
      action = "CHECK";
      justification = "Équité moyenne. Contrôlez la taille du pot.";
    } else {
      action = "CHECK / FOLD";
      justification = "Main faible ou dominée. N'investissez rien de plus.";
    }
  } else {
    // Face à une mise
    if (winEq >= potOdds * 1.5) {
      action = "RE-RAISE (3-Bet/4-Bet)";
      justification = `Équité (${winEq.toFixed(1)}%) largement supérieure aux cotes du pot (${potOdds.toFixed(1)}%). Relancez pour maximiser la valeur et protéger votre main.`;
    } else if (winEq >= potOdds) {
      action = "CALL";
      justification = `Cotes de pot favorables (${potOdds.toFixed(1)}% requises vs ${winEq.toFixed(1)}% d'équité). Suivez la mise, mais restez prudent sur les prochaines streets.`;
    } else {
      // Intégration de la stratégie pour dévier de la pure mathématique
      if (strategy === "LAG (Loose Aggressive)" && analysis.draws.length > 0) {
        action = "RAISE (Semi-Bluff)";
        justification = `Cotes défavorables, mais la stratégie LAG exploite la Fold Equity. Relancez sur vos tirages (${analysis.draws[0]}).`;
      } else {
        action = "FOLD";
        justification = `EV négative. Les cotes du pot (${potOdds.toFixed(1)}%) exigent plus d'équité que votre main actuelle (${winEq.toFixed(1)}%). Passez.`;
      }
    }
  }

  // Ajout du contexte de texture
  const threatMsg = analysis && analysis.vulnerabilities.length > 0 
    ? ` Attention: ${analysis.vulnerabilities[0]}.` 
    : "";

  return `[ACTION : ${action}]\n${justification}${threatMsg}`;
};