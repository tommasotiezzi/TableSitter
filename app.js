// Global state
const state = {
    guestCount: 0,
    layout: '',
    guests: [],
    introverts: [],
    couples: [],
    bestFriends: [],
    keepApart: [],
    outsiders: [],
    relationships: {}
};

// Navigation
function goToStep(stepId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const step = document.getElementById(stepId);
    if (step) step.classList.add('active');
    
    if (stepId === 'build-groups') initBuildGroups();
    if (stepId === 'keep-apart') populateKeepApart();
}

// Step 1: Guest Count
function setGuestCount() {
    const count = parseInt(document.getElementById('guestCountInput').value);
    if (count < 4 || count > 50) {
        alert('Please enter 4-50 guests');
        return;
    }
    state.guestCount = count;
    document.getElementById('total').textContent = count;
    document.getElementById('counter').textContent = '0';
    goToStep('table-layout');
}

// Step 2: Layout
function selectLayout(layout) {
    state.layout = layout;
    document.querySelectorAll('.layout-card').forEach(c => c.classList.remove('selected'));
    event.target.closest('.layout-card').classList.add('selected');
    setTimeout(() => goToStep('guest-names'), 300);
}

// Step 3: Guest Names
function addGuest() {
    const input = document.getElementById('nameInput');
    const intro = document.getElementById('introvertCheck');
    const name = input.value.trim();
    
    if (!name) return alert('Enter a name');
    if (state.guests.length >= state.guestCount) return alert('All guests added');
    if (state.guests.includes(name)) return alert('Name exists');
    
    const idx = state.guests.length;
    state.guests.push(name);
    if (intro.checked) state.introverts.push(idx);
    
    input.value = '';
    intro.checked = false;
    renderGuestList();
}

function removeGuest(idx) {
    state.guests.splice(idx, 1);
    // Adjust introverts indices
    state.introverts = state.introverts.filter(i => i !== idx).map(i => i > idx ? i - 1 : i);
    renderGuestList();
}

function renderGuestList() {
    const list = document.getElementById('guestList');
    list.innerHTML = state.guests.map((name, idx) => `
        <div class="guest-item">
            <span>${name}${state.introverts.includes(idx) ? ' 🤫' : ''}</span>
            <button class="remove-btn" onclick="removeGuest(${idx})">×</button>
        </div>
    `).join('');
    
    document.getElementById('counter').textContent = state.guests.length;
    document.getElementById('namesNext').disabled = state.guests.length !== state.guestCount;
}

// Step 4: Build Groups (Drag & Drop)
function initBuildGroups() {
    renderCards();
    renderSlots();
    initDragDrop();
}

function renderCards() {
    const container = document.getElementById('cards');
    container.innerHTML = state.guests.map((name, idx) => `
        <div class="card" draggable="true" data-id="${idx}">${name.substring(0,3)}</div>
    `).join('');
}

function renderSlots() {
    // Couples
    let html = '<div class="slot-pair">';
    html += '<div class="slot" data-group="couple" data-idx="0">+</div>';
    html += '<div class="slot" data-group="couple" data-idx="0">+</div>';
    html += '</div>';
    document.getElementById('coupleSlots').innerHTML = html;
    
    // Best Friends
    html = '<div class="slot-pair">';
    html += '<div class="slot" data-group="bf" data-idx="0">+</div>';
    html += '<div class="slot" data-group="bf" data-idx="0">+</div>';
    html += '</div>';
    document.getElementById('bfSlots').innerHTML = html;
}

function initDragDrop() {
    const cards = document.querySelectorAll('.card');
    const slots = document.querySelectorAll('.slot');
    
    cards.forEach(card => {
        card.addEventListener('dragstart', e => {
            e.dataTransfer.setData('id', card.dataset.id);
            card.classList.add('dragging');
        });
        card.addEventListener('dragend', e => {
            card.classList.remove('dragging');
        });
    });
    
    slots.forEach(slot => {
        slot.addEventListener('dragover', e => {
            e.preventDefault();
            if (!slot.classList.contains('filled')) slot.classList.add('drag-over');
        });
        slot.addEventListener('dragleave', () => {
            slot.classList.remove('drag-over');
        });
        slot.addEventListener('drop', e => {
            e.preventDefault();
            slot.classList.remove('drag-over');
            if (slot.classList.contains('filled')) return;
            
            const id = parseInt(e.dataTransfer.getData('id'));
            fillSlot(slot, id);
        });
    });
}

