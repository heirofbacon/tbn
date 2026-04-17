// --- SMART API ROUTER ---
function getApiUrl(endpoint) {
    const host = window.location.hostname;
    // Uses local port 3000 if testing locally, otherwise the public URL
    if (host === 'localhost' || host === '127.0.0.1' || host === 'jserver.local' || host.startsWith('192.168.') || host.startsWith('10.')) {
        return `http://${host}:3000${endpoint}`;
    }
    return `https://core.tinko.online${endpoint}`;
}

let activeTool = 'home'; // Track the current tool for the Easter Eggs
let lbData = []; // Store leaderboard data globally
let dexData = []; // Store pokedex data globally

function loadTool(target) {
    activeTool = target; 
    
    // FIX: Moved inside function so it never returns null and crashes the app
    const links = document.querySelectorAll('.nav-link');
    const scrA = document.getElementById('main-scroll-area');
    
    if (links.length > 0) {
        links.forEach(l => {
            l.classList.remove('active');
            if (l.dataset.target === target) l.classList.add('active');
        });
    }
    
    // FIX: Safety check before scrolling
    if (scrA) scrA.scrollTo(0, 0); 

    // Hide ALL containers first to reset state
    ['home-container', 'commands-container', 'guide-container', 'leaderboard-container', 'pokedex-container', 'baconsuite-container', 'tool-container'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    // Handle Static Routes (Pages that don't need to fetch HTML)
    if (['home', 'commands', 'guide', 'leaderboard', 'pokedex', 'baconsuite'].includes(target)) {
        const targetContainer = document.getElementById(`${target}-container`);
        if (targetContainer) targetContainer.classList.remove('hidden');
        
        if (target === 'leaderboard') {
            fetchLeaderboard();
            fetchCustomBalls(); // Load custom balls next to the leaderboard
        }
        if (target === 'pokedex') fetchPokedex();

        if (target === 'home') {
            window.history.pushState({}, '', window.location.pathname);
        } else {
            window.history.pushState({}, '', '?page=' + target);
        }
    } 
    // Handle Dynamic Tool Routes (Fetching the overlay editors)
    else {
        const tC = document.getElementById('tool-container');
        if (tC) {
            tC.classList.remove('hidden');
            tC.innerHTML = '<div class="flex justify-center items-center h-64"><i class="fas fa-spinner fa-spin text-4xl text-emerald-500"></i></div>';
        }
        window.history.pushState({}, '', '?tool=' + target);
        
        fetch(`./tools/${target}/editor.html`)
            .then(r => {
                if (!r.ok) throw new Error(`Tool missing.`);
                return r.text();
            })
            .then(h => {
                if (tC) {
                    tC.innerHTML = h;
                    const s = tC.querySelectorAll('script');
                    s.forEach(oS => {
                        const nS = document.createElement('script');
                        Array.from(oS.attributes).forEach(a => nS.setAttribute(a.name, a.value));
                        if (oS.innerHTML) nS.appendChild(document.createTextNode(oS.innerHTML));
                        oS.parentNode.replaceChild(nS, oS);
                    });
                }
            })
            .catch(e => {
                if (tC) {
                    tC.innerHTML = `<div class="text-center text-red-500 font-bold p-12 bg-zinc-900 rounded-xl mx-5 mt-8 border border-red-900/50"><i class="fas fa-exclamation-triangle text-3xl mb-3"></i><br>Error: ${e.message}</div>`;
                }
            });
    }
}

// FIX: Wait for HTML to load before attaching events
document.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll('.nav-link');
    if (links) {
        links.forEach(l => l.addEventListener('click', (e) => loadTool(e.currentTarget.dataset.target)));
    }

    const urlParams = new URLSearchParams(window.location.search);
    const initialTool = urlParams.get('tool');
    const initialPage = urlParams.get('page');

    if (initialTool) {
        loadTool(initialTool);
    } else if (initialPage && ['commands', 'guide', 'leaderboard', 'pokedex', 'baconsuite'].includes(initialPage)) {
        loadTool(initialPage);
    } else {
        loadTool('home'); // Default load
    }

    // Tada Animation Logic for Support Buttons
    const supportBtns = document.querySelectorAll('.support-btn-anim');
    if (supportBtns && supportBtns.length > 0) {
        setInterval(() => {
            supportBtns.forEach(btn => {
                btn.classList.remove('animate-tada');
                void btn.offsetWidth; // Trigger browser reflow to restart animation
                btn.classList.add('animate-tada');
            });
        }, 8000); // Triggers every 8 seconds
    }
});


