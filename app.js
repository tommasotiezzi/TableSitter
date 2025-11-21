const app = {
    data: {
        guestCount: 0,
        tableLayout: '',
        guests: [],
        couples: [],
        relationships: {},
        currentPersonIndex: 0
    },

    goToStep(stepId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(stepId).classList.add('active');
    },

    setGuestCount() {
        const count = parseInt(document.getElementById('guestCountInput').value);
        if (count < 4 || count > 50) {
            alert('Please enter a number between 4 and 50');
            return;
        }
        this.data.guestCount = count;
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
        
        this.data.guests.push(name);
        input.value = '';
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
        container.innerHTML = this.data.guests.map((name, index) => `
            <div class="guest-item">
                <span>${name}</span>
                <button class="remove-btn" onclick="app.removeGuest(${index})">×</button>
            </div>
        `).join('');
    },

    checkNamesComplete() {
        const btn = document.getElementById('namesNextBtn');
        btn.disabled = this.data.guests.length !== this.data.guestCount;
    },

    populateCoupleSelects() {
        const select1 = document.getElementById('couple1');
        const select2 = document.getElementById('couple2');
        
        const options = this.data.guests.map((name, i) => 
            `<option value="${i}">${name}</option>`
        ).join('');
        
        select1.innerHTML = '<option value="">Select person</option>' + options;
        select2.innerHTML = '<option value="">Select person</option>' + options;
    },

    addCouple() {
        const idx1 = parseInt(document.getElementById('couple1').value);
        const idx2 = parseInt(document.getElementById('couple2').value);
        
        if (isNaN(idx1) || isNaN(idx2)) {
            alert('Please select both people');
            return;
        }
        
        if (idx1 === idx2) {
            alert('Please select two different people');
            return;
        }
        
        // Check if already exists
        const exists = this.data.couples.some(couple => 
            (couple[0] === idx1 && couple[1] === idx2) || 
            (couple[0] === idx2 && couple[1] === idx1)
        );
        
        if (exists) {
            alert('This couple already exists');
            return;
        }
        
        this.data.couples.push([idx1, idx2]);
        this.renderCoupleList();
        
        // Reset selects
        document.getElementById('couple1').value = '';
        document.getElementById('couple2').value = '';
    },

    removeCouple(index) {
        this.data.couples.splice(index, 1);
        this.renderCoupleList();
    },

    renderCoupleList() {
        const container = document.getElementById('coupleList');
        
        if (this.data.couples.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--brown-500); padding: 20px;">No couples added yet</p>';
            return;
        }
        
        container.innerHTML = this.data.couples.map((couple, index) => `
            <div class="couple-item">
                <span>${this.data.guests[couple[0]]} + ${this.data.guests[couple[1]]}</span>
                <button class="remove-btn" onclick="app.removeCouple(${index})">×</button>
            </div>
        `).join('');
    },

    startRelationships() {
        this.populateCoupleSelects();
        this.data.currentPersonIndex = 0;
        this.data.relationships = {};
        
        // Initialize relationships for all guests
        this.data.guests.forEach((_, i) => {
            this.data.relationships[i] = [];
        });
        
        this.goToStep('relationships');
        this.renderRelationshipStep();
    },

    renderRelationshipStep() {
        const currentIdx = this.data.currentPersonIndex;
        const currentName = this.data.guests[currentIdx];
        
        document.getElementById('relationshipTitle').textContent = `Who does ${currentName} know well?`;
        document.getElementById('currentPerson').textContent = currentIdx + 1;
        document.getElementById('totalPersons').textContent = this.data.guests.length;
        
        // Update progress bar
        const progress = ((currentIdx + 1) / this.data.guests.length) * 100;
        document.getElementById('progressFill').style.width = progress + '%';
        
        // Render options (exclude current person and their partner if they're in a couple)
        let excludedIndices = [currentIdx];
        
        // Check if current person is in a couple
        this.data.couples.forEach(couple => {
            if (couple[0] === currentIdx) excludedIndices.push(couple[1]);
            if (couple[1] === currentIdx) excludedIndices.push(couple[0]);
        });
        
        const container = document.getElementById('relationshipOptions');
        const currentRels = this.data.relationships[currentIdx] || [];
        
        container.innerHTML = this.data.guests.map((name, idx) => {
            if (excludedIndices.includes(idx)) return '';
            
            const existing = currentRels.find(r => r.person === idx);
            const isChecked = existing ? 'checked' : '';
            const relType = existing ? existing.type : 'friend';
            const isDisabled = !existing && currentRels.length >= 3;
            
            return `
                <div class="relationship-item ${isDisabled ? 'disabled' : ''}">
                    <input type="checkbox" 
                           id="rel_${idx}" 
                           ${isChecked} 
                           ${isDisabled ? 'disabled' : ''}
                           onchange="app.toggleRelationship(${idx})">
                    <label for="rel_${idx}">${name}</label>
                    <select id="type_${idx}" 
                            ${!existing ? 'disabled' : ''}
                            onchange="app.updateRelationshipType(${idx})">
                        <option value="best_friend" ${relType === 'best_friend' ? 'selected' : ''}>Best Friend</option>
                        <option value="friend" ${relType === 'friend' ? 'selected' : ''}>Friend</option>
                        <option value="acquaintance" ${relType === 'acquaintance' ? 'selected' : ''}>Acquaintance</option>
                    </select>
                </div>
            `;
        }).join('');
        
        // Update button states
        document.getElementById('prevBtn').disabled = currentIdx === 0;
        const nextBtn = document.getElementById('nextBtn');
        if (currentIdx === this.data.guests.length - 1) {
            nextBtn.textContent = 'Generate Seating';
            nextBtn.onclick = () => this.generateSeating();
        } else {
            nextBtn.textContent = 'Next';
            nextBtn.onclick = () => this.nextPerson();
        }
    },

    toggleRelationship(personIdx) {
        const currentIdx = this.data.currentPersonIndex;
        const checkbox = document.getElementById(`rel_${personIdx}`);
        const select = document.getElementById(`type_${personIdx}`);
        const currentRels = this.data.relationships[currentIdx];
        
        if (checkbox.checked) {
            if (currentRels.length >= 3) {
                checkbox.checked = false;
                alert('You can only select up to 3 relationships per person');
                return;
            }
            currentRels.push({
                person: personIdx,
                type: select.value
            });
            select.disabled = false;
        } else {
            const idx = currentRels.findIndex(r => r.person === personIdx);
            if (idx !== -1) {
                currentRels.splice(idx, 1);
            }
            select.disabled = true;
        }
        
        this.renderRelationshipStep();
    },

    updateRelationshipType(personIdx) {
        const currentIdx = this.data.currentPersonIndex;
        const select = document.getElementById(`type_${personIdx}`);
        const rel = this.data.relationships[currentIdx].find(r => r.person === personIdx);
        
        if (rel) {
            rel.type = select.value;
        }
    },

    nextPerson() {
        if (this.data.currentPersonIndex < this.data.guests.length - 1) {
            this.data.currentPersonIndex++;
            this.renderRelationshipStep();
        }
    },

    previousPerson() {
        if (this.data.currentPersonIndex > 0) {
            this.data.currentPersonIndex--;
            this.renderRelationshipStep();
        }
    },

    generateSeating() {
        const arrangement = seatingAlgorithm.generate(
            this.data.guests.length,
            this.data.couples,
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
            couples: [],
            relationships: {},
            currentPersonIndex: 0
        };
        
        document.getElementById('guestCountInput').value = '';
        document.getElementById('nameInput').value = '';
        
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