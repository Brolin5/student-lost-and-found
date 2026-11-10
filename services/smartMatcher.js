/**
 * Smart Matching Engine
 * Automatically compares Lost vs Found items and computes similarity scores
 * using category alignment, tokenized keyword matching, and campus location proximity.
 */

function tokenize(text = '') {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2);
}

function computeSimilarity(target, candidate) {
  // Only match opposite post types (Lost <-> Found)
  if (target.post_type === candidate.post_type) return 0;

  let score = 0;

  // 1. Category exact match (40 points)
  if (target.category && candidate.category && target.category.toLowerCase() === candidate.category.toLowerCase()) {
    score += 40;
  }

  // 2. Keyword Jaccard Similarity on Title & Description (40 points)
  const targetWords = new Set([...tokenize(target.title), ...tokenize(target.description)]);
  const candidateWords = new Set([...tokenize(candidate.title), ...tokenize(candidate.description)]);

  if (targetWords.size > 0 && candidateWords.size > 0) {
    let intersection = 0;
    for (const word of targetWords) {
      if (candidateWords.has(word)) intersection++;
    }
    const union = new Set([...targetWords, ...candidateWords]).size;
    const jaccard = union > 0 ? (intersection / union) : 0;
    score += Math.round(jaccard * 40);
  }

  // 3. Location Overlap (20 points)
  const targetLoc = tokenize(target.location);
  const candidateLoc = new Set(tokenize(candidate.location));
  let locMatches = 0;
  for (const locWord of targetLoc) {
    if (candidateLoc.has(locWord)) locMatches++;
  }
  if (locMatches > 0) {
    score += Math.min(20, locMatches * 10);
  }

  return Math.min(100, score);
}

function findMatches(targetItem, allItems, threshold = 40) {
  const matches = [];

  for (const item of allItems) {
    const id = item._id || item.id;
    const targetId = targetItem._id || targetItem.id;
    if (id === targetId) continue;

    const score = computeSimilarity(targetItem, item);
    if (score >= threshold) {
      matches.push({
        item,
        score,
        reason: score >= 70 ? 'High Confidence Match' : 'Potential Match'
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

module.exports = { computeSimilarity, findMatches };