// ==========================================
// REAL DATA: LEADERBOARD LOGIC
// ==========================================
async function fetchLeaderboard() {
    const container = document.getElementById('lb-content');
    const notice = document.getElementById('lb-notice');
    if (!container) return;
    
    container.innerHTML = '<div class="flex justify-center py-12"><i class="fas fa-spinner fa-spin text-4xl text-amber-500"></i></div>';
    if (notice) notice.innerHTML = '';
    
    try {
        const res = await fetch(getApiUrl('/api/leaderboard'));
        if (!res.ok) throw new Error(`API Offline (Status: ${res.status} ${res.statusText})`);
        
        const data = await res.json();
        
        let rawArray = Array.isArray(data) ? data : Object.values(data);
        // Filter out banned/blocked users safely
        lbData = rawArray.filter(u => u && !u.banned && !u.blocked && u.status !== 'banned');
        
        renderLeaderboard();
    } catch (err) {
        console.error("Leaderboard Error:", err);
        if (notice) {
            notice.innerHTML = `
                <div class="bg-red-900/20 border border-red-500/50 text-red-400 p-4 rounded-xl mb-4 text-sm font-bold flex flex-col items-center justify-center gap-2 text-center shadow-lg">
                    <div class="flex items-center gap-2"><i class="fas fa-exclamation-triangle text-xl"></i> Failed to load leaderboard data.</div>
                    <span class="text-xs font-mono opacity-80 mt-1">Error Details: ${err.message}</span>
                    <span class="text-[10px] opacity-60 mt-1">If "Failed to fetch", your Node server is offline or CORS is blocking it. If "Status: 500", check your Node console for a database error.</span>
                </div>`;
        }
        container.innerHTML = '';
    }
}

function renderLeaderboard() {
    const container = document.getElementById('lb-content');
    if (!container) return;
    
    const sortMode = document.getElementById('lb-sort')?.value || 'score';
    
    lbData.sort((a, b) => {
        if (sortMode === 'score') return (b.score ?? 0) - (a.score ?? 0);
        if (sortMode === 'name') return String(a.name||'').localeCompare(String(b.name||''));
        if (sortMode === 'platform') return String(a.platform||'').localeCompare(String(b.platform||''));
        return 0;
    });

    if (lbData.length === 0) {
        container.innerHTML = '<div class="text-center text-zinc-500 py-12 bg-zinc-900 border border-zinc-800 rounded-2xl">No eligible players found.</div>';
        return;
    }

    container.innerHTML = lbData.map((user, index) => {
        let rankClass = "bg-zinc-800 text-zinc-400";
        let rankMedal = `#${index + 1}`;
        
        if (sortMode === 'score') {
            if (index === 0) { rankClass = "bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]"; rankMedal = '<i class="fas fa-trophy"></i>'; }
            else if (index === 1) { rankClass = "bg-zinc-300/20 text-zinc-300 border border-zinc-300/50"; rankMedal = '<i class="fas fa-medal"></i>'; }
            else if (index === 2) { rankClass = "bg-orange-700/30 text-orange-400 border border-orange-700/50"; rankMedal = '<i class="fas fa-award"></i>'; }
        }

        const username = user.name || user.username || 'Unknown';
        let platName = String(user.platform || 'Unknown').toLowerCase();
        let platIcon = '';
        let platUrl = '#';
        
        let pfp = user.avatar || user.profilePic || user.avatar_url || user.profile_image_url || '';
        
        // Dynamically generate correct profile external links and Twitch API avatars
        if (platName.includes('twitch')) {
            platIcon = '<i class="fab fa-twitch text-purple-500"></i>';
            platUrl = `https://twitch.tv/${username}`;
            if (!pfp) pfp = `https://decapi.me/twitch/avatar/${username}`;
        } else if (platName.includes('youtube')) {
            platIcon = '<i class="fab fa-youtube text-red-500"></i>';
            platUrl = `https://youtube.com/@${username}`;
        } else if (platName.includes('kick')) {
            platIcon = '<img src="./images/kick.svg" class="w-3 h-3 inline" alt="Kick" onerror="this.style.display=\'none\'">';
            platUrl = `https://kick.com/${username}`;
        } else {
            platIcon = '<i class="fas fa-globe text-zinc-500"></i>';
        }

        const score = user.score ?? 0;

        return `
            <div class="flex items-center gap-3 sm:gap-4 bg-zinc-900 border border-zinc-800 p-3 sm:p-4 rounded-2xl hover:border-zinc-700 transition-colors group">
                <div class="w-10 h-10 sm:w-12 sm:h-12 shrink-0 flex items-center justify-center rounded-xl font-black text-sm sm:text-base ${rankClass}">${rankMedal}</div>
                
                <div class="relative w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full border-2 border-zinc-800 group-hover:border-emerald-500 transition-colors bg-zinc-800 flex items-center justify-center overflow-hidden shadow-inner">
                    <i class="fas fa-user text-zinc-600 text-xl absolute z-0"></i>
                    ${pfp ? `<img src="${pfp}" class="absolute inset-0 w-full h-full object-cover z-10" onerror="this.style.display='none'">` : ''}
                </div>

                <div class="flex-1 min-w-0">
                    <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <h4 class="text-white font-bold text-base sm:text-lg truncate">${username}</h4>
                        
                        <a href="${platUrl}" target="_blank" rel="noopener noreferrer" class="w-fit bg-black border border-zinc-800 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 hover:border-emerald-500 transition-colors cursor-pointer group/link">
                            ${platIcon} <span class="hidden sm:inline text-zinc-500 capitalize group-hover/link:text-zinc-300 transition-colors">${platName}</span>
                        </a>
                    </div>
                </div>
                <div class="text-right shrink-0">
                    <div class="text-emerald-400 font-black text-lg sm:text-2xl font-mono leading-none">${score.toLocaleString()}</div>
                    <div class="text-[9px] sm:text-[10px] uppercase font-bold text-zinc-500 tracking-wider mt-1">Balls</div>
                </div>
            </div>`;
    }).join('');
}

