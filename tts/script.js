        const voices = [
            {name: "50 Cent", cmd: "!fifty"},
            {name: "Ac7ionMan", cmd: "!ac7"},
            {name: "Albert Einstein", cmd: "!einstein"},
            {name: "Alex Jones", cmd: "!alex"},
            {name: "Alyb0ba", cmd: "!aly"},
            {name: "Andrew Tate", cmd: "!tate"},
            {name: "Baked Alaska", cmd: "!baked"},
            {name: "Barack Obama", cmd: "!obama"},
            {name: "Bart Simpson", cmd: "!bart"},
            {name: "Batman", cmd: "!batman"},
            {name: "Beavis", cmd: "!beavis"},
            {name: "beavis2", cmd: "!beavis2"},
            {name: "Blade", cmd: "!blade"},
            {name: "Butthead", cmd: "!butthead"},
            {name: "Cartman", cmd: "!cartman"},
            {name: "Chris Griffin", cmd: "!chris"},
            {name: "Chud The Builder", cmd: "!chud"},
            {name: "CrackyJoe", cmd: "!joe"},
            {name: "Darth Vader", cmd: "!vader"},
            {name: "Dexter Morgan", cmd: "!dexter"},
            {name: "DMX", cmd: "!dmx"},
            {name: "Donald Trump", cmd: "!trump"},
            {name: "Dr. Phil", cmd: "!phil"},
            {name: "Echosbeast", cmd: "!echosbeast"},
            {name: "egirl", cmd: "!egirl"},
            {name: "Elmo", cmd: "!elmo"},
            {name: "Elon Musk", cmd: "!musk"},
            {name: "God", cmd: "!god"},
            {name: "Hank Hill", cmd: "!hank"},
            {name: "Horror Announcer", cmd: "!horror"},
            {name: "Hulk Hogan", cmd: "!hogan"},
            {name: "Ice Cube", cmd: "!icecube"},
            {name: "Ice Poseidon", cmd: "!ice"},
            {name: "Italian Mafia", cmd: "!mafia"},
            {name: "JARVIS", cmd: "!jarvis"},
            {name: "Jeremy Clarkson", cmd: "!clarkson"},
            {name: "Joe Rogan", cmd: "!rogan"},
            {name: "Joker", cmd: "!joker"},
            {name: "Kick Clipz", cmd: "!clipz"},
            {name: "Kyle Broflovski (Southpark)", cmd: "!kyle"},
            {name: "Marcel", cmd: "!marcel"},
            {name: "Meatwad", cmd: "!meatwad"},
            {name: "Michael Jackson", cmd: "!mj"},
            {name: "Mickey Mouse", cmd: "!mickey"},
            {name: "Morgan Freeman", cmd: "!freeman"},
            {name: "Mortal Combat Announcer", cmd: "!mc"},
            {name: "Morty", cmd: "!morty"},
            {name: "Nick Lee", cmd: "!nicklee"},
            {name: "Nick White", cmd: "!nickwhite"},
            {name: "Norm Macdonald", cmd: "!norm"},
            {name: "Old Man", cmd: "!oldman"},
            {name: "Patrick Star", cmd: "!patrick"},
            {name: "Peter Griffin", cmd: "!peter"},
            {name: "phant0mshock", cmd: "!phantom"},
            {name: "RFK", cmd: "!rfk"},
            {name: "Rick (Rick and Morty)", cmd: "!rick"},
            {name: "Rocko (Rocko's Modern Life)", cmd: "!rocko"},
            {name: "Sam Pepper", cmd: "!sam"},
            {name: "Slax", cmd: "!slax"},
            {name: "Snoop Dogg", cmd: "!snoop"},
            {name: "Speed", cmd: "!speed"},
            {name: "SpongeBob", cmd: "!spongebob"},
            {name: "Super Smash Bros. 4/Ultimate Announcer", cmd: "!ssb"},
            {name: "Suspendas", cmd: "!sus"},
            {name: "Suzie Smalls", cmd: "!suzie"},
            {name: "Vagabond", cmd: "!vagabond"},
            {name: "whiz", cmd: "!whiz"},
            {name: "Wvagabond #2", cmd: "!vagabond2"},
            {name: "xqc", cmd: "!xqc"},
            {name: "apples5", cmd: "!apples5"},
            {name: "Bam Margera", cmd: "!bam"},
            {name: "Cristorata", cmd: "!cristorata"},
            {name: "Duck", cmd: "!duck"},
            {name: "eddie", cmd: "!eddie"},
            {name: "endure", cmd: "!endure"},
            {name: "iDuncle", cmd: "!duncle"},
            {name: "Indian Scammer", cmd: "!indian"},
            {name: "James Worley", cmd: "!jamesworley"},
            {name: "KitKat2727", cmd: "!kit"},
            {name: "Lake Show", cmd: "!lake"},
            {name: "MAGGOT", cmd: "!maggot"},
            {name: "Maki95", cmd: "!maki"},
            {name: "matthew selby", cmd: "!matthew"},
            {name: "Santa Maria", cmd: "!santamaria"},
            {name: "Sayge", cmd: "!sayge"},
            {name: "Tokyo Trump", cmd: "!tokyo"},
            {name: "Twitch's CEO Dan Clancy", cmd: "!danclancy"},
            {name: "duhsten", cmd: "!duhsten"},
            {name: "Burger Planet", cmd: "!burger"},
            {name: "NedX", cmd: "!ned"},
            {name: "Kang Joel", cmd: "!joel"},
            {name: "Freddy Krueger", cmd: "!freddy"},
            {name: "Ghostface", cmd: "!ghostface"},
            {name: "Pennywise", cmd: "!pennywise"},
            {name: "Jigsaw", cmd: "!jigsaw"},
            {name: "Chucky", cmd: "!chucky"},
            {name: "Springtrap", cmd: "!springtrap"},
            {name: "M3GAN", cmd: "!m3gan"},
            {name: "Vecna", cmd: "!vecna"},
            {name: "Pinhead", cmd: "!pinhead"},
            {name: "Crypt Keeper", cmd: "!cryptkeeper"},
            {name: "Tiffany", cmd: "!tiffany"},
            {name: "Slappy", cmd: "!slappy"},
            {name: "Freddy Fazbear", cmd: "!fazbear"},
            {name: "Nightmare Freddy", cmd: "!nightmare"},
            {name: "Sonic", cmd: "!sonic"},
            {name: "Jax", cmd: "!jax"},
            {name: "Metal Sonic", cmd: "!metalsonic"},
            {name: "Baldi", cmd: "!baldi"},
            {name: "Pomni", cmd: "!pomni"}
        ];

        const grid = document.getElementById('voiceGrid');

        function renderVoices(list) {
            grid.innerHTML = '';
            if (list.length === 0) {
                grid.innerHTML = '<div class="no-results">No matching voices found.</div>';
                return;
            }
            list.forEach(v => {
                const row = document.createElement('div');
                row.className = 'voice-row';
                row.innerHTML = `
                    <div class="voice-name" title="${v.name}">${v.name}</div>
                    <div class="voice-right">
                        <span class="voice-cmd">${v.cmd}</span>
                        <button class="copy-btn" title="Copy command" onclick="copyCommand('${v.cmd}', this)"><i class="fas fa-copy"></i></button>
                    </div>
                `;
                grid.appendChild(row);
            });
        }

        function filterVoices() {
            const query = document.getElementById('searchInput').value.toLowerCase();
            const filtered = voices.filter(v => 
                v.name.toLowerCase().includes(query) || v.cmd.toLowerCase().includes(query)
            );
            renderVoices(filtered);
        }

        function copyCommand(text, btn) {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                const icon = btn.querySelector('i');
                icon.className = 'fas fa-check';
                setTimeout(() => {
                    icon.className = 'fas fa-copy';
                }, 1500);
            } catch (err) {
                console.error('Failed to copy text', err);
            }
            document.body.removeChild(textArea);
        }

        const canvas = document.getElementById('particleCanvas');
        const ctx = canvas.getContext('2d');

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        let particles = [];
        let particleCount = Math.floor((canvas.width * canvas.height) / 7000);

        class Particle {
            constructor() {
                this.reset();
                this.y = Math.random() * canvas.height;
            }
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.speed = Math.random() / 5 + 0.1;
                this.opacity = 1;
                this.fadeDelay = Math.random() * 600 + 100;
                this.fadeStart = Date.now() + this.fadeDelay;
                this.fadingOut = false;
            }
            update() {
                this.y -= this.speed;
                if (this.y < 0) this.reset();
                if (!this.fadingOut && Date.now() > this.fadeStart) this.fadingOut = true;
                if (this.fadingOut) {
                    this.opacity -= 0.008;
                    if (this.opacity <= 0) this.reset();
                }
            }
            draw() {
                ctx.fillStyle = `rgba(${255 - (Math.random() * 128)}, 255, 255, ${this.opacity})`;
                ctx.fillRect(this.x, this.y, 0.4, Math.random() * 2 + 1);
            }
        }

        function initParticles() {
            particles = [];
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle());
            }
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(animate);
        }

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            particleCount = Math.floor((canvas.width * canvas.height) / 7000);
            initParticles();
        });

        // Initial render & animation start
        renderVoices(voices);
        initParticles();
        animate();