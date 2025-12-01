class VersusGame {
    constructor() {
        this.socket = null;
        this.gameId = null;
        this.playerId = this.generateId();
        this.playerName = '';
        this.currentGameState = null;
        
        this.setupEventListeners();
    }
    
    generateId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }
    
    setupEventListeners() {
        document.getElementById('join-game').addEventListener('click', () => {
            this.joinGame();
        });
        
        document.getElementById('create-game').addEventListener('click', () => {
            this.createGame();
        });
        
        // Controles del juego
        document.addEventListener('keydown', (e) => {
            if (!this.socket || !this.currentGameState) return;
            
            switch(e.key) {
                case 'ArrowLeft':
                    this.move(-1);
                    break;
                case 'ArrowRight':
                    this.move(1);
                    break;
                case ' ':
                    this.pickBall();
                    break;
                case 'Enter':
                    this.throwBalls();
                    break;
            }
        });
    }
    
    joinGame() {
        this.playerName = document.getElementById('player-name').value || 'Player';
        this.gameId = document.getElementById('game-id').value || 'default_room';
        
        if (!this.playerName.trim()) {
            alert('Por favor ingresa tu nombre');
            return;
        }
        
        this.connectWebSocket();
    }
    
    createGame() {
        this.playerName = document.getElementById('player-name').value || 'Player';
        this.gameId = 'room_' + Math.random().toString(36).substr(2, 9);
        document.getElementById('game-id').value = this.gameId;
        
        if (!this.playerName.trim()) {
            alert('Por favor ingresa tu nombre');
            return;
        }
        
        this.connectWebSocket();
    }
    
    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/${this.gameId}/${this.playerId}`;
        
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
            console.log('Conectado al servidor');
            this.socket.send(JSON.stringify({
                type: 'join_game',
                player_name: this.playerName
            }));
            
            document.querySelector('.player-setup').style.display = 'none';
            document.querySelector('.game-area').style.display = 'block';
        };
        
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'game_state') {
                this.currentGameState = data.data;
                this.updateGameDisplay();
            }
        };
        
        this.socket.onclose = () => {
            console.log('Conexión cerrada');
        };
        
        this.socket.onerror = (error) => {
            console.error('Error WebSocket:', error);
            alert('Error al conectar con el servidor');
        };
    }
    
    move(direction) {
        if (this.socket) {
            this.socket.send(JSON.stringify({
                type: 'move',
                direction: direction
            }));
        }
    }
    
    pickBall() {
        if (this.socket && this.currentGameState) {
            // En una implementación real, necesitarías trackear la posición del jugador
            const playerState = this.currentGameState.players[this.playerId];
            if (playerState && !playerState.game_over) {
                this.socket.send(JSON.stringify({
                    type: 'pick_ball',
                    column: this.getCurrentColumn() // Necesitarías implementar esto
                }));
            }
        }
    }
    
    throwBalls() {
        if (this.socket && this.currentGameState) {
            const playerState = this.currentGameState.players[this.playerId];
            if (playerState && !playerState.game_over) {
                this.socket.send(JSON.stringify({
                    type: 'throw_balls',
                    column: this.getCurrentColumn() // Necesitarías implementar esto
                }));
            }
        }
    }
    
    getCurrentColumn() {
        // Implementación simplificada - en una versión real trackearías la posición
        return Math.floor(Math.random() * 8);
    }
    
    updateGameDisplay() {
        if (!this.currentGameState) return;
        
        const gameState = this.currentGameState;
        const playerState = gameState.players[this.playerId];
        const opponentId = Object.keys(gameState.players).find(id => id !== this.playerId);
        const opponentState = opponentId ? gameState.players[opponentId] : null;
        
        // Actualizar información de jugadores
        document.getElementById('current-player').textContent = 
            playerState ? `${playerState.name} (Tú)` : 'Esperando...';
        document.getElementById('opponent-player').textContent = 
            opponentState ? opponentState.name : 'Esperando oponente...';
        
        // Actualizar campos de juego
        if (playerState) {
            this.renderField('player-field', playerState.field);
            this.updateChainDisplay(playerState.current_chain);
            document.getElementById('player1-info').innerHTML = `
                ${playerState.name}: ${playerState.score} pts
                ${playerState.game_over ? '💀 PERDEDOR' : '✅ ACTIVO'}
            `;
        }
        
        if (opponentState) {
            this.renderField('opponent-field', opponentState.field, true);
            document.getElementById('player2-info').innerHTML = `
                ${opponentState.name}: ${opponentState.score} pts
                ${opponentState.game_over ? '💀 PERDEDOR' : '✅ ACTIVO'}
            `;
        }
        
        // Actualizar estado del juego
        const statusElement = document.getElementById('game-status');
        if (gameState.state === 'waiting') {
            statusElement.textContent = 'Esperando a que se una otro jugador...';
            statusElement.style.color = '#f9ca24';
        } else if (gameState.state === 'playing') {
            statusElement.textContent = '¡Juego en progreso!';
            statusElement.style.color = '#1dd1a1';
            
            // Verificar si el juego terminó
            if (playerState && playerState.game_over) {
                statusElement.textContent = '¡Has perdido!';
                statusElement.style.color = '#ff6b6b';
            } else if (opponentState && opponentState.game_over) {
                statusElement.textContent = '¡Has ganado!';
                statusElement.style.color = '#1dd1a1';
            }
        }
    }
    
    renderField(containerId, field, isOpponent = false) {
        const container = document.getElementById(containerId);
        const gridWidth = 8;
        const gridHeight = 12;
        
        container.innerHTML = '';
        container.style.gridTemplateColumns = `repeat(${gridWidth}, 40px)`;
        
        // Renderizar de abajo hacia arriba
        for (let row = gridHeight - 1; row >= 0; row--) {
            for (let col = 0; col < gridWidth; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                
                if (field[col] && row < field[col].length) {
                    const color = field[col][row];
                    cell.className += ` ${color}`;
                } else {
                    cell.className += ' empty';
                }
                
                container.appendChild(cell);
            }
        }
        
        if (!isOpponent) {
            // Añadir jugador propio
            const juggler = document.createElement('div');
            juggler.className = 'juggler';
            container.appendChild(juggler);
        }
    }
    
    updateChainDisplay(chain) {
        const chainDisplay = document.getElementById('chain-display');
        if (chainDisplay && chain) {
            chainDisplay.innerHTML = chain.map(color => 
                `<div class="chain-ball ${color}"></div>`
            ).join('');
        }
    }
}

// Inicializar el juego cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    new VersusGame();
});