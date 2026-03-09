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