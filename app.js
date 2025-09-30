const express = require('express');
const socket = require('socket.io');
const http = require('http');
const https = require('https');
const fs = require('fs');
const { Chess } = require('chess.js');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const { log } = require('console');

const app = express();

// Try to load SSL certificates
let httpsOptions = null;
try {
    httpsOptions = {
        key: fs.readFileSync('server.key'),
        cert: fs.readFileSync('server.cert')
    };
    console.log('✅ SSL certificates found, HTTPS will be available');
} catch (error) {
    console.log('⚠️  SSL certificates not found, running HTTP only');
    console.log('   Run "node generate-cert.js" to create certificates for voice recognition');
}

// Create both HTTP and HTTPS servers
const httpServer = http.createServer(app);
const httpsServer = httpsOptions ? https.createServer(httpsOptions, app) : null;

// Use HTTPS server for Socket.IO if available, otherwise HTTP
const io = socket(httpsServer || httpServer);

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

// Voice Chess Integration
app.get('/game/voice/:difficulty?', requireAuth, (req, res) => {
    const difficulty = req.params.difficulty || 'medium';
    
    // Check if using HTTP and suggest HTTPS for better voice recognition
    const isHTTPS = req.secure || req.get('x-forwarded-proto') === 'https';
    
    res.render('voice-game', { 
        user: req.session.user, 
        mode: 'voice',
        difficulty: difficulty,
        isHTTPS: isHTTPS,
        httpsUrl: `https://${req.get('host').replace(':3001', ':3443')}${req.originalUrl}`
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

// Voice Command Processing Endpoint
app.post('/api/voice-command', requireAuth, (req, res) => {
    const { command, fen } = req.body;
    
    try {
        // Parse the voice command into chess notation
        const move = parseVoiceCommand(command.toLowerCase());
        
        if (!move) {
            return res.json({ 
                success: false, 
                error: 'Could not understand the command. Try saying something like "pawn to e4" or "knight to f3"',
                parsedCommand: command
            });
        }
        
        // Validate the move using chess.js
        const tempChess = new Chess(fen);
        const validMove = tempChess.move(move);
        
        if (validMove) {
            res.json({ 
                success: true, 
                move: validMove,
                parsedCommand: command,
                chessNotation: move
            });
        } else {
            res.json({ 
                success: false, 
                error: `Invalid move: ${move}. Please try again.`,
                parsedCommand: command,
                chessNotation: move
            });
        }
        
    } catch (error) {
        console.error('Voice command processing error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to process voice command',
            parsedCommand: command
        });
    }
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



// Voice Command Parsing Function
function parseVoiceCommand(command) {
    // Remove common filler words
    command = command.replace(/\b(to|the|a|an)\b/g, '').trim();
    
    // Define piece name mappings
    const pieceNames = {
        'pawn': 'P',
        'knight': 'N',
        'bishop': 'B',
        'rook': 'R',
        'queen': 'Q',
        'king': 'K',
        'castle': 'O-O' // Special case for castling
    };
    
    // Handle castling commands
    if (command.includes('castle') || command.includes('castling')) {
        if (command.includes('king') || command.includes('short')) {
            return 'O-O';
        } else if (command.includes('queen') || command.includes('long')) {
            return 'O-O-O';
        }
        return 'O-O'; // Default to kingside
    }
    
    // Handle special commands
    if (command.includes('resign') || command.includes('surrender')) {
        return null; // Handle resignation separately
    }
    
    // Try to extract square notation (like "e4", "nf3", "qh5")
    const squarePattern = /([a-h][1-8])/g;
    const squares = command.match(squarePattern);
    
    if (squares && squares.length >= 1) {
        let move = '';
        
        // Look for piece names in the command
        for (const [pieceName, pieceSymbol] of Object.entries(pieceNames)) {
            if (command.includes(pieceName)) {
                if (pieceSymbol !== 'P') { // Don't add P for pawns
                    move = pieceSymbol;
                }
                break;
            }
        }
        
        // If we have two squares, it's likely a from-to move
        if (squares.length >= 2) {
            return squares[0] + squares[1]; // e.g., "e2e4"
        } else {
            // Single square - piece to square (e.g., "Ne4", "e4")
            move += squares[0];
            return move;
        }
    }
    
    // Try to parse more natural language patterns
    const patterns = [
        // "pawn e4", "knight f3", etc.
        /([a-z]+)\s+([a-h][1-8])/,
        // "e2 to e4", "g1 to f3", etc.
        /([a-h][1-8])\s+([a-h][1-8])/,
        // Just a square like "e4"
        /^([a-h][1-8])$/
    ];
    
    for (const pattern of patterns) {
        const match = command.match(pattern);
        if (match) {
            if (match.length === 3) {
                const [, first, second] = match;
                
                // Check if first part is a piece name
                if (pieceNames[first]) {
                    const pieceSymbol = pieceNames[first];
                    return pieceSymbol === 'P' ? second : pieceSymbol + second;
                }
                
                // Check if it's two squares (from-to)
                if (/^[a-h][1-8]$/.test(first) && /^[a-h][1-8]$/.test(second)) {
                    return first + second;
                }
            } else if (match.length === 2) {
                // Just a square
                return match[1];
            }
        }
    }
    
    return null; // Could not parse the command
}

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
            const Eval = minimax(chess, depth - 1, false);
            chess.undo();
            maxEval = Math.max(maxEval, Eval);
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            chess.move(move);
            const Eval = minimax(chess, depth - 1, true);
            chess.undo();
            minEval = Math.min(minEval, Eval);
        }
        return minEval;
    }
}

// Start HTTP server
httpServer.listen(3001, () => {
    console.log('🌐 Mental Chessters HTTP server running on http://localhost:3001');
});

// Start HTTPS server if certificates are available
if (httpsServer) {
    httpsServer.listen(3443, () => {
        console.log('🔒 Mental Chessters HTTPS server running on https://localhost:3443');
        console.log('🎤 Use HTTPS URL for voice recognition to work properly!');
        console.log('🔗 Voice Chess URL: https://localhost:3443');
    });
} else {
    console.log('🚨 For voice recognition, generate SSL certificates with: node generate-cert.js');
    console.log('💡 Then restart the server to enable HTTPS');
}