// ==========================================
// REAL DATA: POKEDEX LOGIC
// ==========================================
let currentPokedexRoster = [];
let recentViewedTrainers = [];

function setupPokedexUI() {
    const container = document.getElementById('dex-content');
    const notice = document.getElementById('dex-notice');
    if (!container || !notice) return;

    // Build the structural layout if it doesn't already exist
    if (!document.getElementById('dex-layout-wrapper')) {
        const dexContainer = document.querySelector('#pokedex-container > div:first-child');
        if (dexContainer) {
            // Expand width to make room for the sidebar
            dexContainer.classList.remove('max-w-6xl');
            dexContainer.classList.add('max-w-8xl');

            const wrapper = document.createElement('div');
            wrapper.id = 'dex-layout-wrapper';
            wrapper.className = 'grid grid-cols-1 lg:grid-cols-4 gap-8 items-start mt-2';
            
            const mainCol = document.createElement('div');
            mainCol.className = 'lg:col-span-3 w-full';
            
            mainCol.innerHTML = `
                <div id="pokedex-search-bar" class="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6 shadow-lg flex flex-col xl:flex-row gap-4 items-center justify-between">
                    <div class="flex-1 w-full">
                        <h3 class="text-white font-bold text-lg mb-1">Trainer Search</h3>
                        <p class="text-xs text-zinc-400">Enter a username to view their captured Pokémon.</p>
                    </div>
                    <div class="flex flex-wrap sm:flex-nowrap gap-2 w-full xl:w-auto">
                        <select id="dex-sort" onchange="renderPokedex()" class="hidden bg-black border border-zinc-800 focus:border-red-500 outline-none px-3 py-3 rounded-xl text-sm text-zinc-300 w-full sm:w-auto transition-colors cursor-pointer">
                            <option value="level">Level (High-Low)</option>
                            <option value="number">Dex Number</option>
                            <option value="name">Name (A-Z)</option>
                            <option value="shiny">Shiny First</option>
                        </select>
                        <input type="text" id="dex-search-input" class="flex-1 sm:flex-none bg-black border border-zinc-800 focus:border-red-500 outline-none px-4 py-3 rounded-xl text-sm text-white w-full sm:w-64 transition-colors" placeholder="e.g. heirofbacon" onkeypress="if(event.key === 'Enter') executeDexSearch()">
                        <button onclick="executeDexSearch()" class="bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(220,38,38,0.3)] shrink-0"><i class="fas fa-search"></i></button>
                    </div>
                </div>
                
                <div id="dex-stats-bar" class="hidden grid grid-cols-3 gap-4 mb-6 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                    <div class="text-center"><div class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Pokéballs</div><div id="stat-dex-balls" class="text-2xl font-black text-brand font-mono">0</div></div>
                    <div class="text-center border-x border-zinc-800"><div class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Unique</div><div id="stat-dex-unique" class="text-2xl font-black text-blue-400 font-mono">0</div></div>
                    <div class="text-center"><div class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Shinies</div><div id="stat-dex-shiny" class="text-2xl font-black text-yellow-400 font-mono">0</div></div>
                </div>
                
                <div id="dex-error" class="hidden bg-red-900/20 border border-red-500/50 text-red-400 p-4 rounded-xl mb-4 text-sm font-bold flex flex-col items-center justify-center gap-2 text-center shadow-lg"></div>
            `;
            
            // Move the actual grid into the main column
            mainCol.appendChild(container);
            
            const sideCol = document.createElement('div');
            sideCol.className = 'lg:col-span-1 w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl lg:sticky lg:top-8';
            sideCol.innerHTML = `
                <h3 class="text-base font-bold text-white mb-2 flex items-center gap-2"><i class="fas fa-history text-blue-500"></i> Recently Viewed</h3>
                <p class="text-xs text-zinc-400 mb-4 pb-4 border-b border-zinc-800">Quickly access recent trainers.</p>
                <div id="dex-recent-list" class="flex flex-col gap-2">
                    <div class="text-center text-zinc-500 text-xs italic py-4">No recent searches</div>
                </div>
            `;

            wrapper.appendChild(mainCol);
            wrapper.appendChild(sideCol);
            
            // Hide the old generic notice div to prevent layout breakage
            notice.style.display = 'none';
            
            dexContainer.appendChild(wrapper);
        }
    }
}

