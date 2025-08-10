#  Sopa de letra 🧠

¡Bienvenido a Sopa de Letras! Un juego de sopa de letras moderno, interactivo y competitivo, desarrollado con un stack de tecnologías web en tiempo real. Este proyecto combina una experiencia de juego clásica con funcionalidades online, perfecto tanto para partidas casuales en solitario como para desafíos contra amigos.


---

## ✨ Características Principales

Este proyecto no es una simple sopa de letras. Incluye un conjunto completo de características diseñadas para una experiencia de usuario moderna y rejugable:

* **Modo Un Jugador:**
    * **Sistema de Niveles:** La dificultad aumenta progresivamente (tableros más grandes, más palabras, palabras en reverso) a medida que el jugador avanza.
    * **Modos de Juego:** Elige entre un relajante **Modo Zen** sin presión o un desafiante **Modo Contrarreloj**.
    * **Progreso Guardado:** El nivel del jugador se guarda en el navegador usando `localStorage`, permitiendo continuar la progresión en futuras sesiones.

* **Modo Multijugador Competitivo:**
    * **Salas Privadas:** Crea una sala de juego y comparte un código único para que tus amigos se unan.
    * **Competición en Tiempo Real:** Todos los jugadores en una sala reciben el mismo tablero y compiten para encontrar las palabras primero.
    * **Tablero de Puntuaciones:** Un marcador en tiempo real muestra las puntuaciones de cada jugador, otorgando puntos por cada palabra encontrada y bonificaciones especiales.

* **Interfaz y Experiencia de Usuario:**
    * **Diseño Moderno y Minimalista:** Construido con **Tailwind CSS** para una apariencia limpia y profesional.
    * **Temas Personalizables:** Incluye un modo claro y oscuro, además de múltiples temas de color de acento para personalizar la interfaz.
    * **Animaciones y Efectos:** Transiciones fluidas, animaciones de entrada y efectos de confeti que hacen que la experiencia de juego sea satisfactoria y divertida.
    * **Soporte Táctil Completo:** Funciona perfectamente en dispositivos móviles, previniendo el scroll de la página durante la selección de palabras.

---

## 🛠️ Tecnologías Utilizadas

* **Frontend:**
    * **HTML5** y **CSS3** (con variables para tematización)
    * **JavaScript (ES6+)** para toda la lógica del cliente.
    * **Tailwind CSS (vía CDN)** para un diseño rápido y responsivo.
    * **Socket.IO Client** para la comunicación en tiempo real.
    * **canvas-confetti** para efectos visuales.

* **Backend:**
    * **Node.js** como entorno de ejecución.
    * **Express.js** para el servidor web.
    * **Socket.IO** para la gestión de websockets, salas y la lógica de la partida multijugador.

---

## ⚙️ Cómo Empezar

Para ejecutar este proyecto en tu máquina local, sigue estos sencillos pasos:

1.  **Clona el repositorio:**
    ```bash
    git clone https://github.com/laocorp/sopa-de-letras.git
    cd sopa-de-letras
    ```

2.  **Instala las dependencias del servidor:**
    ```bash
    npm install
    ```

3.  **Inicia el servidor:**
    ```bash
    npm start
    ```

4.  **¡A jugar!** Abre tu navegador y ve a `http://localhost:2409`.

---

## 📄 Créditos

Este proyecto fue desarrollado con ❤️ por **LAOCORP**.
