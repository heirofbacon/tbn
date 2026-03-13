const links = document.querySelectorAll('.nav-link');
const gC = document.getElementById('guide-container');
const tC = document.getElementById('tool-container');
const scrA = document.getElementById('main-scroll-area');

function loadTool(target) {
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