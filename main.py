from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import json
import asyncio
import random
from typing import Dict, List, Optional
import uuid

app = FastAPI(title="Magical Drop Clone")

# Montar archivos estáticos
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Estado del juego
class GameState:
    def __init__(self):
        self.players: Dict[str, Dict] = {}
        self.games: Dict[str, Dict] = {}
        self.connections: Dict[str, WebSocket] = {}

class Player:
    def __init__(self, player_id: str, name: str):
        self.id = player_id
        self.name = name
        self.score = 0
        self.field = [[] for _ in range(8)]  # 8 columnas
        self.current_chain = []
        self.game_over = False

class MagicalDropGame:
    def __init__(self, game_id: str):
        self.game_id = game_id
        self.players: Dict[str, Player] = {}
        self.state = "waiting"  # waiting, playing, finished
        self.colors = ['red', 'blue', 'green', 'yellow', 'purple']
        self.grid_width = 8
        self.grid_height = 12
    
    def add_player(self, player_id: str, player_name: str):
        if len(self.players) < 2:
            self.players[player_id] = Player(player_id, player_name)
            if len(self.players) == 2:
                self.state = "playing"
                self.initialize_game()
            return True
        return False
    
    def initialize_game(self):
        """Inicializa el campo de juego para ambos jugadores"""
        for player in self.players.values():
            player.field = self.generate_initial_field()
    
    def generate_initial_field(self):
        """Genera un campo inicial con fichas aleatorias"""
        field = [[] for _ in range(self.grid_width)]
        for col in range(self.grid_width):
            # Llenar cada columna con 6-8 fichas iniciales
            num_balls = random.randint(6, 8)
            for _ in range(num_balls):
                if len(field[col]) < self.grid_height:
                    field[col].append(random.choice(self.colors))
        return field
    
    def move_player(self, player_id: str, direction: str):
        """Mueve al jugador izquierda/derecha"""
        # Implementación simplificada - en el cliente se manejará la posición
        return True
    
    def pick_ball(self, player_id: str, column: int):
        """Recoge una ficha de una columna"""
        player = self.players.get(player_id)
        if not player or player.game_over:
            return False
        
        if 0 <= column < self.grid_width and player.field[column]:
            ball = player.field[column].pop()
            player.current_chain.append(ball)
            return True
        return False
    
    def throw_balls(self, player_id: str, column: int):
        """Lanza las fichas recolectadas a una columna"""
        player = self.players.get(player_id)
        if not player or player.game_over or not player.current_chain:
            return False
        
        if 0 <= column < self.grid_width:
            # Verificar que la columna no esté llena
            if len(player.field[column]) < self.grid_height:
                # Lanzar las fichas en orden inverso (última recogida primero)
                for ball in reversed(player.current_chain):
                    if len(player.field[column]) < self.grid_height:
                        player.field[column].append(ball)
                
                player.current_chain = []
                self.check_matches(player_id)
                return True
        return False
    
    def check_matches(self, player_id: str):
        """Verifica y elimina grupos de 3 o más fichas del mismo color"""
        player = self.players.get(player_id)
        if not player:
            return
        
        matches_found = True
        while matches_found:
            matches_found = False
            matches = []
            
            # Verificar matches horizontales
            for row in range(self.grid_height):
                for col in range(self.grid_width - 2):
                    if (col + 2 < self.grid_width and 
                        len(player.field[col]) > row and
                        len(player.field[col + 1]) > row and
                        len(player.field[col + 2]) > row):
                        
                        if (player.field[col][row] == player.field[col + 1][row] == 
                            player.field[col + 2][row]):
                            matches.append((col, row))
                            matches.append((col + 1, row))
                            matches.append((col + 2, row))
            
            # Verificar matches verticales
            for col in range(self.grid_width):
                for row in range(len(player.field[col]) - 2):
                    if (player.field[col][row] == player.field[col][row + 1] == 
                        player.field[col][row + 2]):
                        matches.append((col, row))
                        matches.append((col, row + 1))
                        matches.append((col, row + 2))
            
            # Eliminar matches únicos
            unique_matches = list(set(matches))
            if unique_matches:
                matches_found = True
                # Ordenar por fila descendente para eliminar de abajo hacia arriba
                unique_matches.sort(key=lambda x: x[1], reverse=True)
                
                for col, row in unique_matches:
                    if 0 <= col < self.grid_width and row < len(player.field[col]):
                        player.field[col].pop(row)
                        player.score += 10
                
                # Enviar garbage al oponente
                self.send_garbage(player_id, len(unique_matches) // 3)
    
    def send_garbage(self, from_player_id: str, amount: int):
        """Envía basura al oponente"""
        if amount <= 0:
            return
        
        for player_id, player in self.players.items():
            if player_id != from_player_id and not player.game_over:
                # Añadir filas de basura en la parte inferior
                for _ in range(amount):
                    garbage_col = random.randint(0, self.grid_width - 1)
                    if len(player.field[garbage_col]) < self.grid_height:
                        player.field[garbage_col].append('gray')
    
    def check_game_over(self, player_id: str):
        """Verifica si el juego ha terminado para un jugador"""
        player = self.players.get(player_id)
        if not player:
            return False
        
        # Verificar si alguna columna llegó al tope
        for col in player.field:
            if len(col) >= self.grid_height:
                player.game_over = True
                return True
        return False
    
    def get_game_state(self):
        """Obtiene el estado actual del juego para enviar a los clientes"""
        return {
            "state": self.state,
            "players": {
                player_id: {
                    "name": player.name,
                    "score": player.score,
                    "field": player.field,
                    "current_chain": player.current_chain,
                    "game_over": player.game_over
                }
                for player_id, player in self.players.items()
            }
        }

game_state = GameState()

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/singleplayer", response_class=HTMLResponse)
async def singleplayer(request: Request):
    return templates.TemplateResponse("singleplayer.html", {"request": request})

@app.get("/versus", response_class=HTMLResponse)
async def versus(request: Request):
    return templates.TemplateResponse("versus.html", {"request": request})

@app.websocket("/ws/{game_id}/{player_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str, player_id: str):
    await websocket.accept()
    
    if game_id not in game_state.games:
        game_state.games[game_id] = MagicalDropGame(game_id)
    
    game = game_state.games[game_id]
    game_state.connections[player_id] = websocket
    
    try:
        # Enviar estado inicial del juego
        await websocket.send_json({
            "type": "game_state",
            "data": game.get_game_state()
        })
        
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            if message_type == "join_game":
                player_name = data.get("player_name", "Player")
                game.add_player(player_id, player_name)
                
                # Notificar a todos los jugadores
                for pid, ws in game_state.connections.items():
                    if pid in game.players:
                        await ws.send_json({
                            "type": "game_state",
                            "data": game.get_game_state()
                        })
            
            elif message_type == "move":
                direction = data.get("direction")
                game.move_player(player_id, direction)
            
            elif message_type == "pick_ball":
                column = data.get("column")
                game.pick_ball(player_id, column)
            
            elif message_type == "throw_balls":
                column = data.get("column")
                game.throw_balls(player_id, column)
                game.check_game_over(player_id)
            
            # Enviar estado actualizado a todos los jugadores
            for pid, ws in game_state.connections.items():
                if pid in game.players:
                    await ws.send_json({
                        "type": "game_state",
                        "data": game.get_game_state()
                    })
                    
    except WebSocketDisconnect:
        del game_state.connections[player_id]
        if game_id in game_state.games:
            if player_id in game_state.games[game_id].players:
                del game_state.games[game_id].players[player_id]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)