require('dotenv').config();
console.log('CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);    
const express = require('express');
const socket = require('socket.io');
const http = require('http');
                    // ADD
const passport = require('./config/passport');     // ADD
const https = require('https');
const fs = require('fs');
const { Chess } = require('chess.js');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const { log } = require('console');
const mongoose = require('mongoose');
const User = require('./models/User');

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
app.use(passport.initialize());
app.use(passport.session());

// Middleware
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mentalchessters')
    .then(() => console.log('✅ Connected to MongoDB successfully'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session.user || req.isAuthenticated()) {
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

// Google OAuth routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Store Google user in session same format as your existing users
    req.session.user = {
      username: req.user.username,
      email:    req.user.email,
      photo:    req.user.photo,
      provider: 'google'
    };
    res.redirect('/game-mode');
  }
);

app.get('/signup', (req, res) => {
    if (req.session.user) {
        res.redirect('/game-mode');
    } else {
        res.render('signup');
    }
});

app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.render('signup', { error: 'Username is already taken' });
        }
        
        // Create new user
        const user = new User({ username, password });
        await user.save();
        
        // Log them in automatically
        req.session.user = { username: user.username, id: user._id };
        res.redirect('/game-mode');
    } catch (error) {
        console.error('Signup error:', error);
        res.render('signup', { error: 'Error creating account. Password might be too short.' });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log('Login attempt:', { username });
    
    try {
        // Allow fallback to guest for testing purposes if you want
        if (username === 'guest' && password === 'guest') {
            req.session.user = { username: 'guest' };
            return res.redirect('/game-mode');
        }

        const user = await User.findOne({ username });
        
        if (user && await user.comparePassword(password)) {
            req.session.user = { username: user.username, id: user._id };
            console.log('Login successful for:', username);
            res.redirect('/game-mode');
        } else {
            console.log('Login failed for:', username);
            res.render('login', { error: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { error: 'An error occurred during login' });
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
    const { command, fen } = req.body || {};

    // Basic input validation to avoid crashes
    if (!command || typeof command !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'No voice command text received from client',
            parsedCommand: command || null
        });
    }

    if (!fen || typeof fen !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'No valid FEN position received from client',
            parsedCommand: command,
            fen: fen || null
        });
    }

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
        let tempChess;
        try {
            tempChess = new Chess(fen);
        } catch (fenError) {
            console.error('Invalid FEN received in /api/voice-command:', fen, fenError);
            return res.status(400).json({
                success: false,
                error: 'Invalid board position (FEN) from client',
                parsedCommand: command,
                fen: fen
            });
        }

        let validMove;
        try {
            validMove = tempChess.move(move);
        } catch (moveError) {
            console.error('Error applying move in /api/voice-command:', move, moveError);
            validMove = null;
        }

        if (validMove) {
            return res.json({
                success: true,
                move: validMove,
                parsedCommand: command,
                chessNotation: move
            });
        } else {
            return res.json({
                success: false,
                error: `Invalid move: ${move}. Please try again.`,
                parsedCommand: command,
                chessNotation: move
            });
        }
    } catch (error) {
        console.error('Voice command processing error (unexpected):', error);
        // Return a graceful error instead of 500 so client can show a message
        return res.json({
            success: false,
            error: 'Failed to process voice command due to an internal error',
            parsedCommand: command
        });
    }
});

