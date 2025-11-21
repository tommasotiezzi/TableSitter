const app = {
    data: {
        guestCount: 0,
        tableLayout: '',
        guests: [],
        introverts: [], // indices of introverted guests
        couples: [],
        bestFriends: [], // separate from couples
        keepApart: [],
        outsiders: [], // people not in couples/bestFriends
        relationships: {},
        currentPersonIndex: 0
    },

    goToStep(stepId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(stepId).classList.add('active');
        
        // Initialize build groups when entering
        if (stepId === 'build-groups') {
            this.initBuildGroups();
        }
        
        // Populate keep apart dropdowns
        if (stepId === 'keep-apart') {
            this.populateKeepApartSelects();
        }
    },

    setGuestCount() {
        const count = parseInt(document.getElementById('guestCountInput').value);
        if (count < 4 || count > 50) {
            alert('Please enter a number between 4 and 50');
            return;
        }
        this.data.guestCount = count;
        
        // Initialize counter display
        document.getElementById('guestTotal').textContent = count;
        document.getElementById('guestCounter').textContent = '0';
        
        this.goToStep('table-layout');
    },

    selectLayout(layout) {
        this.data.tableLayout = layout;
        
        // Visual feedback
        document.querySelectorAll('.layout-card').forEach(card => {
            card.classList.remove('selected');
        });
        event.currentTarget.classList.add('selected');
        
        // Go to next step after short delay
        setTimeout(() => {
            this.goToStep('guest-names');
        }, 300);
    },

    addGuest() {
        const input = document.getElementById('nameInput');
        const introvertCheck = document.getElementById('introvertCheck');
        const name = input.value.trim();
        
        if (!name) {
            alert('Please enter a name');
            return;
        }
        
        if (this.data.guests.length >= this.data.guestCount) {
            alert(`You can only add ${this.data.guestCount} guests`);
            return;
        }
        
        if (this.data.guests.includes(name)) {
            alert('This name already exists');
            return;
        }
        
        const guestIndex = this.data.guests.length;
        this.data.guests.push(name);
        
        if (introvertCheck.checked) {
            this.data.introverts.push(guestIndex);
        }
        
        input.value = '';
        introvertCheck.checked = false;
        this.renderGuestList();
        this.checkNamesComplete();
    },

    removeGuest(index) {
        this.data.guests.splice(index, 1);
        this.renderGuestList();
        this.checkNamesComplete();
    },

    renderGuestList() {
        const container = document.getElementById('guestList');
        container.innerHTML = this.data.guests.map((name, index) => {
            const isIntrovert = this.data.introverts.includes(index);
            return `
                <div class="guest-item">
                    <span>${name}${isIntrovert ? ' <span class="intro-badge">🤫</span>' : ''}</span>
                    <button class="remove-btn" onclick="app.removeGuest(${index})">×</button>
                </div>
            `;
        }).join('');
        
        // Update counter
        document.getElementById('guestCounter').textContent = this.data.guests.length;
    },

    checkNamesComplete() {
        const btn = document.getElementById('namesNextBtn');
        btn.disabled = this.data.guests.length !== this.data.guestCount;
    },

    // Build Groups - Drag & Drop
    initBuildGroups() {
        this.renderGuestCards();
        this.initDragAndDrop();
    },

    renderGuestCards() {
        const container = document.getElementById('guestCards');
        container.innerHTML = this.data.guests.map((name, idx) => {
            const abbreviation = name.substring(0, 3).toUpperCase();
            return `
                <div class="guest-card" 
                     draggable="true" 
                     data-guest-id="${idx}"
                     data-guest-name="${name}">
                    ${abbreviation}
                </div>
            `;
        }).join('');
    },

    initDragAndDrop() {
        const cards = document.querySelectorAll('.guest-card');
        const slots = document.querySelectorAll('.drop-slot');

        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('guestId', card.dataset.guestId);
                e.dataTransfer.setData('guestName', card.dataset.guestName);
                card.classList.add('dragging');
            });

            card.addEventListener('dragend', (e) => {
                card.classList.remove('dragging');
            });
        });

        slots.forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (!slot.classList.contains('filled')) {
                    slot.classList.add('drag-over');
                }
            });

            slot.addEventListener('dragleave', (e) => {
                slot.classList.remove('drag-over');
            });

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                
                if (slot.classList.contains('filled')) return;
                
                const guestId = parseInt(e.dataTransfer.getData('guestId'));
                const guestName = e.dataTransfer.getData('guestName');
                
                this.fillSlot(slot, guestId, guestName);
            });
        });
    },

    fillSlot(slot, guestId, guestName) {
        const abbreviation = guestName.substring(0, 3).toUpperCase();
        
        slot.classList.add('filled');
        slot.innerHTML = `
            <div class="guest-card-in-slot">
                ${abbreviation}
                <button class="remove-from-slot" onclick="app.removeFromSlot(this, ${guestId})">×</button>
            </div>
        `;
        
        // Hide card from available
        const card = document.querySelector(`.guest-card[data-guest-id="${guestId}"]`);
        if (card) card.classList.add('hidden');
        
        // Check if pair is complete
        const group = slot.dataset.group;
        const pairIndex = parseInt(slot.dataset.pair);
        const pairSlots = document.querySelectorAll(`.drop-slot[data-group="${group}"][data-pair="${pairIndex}"]`);
        const allFilled = Array.from(pairSlots).every(s => s.classList.contains('filled'));
        
        if (allFilled) {
            // Add new empty pair
            this.addEmptyPair(group);
            
            // Save the pair
            const guestIds = Array.from(pairSlots).map(s => {
                const cardInSlot = s.querySelector('.guest-card-in-slot');
                return parseInt(cardInSlot.parentElement.dataset.originalGuestId || 
                               s.dataset.guestId);
            });
            
            // Store in slot for retrieval
            pairSlots.forEach((s, i) => {
                s.dataset.guestId = guestIds[i] || this.getGuestIdFromSlot(s);
            });
        }
    },

    getGuestIdFromSlot(slot) {
        const abbrev = slot.querySelector('.guest-card-in-slot')?.textContent.trim().replace('×', '');
        return this.data.guests.findIndex(name => 
            name.substring(0, 3).toUpperCase() === abbrev
        );
    },

    removeFromSlot(button, guestId) {
        const slot = button.closest('.drop-slot');
        slot.classList.remove('filled');
        slot.innerHTML = '<span class="slot-placeholder">+</span>';
        delete slot.dataset.guestId;
        
        // Show card again
        const card = document.querySelector(`.guest-card[data-guest-id="${guestId}"]`);
        if (card) card.classList.remove('hidden');
    },

    addEmptyPair(group) {
        const container = group === 'couple' ? 
            document.getElementById('coupleSlotsContainer') : 
            document.getElementById('bestFriendSlotsContainer');
        
        const currentPairs = container.querySelectorAll('.slot-pair').length;
        
        const newPair = document.createElement('div');
        newPair.className = 'slot-pair';
        newPair.innerHTML = `
            <div class="drop-slot" data-group="${group}" data-pair="${currentPairs}" data-position="0">
                <span class="slot-placeholder">+</span>
            </div>
            <div class="drop-slot" data-group="${group}" data-pair="${currentPairs}" data-position="1">
                <span class="slot-placeholder">+</span>
            </div>
        `;
        
        container.appendChild(newPair);
        
        // Re-init drag and drop for new slots
        this.initDragAndDrop();
    },

    finishGroups() {
        // Extract couples
        this.data.couples = [];
        const coupleSlots = document.querySelectorAll('.drop-slot[data-group="couple"]');
        const couplePairs = {};
        
        coupleSlots.forEach(slot => {
            if (slot.classList.contains('filled')) {
                const pairIndex = slot.dataset.pair;
                const guestId = this.getGuestIdFromSlot(slot);
                
                if (!couplePairs[pairIndex]) couplePairs[pairIndex] = [];
                couplePairs[pairIndex].push(guestId);
            }
        });
        
        Object.values(couplePairs).forEach(pair => {
            if (pair.length === 2) {
                this.data.couples.push(pair);
            }
        });
        
        // Extract best friends
        this.data.bestFriends = [];
        const bfSlots = document.querySelectorAll('.drop-slot[data-group="bestfriend"]');
        const bfPairs = {};
        
        bfSlots.forEach(slot => {
            if (slot.classList.contains('filled')) {
                const pairIndex = slot.dataset.pair;
                const guestId = this.getGuestIdFromSlot(slot);
                
                if (!bfPairs[pairIndex]) bfPairs[pairIndex] = [];
                bfPairs[pairIndex].push(guestId);
            }
        });
        
        Object.values(bfPairs).forEach(pair => {
            if (pair.length === 2) {
                this.data.bestFriends.push(pair);
            }
        });
        
        this.goToStep('keep-apart');
    },

    // Keep Apart functions
    populateKeepApartSelects() {
        const select1 = document.getElementById('apart1');
        const select2 = document.getElementById('apart2');
        
        const options = this.data.guests.map((name, i) => 
            `<option value="${i}">${name}</option>`
        ).join('');
        
        select1.innerHTML = '<option value="">Select person</option>' + options;
        select2.innerHTML = '<option value="">Select person</option>' + options;
    },

    addKeepApart() {
        const idx1 = parseInt(document.getElementById('apart1').value);
        const idx2 = parseInt(document.getElementById('apart2').value);
        
        if (isNaN(idx1) || isNaN(idx2)) {
            alert('Please select both people');
            return;
        }
        
        if (idx1 === idx2) {
            alert('Please select two different people');
            return;
        }
        
        // Check if already exists
        const exists = this.data.keepApart.some(pair => 
            (pair[0] === idx1 && pair[1] === idx2) || 
            (pair[0] === idx2 && pair[1] === idx1)
        );
        
        if (exists) {
            alert('This pair is already marked to keep apart');
            return;
        }
        
        this.data.keepApart.push([idx1, idx2]);
        this.renderKeepApartList();
        
        // Reset selects
        document.getElementById('apart1').value = '';
        document.getElementById('apart2').value = '';
    },

    removeKeepApart(index) {
        this.data.keepApart.splice(index, 1);
        this.renderKeepApartList();
    },

    renderKeepApartList() {
        const container = document.getElementById('keepApartList');
        
        if (this.data.keepApart.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--brown-500); padding: 20px;">No conflicts added</p>';
            return;
        }
        
        container.innerHTML = this.data.keepApart.map((pair, index) => `
            <div class="couple-item">
                <span>${this.data.guests[pair[0]]} ≠ ${this.data.guests[pair[1]]}</span>
                <button class="remove-btn" onclick="app.removeKeepApart(${index})">×</button>
            </div>
        `).join('');
    },

    // Outsiders - Connect people not in groups
    checkOutsiders() {
        // Find people not in couples or best friends
        const inGroups = new Set();
        this.data.couples.forEach(pair => {
            inGroups.add(pair[0]);
            inGroups.add(pair[1]);
        });
        this.data.bestFriends.forEach(pair => {
            inGroups.add(pair[0]);
            inGroups.add(pair[1]);
        });
        
        const outsiders = [];
        this.data.guests.forEach((name, idx) => {
            if (!inGroups.has(idx)) {
                outsiders.push(idx);
            }
        });
        
        if (outsiders.length === 0) {
            // No outsiders, skip to generation
            this.generateSeating();
        } else {
            // Show outsiders step
            this.data.outsiders = outsiders;
            this.renderOutsiders();
            this.goToStep('connect-outsiders');
        }
    },

    renderOutsiders() {
        const container = document.getElementById('outsidersList');
        const peopleInGroups = [];
        
        // Get all people in groups for selection
        this.data.couples.forEach(pair => {
            pair.forEach(id => {
                if (!peopleInGroups.includes(id)) {
                    peopleInGroups.push(id);
                }
            });
        });
        this.data.bestFriends.forEach(pair => {
            pair.forEach(id => {
                if (!peopleInGroups.includes(id)) {
                    peopleInGroups.push(id);
                }
            });
        });
        
        container.innerHTML = this.data.outsiders.map(outsiderId => {
            const outsiderName = this.data.guests[outsiderId];
            const options = peopleInGroups.map(id => 
                `<option value="${id}">${this.data.guests[id]}</option>`
            ).join('');
            
            return `
                <div class="outsider-item">
                    <div class="outsider-name">${outsiderName}</div>
                    <div class="outsider-connections" id="connections_${outsiderId}">
                        <div class="connection-row">
                            <select class="input-medium" id="outsider_person_${outsiderId}_0">
                                <option value="">Who do they know?</option>
                                ${options}
                            </select>
                            <select class="input-medium" id="outsider_level_${outsiderId}_0">
                                <option value="close_friend">Close Friend</option>
                                <option value="friend" selected>Friend</option>
                                <option value="acquaintance">Acquaintance</option>
                            </select>
                        </div>
                        <div class="connection-row">
                            <select class="input-medium" id="outsider_person_${outsiderId}_1">
                                <option value="">Who else?</option>
                                ${options}
                            </select>
                            <select class="input-medium" id="outsider_level_${outsiderId}_1">
                                <option value="close_friend">Close Friend</option>
                                <option value="friend" selected>Friend</option>
                                <option value="acquaintance">Acquaintance</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    generateSeating() {
        // Collect outsider relationships
        this.data.relationships = {};
        this.data.guests.forEach((_, i) => {
            this.data.relationships[i] = [];
        });
        
        if (this.data.outsiders) {
            this.data.outsiders.forEach(outsiderId => {
                for (let i = 0; i < 2; i++) {
                    const personSelect = document.getElementById(`outsider_person_${outsiderId}_${i}`);
                    const levelSelect = document.getElementById(`outsider_level_${outsiderId}_${i}`);
                    
                    if (personSelect && personSelect.value) {
                        const personId = parseInt(personSelect.value);
                        const level = levelSelect.value;
                        
                        this.data.relationships[outsiderId].push({
                            person: personId,
                            type: level
                        });
                    }
                }
            });
        }
        
        const arrangement = seatingAlgorithm.generate(
            this.data.guests.length,
            this.data.couples,
            this.data.bestFriends,
            this.data.keepApart,
            this.data.introverts,
            this.data.relationships,
            this.data.tableLayout
        );
        
        this.displaySeating(arrangement);
        this.goToStep('results');
    },

    displaySeating(arrangement) {
        const container = document.getElementById('tableDisplay');
        
        let tableClass = '';
        if (this.data.tableLayout === 'rectangular') {
            tableClass = 'table-rectangular';
        } else if (this.data.tableLayout === 'circular') {
            tableClass = 'table-circular';
        }
        
        container.innerHTML = `<div class="table-shape ${tableClass}" id="tableShape"></div>`;
        
        const tableShape = document.getElementById('tableShape');
        const positions = this.calculatePositions(arrangement.length, this.data.tableLayout);
        
        arrangement.forEach((guestIdx, pos) => {
            const card = document.createElement('div');
            card.className = 'place-card';
            card.textContent = this.data.guests[guestIdx];
            card.style.left = positions[pos].x + '%';
            card.style.top = positions[pos].y + '%';
            tableShape.appendChild(card);
        });
    },

    calculatePositions(numGuests, layout) {
        const positions = [];
        
        if (layout === 'rectangular') {
            // Split guests between top and bottom sides
            const topSide = Math.ceil(numGuests / 2);
            const bottomSide = numGuests - topSide;
            
            // Top side (left to right)
            for (let i = 0; i < topSide; i++) {
                positions.push({
                    x: 10 + (i / Math.max(topSide - 1, 1)) * 80,
                    y: 0
                });
            }
            
            // Bottom side (right to left, so they face top side)
            for (let i = 0; i < bottomSide; i++) {
                positions.push({
                    x: 90 - (i / Math.max(bottomSide - 1, 1)) * 80,
                    y: 100
                });
            }
        } else if (layout === 'circular') {
            // Evenly spaced around circle
            for (let i = 0; i < numGuests; i++) {
                const angle = (i / numGuests) * 2 * Math.PI - Math.PI / 2;
                positions.push({
                    x: 50 + Math.cos(angle) * 45,
                    y: 50 + Math.sin(angle) * 45
                });
            }
        }
        
        return positions;
    },

    exportSeating() {
        const arrangement = [];
        const cards = document.querySelectorAll('.place-card');
        cards.forEach((card, i) => {
            arrangement.push(`${i + 1}. ${card.textContent}`);
        });
        
        const text = `TableSitter - Seating Arrangement\n\nTable Layout: ${this.data.tableLayout}\n\n${arrangement.join('\n')}`;
        
        // Copy to clipboard
        navigator.clipboard.writeText(text).then(() => {
            alert('Seating arrangement copied to clipboard!');
        }).catch(() => {
            // Fallback: show in alert
            alert(text);
        });
    },

    reset() {
        this.data = {
            guestCount: 0,
            tableLayout: '',
            guests: [],
            introverts: [],
            couples: [],
            bestFriends: [],
            keepApart: [],
            outsiders: [],
            relationships: {},
            currentPersonIndex: 0
        };
        
        document.getElementById('guestCountInput').value = '';
        document.getElementById('nameInput').value = '';
        document.getElementById('introvertCheck').checked = false;
        
        this.goToStep('landing');
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Allow Enter key on name input
    document.getElementById('nameInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            app.addGuest();
        }
    });
    
    // Allow Enter key on guest count
    document.getElementById('guestCountInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            app.setGuestCount();
        }
    });
});