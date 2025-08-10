document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    // --- 1. REFERENCIAS AL DOM ---
    const DOM = {
        menu: document.getElementById('menu-principal'),
        juego: document.getElementById('contenedor-juego'),
        salaEspera: document.getElementById('sala-espera'),
        nivel: document.getElementById('nivel-jugador'),
        tablero: document.getElementById('tablero-juego'),
        listaPalabras: document.getElementById('lista-palabras'),
        categoria: document.getElementById('categoria-actual'),
        temporizador: document.getElementById('temporizador'),
        puntuaciones: {
            el: document.getElementById('tablero-puntuaciones'),
            lista: document.getElementById('lista-puntuaciones')
        },
        modal: {
            el: document.getElementById('modal-fin-partida'),
            titulo: document.getElementById('modal-titulo'),
            subtitulo: document.getElementById('modal-subtitulo'),
            puntuaciones: document.getElementById('modal-puntuaciones'),
            boton: document.getElementById('modal-nueva-partida-btn')
        },
        botonesModo: document.querySelectorAll('.modo-btn'),
        multiplayer: {
             crearSalaBtn: document.getElementById('crear-sala-btn'),
             unirseSalaBtn: document.getElementById('unirse-sala-btn'),
             codigoSalaInput: document.getElementById('codigo-sala-input'),
             codigoSalaDisplay: document.getElementById('codigo-sala-display'),
             listaJugadores: document.getElementById('lista-jugadores'),
             empezarPartidaBtn: document.getElementById('empezar-partida-btn')
        },
        theme: {
            toggleBtn: document.getElementById('theme-toggle-btn'),
            sunIcon: document.getElementById('theme-icon-sun'),
            moonIcon: document.getElementById('theme-icon-moon'),
            htmlEl: document.documentElement,
            colorBtns: document.querySelectorAll('.theme-color-btn')
        }
    };

    // --- 2. DATOS Y ESTADO DEL JUEGO ---
    const CATEGORIAS = {
        Paises: ["ECUADOR", "COLOMBIA", "ARGENTINA", "JAPON", "ITALIA", "CANADA", "EGIPTO", "SUECIA"],
        Animales: ["TIGRILLO", "CONDOR", "JAGUAR", "BALLENA", "TUCAN", "IGUANA", "DELFIN", "ARMADILLO"],
        "Cultura Pop": ["MATRIX", "AVATAR", "MARVEL", "PIXAR", "NINTENDO", "STARWARS", "POKEMON", "ZELDA"],
    };
    const CONFIG_NIVEL = [
        { gridSize: 10, wordCount: 6, allowReverse: false }, { gridSize: 12, wordCount: 7, allowReverse: false },
        { gridSize: 14, wordCount: 8, allowReverse: true }, { gridSize: 15, wordCount: 9, allowReverse: true }
    ];
    let estadoJuego = {};

    function resetEstadoJuego() {
        estadoJuego = {
            nivel: 1, activo: false, grid: [], palabrasActuales: [], palabrasEncontradas: new Set(),
            isSelecting: false, selection: [], modo: 'zen', tiempoRestante: 0, timerId: null,
            codigoSala: null, esMultijugador: false
        };
    }

    // --- 3. LÓGICA DE TEMAS Y PROGRESIÓN (UN JUGADOR) ---
    function cargarTema() {
        if (localStorage.getItem('theme') === 'light') {
            DOM.theme.htmlEl.classList.add('light');
            DOM.theme.sunIcon.classList.add('hidden');
            DOM.theme.moonIcon.classList.remove('hidden');
        } else {
            DOM.theme.htmlEl.classList.remove('light');
            DOM.theme.sunIcon.classList.remove('hidden');
            DOM.theme.moonIcon.classList.add('hidden');
        }
        const temaColorGuardado = localStorage.getItem('colorTheme') || 'cyan';
        DOM.theme.htmlEl.setAttribute('data-theme', temaColorGuardado);
    }

    function toggleTheme() {
        DOM.theme.htmlEl.classList.toggle('light');
        const isLight = DOM.theme.htmlEl.classList.contains('light');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        DOM.theme.sunIcon.classList.toggle('hidden', isLight);
        DOM.theme.moonIcon.classList.toggle('hidden', !isLight);
    }
    
    function cambiarTemaColor(e) {
        const tema = e.target.dataset.theme;
        DOM.theme.htmlEl.setAttribute('data-theme', tema);
        localStorage.setItem('colorTheme', tema);
    }

    function cargarProgreso() {
        const nivelGuardado = localStorage.getItem('sopaDeLetrasNivel');
        estadoJuego.nivel = nivelGuardado ? parseInt(nivelGuardado, 10) : 1;
    }

    function guardarProgreso() {
        localStorage.setItem('sopaDeLetrasNivel', estadoJuego.nivel);
    }

    function subirDeNivel() {
        estadoJuego.nivel++;
        guardarProgreso();
    }

    function getConfiguracionActual() {
        const nivel = estadoJuego.nivel;
        if (nivel <= 3) return CONFIG_NIVEL[0];
        if (nivel <= 7) return CONFIG_NIVEL[1];
        if (nivel <= 12) return CONFIG_NIVEL[2];
        return CONFIG_NIVEL[3];
    }

    // --- 4. LÓGICA MULTIJUGADOR ---
    function mostrarSalaEspera(datos) {
        estadoJuego.codigoSala = datos.codigoSala || DOM.multiplayer.codigoSalaInput.value.toUpperCase();
        DOM.menu.classList.add('hidden');
        DOM.juego.classList.add('hidden');
        DOM.salaEspera.classList.remove('hidden');
        DOM.multiplayer.codigoSalaDisplay.textContent = estadoJuego.codigoSala;
        actualizarListaJugadores(datos.jugadores);
    }

    function actualizarListaJugadores(jugadores) {
        DOM.multiplayer.listaJugadores.innerHTML = '';
        jugadores.forEach(jugador => {
            const li = document.createElement('li');
            li.textContent = `${jugador.nombre} ${jugador.id === socket.id ? '(Tú)' : ''}`;
            li.className = "bg-slate-700 p-2 rounded-md";
            DOM.multiplayer.listaJugadores.appendChild(li);
        });
        const esAnfitrion = jugadores.length > 0 && jugadores[0].id === socket.id;
        DOM.multiplayer.empezarPartidaBtn.classList.toggle('hidden', !esAnfitrion);
        DOM.multiplayer.empezarPartidaBtn.disabled = jugadores.length < 2;
    }

    // --- 5. LÓGICA DEL JUEGO (MODOS, TIMER, FIN) ---
    function elegirModo(e) {
        resetEstadoJuego();
        cargarProgreso();
        estadoJuego.modo = e.target.dataset.modo;
        DOM.menu.classList.add('hidden');
        DOM.juego.classList.remove('hidden');
        iniciarJuegoSinglePlayer();
    }

    function iniciarTimer() {
        if (estadoJuego.modo !== 'contrarreloj') {
            DOM.temporizador.classList.add('hidden');
            return;
        }
        estadoJuego.tiempoRestante = 90;
        DOM.temporizador.classList.remove('hidden');
        estadoJuego.timerId = setInterval(() => {
            estadoJuego.tiempoRestante--;
            const min = Math.floor(estadoJuego.tiempoRestante / 60).toString().padStart(2, '0');
            const sec = (estadoJuego.tiempoRestante % 60).toString().padStart(2, '0');
            DOM.temporizador.textContent = `${min}:${sec}`;
            if (estadoJuego.tiempoRestante <= 0) finalizarPartida(false);
        }, 1000);
    }

    function detenerTimer() {
        clearInterval(estadoJuego.timerId);
    }

    function finalizarPartida(haGanado) {
        estadoJuego.activo = false;
        detenerTimer();
        DOM.modal.titulo.textContent = haGanado ? `¡Nivel ${estadoJuego.nivel} Superado!` : "¡Se acabó el tiempo!";
        DOM.modal.subtitulo.textContent = haGanado ? "¡Prepárate para el siguiente desafío!" : "¡Mejor suerte la próxima vez!";
        DOM.modal.puntuaciones.innerHTML = ''; // Limpiamos por si había puntuaciones de MP
        if (haGanado) subirDeNivel();
        DOM.modal.el.classList.remove('hidden');
    }

    // --- 6. ALGORITMO DE GENERACIÓN (PARA UN JUGADOR) ---
    function generarSopa(words, config) {
        const { gridSize, allowReverse } = config;
        let grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(''));
        let directions = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: -1 }];
        if (allowReverse) directions.push({ x: -1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: -1 }, { x: -1, y: 1 });
        words.forEach(word => {
            let placed = false;
            const positions = [];
            for (let y = 0; y < gridSize; y++) for (let x = 0; x < gridSize; x++) positions.push({ x, y });
            const shuffledPositions = positions.sort(() => 0.5 - Math.random());
            const shuffledDirections = directions.sort(() => 0.5 - Math.random());
            for (const pos of shuffledPositions) {
                for (const dir of shuffledDirections) {
                    if (canPlaceWord(word, pos.x, pos.y, dir, gridSize, grid)) {
                        placeWord(word, pos.x, pos.y, dir, gridSize, grid);
                        placed = true;
                        break;
                    }
                }
                if (placed) break;
            }
        });
        fillEmptySpaces(gridSize, grid);
        return grid;
    }

    function canPlaceWord(word, startX, startY, dir, gridSize, grid) { for (let i = 0; i < word.length; i++) { const x = startX + i * dir.x, y = startY + i * dir.y; if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return false; if (grid[y][x] !== '' && grid[y][x] !== word[i]) return false; } return true; }
    function placeWord(word, startX, startY, dir, gridSize, grid) { for (let i = 0; i < word.length; i++) { const x = startX + i * dir.x, y = startY + i * dir.y; grid[y][x] = word[i]; } }
    function fillEmptySpaces(gridSize, grid) { const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; for (let y = 0; y < gridSize; y++) { for (let x = 0; x < gridSize; x++) { if (grid[y][x] === '') { grid[y][x] = alphabet[Math.floor(Math.random() * alphabet.length)]; } } } }

    // --- 7. RENDERIZADO Y VISUALIZACIÓN ---
    function renderizarJuego(datosPartida) {
        const { grid, palabras, categoria, gridSize } = datosPartida;
        estadoJuego.grid = grid;
        estadoJuego.palabrasActuales = palabras;
        estadoJuego.palabrasEncontradas.clear();
        estadoJuego.activo = true;

        DOM.salaEspera.classList.add('hidden');
        DOM.juego.classList.remove('hidden');
        DOM.puntuaciones.el.classList.toggle('hidden', !estadoJuego.esMultijugador);

        DOM.tablero.innerHTML = '';
        DOM.listaPalabras.innerHTML = '';
        DOM.tablero.style.gridTemplateColumns = `repeat(${gridSize}, minmax(0, 1fr))`;
        
        estadoJuego.grid.forEach((row, y) => {
            row.forEach((letter, x) => {
                const cell = document.createElement('div');
                cell.textContent = letter;
                cell.className = 'celda w-8 h-8 flex items-center justify-center font-bold text-lg rounded-md select-none cursor-pointer';
                cell.style.animationDelay = `${y * 50 + x * 20}ms`;
                cell.dataset.x = x;
                cell.dataset.y = y;
                DOM.tablero.appendChild(cell);
            });
        });
        
        estadoJuego.palabrasActuales.forEach(word => {
            const wordEl = document.createElement('span');
            wordEl.textContent = word;
            wordEl.id = `palabra-${word}`;
            wordEl.className = 'text-slate-400 font-medium p-2';
            DOM.listaPalabras.appendChild(wordEl);
        });
        
        DOM.categoria.textContent = `Categoría: ${categoria}`;
        DOM.nivel.textContent = estadoJuego.esMultijugador ? 'Partida Online' : `Nivel ${estadoJuego.nivel}`;
    }
    
    function actualizarPuntuaciones(jugadores) {
        DOM.puntuaciones.lista.innerHTML = '';
        jugadores.sort((a, b) => b.puntuacion - a.puntuacion).forEach(jugador => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${jugador.nombre}:</span> <span class="font-bold">${jugador.puntuacion}</span>`;
            if (jugador.id === socket.id) li.classList.add('text-[var(--color-accent)]');
            DOM.puntuaciones.lista.appendChild(li);
        });
    }

    // --- 8. MANEJO DE INTERACCIÓN ---
    function handleSelectionEnd() {
        if (!estadoJuego.isSelecting) return;
        estadoJuego.isSelecting = false;
        const selectedWord = estadoJuego.selection.map(cell => cell.textContent).join('');
        const reversedSelectedWord = [...selectedWord].reverse().join('');
        const palabraCorrecta = estadoJuego.palabrasActuales.find(p => (p === selectedWord || p === reversedSelectedWord) && !estadoJuego.palabrasEncontradas.has(p));

        if (palabraCorrecta) {
            marcarPalabraComoEncontrada(palabraCorrecta, estadoJuego.selection);
        } else {
            estadoJuego.selection.forEach(cell => cell.classList.remove('seleccionada'));
        }
    }

    function marcarPalabraComoEncontrada(word, cells) {
        if (!estadoJuego.activo) return;
        
        if (estadoJuego.esMultijugador) {
            socket.emit('palabraEncontrada', { codigoSala: estadoJuego.codigoSala, palabra: word });
        } else {
            estadoJuego.palabrasEncontradas.add(word);
            cells.forEach(cell => cell.classList.add('encontrada'));
            document.getElementById(`palabra-${word}`).classList.add('palabra-encontrada');
            confetti({ particleCount: 50, spread: 70, origin: { x: 0.5, y: 0.7 } });
            if (estadoJuego.palabrasEncontradas.size === estadoJuego.palabrasActuales.length) {
                finalizarPartida(true);
            }
        }
    }
    
    function handleSelectionStart(e) { if (!estadoJuego.activo || !e.target.classList.contains('celda')) return; estadoJuego.isSelecting = true; estadoJuego.selection = [e.target]; e.target.classList.add('seleccionada'); }
    function handleSelectionMove(e) { if (!estadoJuego.isSelecting || !e.target.classList.contains('celda')) return; if (!estadoJuego.selection.includes(e.target)) { estadoJuego.selection.push(e.target); e.target.classList.add('seleccionada'); } }
    function handleTouchStart(e) { e.preventDefault(); const touch = e.touches[0]; const target = document.elementFromPoint(touch.clientX, touch.clientY); if (target && target.classList.contains('celda')) { handleSelectionStart({ target }); } }
    function handleTouchMove(e) { e.preventDefault(); const touch = e.touches[0]; const target = document.elementFromPoint(touch.clientX, touch.clientY); if (target && target.classList.contains('celda')) { handleSelectionMove({ target }); } }
    function handleTouchEnd(e) { handleSelectionEnd(); }

    // --- 9. INICIALIZACIÓN DE PARTIDAS ---
    function iniciarJuegoSinglePlayer() {
        resetEstadoJuego();
        cargarProgreso();
        const config = getConfiguracionActual();
        const nombresDeCategorias = Object.keys(CATEGORIAS);
        const categoriaJuego = nombresDeCategorias[Math.floor(Math.random() * nombresDeCategorias.length)];
        const palabras = CATEGORIAS[categoriaJuego].sort(() => 0.5 - Math.random()).slice(0, config.wordCount);
        const grid = generarSopa(palabras, config);
        renderizarJuego({ grid, palabras, categoria: categoriaJuego, gridSize: config.gridSize });
        iniciarTimer();
    }
    
    // --- 10. ASIGNACIÓN DE EVENTOS ---
    DOM.theme.toggleBtn.addEventListener('click', toggleTheme);
    DOM.theme.colorBtns.forEach(btn => btn.addEventListener('click', cambiarTemaColor));
    DOM.botonesModo.forEach(btn => btn.addEventListener('click', elegirModo));
    DOM.multiplayer.crearSalaBtn.addEventListener('click', () => socket.emit('crearSala'));
    DOM.multiplayer.unirseSalaBtn.addEventListener('click', () => { const codigo = DOM.multiplayer.codigoSalaInput.value.trim().toUpperCase(); if (codigo) socket.emit('unirseSala', codigo); });
    DOM.multiplayer.empezarPartidaBtn.addEventListener('click', () => socket.emit('empezarPartida', estadoJuego.codigoSala));
    DOM.modal.boton.addEventListener('click', () => { DOM.modal.el.classList.add('hidden'); DOM.menu.classList.remove('hidden'); DOM.juego.classList.add('hidden'); DOM.salaEspera.classList.add('hidden'); });
    
    DOM.tablero.addEventListener('mousedown', handleSelectionStart);
    DOM.tablero.addEventListener('mouseover', handleSelectionMove);
    document.addEventListener('mouseup', handleSelectionEnd);
    DOM.tablero.addEventListener('touchstart', handleTouchStart, { passive: false });
    DOM.tablero.addEventListener('touchmove', handleTouchMove, { passive: false });
    DOM.tablero.addEventListener('touchend', handleTouchEnd);

    // --- 11. SOCKET.IO LISTENERS ---
    socket.on('salaCreada', (datos) => { resetEstadoJuego(); estadoJuego.esMultijugador = true; mostrarSalaEspera(datos); });
    socket.on('actualizarSala', (datos) => { actualizarListaJugadores(datos.jugadores); });
    socket.on('errorSala', (mensaje) => { alert(mensaje); });
    socket.on('partidaIniciada', (datosPartida) => { renderizarJuego({ ...datosPartida, esMultijugador: true }); });
    socket.on('actualizarPuntuaciones', (jugadores) => { actualizarPuntuaciones(jugadores); });
    socket.on('oponenteEncontroPalabra', ({palabra, jugadorId}) => {
        if (socket.id !== jugadorId) {
            document.getElementById(`palabra-${palabra}`).classList.add('palabra-oponente');
        }
    });
    socket.on('partidaTerminada', (jugadores) => {
        estadoJuego.activo = false;
        DOM.modal.titulo.textContent = "¡Partida Terminada!";
        DOM.modal.subtitulo.textContent = `${jugadores[0].nombre} es el ganador!`;
        DOM.modal.puntuaciones.innerHTML = '';
        jugadores.forEach((jugador, index) => {
            const p = document.createElement('p');
            p.innerHTML = `${index + 1}. ${jugador.nombre}: <span class="font-bold">${jugador.puntuacion}</span>`;
            if (jugador.id === socket.id) p.classList.add('text-[var(--color-accent)]');
            DOM.modal.puntuaciones.appendChild(p);
        });
        DOM.modal.el.classList.remove('hidden');
    });

    // --- CARGA INICIAL ---
    cargarTema();
});
