function generateSeating(numGuests, couples, bestFriends, keepApart, introverts, relationships, layout) {
    const allBestFriends = [...couples, ...bestFriends];
    const arrangement = new Array(numGuests).fill(-1);
    const used = new Array(numGuests).fill(false);
    
    // Place couples
    placeCouples(arrangement, couples, used, numGuests, layout);
    
    // Fill remaining
    fillRemaining(arrangement, allBestFriends, keepApart, introverts, relationships, used, numGuests, layout);
    
    return arrangement;
}

function placeCouples(arr, couples, used, num, layout) {
    couples.forEach(([p1, p2]) => {
        let placed = false;
        
        if (layout === 'rectangular') {
            const top = Math.ceil(num / 2);
            // Try across
            for (let i = 0; i < top && !placed; i++) {
                if (arr[i] === -1) {
                    const across = num - 1 - i;
                    if (across >= top && arr[across] === -1) {
                        arr[i] = p1;
                        arr[across] = p2;
                        used[p1] = used[p2] = true;
                        placed = true;
                    }
                }
            }
        }
        
        // Fallback: 2 seats apart
        if (!placed) {
            for (let i = 0; i < num - 2 && !placed; i++) {
                if (arr[i] === -1 && arr[i + 2] === -1) {
                    arr[i] = p1;
                    arr[i + 2] = p2;
                    used[p1] = used[p2] = true;
                    placed = true;
                }
            }
        }
        
        // Last resort: adjacent
        if (!placed) {
            for (let i = 0; i < num - 1 && !placed; i++) {
                if (arr[i] === -1 && arr[i + 1] === -1) {
                    arr[i] = p1;
                    arr[i + 1] = p2;
                    used[p1] = used[p2] = true;
                    placed = true;
                }
            }
        }
    });
}

function fillRemaining(arr, allBF, keepApart, introverts, rels, used, num, layout) {
    const remaining = [];
    for (let i = 0; i < num; i++) {
        if (!used[i]) remaining.push(i);
    }
    
    shuffle(remaining);
    
    for (const person of remaining) {
        let bestPos = -1;
        let bestScore = -Infinity;
        
        for (let pos = 0; pos < num; pos++) {
            if (arr[pos] === -1) {
                const score = scorePos(person, pos, arr, allBF, keepApart, introverts, rels, num, layout);
                if (score > bestScore) {
                    bestScore = score;
                    bestPos = pos;
                }
            }
        }
        
        if (bestPos !== -1) arr[bestPos] = person;
    }
}

function scorePos(person, pos, arr, allBF, keepApart, introverts, rels, num, layout) {
    let score = 0;
    
    const personRels = rels[person] || [];
    const isIntrovert = introverts.includes(person);
    const interactionZone = getInteractionZone(pos, num, layout);
    const nearbyZone = getNearbyZone(pos, num, layout);
    
    // Get person's best friends
    const personBF = [];
    allBF.forEach(([a, b]) => {
        if (a === person) personBF.push(b);
        if (b === person) personBF.push(a);
    });
    
    // Get keep apart
    const mustAvoid = [];
    keepApart.forEach(([a, b]) => {
        if (a === person) mustAvoid.push(b);
        if (b === person) mustAvoid.push(a);
    });
    
    let hasStrangerInZone = false;
    let hasKnownNearby = false;
    let knownInZone = 0;
    
    // Check interaction zone
    interactionZone.forEach(zonePos => {
        const zonePerson = arr[zonePos];
        if (zonePerson !== -1) {
            // Keep apart violation
            if (mustAvoid.includes(zonePerson)) {
                score -= 500;
                return;
            }
            
            // Best friend in zone
            if (personBF.includes(zonePerson)) {
                score -= 120;
                knownInZone++;
                return;
            }
            
            // Regular relationship
            const rel = personRels.find(r => r.person === zonePerson);
            if (rel) {
                knownInZone++;
                if (rel.type === 'close_friend') score -= 80;
                else if (rel.type === 'friend') score -= 50;
                else if (rel.type === 'acquaintance') score -= 20;
            } else {
                score += 50;
                hasStrangerInZone = true;
            }
        }
    });
    
    // Check nearby zone
    nearbyZone.forEach(nearPos => {
        const nearPerson = arr[nearPos];
        if (nearPerson !== -1) {
            if (personBF.includes(nearPerson)) {
                hasKnownNearby = true;
                score += 80;
                return;
            }
            
            const rel = personRels.find(r => r.person === nearPerson);
            if (rel) {
                hasKnownNearby = true;
                if (rel.type === 'close_friend') score += 70;
                else if (rel.type === 'friend') score += 50;
                else if (rel.type === 'acquaintance') score += 25;
            }
        }
    });
    
    // Introvert penalty
    if (isIntrovert && !hasKnownNearby && (personRels.length > 0 || personBF.length > 0)) {
        score -= 100;
    }
    
    // Isolation penalty
    if (hasStrangerInZone && !hasKnownNearby && (personRels.length > 0 || personBF.length > 0)) {
        score -= 40;
    }
    
    // Perfect mixing bonus
    if (hasStrangerInZone && hasKnownNearby) {
        score += 60;
    }
    
    // All known penalty
    if (knownInZone === interactionZone.length && interactionZone.length > 0) {
        score -= 50;
    }
    
    return score;
}

function getInteractionZone(pos, num, layout) {
    const zone = [];
    
    if (layout === 'rectangular') {
        const top = Math.ceil(num / 2);
        
        if (pos < top) {
            // Top side
            if (pos > 0) zone.push(pos - 1);
            if (pos < top - 1) zone.push(pos + 1);
            
            // Across
            const across = num - 1 - pos;
            zone.push(across);
            if (across > top) zone.push(across - 1);
            if (across < num - 1) zone.push(across + 1);
        } else {
            // Bottom side
            if (pos < num - 1) zone.push(pos + 1);
            if (pos > top) zone.push(pos - 1);
            
            // Across
            const across = num - 1 - pos;
            zone.push(across);
            if (across > 0) zone.push(across - 1);
            if (across < top - 1) zone.push(across + 1);
        }
    } else {
        // Circular
        zone.push((pos - 1 + num) % num);
        zone.push((pos + 1) % num);
    }
    
    return zone.filter(p => p >= 0 && p < num);
}

function getNearbyZone(pos, num, layout) {
    const nearby = [];
    
    if (layout === 'rectangular') {
        const top = Math.ceil(num / 2);
        
        if (pos < top) {
            if (pos >= 2) nearby.push(pos - 2);
            if (pos <= top - 3) nearby.push(pos + 2);
        } else {
            if (pos >= top + 2) nearby.push(pos - 2);
            if (pos <= num - 3) nearby.push(pos + 2);
        }
    } else {
        nearby.push((pos + 2) % num);
        nearby.push((pos - 2 + num) % num);
        nearby.push((pos + 3) % num);
        nearby.push((pos - 3 + num) % num);
    }
    
    return nearby.filter(p => p >= 0 && p < num);
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}