// AI Move Generation Endpoint
app.post('/api/ai-move', requireAuth, (req, res) => {
    const { fen, difficulty = 'medium' } = req.body || {};

    // Validate input early to avoid 500s from bad data
    if (!fen || typeof fen !== 'string') {
        return res.status(400).json({
            error: 'No valid FEN position received from client',
            fen: fen || null,
            difficulty
        });
    }

    try {
        // Create temporary chess instance to validate position
        let tempChess;
        try {
            tempChess = new Chess(fen);
        } catch (fenError) {
            console.error('Invalid FEN received in /api/ai-move:', fen, fenError);
            return res.status(400).json({
                error: 'Invalid board position (FEN) from client',
                fen,
                difficulty
            });
        }

        const possibleMoves = tempChess.moves();

        if (possibleMoves.length === 0) {
            return res.status(400).json({ error: 'No legal moves available', fen, difficulty });
        }

        let aiMove;

        try {
            switch(difficulty.toLowerCase()) {
                case 'easy':
                    // Random move for easy mode
                    aiMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                    break;

                case 'medium':
                    // Shallow search for medium mode
                    aiMove = getBestMove(tempChess, 2);
                    break;

                case 'hard':
                    // Deeper search for hard mode
                    aiMove = getBestMove(tempChess, 3);
                    break;

                case 'expert':
                    // Even deeper search for expert mode (may be slower but much stronger)
                    aiMove = getBestMove(tempChess, 4);
                    break;

                default:
                    aiMove = getBestMove(tempChess, 2);
            }
        } catch (aiError) {
            console.error('Error in getBestMove for /api/ai-move:', aiError);
            return res.status(500).json({ error: 'AI search failed internally' });
        }

        if (!aiMove) {
            console.error('AI returned no move for FEN:', fen, 'difficulty:', difficulty);
            return res.status(500).json({ error: 'AI failed to find a move' });
        }

        let evalScore;
        try {
            evalScore = evaluatePosition(tempChess);
        } catch (evalError) {
            console.error('Error in evaluatePosition for /api/ai-move:', evalError);
            evalScore = null;
        }

        return res.json({
            move: aiMove,
            difficulty,
            evaluation: evalScore
        });

    } catch (error) {
        console.error('AI move generation error (unexpected):', error);
        return res.status(500).json({ error: 'Failed to generate AI move due to an internal error' });
    }
});
 