function fillSlot(slot, guestId) {
    const name = state.guests[guestId];
    const abbr = name.substring(0, 3);
    
    slot.classList.add('filled');
    slot.innerHTML = `
        <div class="card-in-slot" data-guest="${guestId}">
            ${abbr}
            <button class="remove-slot" onclick="emptySlot(this, ${guestId})">×</button>
        </div>
    `;
    
    // Hide card
    const card = document.querySelector(`.card[data-id="${guestId}"]`);
    if (card) card.classList.add('hidden');
    
    // Check if pair complete
    const group = slot.dataset.group;
    const parent = slot.parentElement;
    const pairSlots = parent.querySelectorAll('.slot');
    const allFilled = Array.from(pairSlots).every(s => s.classList.contains('filled'));
    
    if (allFilled) {
        // Add new pair
        const newPair = document.createElement('div');
        newPair.className = 'slot-pair';
        newPair.innerHTML = `
            <div class="slot" data-group="${group}">+</div>
            <div class="slot" data-group="${group}">+</div>
        `;
        parent.parentElement.appendChild(newPair);
        initDragDrop();
    }
}

function emptySlot(btn, guestId) {
    const slot = btn.closest('.slot');
    slot.classList.remove('filled');
    slot.innerHTML = '+';
    
    // Show card
    const card = document.querySelector(`.card[data-id="${guestId}"]`);
    if (card) card.classList.remove('hidden');
}

function finishGroups() {
    // Extract couples
    state.couples = [];
    const couplePairDivs = document.querySelectorAll('#coupleSlots .slot-pair');
    couplePairDivs.forEach(pairDiv => {
        const slots = pairDiv.querySelectorAll('.slot.filled');
        if (slots.length === 2) {
            const ids = Array.from(slots).map(s => {
                const guest = s.querySelector('[data-guest]');
                return guest ? parseInt(guest.dataset.guest) : null;
            }).filter(id => id !== null);
            
            if (ids.length === 2) {
                state.couples.push(ids);
            }
        }
    });
    
    // Extract best friends
    state.bestFriends = [];
    const bfPairDivs = document.querySelectorAll('#bfSlots .slot-pair');
    bfPairDivs.forEach(pairDiv => {
        const slots = pairDiv.querySelectorAll('.slot.filled');
        if (slots.length === 2) {
            const ids = Array.from(slots).map(s => {
                const guest = s.querySelector('[data-guest]');
                return guest ? parseInt(guest.dataset.guest) : null;
            }).filter(id => id !== null);
            
            if (ids.length === 2) {
                state.bestFriends.push(ids);
            }
        }
    });
    
    console.log('Couples:', state.couples);
    console.log('Best Friends:', state.bestFriends);
    
    goToStep('keep-apart');
}


// Step 5: Keep Apart
function populateKeepApart() {
    const opts = state.guests.map((n, i) => `<option value="${i}">${n}</option>`).join('');
    document.getElementById('apart1').innerHTML = '<option value="">Select</option>' + opts;
    document.getElementById('apart2').innerHTML = '<option value="">Select</option>' + opts;
    renderApartList();
}

function addKeepApart() {
    const id1 = parseInt(document.getElementById('apart1').value);
    const id2 = parseInt(document.getElementById('apart2').value);
    
    if (isNaN(id1) || isNaN(id2)) return alert('Select both');
    if (id1 === id2) return alert('Must be different');
    
    const exists = state.keepApart.some(p => 
        (p[0] === id1 && p[1] === id2) || (p[0] === id2 && p[1] === id1)
    );
    if (exists) return alert('Already added');
    
    state.keepApart.push([id1, id2]);
    renderApartList();
    document.getElementById('apart1').value = '';
    document.getElementById('apart2').value = '';
}

function removeApart(idx) {
    state.keepApart.splice(idx, 1);
    renderApartList();
}

function renderApartList() {
    const list = document.getElementById('apartList');
    if (state.keepApart.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#795548;padding:20px">No conflicts</p>';
        return;
    }
    list.innerHTML = state.keepApart.map((p, idx) => `
        <div class="guest-item">
            <span>${state.guests[p[0]]} ≠ ${state.guests[p[1]]}</span>
            <button class="remove-btn" onclick="removeApart(${idx})">×</button>
        </div>
    `).join('');
}

// Step 6: Outsiders
function checkOutsiders() {
    const inGroups = new Set();
    state.couples.forEach(p => { inGroups.add(p[0]); inGroups.add(p[1]); });
    state.bestFriends.forEach(p => { inGroups.add(p[0]); inGroups.add(p[1]); });
    
    console.log('In groups:', Array.from(inGroups).map(i => state.guests[i]));
    
    state.outsiders = [];
    state.guests.forEach((name, idx) => {
        if (!inGroups.has(idx)) {
            state.outsiders.push(idx);
            console.log('Outsider:', name);
        }
    });
    
    if (state.outsiders.length === 0) {
        generate();
    } else {
        renderOutsiders();
        goToStep('outsiders');
    }
}

