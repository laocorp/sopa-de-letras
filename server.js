// ---------------------------------------------------
// -- SERVIDOR PARA SOPA DE LETRAS (Node.js + Express + Socket.IO) --
// ---------------------------------------------------

const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 2409;

// Sirve los archivos estáticos del frontend desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// --- LÓGICA DEL JUEGO (VIVE EN EL SERVIDOR PARA MULTIJUGADOR) ---
const CATEGORIAS = {
    Paises: ["ECUADOR", "COLOMBIA", "ARGENTINA", "JAPON", "ITALIA", "CANADA", "EGIPTO", "SUECIA"],
    Animales: ["TIGRILLO", "CONDOR", "JAGUAR", "BALLENA", "TUCAN", "IGUANA", "DELFIN", "ARMADILLO"],
    "Cultura Pop": ["MATRIX", "AVATAR", "MARVEL", "PIXAR", "NINTENDO", "STARWARS", "POKEMON", "ZELDA"],
};
const CONFIG_BASE_MP = { gridSize: 12, wordCount: 8, allowReverse: true };

/**
 * Genera todos los datos necesarios para una nueva partida multijugador.
 * @returns {object} Objeto con el grid, palabras, categoría y tamaño.
 */
function generarDatosDePartida() {
    const config = CONFIG_BASE_MP;
    const nombresDeCategorias = Object.keys(CATEGORIAS);
    const categoria = nombresDeCategorias[Math.floor(Math.random() * nombresDeCategorias.length)];
    const palabras = CATEGORIAS[categoria].sort(() => 0.5 - Math.random()).slice(0, config.wordCount);
    const grid = generarSopa(palabras, config);
    return { grid, palabras, categoria, gridSize: config.gridSize };
}

/**
 * Algoritmo robusto para generar la sopa de letras.
 * @param {string[]} words - Array de palabras a colocar.
 * @param {object} config - Configuración de la partida (tamaño, etc.).
 * @returns {string[][]} El grid 2D con la sopa de letras generada.
 */
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

function canPlaceWord(word, startX, startY, dir, gridSize, grid) {
    for (let i = 0; i < word.length; i++) {
        const x = startX + i * dir.x, y = startY + i * dir.y;
        if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return false;
        if (grid[y][x] !== '' && grid[y][x] !== word[i]) return false;
    }
    return true;
}

function placeWord(word, startX, startY, dir, gridSize, grid) {
    for (let i = 0; i < word.length; i++) {
        const x = startX + i * dir.x, y = startY + i * dir.y;
        grid[y][x] = word[i];
    }
}

function fillEmptySpaces(gridSize, grid) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (grid[y][x] === '') {
                grid[y][x] = alphabet[Math.floor(Math.random() * alphabet.length)];
            }
        }
    }
}

// --- LÓGICA DE SALAS Y PARTIDAS ---
const salas = {};

io.on('connection', (socket) => {
    console.log(`✅ Jugador conectado: ${socket.id}`);

    socket.on('crearSala', () => {
        const codigoSala = Math.random().toString(36).substring(2, 7).toUpperCase();
        socket.join(codigoSala);
        salas[codigoSala] = {
            jugadores: [{ id: socket.id, nombre: `Anfitrión`, puntuacion: 0 }],
            partidaIniciada: false,
            palabrasEncontradas: new Set()
        };
        socket.emit('salaCreada', { codigoSala, jugadores: salas[codigoSala].jugadores });
    });

    socket.on('unirseSala', (codigoSala) => {
        const sala = salas[codigoSala];
        if (sala && !sala.partidaIniciada) {
            if (sala.jugadores.length < 4) {
                socket.join(codigoSala);
                const nuevoJugador = { id: socket.id, nombre: `Jugador ${sala.jugadores.length + 1}`, puntuacion: 0 };
                sala.jugadores.push(nuevoJugador);
                io.to(codigoSala).emit('actualizarSala', { jugadores: sala.jugadores });
            } else { socket.emit('errorSala', 'La sala está llena.'); }
        } else { socket.emit('errorSala', 'La sala no existe o la partida ya empezó.'); }
    });

    socket.on('empezarPartida', (codigoSala) => {
        const sala = salas[codigoSala];
        if (sala && sala.jugadores[0].id === socket.id && !sala.partidaIniciada) {
            sala.partidaIniciada = true;
            const datosPartida = generarDatosDePartida();
            sala.datosPartida = datosPartida; // Guardamos los datos para la partida
            io.to(codigoSala).emit('partidaIniciada', datosPartida);
        }
    });

    socket.on('palabraEncontrada', ({ codigoSala, palabra }) => {
        const sala = salas[codigoSala];
        if (!sala || !sala.partidaIniciada) return;

        const jugador = sala.jugadores.find(j => j.id === socket.id);
        if (jugador && sala.datosPartida.palabras.includes(palabra) && !sala.palabrasEncontradas.has(palabra)) {
            
            jugador.puntuacion += 100; // Puntos base
            if (sala.palabrasEncontradas.size === 0) jugador.puntuacion += 50; // Bonus primera palabra
            
            sala.palabrasEncontradas.add(palabra);

            io.to(codigoSala).emit('actualizarPuntuaciones', sala.jugadores);
            io.to(codigoSala).emit('oponenteEncontroPalabra', {palabra, jugadorId: socket.id});

            if (sala.palabrasEncontradas.size === sala.datosPartida.palabras.length) {
                jugador.puntuacion += 200; // Bonus por ganar
                io.to(codigoSala).emit('partidaTerminada', sala.jugadores.sort((a, b) => b.puntuacion - a.puntuacion));
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`❌ Jugador desconectado: ${socket.id}`);
        for (const codigoSala in salas) {
            const sala = salas[codigoSala];
            const indiceJugador = sala.jugadores.findIndex(j => j.id === socket.id);
            if (indiceJugador !== -1) {
                sala.jugadores.splice(indiceJugador, 1);
                if (sala.jugadores.length === 0) {
                    delete salas[codigoSala];
                } else {
                    io.to(codigoSala).emit('actualizarSala', { jugadores: sala.jugadores });
                }
                break;
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Servidor iniciado en http://localhost:${PORT}`);
});