async function fetchPokedex() {
    setupPokedexUI();
    const input = document.getElementById('dex-search-input');
    
    // If there is already text in the box, the sync button refreshes that user
    if (input && input.value.trim() !== '') {
        executeDexSearch();
    } else {
        // Otherwise, show the default empty state
        const container = document.getElementById('dex-content');
        if (container) container.innerHTML = '<div class="col-span-full text-center text-zinc-500 py-12 bg-zinc-900 border border-zinc-800 rounded-2xl">Use the search bar above to look up a Trainer\'s Pokédex.</div>';
        document.getElementById('dex-stats-bar')?.classList.add('hidden');
        document.getElementById('dex-error')?.classList.add('hidden');
        document.getElementById('dex-sort')?.classList.add('hidden');
    }
}

window.executeDexSearch = async function(presetUsername = null) {
    const input = document.getElementById('dex-search-input');
    const container = document.getElementById('dex-content');
    const errorBox = document.getElementById('dex-error');
    const statsBar = document.getElementById('dex-stats-bar');
    const sortDropdown = document.getElementById('dex-sort');
    
    const username = presetUsername || input?.value.trim();
    if (!username) return;

    if (input && presetUsername) input.value = presetUsername;

    container.innerHTML = '<div class="col-span-full flex justify-center py-12"><i class="fas fa-spinner fa-spin text-4xl text-red-500"></i></div>';
    if (errorBox) errorBox.classList.add('hidden');
    if (statsBar) statsBar.classList.add('hidden');
    if (sortDropdown) sortDropdown.classList.add('hidden');

    try {
        const res = await fetch(getApiUrl(`/api/pokedex/${encodeURIComponent(username)}`));
        if (res.status === 404) {
            throw new Error(`Trainer '${username}' has not caught any Pokémon yet.`);
        }
        if (!res.ok) throw new Error(`API Offline (Status: ${res.status})`);
        
        const trainer = await res.json();
        
        // Update Stats
        if (statsBar) {
            document.getElementById('stat-dex-balls').innerText = trainer.pokeballs || 0;
            document.getElementById('stat-dex-unique').innerText = trainer.pokedexCount || 0;
            document.getElementById('stat-dex-shiny').innerText = trainer.shinyCount || 0;
            statsBar.classList.remove('hidden');
        }

        let roster = [];
        try { roster = JSON.parse(trainer.roster || '[]'); } catch(e) {}
        
        // Save state for sorting algorithms and recent views
        currentPokedexRoster = roster;
        addToRecentViewed(trainer.username);

        if (roster.length > 0 && sortDropdown) {
            sortDropdown.classList.remove('hidden');
        }

        renderPokedex();
    } catch (err) {
        console.error("Pokedex Search Error:", err);
        if (errorBox) {
            errorBox.innerHTML = `<div class="flex items-center gap-2"><i class="fas fa-exclamation-triangle text-xl"></i> Search Failed</div><span class="text-xs opacity-80 mt-1">${err.message}</span>`;
            errorBox.classList.remove('hidden');
        }
        container.innerHTML = '';
    }
};

