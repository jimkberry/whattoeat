// --- APP LOGIC ---
const app = {
    data: {
        meals: [],
        filters: { pizza: false, lake: false },
        apiUrl: localStorage.getItem('wte-api-url') || "",
        isSpinning: false,
        editingId: null // ID of meal currently being edited
    },

    init() {
        if (!this.data.apiUrl && !localStorage.getItem('wte-meals')) {
            this.setView('setup');
        } else {
            this.fetchMeals();
            this.setView('spinner');
        }
        lucide.createIcons();
    },

    // --- UTILS ---
    generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            try { return crypto.randomUUID(); } catch (e) { }
        }
        // Fallback for insecure contexts or older browsers
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    // --- VIEW MANAGEMENT ---
    setView(viewName) {
        document.querySelectorAll('#app > div').forEach(el => el.classList.add('hidden'));
        document.getElementById(`view-${viewName}`).classList.remove('hidden');
        if (viewName === 'editor') this.renderMealList();
    },

    // --- DATA ---
    async fetchMeals() {
        // Optimistic load
        const local = localStorage.getItem('wte-meals');
        if (local) this.data.meals = JSON.parse(local).map(meal => ({ ...meal, selectionCount: 0 }));

        if (this.data.apiUrl) {
            try {
                const res = await fetch(this.data.apiUrl);
                const data = await res.json();
                this.data.meals = data.map(m => ({ ...m, id: m.id || this.generateUUID(), selectionCount: 0 }));
                localStorage.setItem('wte-meals', JSON.stringify(this.data.meals));
            } catch (e) { console.error(e); }
        }
        this.renderMealList();
    },

    async saveMeals() {
        localStorage.setItem('wte-meals', JSON.stringify(this.data.meals.map(meal => {
            // Remove selectionCount before saving to local storage
            const { selectionCount, ...rest } = meal;
            return rest;
        })));
        this.renderMealList();

        if (this.data.apiUrl) {
            document.getElementById('conn-status').textContent = "Saving...";
            try {
                await fetch(this.data.apiUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify(this.data.meals.map(meal => {
                        // Remove selectionCount before sending to the API
                        const { selectionCount, ...rest } = meal;
                        return rest;
                    }))
                });
                setTimeout(() => this.updateConnStatus(), 500);
            } catch (e) { console.error(e); }
        }
    },

    saveSetup() {
        const url = document.getElementById('setup-url').value.trim();
        if (url) {
            this.data.apiUrl = url;
            localStorage.setItem('wte-api-url', url);
            this.fetchMeals();
            this.setView('spinner');
            this.updateConnStatus();
        }
    },

    skipSetup() {
        this.data.apiUrl = "";
        localStorage.removeItem('wte-api-url');
        this.setView('spinner');
    },

    updateConnStatus() {
        const el = document.getElementById('conn-status');
        if (this.data.apiUrl) {
            el.textContent = "● Connected";
            el.style.color = "var(--secondary-color)";
        } else {
            el.textContent = "○ Local Only";
            el.style.color = "var(--text-muted)";
        }
    },

    // --- SPINNER LOGIC ---
    toggleFilter(key) {
        this.data.filters[key] = !this.data.filters[key];
        const btn = document.getElementById(`filter-${key}`);
        this.data.filters[key] ? btn.classList.add('active') : btn.classList.remove('active');
    },

    spin() {

       // Overview: the idea here is that we create a random vertical list of all of the meals, and drag it upwards
       // through the parent div to look like the meals are scrolling by. Some points:

       // - the winner is selected first, and put near the middle of the list to prevent edge-effects
       // - the first meal is copied and added to the end of the list to make the transition seamless.
       // algo:
       // - compute a y-axis base_position where the first meal is centered in the div
       // - compute end_offset which added to base_pos is where the last meal (copy of the first) is centered
       // - compute winner_offset which +base_position is where the winner meal is centered
       // - set a y offset var to 0
       // - set a last_lap boolean to false
       // - using setinterval, loop over:
       //   - set the div to the base position+offset
       //   - if offset <= end_offset:
       //     - reset offset to 0 (this is the seamless transition)
       //     - if a preset amount of time has passed: ( typically a couple of "laps" worth)
       //       - set last_lap flag true
       //   - if last_lap is true:
       //     - if the offset is <= wimmer_offset:
       //       - clear the setInterval (end the loop)
       //   - subtract a constant from y offset (moves the list upwards)
       // - highlight the winner item

        if (this.data.isSpinning) return;

        let candidates = this.data.meals.filter(m => {
            if (this.data.filters.pizza != m.isPizza) return false;
            if (this.data.filters.lake && !m.isLake) return false;
            if (!this.data.filters.lake && !m.isHome) return false;
            return true;
        });

        if (candidates.length === 0) {
            document.getElementById('slot-text').innerText = "None found!";
            return;
        }

        this.data.isSpinning = true;
        const slotText = document.getElementById('slot-text');
        const btn = document.getElementById('btn-spin');
        btn.disabled = true;
        btn.innerText = "SPINNING...";
        //slotText.style.color = "var(--text-muted)";
        //slotText.style.textShadow = "none";

        // Create the spinning candidates div
        const slotCandidates = document.getElementById('slot-candidates');
        slotCandidates.innerHTML = '';
        slotCandidates.classList.remove('hidden');

        winner = this.selectWinner(candidates);
        //console.log('Winner: ' + winner.name);

        let spinCands = [winner];
        candidates = candidates.filter( c => c != winner);
        while (candidates.length > 0) {
            let c = candidates[ Math.floor(Math.random() * candidates.length) ];
            if (candidates.length & 1)
                spinCands.unshift(c);
            else
                spinCands.push(c);
            candidates = candidates.filter( cand => cand != c);
        }
        // Add repeated first candidate name at the end to create a loop effect
        spinCands = [...spinCands,  spinCands[0]];

        spinCands.forEach(candidate => {
            console.log(candidate.name);
            const h1 = document.createElement('h1');
            h1.innerText = candidate.name;
            h1.className = "spinner-item";
            slotCandidates.appendChild(h1);
        });

        // Animate the spinning effect
        const frame_ms = 16.7; // 60Hz
        const base_y = slotCandidates.clientHeight/2 - slotCandidates.firstChild.clientHeight/2; // first item is centered
        const end_offset = -(slotCandidates.clientHeight - slotCandidates.firstChild.clientHeight);
        const winner_offset = -spinCands.indexOf(winner) * slotCandidates.firstChild.clientHeight;
        let pix_per_ms = -1; // Adjust this value to control the speed of the spin
        let offset = 0;
        let msToGo = 2500; // Adjust this value to control the duration of the spin
        let lastLap = false;

        const interval = setInterval(() => {
            slotCandidates.style.transform = `translateY(${base_y+offset}px)`;
            if (offset <= end_offset) {
                offset = 0; //reset to bottom
                if (msToGo < 0)
                    lastLap = true;
            }

            if ( lastLap && offset <= winner_offset) {
                clearInterval(interval);
                this.data.isSpinning = false;

                btn.disabled = false;
                btn.innerText = "SPIN AGAIN";

                winnerSlot = slotCandidates.children[spinCands.indexOf(winner)];
                winnerSlot.style.color = "var(--primary-glow)";
                winnerSlot.style.textShadow = "0 0 20px rgba(139, 92, 246, 0.5)";
            }
            msToGo -= frame_ms;
            offset += pix_per_ms * frame_ms;
        }, frame_ms);
    },

    selectWinner(candidates) {
        const minSelectionCount = candidates.reduce((min, candidate) => Math.min(min, candidate.selectionCount), Infinity);
        const viableCandidates = candidates.filter(candidate => candidate.selectionCount === minSelectionCount);
        //console.info('Choices: ' + viableCandidates.length + ' / ' + candidates.length);
        const winner = viableCandidates[Math.floor(Math.random() * viableCandidates.length)];
        winner.selectionCount++;
        return winner;
    },

    // --- EDITOR LOGIC ---
    addMeal(e) {
        e.preventDefault();
        const input = document.getElementById('new-meal-name');
        const name = input.value.trim();
        if (!name) return;

        const newId = this.generateUUID();
        this.data.meals.push({
            id: newId,
            name: name,
            isPizza: false,
            isHome: false, // New property for home-only meals
            isLake: false,
            selectionCount: 0 // Initialize selectionCount to 0
        });
        input.value = "";
        this.saveMeals();

        // Scroll into view
        setTimeout(() => {
            const el = document.getElementById(`meal-${newId}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    },

    deleteMeal(id) {
        if (!confirm("Delete this meal?")) return;
        this.data.meals = this.data.meals.filter(m => m.id !== id);
        this.saveMeals();
    },

    toggleAttribute(id, attr) {
        const meal = this.data.meals.find(m => m.id === id);
        if (meal) {
            meal[attr] = !meal[attr];
            this.saveMeals();
        }
    },

    startEdit(id) {
        this.data.editingId = id;
        this.renderMealList();
        setTimeout(() => {
            const input = document.getElementById(`edit-input-${id}`);
            if (input) {
                input.focus();
                input.select();
            }
        }, 50);
    },

    saveEdit(id) {
        const input = document.getElementById(`edit-input-${id}`);
        const newName = input.value.trim();
        if (newName) {
            const meal = this.data.meals.find(m => m.id === id);
            if (meal) {
                meal.name = newName;
                this.saveMeals();
            }
        }
        this.data.editingId = null;
        this.renderMealList();
    },

    cancelEdit() {
        this.data.editingId = null;
        this.renderMealList();
    },

    handleEditKey(e, id) {
        if (e.key === 'Enter') this.saveEdit(id);
        if (e.key === 'Escape') this.cancelEdit();
    },

    renderMealList() {
        const list = document.getElementById('meal-list');
        list.innerHTML = "";
        this.updateConnStatus();

        // Sort alphabetical
        const sorted = [...this.data.meals].sort((a, b) => a.name.localeCompare(b.name));

        sorted.forEach(meal => {
            const div = document.createElement('div');
            div.id = `meal-${meal.id}`;
            div.className = "glass-panel";
            div.style.cssText = "margin-bottom: 10px; padding: 12px; display: flex; align-items: center; justify-content: space-between;";

            const isEditing = this.data.editingId === meal.id;

            if (isEditing) {
                div.innerHTML = `
                    <div style="flex: 1; display: flex; gap: 8px; align-items: center;">
                        <input type="text" id="edit-input-${meal.id}" value="${meal.name}"
                            onkeydown="app.handleEditKey(event, '${meal.id}')"
                            style="padding: 8px; font-size: 1rem;">
                        <button class="btn-icon" style="color: var(--secondary-color)" onclick="app.saveEdit('${meal.id}')">
                            <i data-lucide="check" width="18"></i>
                        </button>
                        <button class="btn-icon" style="color: var(--danger-color)" onclick="app.cancelEdit()">
                            <i data-lucide="x" width="18"></i>
                        </button>
                    </div>
                `;
            } else {
                div.innerHTML = `
                    <div style="flex: 1">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="font-weight: 600; margin-bottom: 8px; cursor: pointer;" onclick="app.startEdit('${meal.id}')" title="Click to edit name">${meal.name}</div>
                        </div>
                        <div class="toggle-group">
                            <button class="toggle-btn ${meal.isPizza ? 'active' : ''}" onclick="app.toggleAttribute('${meal.id}', 'isPizza')">
                                <i data-lucide="pizza" width="14"></i>
                            </button>
                            <button class="toggle-btn ${meal.isHome ? 'active' : ''}" onclick="app.toggleAttribute('${meal.id}', 'isHome')"> <!-- New toggle for isHome -->
                                <i data-lucide="home" width="14"></i> <!-- Icon for home -->
                            </button>
                            <button class="toggle-btn ${meal.isLake ? 'active' : ''}" onclick="app.toggleAttribute('${meal.id}', 'isLake')">
                                <i data-lucide="waves" width="14"></i>
                            </button>
                        </div>
                    </div>
                    <div style="display: flex; gap: 4px; flex-direction: column;">
                        <button class="btn-icon" onclick="app.startEdit('${meal.id}')">
                            <i data-lucide="pencil" width="16"></i>
                        </button>
                        <button class="btn-icon" style="color: var(--danger-color)" onclick="app.deleteMeal('${meal.id}')">
                             <i data-lucide="trash-2" width="16"></i>
                        </button>
                    </div>
                `;
            }
            list.appendChild(div);
        });
        lucide.createIcons();
    }
};

// Start
app.init();
