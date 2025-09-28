const express = require('express');
const socket = require('socket.io');
const http = require('http');
const { Chess } = require('chess.js');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const { log } = require('console');

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();

let players = {};
let currentPlayer = 'W';

// Session configuration
app.use(session({
    secret: 'mental-chessters-secret-key-2024',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Middleware
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Simple user store (in production, use a proper database)
const users = {
    'admin': { username: 'admin', password: 'password123' },
    'player1': { username: 'player1', password: 'chess123' },
    'guest': { username: 'guest', password: 'guest' }
};

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Routes
app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    if (req.session.user) {
        res.redirect('/game-mode');
    } else {
        res.render('login');
    }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    console.log('Login attempt:', { username, password });
    
    if (users[username] && users[username].password === password) {
        req.session.user = users[username];
        console.log('Login successful for:', username);
        res.redirect('/game-mode');
    } else {
        console.log('Login failed for:', username);
        res.render('login', { error: 'Invalid credentials. Try: admin/password123, player1/chess123, or guest/guest' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/game-mode', (req, res) => {
    res.render('game-mode', { user: req.session.user });
});

app.get('/game/online', requireAuth, (req, res) => {
    res.render('index', { user: req.session.user, mode: 'online' });
});

app.get('/game/offline', (req, res) => {
    res.render('offline', { user: req.session.user, mode: 'offline' });
});

// AI Chess Integration
app.get('/game/ai/:difficulty?', requireAuth, (req, res) => {
    const difficulty = req.params.difficulty || 'medium';
    res.render('ai-game', { 
        user: req.session.user, 
        mode: 'ai',
        difficulty: difficulty
    });
});

// Additional Game Features Routes
app.get('/tutorials', (req, res) => {
    res.render('tutorials', { 
        user: req.session.user,
        title: 'Chess Tutorials - Learn the Game'
    });
});

app.get('/puzzles', requireAuth, (req, res) => {
    res.render('puzzles', { 
        user: req.session.user,
        title: 'Daily Chess Puzzles'
    });
});

app.get('/analysis', requireAuth, (req, res) => {
    res.render('analysis', { 
        user: req.session.user,
        title: 'Game Analysis Tool'
    });
});

// Game Statistics API
app.get('/api/stats', (req, res) => {
    // Mock statistics - you can replace with real database queries
    const stats = {
        playersOnline: Math.floor(Math.random() * 50) + 10,
        gamesToday: Math.floor(Math.random() * 2000) + 800,
        totalGames: 25847,
        activeTournaments: 3
    };
    res.json(stats);
});

// AI Move Generation Endpoint
app.post('/api/ai-move', requireAuth, (req, res) => {
    const { fen, difficulty = 'medium' } = req.body;
    
    try {
        // Create temporary chess instance to validate position
        const tempChess = new Chess(fen);
        const possibleMoves = tempChess.moves();
        
        if (possibleMoves.length === 0) {
            return res.status(400).json({ error: 'No legal moves available' });
        }
        
        let aiMove;
        
        switch(difficulty.toLowerCase()) {
            case 'easy':
                // Random move for easy mode
                aiMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                break;
                
            case 'medium':
                // Simple evaluation for medium mode
                aiMove = getBestMove(tempChess, 1);
                break;
                
            case 'hard':
                // Deeper search for hard mode
                aiMove = getBestMove(tempChess, 2);
                break;
                
            case 'expert':
                // Even deeper search for expert mode
                aiMove = getBestMove(tempChess, 3);
                break;
                
            default:
                aiMove = getBestMove(tempChess, 1);
        }
        
        res.json({ 
            move: aiMove,
            difficulty: difficulty,
            evaluation: evaluatePosition(tempChess)
        });
        
    } catch (error) {
        console.error('AI move generation error:', error);
        res.status(500).json({ error: 'Failed to generate AI move' });
    }
});
 
// Socket.IO for online multiplayer
io.on('connection', (uniqueSocket) => {
    console.log('User connected:', uniqueSocket.id);

    if (!players.white) {
        players.white = uniqueSocket.id;
        uniqueSocket.emit('playerRole', 'W');
    } else if (!players.black) {
        players.black = uniqueSocket.id;
        uniqueSocket.emit('playerRole', 'b');
    } else {
        uniqueSocket.emit('spectatorRole');
    }

    uniqueSocket.on('disconnect', () => {
        console.log('User disconnected:', uniqueSocket.id);
        if (uniqueSocket.id === players.white) {
            delete players.white;
        } else if (uniqueSocket.id === players.black) {
            delete players.black;
        }
    });

    uniqueSocket.on('move', (move) => {
        try {
            if (chess.turn() === 'w' && uniqueSocket.id !== players.white) return;
            if (chess.turn() === 'b' && uniqueSocket.id !== players.black) return;

            const result = chess.move(move);
            if (result) {
                currentPlayer = chess.turn();
                io.emit('move', move);
                io.emit('boardState', chess.fen());
            } else {
                console.log('Invalid move attempted');
                uniqueSocket.emit('invalidMove', move);
            }
        } catch (err) {
            console.log('Move error:', err);
            uniqueSocket.emit('invalidMove', move);
        }
    });

});



// AI Chess Engine Functions
function evaluatePosition(chess) {
    const pieceValues = {
        'p': 10, 'n': 30, 'b': 30, 'r': 50, 'q': 90, 'k': 900
    };
    
    let score = 0;
    const board = chess.board();
    
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = board[i][j];
            if (piece) {
                const value = pieceValues[piece.type];
                const positionalValue = getPositionalValue(piece, i, j);
                
                if (piece.color === 'w') {
                    score += value + positionalValue;
                } else {
                    score -= value + positionalValue;
                }
            }
        }
    }
    
    return score;
}

function getPositionalValue(piece, row, col) {
    // Simple positional bonuses
    const centerControl = Math.abs(3.5 - row) + Math.abs(3.5 - col);
    let bonus = 0;
    
    switch(piece.type) {
        case 'p':
            // Pawns advance bonus
            bonus = piece.color === 'w' ? (7 - row) : row;
            break;
        case 'n':
        case 'b':
            // Knights and bishops prefer center
            bonus = 5 - centerControl;
            break;
        case 'q':
            // Queen mobility
            bonus = 2;
            break;
    }
    
    return bonus;
}

function getBestMove(chess, depth) {
    const moves = chess.moves();
    let bestMove = moves[0];
    let bestScore = chess.turn() === 'w' ? -Infinity : Infinity;
    
    for (const move of moves) {
        chess.move(move);
        const score = minimax(chess, depth - 1, !chess.turn() === 'w');
        chess.undo();
        
        if (chess.turn() === 'w') {
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        } else {
            if (score < bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
    }
    
    return bestMove;
}

function minimax(chess, depth, maximizingPlayer) {
    if (depth === 0 || chess.game_over()) {
        return evaluatePosition(chess);
    }
    
    const moves = chess.moves();
    
    if (maximizingPlayer) {
        let maxEval = -Infinity;
        for (const move of moves) {
            chess.move(move);
            const eval = minimax(chess, depth - 1, false);
            chess.undo();
            maxEval = Math.max(maxEval, eval);
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            chess.move(move);
            const eval = minimax(chess, depth - 1, true);
            chess.undo();
            minEval = Math.min(minEval, eval);
        }
        return minEval;
    }
}

server.listen(3001, () => {
    console.log('Mental Chessters server running on http://localhost:3001');
});




