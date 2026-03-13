const links = document.querySelectorAll('.nav-link');
const gC = document.getElementById('guide-container');
const tC = document.getElementById('tool-container');
const scrA = document.getElementById('main-scroll-area');

let activeTool = 'guide'; // Track the current tool for the Easter Eggs

function loadTool(target) {
    activeTool = target; // Update tracking
    links.forEach(l => {
        l.classList.remove('active');
        if (l.dataset.target === target) l.classList.add('active');
    });
    scrA.scrollTo(0, 0);

    if (target === 'guide') {
        tC.classList.add('hidden');
        tC.innerHTML = '';
        gC.classList.remove('hidden');
        window.history.pushState({}, '', window.location.pathname);
    } else {
        gC.classList.add('hidden');
        tC.classList.remove('hidden');
        tC.innerHTML = '<div class="flex justify-center items-center h-64"><i class="fas fa-spinner fa-spin text-4xl text-emerald-500"></i></div>';
        window.history.pushState({}, '', '?tool=' + target);
        
        fetch(`./tools/${target}/editor.html`)
            .then(r => {
                if (!r.ok) throw new Error(`Tool missing.`);
                return r.text();
            })
            .then(h => {
                tC.innerHTML = h;
                const s = tC.querySelectorAll('script');
                s.forEach(oS => {
                    const nS = document.createElement('script');
                    Array.from(oS.attributes).forEach(a => nS.setAttribute(a.name, a.value));
                    if (oS.innerHTML) nS.appendChild(document.createTextNode(oS.innerHTML));
                    oS.parentNode.replaceChild(nS, oS);
                });
            })
            .catch(e => {
                tC.innerHTML = `<div class="text-center text-red-500 font-bold p-12 bg-zinc-900 rounded-xl mx-5 mt-8 border border-red-900/50"><i class="fas fa-exclamation-triangle text-3xl mb-3"></i><br>Error: ${e.message}</div>`;
            });
    }
}

links.forEach(l => l.addEventListener('click', (e) => loadTool(e.currentTarget.dataset.target)));

const urlParams = new URLSearchParams(window.location.search);
const initialTool = urlParams.get('tool');
if (initialTool) loadTool(initialTool);

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
// KONAMI CODE EASTER EGG
// ==========================================
const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiIndex = 0;

document.addEventListener('keydown', (e) => {
    // 1. Ignore if user is actively typing in an input field or dropdown
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        konamiIndex = 0;
        return;
    }

    // 2. Only allow if they are actually on a tool page, not the guide
    if (activeTool === 'guide') return;

    // 3. Match the key (ignoring uppercase vs lowercase for 'B' and 'A')
    const key = e.key;
    const expectedKey = konamiCode[konamiIndex];
    const isMatch = (key.toLowerCase() === expectedKey.toLowerCase()) || (key === expectedKey);

    if (isMatch) {
        konamiIndex++;
        if (konamiIndex === konamiCode.length) {
            konamiIndex = 0; // Reset counter
            triggerGame(activeTool); // Fire!
        }
    } else {
        konamiIndex = 0; // Reset if they mess up the sequence
    }
});

function triggerGame(tool) {
    const frame = document.getElementById('previewFrame');
    if (!frame) return;

    // Route the tools to their specific games
    let gamePath = '';
    if (tool === 'weather') gamePath = '../secret/contra.html';
    else if (tool === 'watermark') gamePath = '../secret/superc.html';
    else if (tool === 'socials') gamePath = '../secret/tmnt.html';

    if (gamePath) {
        frame.src = gamePath;
        
        // ALLOW INTERACTION: Strip the CSS block and auto-focus the frame!
        frame.classList.remove('pointer-events-none');
        frame.classList.add('pointer-events-auto');
        
        // Give the iframe a tiny delay to load, then force focus on it
        setTimeout(() => {
            frame.focus();
        }, 200);
        
        // Visual feedback on the Copy button to let them know it worked
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
