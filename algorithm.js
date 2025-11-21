const seatingAlgorithm = {
    generate(numGuests, couples, bestFriends, keepApart, introverts, relationships, layout) {
        // Combine couples and bestFriends into one bestFriends array for algorithm
        const allBestFriends = [...couples, ...bestFriends];
        
        const arrangement = new Array(numGuests).fill(-1);
        const used = new Array(numGuests).fill(false);
        
        // Step 1: Place couples with appropriate gap based on layout
        this.placeCouples(arrangement, couples, used, numGuests, layout);
        
        // Step 2: Fill remaining seats prioritizing maximum mixing in interaction zones
        this.fillRemaining(arrangement, allBestFriends, keepApart, introverts, relationships, used, numGuests, layout);
        
        return arrangement;
    },
    
    placeCouples(arrangement, couples, used, numGuests, layout) {
        couples.forEach(couple => {
            const [p1, p2] = couple;
            
            let placed = false;
            
            if (layout === 'rectangular') {
                // For rectangular: try to place across from each other (they can see/talk)
                // or with 1-2 seats gap on same side
                const topSide = Math.ceil(numGuests / 2);
                
                // Try placing across first
                for (let i = 0; i < topSide && !placed; i++) {
                    if (arrangement[i] === -1) {
                        // Position across is roughly mirrored on bottom side
                        const acrossPos = numGuests - 1 - i;
                        if (acrossPos >= topSide && arrangement[acrossPos] === -1) {
                            arrangement[i] = p1;
                            arrangement[acrossPos] = p2;
                            used[p1] = true;
                            used[p2] = true;
                            placed = true;
                        }
                    }
                }
                
                // Fallback: place with 1-2 seat gap on same side
                if (!placed) {
                    for (let i = 0; i < numGuests - 2 && !placed; i++) {
                        if (arrangement[i] === -1) {
                            const gapPos = i + 2;
                            if (gapPos < numGuests && arrangement[gapPos] === -1) {
                                arrangement[i] = p1;
                                arrangement[gapPos] = p2;
                                used[p1] = true;
                                used[p2] = true;
                                placed = true;
                            }
                        }
                    }
                }
            } else if (layout === 'circular') {
                // For circular: place with 1-2 seats gap (they can still see each other)
                for (let i = 0; i < numGuests && !placed; i++) {
                    if (arrangement[i] === -1) {
                        // Try 2 seats gap first
                        const gapPos = (i + 2) % numGuests;
                        if (arrangement[gapPos] === -1) {
                            arrangement[i] = p1;
                            arrangement[gapPos] = p2;
                            used[p1] = true;
                            used[p2] = true;
                            placed = true;
                        }
                    }
                }
            }
            
            // Last resort: adjacent
            if (!placed) {
                for (let i = 0; i < numGuests && !placed; i++) {
                    if (arrangement[i] === -1) {
                        const nextPos = (i + 1) % numGuests;
                        if (arrangement[nextPos] === -1) {
                            arrangement[i] = p1;
                            arrangement[nextPos] = p2;
                            used[p1] = true;
                            used[p2] = true;
                            placed = true;
                        }
                    }
                }
            }
        });
    },
    
    fillRemaining(arrangement, allBestFriends, keepApart, introverts, relationships, used, numGuests, layout) {
        const remaining = [];
        for (let i = 0; i < numGuests; i++) {
            if (!used[i]) {
                remaining.push(i);
            }
        }
        
        // Shuffle for randomness
        this.shuffle(remaining);
        
        // Score each position for each person and place optimally
        for (const person of remaining) {
            let bestPos = -1;
            let bestScore = -Infinity;
            
            for (let pos = 0; pos < numGuests; pos++) {
                if (arrangement[pos] === -1) {
                    const score = this.scorePosition(person, pos, arrangement, allBestFriends, keepApart, introverts, relationships, numGuests, layout);
                    if (score > bestScore) {
                        bestScore = score;
                        bestPos = pos;
                    }
                }
            }
            
            if (bestPos !== -1) {
                arrangement[bestPos] = person;
            }
        }
    },
    
    getInteractionZone(pos, numGuests, layout) {
        // Returns array of positions that this person can interact with
        const zone = [];
        
        if (layout === 'rectangular') {
            const topSide = Math.ceil(numGuests / 2);
            
            if (pos < topSide) {
                // Top side
                // Left and right neighbors
                if (pos > 0) zone.push(pos - 1);
                if (pos < topSide - 1) zone.push(pos + 1);
                
                // Across positions (bottom side, roughly mirrored)
                const acrossCenter = numGuests - 1 - pos;
                zone.push(acrossCenter);
                if (acrossCenter > topSide) zone.push(acrossCenter - 1);
                if (acrossCenter < numGuests - 1) zone.push(acrossCenter + 1);
            } else {
                // Bottom side
                // Left and right neighbors
                if (pos < numGuests - 1) zone.push(pos + 1);
                if (pos > topSide) zone.push(pos - 1);
                
                // Across positions (top side, roughly mirrored)
                const acrossCenter = numGuests - 1 - pos;
                zone.push(acrossCenter);
                if (acrossCenter > 0) zone.push(acrossCenter - 1);
                if (acrossCenter < topSide - 1) zone.push(acrossCenter + 1);
            }
        } else if (layout === 'circular') {
            // Circular: mainly left and right immediate neighbors
            const left = (pos - 1 + numGuests) % numGuests;
            const right = (pos + 1) % numGuests;
            zone.push(left, right);
        }
        
        return zone.filter(p => p >= 0 && p < numGuests);
    },
    
    getNearbyZone(pos, numGuests, layout) {
        // Returns "nearby but not immediate" positions (for social bridges)
        const nearby = [];
        
        if (layout === 'rectangular') {
            const topSide = Math.ceil(numGuests / 2);
            
            if (pos < topSide) {
                // Top side - check 2 seats away on same side
                if (pos >= 2) nearby.push(pos - 2);
                if (pos <= topSide - 3) nearby.push(pos + 2);
            } else {
                // Bottom side - check 2 seats away on same side
                if (pos >= topSide + 2) nearby.push(pos - 2);
                if (pos <= numGuests - 3) nearby.push(pos + 2);
            }
        } else if (layout === 'circular') {
            // Circular: 2-3 seats away (can still see/talk across)
            nearby.push((pos + 2) % numGuests);
            nearby.push((pos - 2 + numGuests) % numGuests);
            nearby.push((pos + 3) % numGuests);
            nearby.push((pos - 3 + numGuests) % numGuests);
        }
        
        return nearby.filter(p => p >= 0 && p < numGuests);
    },
    
    scorePosition(person, pos, arrangement, allBestFriends, keepApart, introverts, relationships, numGuests, layout) {
        // Higher score = better mixing with social bridges
        let score = 0;
        
        const personRels = relationships[person] || [];
        const isIntrovert = introverts.includes(person);
        const interactionZone = this.getInteractionZone(pos, numGuests, layout);
        const nearbyZone = this.getNearbyZone(pos, numGuests, layout);
        
        // Check if person is best friends with someone
        const personBestFriends = [];
        allBestFriends.forEach(pair => {
            if (pair[0] === person) personBestFriends.push(pair[1]);
            if (pair[1] === person) personBestFriends.push(pair[0]);
        });
        
        // Check if person should be kept apart from someone
        const mustKeepApartFrom = [];
        keepApart.forEach(pair => {
            if (pair[0] === person) mustKeepApartFrom.push(pair[1]);
            if (pair[1] === person) mustKeepApartFrom.push(pair[0]);
        });
        
        let hasStrangerInZone = false;
        let hasKnownPersonNearby = false;
        let knownPeopleInZone = 0;
        
        // Check immediate interaction zone
        interactionZone.forEach(zonePos => {
            const zonePerson = arrangement[zonePos];
            if (zonePerson !== -1) {
                // CRITICAL: Check keep apart constraint
                if (mustKeepApartFrom.includes(zonePerson)) {
                    score -= 500; // Massive penalty for violating keep apart
                    return;
                }
                
                // Check if best friend
                if (personBestFriends.includes(zonePerson)) {
                    score -= 120; // Heavy penalty for best friends in interaction zone
                    knownPeopleInZone++;
                    return;
                }
                
                // Check regular relationships
                const rel = personRels.find(r => r.person === zonePerson);
                if (rel) {
                    knownPeopleInZone++;
                    // PENALIZE known people in immediate interaction zone
                    if (rel.type === 'close_friend') {
                        score -= 80;
                    } else if (rel.type === 'friend') {
                        score -= 50;
                    } else if (rel.type === 'acquaintance') {
                        score -= 20;
                    } else if (rel.type === 'know_by_sight') {
                        score -= 5;
                    }
                } else {
                    // REWARD strangers in interaction zone
                    score += 50;
                    hasStrangerInZone = true;
                }
            }
        });
        
        // Check nearby zone for social bridges
        nearbyZone.forEach(nearbyPos => {
            const nearbyPerson = arrangement[nearbyPos];
            if (nearbyPerson !== -1) {
                // Check if best friend
                if (personBestFriends.includes(nearbyPerson)) {
                    hasKnownPersonNearby = true;
                    score += 80; // REWARD best friends nearby (social bridge)
                    return;
                }
                
                // Check regular relationships
                const rel = personRels.find(r => r.person === nearbyPerson);
                if (rel) {
                    hasKnownPersonNearby = true;
                    // REWARD known people nearby (social bridge)
                    if (rel.type === 'close_friend') {
                        score += 70;
                    } else if (rel.type === 'friend') {
                        score += 50;
                    } else if (rel.type === 'acquaintance') {
                        score += 25;
                    } else if (rel.type === 'know_by_sight') {
                        score += 10;
                    }
                }
            }
        });
        
        // INTROVERT handling: MUST have known person nearby
        if (isIntrovert && !hasKnownPersonNearby && (personRels.length > 0 || personBestFriends.length > 0)) {
            score -= 100; // Heavy penalty for introvert isolation
        }
        
        // CRITICAL: Avoid complete stranger islands for everyone
        if (hasStrangerInZone && !hasKnownPersonNearby && (personRels.length > 0 || personBestFriends.length > 0)) {
            score -= 40; // Penalty for isolation
        }
        
        // IDEAL: strangers in interaction zone + friends nearby
        if (hasStrangerInZone && hasKnownPersonNearby) {
            score += 60; // Bonus for perfect mixing setup
        }
        
        // Penalize if ALL people in interaction zone are known (no mixing)
        if (knownPeopleInZone === interactionZone.length && interactionZone.length > 0) {
            score -= 50;
        }
        
        return score;
    },
    
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
};