function renderPokedex() {
    const container = document.getElementById('dex-content');
    if (!container) return;

    // Create a copy of the roster so sorting doesn't permanently disrupt the source
    let roster = [...currentPokedexRoster];

    if (!roster || roster.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center text-zinc-500 py-12 bg-zinc-900 border border-zinc-800 rounded-2xl">This trainer has no Pokémon in their active roster.</div>';
        return;
    }

    const sortMode = document.getElementById('dex-sort')?.value || 'level';

    roster.sort((a, b) => {
        if (sortMode === 'level') return (b.level || 0) - (a.level || 0);
        if (sortMode === 'number') return (a.internalId || 0) - (b.internalId || 0);
        if (sortMode === 'name') return (a.name || '').localeCompare(b.name || '');
        if (sortMode === 'shiny') return (b.isShiny === true ? 1 : 0) - (a.isShiny === true ? 1 : 0);
        return 0;
    });

    container.innerHTML = roster.map(pk => {
        const folder = pk.isShiny ? 'shiny' : 'normal';
        const spriteUrl = getApiUrl(`/assets/sprites/${folder}/${pk.internalId}.png`);
        
        // Colors IVs green if perfect 31
        const checkIV = (val) => val === 31 ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]' : 'text-white';

        return `
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col hover:border-red-500/50 transition-colors group shadow-lg relative">
            ${pk.isShiny ? '<div class="absolute top-2 right-2 text-xl drop-shadow-[0_0_5px_gold]">✨</div>' : ''}
            ${pk.locked ? '<div class="absolute top-2 left-2 text-sm">🔒</div>' : ''}
            
            <div class="w-full h-24 mb-2 flex items-center justify-center">
                <img src="${spriteUrl}" class="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]" onerror="this.src=getApiUrl('/assets/sprites/normal/0.png')">
            </div>

            <h4 class="font-bold text-lg text-center truncate w-full capitalize text-red-400">${pk.name || 'Unknown'}</h4>
            <div class="text-[11px] font-bold text-zinc-500 uppercase tracking-widest text-center mb-3">Level ${pk.level || 1}</div>

            <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px] bg-black p-2.5 rounded-lg border border-zinc-800 mt-auto">
                <div class="flex justify-between items-center"><span class="text-zinc-600 font-bold">HP</span> <span class="font-bold ${checkIV(pk.ivs?.hp)}">${pk.ivs?.hp || 0}/31</span></div>
                <div class="flex justify-between items-center"><span class="text-zinc-600 font-bold">ATK</span> <span class="font-bold ${checkIV(pk.ivs?.atk)}">${pk.ivs?.atk || 0}/31</span></div>
                <div class="flex justify-between items-center"><span class="text-zinc-600 font-bold">DEF</span> <span class="font-bold ${checkIV(pk.ivs?.def)}">${pk.ivs?.def || 0}/31</span></div>
                <div class="flex justify-between items-center"><span class="text-zinc-600 font-bold">SP.A</span> <span class="font-bold ${checkIV(pk.ivs?.spAtk)}">${pk.ivs?.spAtk || 0}/31</span></div>
                <div class="flex justify-between items-center"><span class="text-zinc-600 font-bold">SP.D</span> <span class="font-bold ${checkIV(pk.ivs?.spDef)}">${pk.ivs?.spDef || 0}/31</span></div>
                <div class="flex justify-between items-center"><span class="text-zinc-600 font-bold">SPD</span> <span class="font-bold ${checkIV(pk.ivs?.speed)}">${pk.ivs?.speed || 0}/31</span></div>
            </div>
        </div>
    `}).join('');
}

