// --- SMART API ROUTER ---
function getApiUrl(endpoint) {
    const host = window.location.hostname;
    // Uses local port 3000 if testing locally, otherwise the public URL
    if (host === 'localhost' || host === '127.0.0.1' || host === 'jserver.local' || host.startsWith('192.168.') || host.startsWith('10.')) {
        return `http://${host}:3000${endpoint}`;
    }
    return `https://still-waterfall-697c.theheirofbacon.workers.dev${endpoint}`;
}

let activeTool = 'home'; // Track the current tool for the Easter Eggs
let lbData = []; // Store leaderboard data globally
let dexData = []; // Store pokedex data globally

function loadTool(target, updateHistory = true) {
    if (target !== 'pokedex') stopPokedexRefresh();
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

        if (updateHistory && target === 'home') {
            window.history.pushState({}, '', window.location.pathname);
        } else if (updateHistory) {
            const next = new URL(window.location.href);
            const trainer = target === 'pokedex' ? next.searchParams.get('u') : null;
            next.search = ''; next.hash = '';
            next.searchParams.set('page', target);
            if (trainer) next.searchParams.set('u', trainer);
            if (next.href !== window.location.href) window.history.pushState({}, '', next);
        }
    } 
    // Handle Dynamic Tool Routes (Fetching the overlay editors)
    else {
        const tC = document.getElementById('tool-container');
        if (tC) {
            tC.classList.remove('hidden');
            tC.innerHTML = '<div class="flex justify-center items-center h-64"><i class="fas fa-spinner fa-spin text-4xl text-emerald-500"></i></div>';
        }
        if (updateHistory) window.history.pushState({}, '', '?tool=' + target);
        
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
        loadTool(initialTool, false);
    } else if (initialPage && ['commands', 'guide', 'leaderboard', 'pokedex', 'baconsuite'].includes(initialPage)) {
        loadTool(initialPage, false);
    } else {
        loadTool('home', false); // Default load
    }

    window.addEventListener('popstate', () => {
        const params = new URLSearchParams(window.location.search);
        loadTool(params.get('tool') || params.get('page') || 'home', false);
    });

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
// Public trainer collections. Selection and battles remain authenticated through stream chat.
let currentPokedexRoster = [];
let currentDexTrainer = null;
let recentViewedTrainers = [];
let dexRequest = null, dexRequestId = 0, dexReady = false, dexBoss = null;
const dexEscape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dexGet = id => document.getElementById(id);
const dexNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
function dexUsername(value) { return String(value || '').trim().replace(/^@/, '').toLowerCase(); }
function dexTrainerUrl(username) {
    const url = new URL(window.location.href);
    url.search = ''; url.hash = '';
    url.searchParams.set('page', 'pokedex');
    url.searchParams.set('u', username);
    return url;
}
function stopPokedexRefresh() {
    dexRequestId++;
    dexRequest?.abort();
    dexRequest = null;
}
function setupPokedexUI() {
    if (dexReady || !dexGet('dex-search-form')) return;
    dexReady = true;
    try {
        const saved = JSON.parse(localStorage.getItem('bacon-pokedex-recent') || '[]');
        recentViewedTrainers = Array.isArray(saved) ? saved.filter(u => typeof u === 'string' && u.length > 0 && u.length <= 80).slice(0, 8) : [];
    } catch {}
    renderRecentViewed();
    dexGet('dex-search-form').addEventListener('submit', event => { event.preventDefault(); executeDexSearch(); });
    for (const id of ['dex-filter', 'dex-sort']) dexGet(id).addEventListener('change', renderPokedex);
    dexGet('dex-pokemon-search').addEventListener('input', renderPokedex);
    dexGet('dex-refresh').addEventListener('click', () => executeDexSearch());
    dexGet('dex-share').addEventListener('click', () => {
        if (currentDexTrainer) copyDexText(dexTrainerUrl(currentDexTrainer.username).href, 'Trainer link copied.');
    });
    dexGet('pokedex-container').addEventListener('click', event => {
        const copy = event.target.closest('[data-dex-copy]');
        if (copy && !copy.disabled) copyDexText(copy.dataset.dexCopy, 'Command copied. Paste it into the stream chat.');
        const recent = event.target.closest('[data-dex-trainer]');
        if (recent) executeDexSearch(recent.dataset.dexTrainer);
    });
    dexGet('dex-content').addEventListener('error', event => {
        const img = event.target;
        if (img.tagName !== 'IMG') return;
        if (!img.dataset.fallback) {
            img.dataset.fallback = 'true';
            img.src = getApiUrl('/assets/sprites/normal/0.png');
        } else {
            img.hidden = true;
            img.parentElement.classList.add('dex-missing-sprite');
        }
    }, true);
    setInterval(() => {
        if (activeTool === 'pokedex' && !document.hidden && currentDexTrainer && !dexRequest) {
            executeDexSearch(currentDexTrainer.username, { silent: true });
        }
    }, 30000);
    setInterval(updateDexBossClock, 1000);
}
async function copyDexText(value, message) {
    const manual = dexGet('dex-copy-value');
    manual.hidden = true;
    try {
        await navigator.clipboard.writeText(value);
        dexGet('dex-copy-status').textContent = message;
    } catch {
        manual.value = value; manual.hidden = false; manual.focus(); manual.select();
        dexGet('dex-copy-status').textContent = 'Copy the selected text below, then paste it into chat or share it.';
    }
}
async function fetchPokedex() {
    setupPokedexUI();
    const username = new URLSearchParams(window.location.search).get('u');
    dexGet('dex-search-input').value = username || '';
    if (username) return executeDexSearch(username);
    stopPokedexRefresh();
    currentDexTrainer = null; currentPokedexRoster = [];
    dexGet('dex-trainer-name').textContent = 'Your collection starts here';
    dexGet('dex-stats-bar').hidden = true; dexGet('dex-active').hidden = true;
    dexGet('dex-toolbar').hidden = true; dexGet('dex-share').hidden = true; dexGet('dex-boss').hidden = true;
    dexGet('dex-error').hidden = true;
    dexGet('dex-content').innerHTML = '<div class="dex-empty"><span class="dex-empty-mark" aria-hidden="true">&#9678;</span><h3>Find a trainer</h3><p>Enter your stream username to see every catch, check your partner, and choose who joins you on screen.</p></div>';
    dexGet('dex-result-count').textContent = ''; dexGet('dex-updated').textContent = '';
    dexGet('dex-content').setAttribute('aria-busy', 'false');
}
async function executeDexSearch(presetUsername = null, { silent = false } = {}) {
    setupPokedexUI();
    const username = dexUsername(presetUsername || dexGet('dex-search-input').value);
    if (!username || username.length > 80) {
        dexGet('dex-error').textContent = 'Enter a trainer username (up to 80 characters).';
        dexGet('dex-error').hidden = false;
        return;
    }
    if (!silent) dexGet('dex-search-input').value = username;
    stopPokedexRefresh();
    const requestId = dexRequestId, controller = new AbortController();
    dexRequest = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    const isCurrent = () => requestId === dexRequestId && activeTool === 'pokedex';
    dexGet('dex-error').hidden = true;
    dexGet('dex-content').setAttribute('aria-busy', 'true');
    if (!silent) {
        dexGet('dex-content').innerHTML = '<div class="dex-empty" role="status">Loading collection&hellip;</div>';
        for (const id of ['dex-active', 'dex-stats-bar', 'dex-toolbar', 'dex-share', 'dex-boss']) dexGet(id).hidden = true;
        dexGet('dex-result-count').textContent = '';
        dexGet('dex-trainer-name').textContent = '@' + username;
        const nextUrl = dexTrainerUrl(username);
        if (window.location.href !== nextUrl.href) window.history.pushState({}, '', nextUrl);
    }
    try {
        const response = await fetch(getApiUrl('/api/pokedex/' + encodeURIComponent(username)), { signal: controller.signal, cache: 'no-store' });
        if (response.status === 404) throw Error('No collection found for @' + username + '. Check the spelling, or catch your first Pokemon in chat.');
        if (!response.ok) throw Error('The game is temporarily unavailable. Please try again shortly.');
        const trainer = await response.json();
        if (!isCurrent()) return;
        let roster;
        try { roster = typeof trainer.roster === 'string' ? JSON.parse(trainer.roster) : trainer.roster; } catch { roster = null; }
        if (!Array.isArray(roster)) throw Error('This collection could not be loaded. Please try again.');
        currentPokedexRoster = roster.filter(p => p && p.internalId != null).map((p, index) => ({
            ...p, selectionNumber: index + 1, level: Math.max(1, Math.min(100, Math.floor(dexNumber(p.level, 1)))), xp: Math.max(0, dexNumber(p.xp))
        }));
        if (!currentPokedexRoster.some(p => p.active) && currentPokedexRoster.length) {
            const dates = currentPokedexRoster.map(p => Date.parse(p.caughtAt));
            const first = dates.every(Number.isFinite) ? dates.indexOf(Math.min(...dates)) : 0;
            currentPokedexRoster[first].active = true;
        }
        currentDexTrainer = { ...trainer, username: String(trainer.username || username) };
        dexGet('dex-trainer-name').textContent = '@' + currentDexTrainer.username;
        dexGet('stat-dex-balls').textContent = dexNumber(trainer.pokeballs).toLocaleString();
        dexGet('stat-dex-caught').textContent = currentPokedexRoster.length.toLocaleString();
        dexGet('stat-dex-unique').textContent = dexNumber(trainer.pokedexCount, new Set(currentPokedexRoster.map(p => p.internalId)).size).toLocaleString();
        dexGet('stat-dex-shiny').textContent = currentPokedexRoster.filter(p => p.isShiny).length.toLocaleString();
        for (const id of ['dex-stats-bar', 'dex-toolbar', 'dex-share']) dexGet(id).hidden = false;
        const partner = currentPokedexRoster.find(p => p.active);
        dexGet('dex-active').hidden = !partner;
        if (partner) {
            dexGet('dex-active').innerHTML = '<div><span class="dex-eyebrow">On-screen partner</span><h3>' + dexEscape(partner.name || 'Unknown') + ' <small>Lv' + partner.level + '</small></h3><p>Chat to bring this partner onto the overlay and earn XP. Each catch keeps its own progress when you swap.</p></div>' + dexXpMarkup(partner);
        }
        const progression = trainer.progression;
        dexGet('dex-xp-help').textContent = progression
            ? progression.xpPerMessage + ' XP per eligible chat message, with a ' + progression.xpCooldownSeconds + '-second cooldown. Evolution milestones: levels ' + progression.firstEvolutionLevel + ' / ' + progression.laterEvolutionLevel + '.'
            : 'Chat to earn XP for your active partner. Each Pokemon keeps its own level, IVs, and XP.';
        addToRecentViewed(currentDexTrainer.username);
        renderPokedex();
        dexGet('dex-updated').textContent = 'Updated ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' \u00b7 refreshes every 30 seconds';
        // The trainer endpoint also works with older servers; boss status is an optional enhancement.
        try {
            const bossResponse = await fetch(getApiUrl('/api/pokemon/world'), { signal: controller.signal, cache: 'no-store' });
            if (isCurrent()) {
                if (bossResponse.ok) { const world = await bossResponse.json(); if (isCurrent()) renderDexBoss(world); }
                else { dexBoss = null; dexGet('dex-boss').hidden = true; }
            }
        } catch { if (isCurrent()) { dexBoss = null; dexGet('dex-boss').hidden = true; } }
    } catch (error) {
        if (!isCurrent()) return;
        dexGet('dex-error').textContent = controller.signal.aborted ? 'The game took too long to respond. Please try again.' : error.message || 'Could not connect to the game. Please try again.';
        dexGet('dex-error').hidden = false;
        if (silent) dexGet('dex-error').textContent += ' Showing the last loaded collection.';
        else {
            currentDexTrainer = null; currentPokedexRoster = [];
            dexGet('dex-content').innerHTML = '';
            dexGet('dex-updated').textContent = '';
        }
    } finally {
        clearTimeout(timeout);
        if (isCurrent()) { dexRequest = null; dexGet('dex-content').setAttribute('aria-busy', 'false'); }
    }
}
function dexXpMarkup(pokemon) {
    const required = pokemon.level >= 100 ? 0 : Math.max(1, dexNumber(pokemon.nextLevelXp, 50 + pokemon.level * 25));
    const xp = Math.min(required, pokemon.xp), percentage = required ? Math.round(xp / required * 100) : 100;
    return '<div class="dex-xp"><div class="dex-xp-label"><span>' + (required ? 'To level ' + (pokemon.level + 1) : 'Maximum level') + '</span><strong>' + (required ? xp + ' / ' + required + ' XP' : 'Lv100') + '</strong></div><div class="dex-xp-track" role="progressbar" aria-label="Level progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + percentage + '"><span style="width:' + percentage + '%"></span></div></div>';
}
function renderPokedex() {
    const container = dexGet('dex-content');
    if (!container) return;
    const query = dexGet('dex-pokemon-search').value.trim().toLowerCase().replace(/^#/, '');
    const filter = dexGet('dex-filter').value;
    let roster = currentPokedexRoster.filter(p =>
        (!query || String(p.name || '').toLowerCase().includes(query) || String(p.internalId).toLowerCase() === query) &&
        (filter !== 'shiny' || p.isShiny) && (filter !== 'active' || p.active) && (filter !== 'team' || p.locked)
    );
    const sort = dexGet('dex-sort').value;
    roster.sort((a, b) => {
        if (sort === 'name') return String(a.name || '').localeCompare(String(b.name || ''));
        if (sort === 'number') return String(a.internalId).localeCompare(String(b.internalId), undefined, { numeric: true });
        if (sort === 'recent') return (Date.parse(b.caughtAt) || 0) - (Date.parse(a.caughtAt) || 0);
        if (sort === 'level') return b.level - a.level;
        return Number(Boolean(b.active)) - Number(Boolean(a.active)) || b.level - a.level;
    });
    dexGet('dex-result-count').textContent = 'Showing ' + roster.length + ' of ' + currentPokedexRoster.length + ' individual Pokemon';
    if (!roster.length) {
        container.innerHTML = '<div class="dex-empty"><h3>' + (currentPokedexRoster.length ? 'No matches yet' : 'Ready for your first catch?') + '</h3><p>' + (currentPokedexRoster.length ? 'Try another name or collection filter.' : 'Use !catch in stream chat when a wild Pokemon appears.') + '</p></div>';
        return;
    }
    container.innerHTML = roster.map(p => {
        const image = getApiUrl('/assets/sprites/' + (p.isShiny ? 'shiny' : 'normal') + '/' + encodeURIComponent(String(p.internalId)) + '.png');
        const ivKeys = [['HP','hp'],['ATK','atk'],['DEF','def'],['SP. ATK','spAtk'],['SP. DEF','spDef'],['SPEED','speed']];
        const iv = key => Math.max(0, Math.min(31, Math.floor(dexNumber(p.ivs?.[key]))));
        const total = ivKeys.reduce((sum, [, key]) => sum + iv(key), 0);
        const command = '!poke ' + p.selectionNumber;
        const evolution = p.evolution, choices = evolution?.choices || [];
        const evolutionText = choices.length ? 'Evolves ' + (evolution.ready ? 'now' : 'at Lv' + evolution.level) + ': ' + choices.map(c => c.name).join(' / ') : '';
        const evolutionButtons = p.active && evolution?.ready && choices.length > 1 ? choices.map(c => '<button type="button" class="dex-evolve" data-dex-copy="' + dexEscape('!evolve ' + c.internalId) + '">Copy evolve ' + dexEscape(c.name) + '</button>').join('') : '';
        return '<article class="dex-card' + (p.active ? ' dex-card-active' : '') + (p.isShiny ? ' dex-card-shiny' : '') + '">' +
            '<div class="dex-card-tags"><span>#' + dexEscape(p.internalId) + '</span><div>' + (p.active ? '<span class="dex-tag dex-tag-active">Active</span>' : '') + (p.isShiny ? '<span class="dex-tag dex-tag-shiny">Shiny</span>' : '') + (p.locked ? '<span class="dex-tag">Team</span>' : '') + '</div></div>' +
            '<div class="dex-sprite"><img src="' + dexEscape(image) + '" alt="' + dexEscape(p.name || 'Pokemon') + '" loading="lazy" decoding="async"></div>' +
            '<h3>' + dexEscape(p.name || 'Unknown') + '</h3><p class="dex-card-level">Level ' + p.level + '</p>' + dexXpMarkup(p) +
            (evolutionText ? '<p class="dex-evolution">' + dexEscape(evolutionText) + '</p>' + evolutionButtons : '') +
            '<details class="dex-ivs"><summary>Individual values <strong>' + total + ' / 186</strong></summary><div class="dex-iv-grid">' + ivKeys.map(([label,key]) => '<div><span>' + label + '</span><strong' + (iv(key) === 31 ? ' class="dex-perfect"' : '') + '>' + iv(key) + '/31</strong></div>').join('') + '</div></details>' +
            '<button type="button" class="dex-select" ' + (p.active || !command ? 'disabled' : 'data-dex-copy="' + dexEscape(command) + '"') + '>' + (p.active ? 'Current partner' : command ? 'Copy ' + command : 'Chat, then refresh to select') + '</button>' +
            (command ? '<details class="dex-command"><summary>View chat command</summary><code>' + dexEscape(command) + '</code></details>' : '') + '</article>';
    }).join('');
}
function addToRecentViewed(username) {
    recentViewedTrainers = [dexUsername(username), ...recentViewedTrainers.filter(u => u !== dexUsername(username))].slice(0, 8);
    try { localStorage.setItem('bacon-pokedex-recent', JSON.stringify(recentViewedTrainers)); } catch {}
    renderRecentViewed();
}
function renderRecentViewed() {
    const list = dexGet('dex-recent-list');
    if (!list) return;
    list.innerHTML = recentViewedTrainers.length
        ? recentViewedTrainers.map(username => '<button type="button" data-dex-trainer="' + dexEscape(username) + '">@' + dexEscape(username) + '<span aria-hidden="true">&rarr;</span></button>').join('')
        : '<p>Your recent trainer searches appear here.</p>';
}
function renderDexBoss(world) {
    dexBoss = world.boss;
    const banner = dexGet('dex-boss');
    if (!world.gameActive || !dexBoss) { banner.hidden = true; return; }
    const participant = (dexBoss.participants || []).find(p => dexUsername(p.username) === dexUsername(currentDexTrainer?.username));
    const joined = Boolean(participant);
    const phase = dexBoss.phase, bossName = dexBoss.pokemon?.nameEn || 'Boss';
    let hint = '', command = '';
    if (phase === 'lobby') { hint = joined ? 'This trainer joined with their selected partner.' : 'Choose your partner, then join in stream chat.'; command = joined ? '' : '!joinboss'; }
    else if (phase === 'catching') { hint = joined ? 'Victory! Participants can use normal catch rules and retry failed throws before the boss flees.' : 'Defeated! Only trainers who joined this battle can try to catch it.'; if (participant?.caught) hint = 'This trainer caught the boss!';
        command = joined && !participant.caught ? '!bosscatch' : ''; }
    else { hint = 'The battle runs automatically. ' + (joined ? 'This trainer is in the fight.' : 'Join the next lobby to take part.'); }
    banner.innerHTML = '<div><span class="dex-eyebrow">Boss ' + dexEscape(phase) + ' <span id="dex-boss-clock"></span></span><h3>' + dexEscape(bossName) + ' <small>Lv' + dexNumber(dexBoss.level, 1) + '</small></h3><p>' + dexEscape(hint) + '</p></div>' + (command ? '<button type="button" data-dex-copy="' + command + '">' + (command === '!joinboss' ? 'Copy join command' : 'Copy catch command') + '</button>' : '');
    banner.hidden = false; updateDexBossClock();
}
function updateDexBossClock() {
    const clock = dexGet('dex-boss-clock');
    if (!clock || !dexBoss?.endsAt) return;
    const seconds = Math.max(0, Math.ceil((dexBoss.endsAt - Date.now()) / 1000));
    const button = dexGet('dex-boss').querySelector('button');
    if (button) button.disabled = seconds <= 0;
    clock.textContent = '\u00b7 ' + Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0') + ' left';
}
window.executeDexSearch = executeDexSearch;

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
