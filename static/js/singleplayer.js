class SinglePlayerGame {
    constructor() {
        this.gridWidth = 8;
        this.gridHeight = 12;
        this.cellSize = 50;
        this.colors = ['red', 'blue', 'green', 'yellow', 'purple'];
        
        this.playerField = [];
        this.currentChain = [];
        this.currentColor = null;
        this.score = 0;
        this.jugglerPosition = 3;
        this.gameOver = false;
        
        // Timer para nueva fila - Sistema mejorado
        this.rowTimer = null;
        this.baseRowInterval = 10000; // 10 segundos iniciales
        this.currentRowInterval = this.baseRowInterval;
        this.minRowInterval = 4000; // Mínimo 4 segundos
        this.intervalDecrease = 500; // Reduce 0.5 segundos cada nueva fila
        this.warningTime = 2000; // 2 segundos de advertencia
        
        this.isWarningActive = false;
        
        this.init();
    }
    
    init() {
        this.createGameBoard();
        this.initializeField();
        this.setupControls();
        this.startRowTimer();
        this.gameLoop();
        
        document.getElementById('restart').addEventListener('click', () => {
            this.restartGame();
        });
    }
    
    createGameBoard() {
        const gameBoard = document.getElementById('game-board');
        gameBoard.innerHTML = '';
        
        gameBoard.style.display = 'grid';
        gameBoard.style.gridTemplateColumns = `repeat(${this.gridWidth}, ${this.cellSize}px)`;
        gameBoard.style.gridTemplateRows = `repeat(${this.gridHeight}, ${this.cellSize}px)`;
        gameBoard.style.gap = '2px';
        gameBoard.style.width = 'fit-content';
        gameBoard.style.margin = '0 auto';
        gameBoard.style.position = 'relative';
        gameBoard.style.background = 'rgba(0,0,0,0.3)';
        gameBoard.style.padding = '10px';
        gameBoard.style.borderRadius = '10px';
        
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell empty';
                cell.dataset.col = col;
                cell.dataset.row = row;
                cell.style.width = `${this.cellSize}px`;
                cell.style.height = `${this.cellSize}px`;
                cell.style.transition = 'all 0.3s ease';
                gameBoard.appendChild(cell);
            }
        }
        
        this.createJuggler();
    }
    
    createJuggler() {
        const gameBoard = document.getElementById('game-board');
        
        const existingJuggler = document.getElementById('juggler');
        if (existingJuggler) {
            existingJuggler.remove();
        }
        
        const juggler = document.createElement('div');
        juggler.id = 'juggler';
        juggler.className = 'juggler';
        juggler.style.position = 'absolute';
        juggler.style.bottom = '-60px';
        juggler.style.width = `${this.cellSize}px`;
        juggler.style.height = `${this.cellSize}px`;
        juggler.style.transition = 'left 0.1s ease, background-color 0.2s ease';
        
        gameBoard.appendChild(juggler);
        this.updateJugglerPosition();
        this.updateJugglerColor();
    }
    
    updateJugglerPosition() {
        const juggler = document.getElementById('juggler');
        if (!juggler) return;
        
        const gameBoard = document.getElementById('game-board');
        const gameBoardRect = gameBoard.getBoundingClientRect();
        
        const cellWidth = this.cellSize + 2;
        const leftPosition = (this.jugglerPosition * cellWidth) + gameBoardRect.left - juggler.parentElement.getBoundingClientRect().left;
        
        juggler.style.left = `${leftPosition}px`;
    }
    
    updateJugglerColor() {
        const juggler = document.getElementById('juggler');
        if (!juggler) return;
        
        if (this.currentColor) {
            juggler.style.background = this.getColorValue(this.currentColor);
            juggler.innerHTML = '●';
            juggler.style.color = 'white';
            juggler.style.fontSize = '24px';
            juggler.style.display = 'flex';
            juggler.style.alignItems = 'center';
            juggler.style.justifyContent = 'center';
        } else {
            juggler.style.background = '#ffd700';
            juggler.innerHTML = '👨';
            juggler.style.fontSize = '20px';
        }
    }
    
    getColorValue(color) {
        const colorMap = {
            'red': '#ff6b6b',
            'blue': '#4ecdc4',
            'green': '#1dd1a1',
            'yellow': '#f9ca24',
            'purple': '#a29bfe',
            'gray': '#636e72'
        };
        return colorMap[color] || '#ffd700';
    }
    
    initializeField() {
        this.playerField = Array.from({ length: this.gridWidth }, () => []);
        
        for (let col = 0; col < this.gridWidth; col++) {
            const numBalls = Math.floor(Math.random() * 2) + 3;
            for (let i = 0; i < numBalls; i++) {
                const color = this.getVerySmartColor(col, this.playerField[col]);
                this.playerField[col].unshift(color);
            }
        }
        
        this.updateDisplay();
    }
    
    getVerySmartColor(col, existingBalls) {
        // Sistema MUY inteligente para minimizar combos automáticos
        
        // 1. Verificar las últimas 2 bolas para evitar triples
        const lastTwoBalls = existingBalls.slice(-2);
        if (lastTwoBalls.length === 2 && lastTwoBalls[0] === lastTwoBalls[1]) {
            const avoidColor = lastTwoBalls[0];
            const availableColors = this.colors.filter(color => color !== avoidColor);
            return availableColors[Math.floor(Math.random() * availableColors.length)];
        }
        
        // 2. Verificar bolas adyacentes en columnas vecinas
        const adjacentColors = new Set();
        
        // Columna izquierda
        if (col > 0 && this.playerField[col - 1].length > 0) {
            const leftColor = this.playerField[col - 1][this.playerField[col - 1].length - 1];
            adjacentColors.add(leftColor);
        }
        
        // Columna derecha
        if (col < this.gridWidth - 1 && this.playerField[col + 1].length > 0) {
            const rightColor = this.playerField[col + 1][this.playerField[col + 1].length - 1];
            adjacentColors.add(rightColor);
        }
        
        // 3. Si hay colores adyacentes iguales, evitar ese color
        if (adjacentColors.size === 1) {
            const avoidColor = Array.from(adjacentColors)[0];
            const availableColors = this.colors.filter(color => color !== avoidColor);
            if (availableColors.length > 0) {
                return availableColors[Math.floor(Math.random() * availableColors.length)];
            }
        }
        
        // 4. Color aleatorio normal (con distribución uniforme)
        return this.colors[Math.floor(Math.random() * this.colors.length)];
    }
    
    startRowTimer() {
        if (this.rowTimer) {
            clearInterval(this.rowTimer);
        }
        
        const timerInterval = this.currentRowInterval - this.warningTime;
        console.log(`Nuevo intervalo de fila: ${this.currentRowInterval}ms`);
        
        this.rowTimer = setInterval(() => {
            this.startRowWarning();
        }, timerInterval);
    }
    
    startRowWarning() {
        if (this.gameOver) return;
        
        this.isWarningActive = true;
        this.animateRowWarning();
        
        // Después del tiempo de advertencia, añadir la nueva fila
        setTimeout(() => {
            if (!this.gameOver) {
                this.addNewRow();
                this.isWarningActive = false;
            }
        }, this.warningTime);
    }
    
    animateRowWarning() {
        const cells = document.querySelectorAll('#game-board .cell');
        let blinkCount = 0;
        const maxBlinks = 6;
        
        const blink = () => {
            if (blinkCount >= maxBlinks || !this.isWarningActive) return;
            
            cells.forEach(cell => {
                if (cell.classList.contains('empty')) {
                    if (blinkCount % 2 === 0) {
                        cell.style.background = 'rgba(255, 255, 0, 0.3)';
                        cell.style.transform = 'scale(1.1)';
                    } else {
                        cell.style.background = 'rgba(255, 255, 255, 0.1)';
                        cell.style.transform = 'scale(1)';
                    }
                } else {
                    // Animación de temblor para bolas existentes
                    if (blinkCount % 2 === 0) {
                        cell.style.transform = 'translateX(-2px) scale(1.05)';
                    } else {
                        cell.style.transform = 'translateX(2px) scale(1.05)';
                    }
                }
            });
            
            blinkCount++;
            setTimeout(blink, 200);
        };
        
        blink();
    }
    
    async addNewRow() {
        if (this.gameOver) return;
        
        console.log('¡Nueva fila añadida!');
        
        // Reducir el intervalo para la próxima fila (hasta el mínimo)
        this.currentRowInterval = Math.max(this.minRowInterval, this.currentRowInterval - this.intervalDecrease);
        console.log(`Próxima fila en: ${this.currentRowInterval}ms`);
        
        // Resetear transformaciones
        const cells = document.querySelectorAll('#game-board .cell');
        cells.forEach(cell => {
            cell.style.transform = 'scale(1)';
            cell.style.background = '';
        });
        
        // Añadir nueva fila con colores MUY inteligentes
        for (let col = 0; col < this.gridWidth; col++) {
            const color = this.getVerySmartColor(col, this.playerField[col]);
            this.playerField[col].unshift(color);
            
            if (this.playerField[col].length > this.gridHeight) {
                this.gameOver = true;
                clearInterval(this.rowTimer);
                alert(`¡Game Over! Una columna llegó al tope. Puntuación final: ${this.score}`);
                return;
            }
        }
        
        // Actualizar visualmente primero
        this.updateDisplay();
        
        // VERIFICAR COMBOS AUTOMÁTICAMENTE - SIEMPRE (100% de probabilidad)
        console.log("Verificando combos automáticos...");
        const hadCombos = await this.checkAndProcessMatches();
        if (hadCombos) {
            console.log("Combos automáticos procesados exitosamente");
        } else {
            console.log("No se encontraron combos automáticos");
        }
        
        // Reiniciar el timer con el nuevo intervalo
        this.startRowTimer();
        
        this.checkGameOver();
    }
    
    async checkAndProcessMatches() {
        let hasMatches = true;
        let totalCombos = 0;
        const maxCombos = 3; // Máximo 3 combos automáticos por fila
        
        while (hasMatches && totalCombos < maxCombos) {
            const matches = new Set();
            this.findAllMatches(matches);
            
            if (matches.size > 0) {
                console.log(`Combo automático #${totalCombos + 1} detectado (${matches.size} bolas)`);
                // Procesar los matches encontrados
                await this.processMatches(matches);
                totalCombos++;
                
                // Pequeña pausa entre combos
                await this.delay(200);
            } else {
                hasMatches = false;
            }
        }
        
        console.log(`Total de combos automáticos procesados: ${totalCombos}`);
        return totalCombos > 0;
    }
    
    async processMatches(matches) {
        if (matches.size === 0) return;
        
        console.log(`Procesando ${matches.size} bolas...`);
        
        // Mostrar visualmente las bolas que van a explotar
        this.highlightMatches(matches);
        await this.delay(100);
        
        // Animación de explosión
        await this.animateExplosion(matches);
        
        // Eliminar lógicamente y actualizar pantalla
        const matchesArray = Array.from(matches).map(str => {
            const [col, row] = str.split(',').map(Number);
            return { col, row };
        }).sort((a, b) => b.row - a.row);
        
        console.log(`Eliminando ${matchesArray.length} bolas del array lógico...`);
        
        // Eliminar del array lógico
        matchesArray.forEach(({ col, row }) => {
            if (this.playerField[col] && row < this.playerField[col].length) {
                this.playerField[col].splice(row, 1);
            }
        });
        
        // Actualizar puntuación (muy pocos puntos para combos automáticos)
        const comboScore = Math.floor(matchesArray.length * 2); // Solo 2 puntos por bola
        this.score += comboScore;
        
        console.log(`¡Combo automático! ${matchesArray.length} bolas - ${comboScore} puntos`);
        
        // Actualizar pantalla INMEDIATAMENTE
        this.updateField();
        
        // Pequeña pausa para mejor feedback visual
        await this.delay(150);
    }
    
    updateDisplay() {
        this.updateField();
        this.updateJugglerPosition();
        this.updateJugglerColor();
        this.updateUI();
    }
    
    updateField() {
        const cells = document.querySelectorAll('#game-board .cell:not(.juggler)');
        
        cells.forEach(cell => {
            const col = parseInt(cell.dataset.col);
            const row = parseInt(cell.dataset.row);
            
            if (col < this.playerField.length && row < this.playerField[col].length) {
                const color = this.playerField[col][row];
                cell.className = `cell ${color}`;
                cell.style.transform = 'scale(1)';
                cell.style.opacity = '1';
                cell.style.background = '';
                cell.style.boxShadow = '';
                cell.style.border = '';
            } else {
                cell.className = 'cell empty';
                cell.style.transform = 'scale(1)';
                cell.style.opacity = '1';
                cell.style.background = '';
                cell.style.boxShadow = '';
                cell.style.border = '';
            }
        });
    }
    
    updateUI() {
        const chainContainer = document.querySelector('.current-chain');
        if (chainContainer) {
            let chainDisplay = chainContainer.querySelector('#chain-display');
            if (!chainDisplay) {
                chainDisplay = document.createElement('div');
                chainDisplay.id = 'chain-display';
                chainDisplay.style.display = 'flex';
                chainDisplay.style.gap = '5px';
                chainDisplay.style.marginTop = '10px';
                chainDisplay.style.flexWrap = 'wrap';
                chainContainer.appendChild(chainDisplay);
            }
            
            chainDisplay.innerHTML = this.currentChain.map(color => 
                `<div class="chain-ball ${color}" style="width: 30px; height: 30px; border-radius: 50%; background: ${this.getColorValue(color)};"></div>`
            ).join('');
        }
        
        document.getElementById('score').textContent = `Puntuación: ${this.score}`;
        document.getElementById('chain').textContent = `Cadena: ${this.currentChain.length}`;
        
        // Mostrar también el tiempo hasta la siguiente fila
        const timeDisplay = document.getElementById('time-display') || (() => {
            const timeElement = document.createElement('div');
            timeElement.id = 'time-display';
            timeElement.style.marginTop = '10px';
            timeElement.style.fontWeight = 'bold';
            document.querySelector('.game-info').appendChild(timeElement);
            return timeElement;
        })();
        
        timeDisplay.textContent = `Siguiente fila en: ${(this.currentRowInterval / 1000).toFixed(1)}s`;
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (this.gameOver) return;
            
            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.moveJuggler(-1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.moveJuggler(1);
                    break;
                case ' ':
                    e.preventDefault();
                    this.pickBall();
                    break;
                case 'Enter':
                    e.preventDefault();
                    this.throwBalls();
                    break;
            }
        });
    }
    
    moveJuggler(direction) {
        const newPosition = this.jugglerPosition + direction;
        if (newPosition >= 0 && newPosition < this.gridWidth) {
            this.jugglerPosition = newPosition;
            this.updateJugglerPosition();
        }
    }
    
    pickBall() {
        const col = this.jugglerPosition;
        
        if (!this.playerField[col] || this.playerField[col].length === 0) {
            return;
        }
        
        const topBallIndex = this.playerField[col].length - 1;
        const ballColor = this.playerField[col][topBallIndex];
        
        if (this.currentColor === null) {
            this.currentColor = ballColor;
            const consecutiveBalls = this.getConsecutiveBalls(col);
            
            this.playerField[col].splice(this.playerField[col].length - consecutiveBalls, consecutiveBalls);
            
            for (let i = 0; i < consecutiveBalls; i++) {
                this.currentChain.push(ballColor);
            }
            
            console.log(`Recogidas ${consecutiveBalls} bolas ${ballColor} consecutivas`);
            
        } else if (this.currentColor === ballColor) {
            const consecutiveBalls = this.getConsecutiveBalls(col);
            
            this.playerField[col].splice(this.playerField[col].length - consecutiveBalls, consecutiveBalls);
            
            for (let i = 0; i < consecutiveBalls; i++) {
                this.currentChain.push(ballColor);
            }
            
            console.log(`Recogidas ${consecutiveBalls} bolas ${ballColor} adicionales`);
        } else {
            console.log(`No puedes recoger ${ballColor}, ya tienes ${this.currentColor}`);
            return;
        }
        
        this.updateDisplay();
    }
    
    getConsecutiveBalls(col) {
        if (!this.playerField[col] || this.playerField[col].length === 0) {
            return 0;
        }
        
        const targetColor = this.currentColor || this.playerField[col][this.playerField[col].length - 1];
        let count = 0;
        
        for (let i = this.playerField[col].length - 1; i >= 0; i--) {
            if (this.playerField[col][i] === targetColor) {
                count++;
            } else {
                break;
            }
        }
        
        return count;
    }
    
    async throwBalls() {
        if (this.currentChain.length === 0) return;
        
        const col = this.jugglerPosition;
        
        if (this.playerField[col].length + this.currentChain.length <= this.gridHeight) {
            for (let i = this.currentChain.length - 1; i >= 0; i--) {
                this.playerField[col].push(this.currentChain[i]);
            }
            
            this.currentChain = [];
            this.currentColor = null;
            
            await this.checkMatches();
            this.updateDisplay();
        } else {
            this.gameOver = true;
            clearInterval(this.rowTimer);
            alert(`¡Game Over! No hay espacio. Puntuación final: ${this.score}`);
        }
    }
    
    async checkMatches() {
        let matchesFound = true;
        let comboMultiplier = 1;
        
        while (matchesFound) {
            matchesFound = false;
            const matches = new Set();
            
            // Encontrar todos los matches
            this.findAllMatches(matches);
            
            if (matches.size > 0) {
                matchesFound = true;
                
                // Procesar los matches
                await this.processMatchesWithMultiplier(matches, comboMultiplier);
                comboMultiplier++;
            }
        }
        
        this.checkGameOver();
    }
    
    async processMatchesWithMultiplier(matches, comboMultiplier) {
        // Mostrar visualmente las bolas que van a explotar
        this.highlightMatches(matches);
        await this.delay(100);
        
        // Animación de explosión
        await this.animateExplosion(matches);
        
        // Eliminar lógicamente y actualizar pantalla
        const matchesArray = Array.from(matches).map(str => {
            const [col, row] = str.split(',').map(Number);
            return { col, row };
        }).sort((a, b) => b.row - a.row);
        
        // Eliminar del array lógico
        matchesArray.forEach(({ col, row }) => {
            if (this.playerField[col] && row < this.playerField[col].length) {
                this.playerField[col].splice(row, 1);
            }
        });
        
        // Actualizar puntuación con multiplicador (puntos completos para combos del jugador)
        const comboScore = matchesArray.length * 10 * comboMultiplier;
        this.score += comboScore;
        
        console.log(`¡Combo x${comboMultiplier}! ${matchesArray.length} bolas - ${comboScore} puntos`);
        
        // Actualizar pantalla INMEDIATAMENTE
        this.updateField();
        
        // Pequeña pausa entre combos para mejor feedback visual
        await this.delay(150);
    }
    
    highlightMatches(matches) {
        matches.forEach(cellKey => {
            const [col, row] = cellKey.split(',').map(Number);
            const cell = this.getCellElement(col, row);
            if (cell) {
                cell.style.border = '2px solid white';
                cell.style.boxShadow = '0 0 10px yellow';
            }
        });
    }
    
    async animateExplosion(matches) {
        return new Promise(resolve => {
            // Primera fase: escalar y cambiar color
            matches.forEach(cellKey => {
                const [col, row] = cellKey.split(',').map(Number);
                const cell = this.getCellElement(col, row);
                if (cell) {
                    cell.style.transform = 'scale(1.8)';
                    cell.style.opacity = '0.8';
                    cell.style.background = 'radial-gradient(circle, #ffff00, #ff4444)';
                }
            });
            
            setTimeout(() => {
                // Segunda fase: desaparecer
                matches.forEach(cellKey => {
                    const [col, row] = cellKey.split(',').map(Number);
                    const cell = this.getCellElement(col, row);
                    if (cell) {
                        cell.style.transform = 'scale(0)';
                        cell.style.opacity = '0';
                    }
                });
                
                setTimeout(resolve, 200);
            }, 200);
        });
    }
    
    findAllMatches(matches) {
        // Usar flood fill para encontrar grupos conectados (solo horizontal/vertical)
        const visited = new Set();
        
        for (let col = 0; col < this.gridWidth; col++) {
            for (let row = 0; row < this.playerField[col].length; row++) {
                const key = `${col},${row}`;
                if (!visited.has(key)) {
                    const color = this.playerField[col][row];
                    const group = this.findConnectedGroup(col, row, color, visited);
                    
                    if (group.size >= 3) {
                        console.log(`Grupo encontrado: ${group.size} bolas de color ${color}`);
                        // Añadir todo el grupo a matches
                        group.forEach(cellKey => {
                            matches.add(cellKey);
                            visited.add(cellKey);
                        });
                    }
                }
            }
        }
        
        console.log(`Total de matches encontrados: ${matches.size}`);
    }
    
    findConnectedGroup(col, row, targetColor, visited) {
        const group = new Set();
        const stack = [[col, row]];
        
        while (stack.length > 0) {
            const [currentCol, currentRow] = stack.pop();
            const key = `${currentCol},${currentRow}`;
            
            if (visited.has(key)) continue;
            if (currentCol < 0 || currentCol >= this.gridWidth) continue;
            if (currentRow < 0 || currentRow >= this.playerField[currentCol].length) continue;
            if (this.playerField[currentCol][currentRow] !== targetColor) continue;
            
            visited.add(key);
            group.add(key);
            
            // Solo direcciones horizontales y verticales (NO diagonales)
            stack.push([currentCol + 1, currentRow]); // Derecha
            stack.push([currentCol - 1, currentRow]); // Izquierda
            stack.push([currentCol, currentRow + 1]); // Arriba
            stack.push([currentCol, currentRow - 1]); // Abajo
        }
        
        return group;
    }
    
    getCellElement(col, row) {
        const cells = document.querySelectorAll('#game-board .cell');
        for (let cell of cells) {
            if (parseInt(cell.dataset.col) === col && parseInt(cell.dataset.row) === row) {
                return cell;
            }
        }
        return null;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    checkGameOver() {
        for (let col = 0; col < this.gridWidth; col++) {
            if (this.playerField[col].length >= this.gridHeight) {
                this.gameOver = true;
                clearInterval(this.rowTimer);
                alert(`¡Game Over! Columna ${col + 1} llegó al tope. Puntuación final: ${this.score}`);
                return true;
            }
        }
        return false;
    }
    
    restartGame() {
        if (this.rowTimer) {
            clearInterval(this.rowTimer);
        }
        
        this.score = 0;
        this.currentChain = [];
        this.currentColor = null;
        this.jugglerPosition = 3;
        this.gameOver = false;
        this.isWarningActive = false;
        this.currentRowInterval = this.baseRowInterval; // Resetear a 10 segundos
        
        this.initializeField();
        this.startRowTimer();
        this.updateDisplay();
    }
    
    gameLoop() {
        if (!this.gameOver) {
            this.updateUI(); // Actualizar el tiempo en pantalla
            requestAnimationFrame(() => this.gameLoop());
        }
    }
}

// Inicializar el juego cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    new SinglePlayerGame();
});