function addToRecentViewed(username) {
    username = username.toLowerCase();
    // Filter out if it already exists so we can push it to the absolute top
    recentViewedTrainers = recentViewedTrainers.filter(u => u !== username);
    recentViewedTrainers.unshift(username);
    
    // Keep max memory footprint limited to 10
    if (recentViewedTrainers.length > 10) {
        recentViewedTrainers.pop();
    }
    
    renderRecentViewed();
}

function renderRecentViewed() {
    const list = document.getElementById('dex-recent-list');
    if (!list) return;

    if (recentViewedTrainers.length === 0) {
        list.innerHTML = '<div class="text-center text-zinc-500 text-xs italic py-4">No recent searches</div>';
        return;
    }

    list.innerHTML = recentViewedTrainers.map(username => `
        <button onclick="executeDexSearch('${username}')" class="w-full bg-black border border-zinc-800 hover:border-red-500/50 p-3 rounded-xl flex items-center gap-3 group transition-colors text-left outline-none cursor-pointer">
            <div class="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700 overflow-hidden relative">
                <i class="fas fa-user text-zinc-600 absolute"></i>
                <img src="https://decapi.me/twitch/avatar/${username}" class="absolute inset-0 w-full h-full object-cover z-10" onerror="this.style.display='none'">
            </div>
            <div class="flex-1 min-w-0">
                <h4 class="text-zinc-300 font-bold text-sm truncate group-hover:text-red-400 transition-colors">${username}</h4>
            </div>
            <i class="fas fa-chevron-right text-zinc-700 group-hover:text-red-500 transition-colors text-xs"></i>
        </button>
    `).join('');
}

// ==========================================
// REAL DATA: CUSTOM BALLS
// ==========================================
async function fetchCustomBalls() {
    try {
        const res = await fetch(getApiUrl('/api/custom_balls'));
        if (!res.ok) return;
        
        const data = await res.json();
        if (data && data.length > 0) {
            
            // Look for the main leaderboard container (the one directly inside the wrapper)
            const lbContainer = document.querySelector('#leaderboard-container > div:first-child');
            if (!lbContainer) return;

            // Expand width to make room for the sidebar
            lbContainer.classList.remove('max-w-4xl');
            lbContainer.classList.add('max-w-7xl');
            
            // Build the layout grid if it doesn't exist
            if (!document.getElementById('lb-sidebar-wrapper')) {
                const notice = document.getElementById('lb-notice');
                const content = document.getElementById('lb-content');
                
                const gridWrapper = document.createElement('div');
                gridWrapper.id = 'lb-sidebar-wrapper';
                gridWrapper.className = 'grid grid-cols-1 lg:grid-cols-4 gap-8 items-start mt-2';
                
                const mainCol = document.createElement('div');
                mainCol.className = 'lg:col-span-3 w-full';
                mainCol.appendChild(notice);
                mainCol.appendChild(content);
                
                const sideCol = document.createElement('div');
                sideCol.className = 'lg:col-span-1 w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl lg:sticky lg:top-8';
                sideCol.innerHTML = `
                    <h3 class="text-base font-bold text-white mb-2 flex items-center gap-2"><i class="fas fa-palette text-pink-500"></i> Custom Tinko Balls</h3>
                    <p class="text-xs text-zinc-400 mb-4 pb-4 border-b border-zinc-800">Equip these in chat using <br><code class="text-emerald-400 font-mono text-[11px] bg-black px-1.5 py-0.5 rounded border border-zinc-800">!color &lt;name&gt;</code></p>
                    <div id="lb-sidebar-content" class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-3"></div>
                `;
                
                gridWrapper.appendChild(mainCol);
                gridWrapper.appendChild(sideCol);
                
                // Append directly to the expanded max-w-7xl container
                lbContainer.appendChild(gridWrapper);
            }
            
            // Inject the custom balls into the new sidebar
            const sbContent = document.getElementById('lb-sidebar-content');
            if (sbContent) {
                sbContent.innerHTML = data.map(ball => {
                    let imgUrl = ball.filepath;
                    if (imgUrl.includes('jserver.local') || imgUrl.includes('localhost')) {
                        imgUrl = imgUrl.replace(/http:\/\/[^/]+:\d+/, getApiUrl(''));
                    }
                    
                    return `
                    <div class="bg-black border border-zinc-800 rounded-xl p-2 flex flex-col items-center hover:border-pink-500/50 transition-colors shadow-inner group cursor-default">
                        <div class="w-10 h-10 mb-1.5 relative flex items-center justify-center">
                            <img src="${imgUrl}" class="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform" onerror="this.style.display='none'">
                        </div>
                        <span class="text-[9px] font-bold text-zinc-500 truncate w-full text-center group-hover:text-zinc-300 transition-colors">${ball.name}</span>
                    </div>
                `}).join('');
            }
        }
    } catch (err) {
        console.error("Custom Balls Error:", err);
    }
}