// ─── Lichess Puzzle Proxy ───────────────────────────────────────────────────
// Uses native fetch (Node 18+). Falls back to a built-in puzzle if Lichess
// is unreachable so the page always works offline / in dev.
app.get('/api/puzzle/daily', async (req, res) => {
    const FALLBACK = {
        puzzle: {
            id: 'fallback',
            rating: 1350,
            themes: ['fork', 'middlegame'],
            initialFen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK02R w KQkq - 4 4',
            solution: ['e1g1', 'f6e4', 'd1e2', 'e4f2']
        }
    };

    try {
        if (typeof fetch === 'undefined') {
            console.warn('⚠️  Native fetch not available. Serving fallback puzzle.');
            return res.json(FALLBACK);
        }

        const response = await fetch('https://lichess.org/api/puzzle/next', {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(8000)
        });

        if (!response.ok) throw new Error('Lichess responded with ' + response.status);

        const data = await response.json();

        // ✅ Reconstruct initialFen from PGN + initialPly
        if (data.game?.pgn && data.puzzle?.initialPly !== undefined) {
            const { Chess } = require('chess.js');
            const tempGame = new Chess();

            // PGN from lichess looks like "e4 e5 Nf3 Nc6 ..." (no move numbers)
            const moves = data.game.pgn
                .split(' ')
                .filter(m => m && !m.match(/^\d+\./)); // remove "1." "2." etc
// ────────────────────────────────────────────────────────────────────────────

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
        'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000
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

    // Basic game state bonuses/penalties
    const isGameOver = (typeof chess.game_over === 'function' && chess.game_over()) ||
                       (typeof chess.gameOver === 'function' && chess.gameOver());

    const inCheckmate = (typeof chess.in_checkmate === 'function' && chess.in_checkmate()) ||
                        (typeof chess.inCheckmate === 'function' && chess.inCheckmate());

    if (isGameOver && inCheckmate) {
        // If it's white to move and checkmated, big negative; if black to move, big positive
        const MATE_SCORE = 100000; // large finite value (avoid Infinity which breaks JSON)
        return chess.turn() === 'w' ? -MATE_SCORE : MATE_SCORE;
    }

    const inCheck = (typeof chess.in_check === 'function' && chess.in_check()) ||
                    (typeof chess.inCheck === 'function' && chess.inCheck());

    if (inCheck) {
        // Being in check is mildly bad
        score += chess.turn() === 'w' ? -50 : 50;
    }

    const inDraw = (typeof chess.in_draw === 'function' && chess.in_draw()) ||
                   (typeof chess.inDraw === 'function' && chess.inDraw());
    const inStalemate = (typeof chess.in_stalemate === 'function' && chess.in_stalemate()) ||
                        (typeof chess.inStalemate === 'function' && chess.inStalemate());
    const inThreefold = (typeof chess.in_threefold_repetition === 'function' && chess.in_threefold_repetition()) ||
                        (typeof chess.inThreefoldRepetition === 'function' && chess.inThreefoldRepetition());

    if (inDraw || inStalemate || inThreefold) {
        // Neutral score for drawish positions
        return 0;
    }

    return score;
}

function getPositionalValue(piece, row, col) {
    // Simple positional bonuses (scaled to match new piece values)
    const centerControl = Math.abs(3.5 - row) + Math.abs(3.5 - col);
    let bonus = 0;

    switch(piece.type) {
        case 'p':
            // Pawns advance bonus (encourage pushing pawns, especially central ones)
            bonus = (piece.color === 'w' ? (7 - row) : row) * 5;
            break;
        case 'n':
        case 'b':
            // Knights and bishops prefer center
            bonus = (5 - centerControl) * 10;
            break;
        case 'q':
            // Queen slight mobility bonus
            bonus = 5;
            break;
        case 'r':
            // Rooks a little better on open files (approximate by centralization)
            bonus = (4 - Math.abs(3.5 - col)) * 5;
            break;
    }

    return bonus;
}

function getBestMove(chess, depth) {
    const moves = chess.moves();

    // If no legal moves, just return null and let caller handle game over
    if (moves.length === 0) {
        return null;
    }

    let bestMove = moves[0];
    let bestScore = chess.turn() === 'w' ? -Infinity : Infinity;

    for (const move of moves) {
        chess.move(move);
        // After making a move, it's the opponent's turn. We pass true if it's White to move.
        const score = minimax(chess, depth - 1, chess.turn() === 'w', -Infinity, Infinity);
        chess.undo();

        if (chess.turn() === 'w') {
            // We are choosing a move for White: maximize score
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        } else {
            // We are choosing a move for Black: minimize score
            if (score < bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
    }

    return bestMove;
}

// Minimax with alpha-beta pruning + simple quiescence search
function minimax(chess, depth, maximizingPlayer, alpha, beta) {
    const isGameOver = (typeof chess.game_over === 'function' && chess.game_over()) ||
                       (typeof chess.gameOver === 'function' && chess.gameOver());

    if (depth === 0 || isGameOver) {
        // When depth is reached, do a small quiescence search on captures
        return quiescence(chess, alpha, beta, maximizingPlayer);
    }

    const moves = chess.moves();

    if (maximizingPlayer) {
        let maxEval = -Infinity;
        for (const move of moves) {
            chess.move(move);
            const Eval = minimax(chess, depth - 1, false, alpha, beta);
            chess.undo();
            maxEval = Math.max(maxEval, Eval);
            alpha = Math.max(alpha, Eval);
            if (beta <= alpha) {
                break; // beta cut-off
            }
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            chess.move(move);
            const Eval = minimax(chess, depth - 1, true, alpha, beta);
            chess.undo();
            minEval = Math.min(minEval, Eval);
            beta = Math.min(beta, Eval);
            if (beta <= alpha) {
                break; // alpha cut-off
            }
        }
        return minEval;
    }
}

// Quiescence search: extend search a bit in "noisy" positions (captures)
function quiescence(chess, alpha, beta, maximizingPlayer) {
    let standPat = evaluatePosition(chess);

    if (maximizingPlayer) {
        if (standPat >= beta) {
            return standPat;
        }
        if (standPat > alpha) {
            alpha = standPat;
        }
    } else {
        if (standPat <= alpha) {
            return standPat;
        }
        if (standPat < beta) {
            beta = standPat;
        }
    }

    // Only consider capture moves to stabilize evaluation
    const captureMoves = chess.moves({ verbose: true }).filter(m => m.captured);

    if (maximizingPlayer) {
        let maxEval = standPat;
        for (const move of captureMoves) {
            chess.move(move);
            const Eval = quiescence(chess, alpha, beta, false);
            chess.undo();

            maxEval = Math.max(maxEval, Eval);
            alpha = Math.max(alpha, Eval);
            if (beta <= alpha) {
                break;
            }
        }
        return maxEval;
    } else {
        let minEval = standPat;
        for (const move of captureMoves) {
            chess.move(move);
            const Eval = quiescence(chess, alpha, beta, true);
            chess.undo();

            minEval = Math.min(minEval, Eval);
            beta = Math.min(beta, Eval);
            if (beta <= alpha) {
                break;
            }
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