function renderOutsiders() {
    const html = state.outsiders.map(id => {
        // Show all guests except this outsider themselves
        const opts = state.guests
            .map((name, idx) => idx !== id ? `<option value="${idx}">${name}</option>` : '')
            .join('');
        
        return `
            <div class="outsider">
                <div class="outsider-name">${state.guests[id]}</div>
                <div class="outsider-selects">
                    <div class="outsider-row">
                        <select class="input-medium" data-person="${id}" data-conn="0">
                            <option value="">Who do they know?</option>
                            ${opts}
                        </select>
                        <select class="input-medium" data-person="${id}" data-level="0">
                            <option value="close_friend">Close Friend</option>
                            <option value="friend" selected>Friend</option>
                            <option value="acquaintance">Acquaintance</option>
                        </select>
                    </div>
                    <div class="outsider-row">
                        <select class="input-medium" data-person="${id}" data-conn="1">
                            <option value="">Who else?</option>
                            ${opts}
                        </select>
                        <select class="input-medium" data-person="${id}" data-level="1">
                            <option value="close_friend">Close Friend</option>
                            <option value="friend" selected>Friend</option>
                            <option value="acquaintance">Acquaintance</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('outsidersList').innerHTML = html;
}

// Step 7: Generate
function generate() {
    // Collect outsider relationships
    state.relationships = {};
    state.guests.forEach((_, i) => state.relationships[i] = []);
    
    state.outsiders.forEach(id => {
        for (let i = 0; i < 2; i++) {
            const connSelect = document.querySelector(`[data-person="${id}"][data-conn="${i}"]`);
            const levelSelect = document.querySelector(`[data-person="${id}"][data-level="${i}"]`);
            
            if (connSelect && connSelect.value) {
                state.relationships[id].push({
                    person: parseInt(connSelect.value),
                    type: levelSelect.value
                });
            }
        }
    });
    
    const arrangement = generateSeating(
        state.guests.length,
        state.couples,
        state.bestFriends,
        state.keepApart,
        state.introverts,
        state.relationships,
        state.layout
    );
    
    displayTable(arrangement);
    goToStep('results');
}

function displayTable(arrangement) {
    const container = document.getElementById('tableDisplay');
    const isRect = state.layout === 'rectangular';
    const tableClass = isRect ? 'table-rect' : 'table-circ';
    
    container.innerHTML = `<div class="${tableClass}" id="table"></div>`;
    
    const positions = getPositions(arrangement.length, isRect);
    const table = document.getElementById('table');
    
    arrangement.forEach((guestId, pos) => {
        const place = document.createElement('div');
        place.className = 'place';
        place.textContent = state.guests[guestId];
        place.style.left = positions[pos].x + '%';
        place.style.top = positions[pos].y + '%';
        table.appendChild(place);
    });
}

function getPositions(num, isRect) {
    const positions = [];
    
    if (isRect) {
        const top = Math.ceil(num / 2);
        const bottom = num - top;
        
        for (let i = 0; i < top; i++) {
            positions.push({ x: 10 + (i / Math.max(top - 1, 1)) * 80, y: 0 });
        }
        for (let i = 0; i < bottom; i++) {
            positions.push({ x: 90 - (i / Math.max(bottom - 1, 1)) * 80, y: 100 });
        }
    } else {
        for (let i = 0; i < num; i++) {
            const angle = (i / num) * 2 * Math.PI - Math.PI / 2;
            positions.push({
                x: 50 + Math.cos(angle) * 45,
                y: 50 + Math.sin(angle) * 45
            });
        }
    }
    
    return positions;
}

function exportSeating() {
    const places = Array.from(document.querySelectorAll('.place'));
    const text = places.map((p, i) => `${i + 1}. ${p.textContent}`).join('\n');
    const output = `TableSitter\nLayout: ${state.layout}\n\n${text}`;
    
    navigator.clipboard.writeText(output).then(() => {
        alert('Copied to clipboard!');
    }).catch(() => {
        alert(output);
    });
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('nameInput').addEventListener('keypress', e => {
        if (e.key === 'Enter') addGuest();
    });
    document.getElementById('guestCountInput').addEventListener('keypress', e => {
        if (e.key === 'Enter') setGuestCount();
    });
});