window.fetchLeaderboard = fetchLeaderboard;
window.renderLeaderboard = renderLeaderboard;
window.fetchPokedex = fetchPokedex;

// ==========================================
// SHHHHHHHHHHHHHHH
// ==========================================
const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiIndex = 0;

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        konamiIndex = 0;
        return;
    }

    if (['home', 'commands', 'guide', 'leaderboard', 'pokedex', 'baconsuite'].includes(activeTool)) {
        konamiIndex = 0;
        return;
    }

    const key = e.key;
    const expectedKey = konamiCode[konamiIndex];
    const isMatch = (key.toLowerCase() === expectedKey.toLowerCase()) || (key === expectedKey);

    if (isMatch) {
        if (key.startsWith('Arrow')) {
            e.preventDefault();
        }
        
        konamiIndex++;
        if (konamiIndex === konamiCode.length) {
            konamiIndex = 0;
            triggerGame(activeTool); 
        }
    } else {
        konamiIndex = 0; 
    }
});

function triggerGame(tool) {
    const wrap = document.getElementById('previewWrapper');
    
    if (!wrap || document.getElementById('gameFrame')) return;

    let gamePath = '';
    if (tool === 'weather') gamePath = '../secret/contra.html';
    else if (tool === 'watermark') gamePath = '../secret/superc.html';
    else if (tool === 'socials') gamePath = '../secret/tmnt.html';
    else if (tool === 'gorillas') gamePath = 'https://archive.org/embed/msdos_Gorillas_1991';

    if (gamePath) {
        const gameFrame = document.createElement('iframe');
        gameFrame.id = 'gameFrame';
        gameFrame.src = gamePath;
        gameFrame.frameBorder = '0';
        gameFrame.className = 'absolute inset-0 w-full h-full z-[50] pointer-events-auto bg-black';

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.title = "Close Game";
        closeBtn.className = 'absolute top-3 right-3 z-[60] bg-red-600 hover:bg-red-500 text-white w-8 h-8 rounded-full font-bold flex justify-center items-center shadow-[0_0_15px_rgba(220,38,38,0.8)] transition-transform hover:scale-110';
        
        const fullBtn = document.createElement('button');
        fullBtn.innerHTML = '<i class="fas fa-external-link-alt"></i>';
        fullBtn.title = "Play Fullscreen / Pop-out";
        fullBtn.className = 'absolute top-3 right-14 z-[60] bg-blue-600 hover:bg-blue-500 text-white w-8 h-8 rounded-full font-bold flex justify-center items-center shadow-[0_0_15px_rgba(37,99,235,0.8)] transition-transform hover:scale-110';

        closeBtn.onclick = () => {
            gameFrame.remove();
            closeBtn.remove();
            fullBtn.remove();
        };

        fullBtn.onclick = () => {
            window.open(gamePath, '_blank');
            gameFrame.remove();
            closeBtn.remove();
            fullBtn.remove();
        };

        wrap.appendChild(gameFrame);
        wrap.appendChild(closeBtn);
        wrap.appendChild(fullBtn);
        
        setTimeout(() => {
            gameFrame.focus();
        }, 200);
        
        const copyBtn = document.getElementById('copyBtn');
        if (copyBtn) {
            const oldTxt = copyBtn.textContent;
            copyBtn.textContent = '🕹️ 30 LIVES ADDED!';
            copyBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
            copyBtn.classList.add('bg-red-600', 'hover:bg-red-500');
            
            setTimeout(() => {
                copyBtn.textContent = oldTxt;
                copyBtn.classList.remove('bg-red-600', 'hover:bg-red-500');
                copyBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-500');
            }, 3000);
        }
    }
}