// Global Environment Helper (Accessible by all tools)
window.BaconEnv = {
    getApiUrl: (endpoint) => {
        const host = window.location.hostname;
        // Detect localhost, local IP addresses, and custom local domains (like 'bacontoolkit' which has no dots)
        const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.') || !host.includes('.');
        const baseUrl = isLocal ? 'http://localhost:3000' : 'https://core.tinko.online';
        return baseUrl + endpoint;
    }
};

let activeTool = 'home'; // Track the current tool for the Easter Eggs

function loadTool(target) {
    activeTool = target; // Update tracking
    
    // Grab elements dynamically INSIDE the function to prevent null crashes
    const links = document.querySelectorAll('.nav-link');
    const scrA = document.getElementById('main-scroll-area');
    
    links.forEach(l => {
        l.classList.remove('active');
        if (l.dataset.target === target) l.classList.add('active');
    });
    
    // Safe check: Only scroll if the element actually exists
    if (scrA) scrA.scrollTo(0, 0);

    // 1. Hide ALL containers first to reset state
    ['home-container', 'commands-container', 'guide-container', 'tool-container'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    // 2. Handle Static Routes (Pages that don't need to fetch HTML)
    if (['home', 'commands', 'guide'].includes(target)) {
        const targetContainer = document.getElementById(`${target}-container`);
        if (targetContainer) targetContainer.classList.remove('hidden');
        
        if (target === 'home') {
            window.history.pushState({}, '', window.location.pathname);
        } else {
            window.history.pushState({}, '', '?page=' + target);
        }
    } 
    // 3. Handle Dynamic Tool Routes (Fetching the overlay editors and modules)
    else {
        const tC = document.getElementById('tool-container');
        if (tC) {
            tC.classList.remove('hidden');
            tC.innerHTML = '<div class="flex justify-center items-center h-64"><i class="fas fa-spinner fa-spin text-4xl text-emerald-500"></i></div>';
        }
        
        window.history.pushState({}, '', '?tool=' + target);
        
        // This fetch will naturally pull ./tools/leaderboard/editor.html!
        fetch(`./tools/${target}/editor.html`)
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}: Tool missing or failed to load.`);
                return r.text();
            })
            .then(h => {
                if (tC) {
                    tC.innerHTML = h;
                    // Safely Re-evaluate scripts in the loaded HTML
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
                    tC.innerHTML = `<div class="text-center text-red-500 font-bold p-12 bg-zinc-900 rounded-xl mx-5 mt-8 border border-red-900/50"><i class="fas fa-exclamation-triangle text-3xl mb-3"></i><br>System Error: ${e.message}</div>`;
                }
                console.error('Bacon Toolkit Tool Load Error:', e);
            });
    }
}

// Wrap initialization to ensure DOM is 100% ready before attaching events
document.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll('.nav-link');
    links.forEach(l => l.addEventListener('click', (e) => loadTool(e.currentTarget.dataset.target)));

    const urlParams = new URLSearchParams(window.location.search);
    const initialTool = urlParams.get('tool');
    const initialPage = urlParams.get('page');

    if (initialTool) {
        loadTool(initialTool);
    } else if (initialPage && ['commands', 'guide'].includes(initialPage)) {
        loadTool(initialPage);
    } else {
        loadTool('home'); // Default load
    }
});

// Tada Animation Logic for Support Buttons
const supportBtns = document.querySelectorAll('.support-btn-anim');
if (supportBtns.length > 0) {
    setInterval(() => {
        supportBtns.forEach(btn => {
            btn.classList.remove('animate-tada');
            void btn.offsetWidth; // Trigger browser reflow to restart animation
            btn.classList.add('animate-tada');
        });
    }, 8000); // Triggers every 8 seconds
}

// ==========================================
// SHHHHHHHHHHHHHHH
// ==========================================
const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiIndex = 0;

document.addEventListener('keydown', (e) => {
    // 1. Ignore if user is actively typing in an input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        konamiIndex = 0;
        return;
    }

    // 2. Only allow if they are actually on a dynamic tool page
    if (['home', 'commands', 'guide', 'leaderboard'].includes(activeTool)) {
        konamiIndex = 0;
        return;
    }

    // 3. Match the key
    const key = e.key;
    const expectedKey = konamiCode[konamiIndex];
    const isMatch = (key.toLowerCase() === expectedKey.toLowerCase()) || (key === expectedKey);

    if (isMatch) {
        // Prevent window scrolling while executing the sequence
        if (key.startsWith('Arrow')) {
            e.preventDefault();
        }
        
        konamiIndex++;
        if (konamiIndex === konamiCode.length) {
            konamiIndex = 0; // Reset counter
            triggerGame(activeTool); // Fire!
        }
    } else {
        konamiIndex = 0; // Reset if they mess up
    }
});

function triggerGame(tool) {
    const wrap = document.getElementById('previewWrapper');
    
    // Don't trigger if the wrapper is missing or a game is already running
    if (!wrap || document.getElementById('gameFrame')) return;

    // Route the tools to their specific games
    let gamePath = '';
    if (tool === 'weather') gamePath = '../secret/contra.html';
    else if (tool === 'watermark') gamePath = '../secret/superc.html';
    else if (tool === 'socials') gamePath = '../secret/tmnt.html';
    else if (tool === 'gorillas') gamePath = 'https://archive.org/embed/msdos_Gorillas_1991';

    if (gamePath) {
        // 1. Create an independent game layer on TOP of the preview
        const gameFrame = document.createElement('iframe');
        gameFrame.id = 'gameFrame';
        gameFrame.src = gamePath;
        gameFrame.frameBorder = '0';
        gameFrame.className = 'absolute inset-0 w-full h-full z-[50] pointer-events-auto bg-black';

        // 2. Create an Exit/Close Button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.title = "Close Game";
        closeBtn.className = 'absolute top-3 right-3 z-[60] bg-red-600 hover:bg-red-500 text-white w-8 h-8 rounded-full font-bold flex justify-center items-center shadow-[0_0_15px_rgba(220,38,38,0.8)] transition-transform hover:scale-110';
        
        // 3. Create a Pop-out / Fullscreen Button
        const fullBtn = document.createElement('button');
        fullBtn.innerHTML = '<i class="fas fa-external-link-alt"></i>';
        fullBtn.title = "Play Fullscreen / Pop-out";
        fullBtn.className = 'absolute top-3 right-14 z-[60] bg-blue-600 hover:bg-blue-500 text-white w-8 h-8 rounded-full font-bold flex justify-center items-center shadow-[0_0_15px_rgba(37,99,235,0.8)] transition-transform hover:scale-110';

        // Remove the game elements when X is clicked
        closeBtn.onclick = () => {
            gameFrame.remove();
            closeBtn.remove();
            fullBtn.remove();
        };

        // Open in new tab and kill the mini-viewer when Pop-out is clicked
        fullBtn.onclick = () => {
            window.open(gamePath, '_blank');
            gameFrame.remove();
            closeBtn.remove();
            fullBtn.remove();
        };

        // Inject them into the wrapper
        wrap.appendChild(gameFrame);
        wrap.appendChild(closeBtn);
        wrap.appendChild(fullBtn);
        
        // Auto-focus the new iframe so the controller/keyboard works immediately
        setTimeout(() => {
            gameFrame.focus();
        }, 200);
        
        // Visual feedback on the Copy button
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