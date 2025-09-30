// Offline Chess Game Logic
let game = new Chess();
let selectedSquare = null;
let gameMode = 'ai'; // 'ai' or 'local'
let aiDifficulty = 2;
let isAiTurn = false;
let gameStats = {
    wins: parseInt(localStorage.getItem('chessWins')) || 0,
    losses: parseInt(localStorage.getItem('chessLosses')) || 0
};

// Chess piece Unicode symbols
const pieceSymbols = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

// Initialize the game
document.addEventListener('DOMContentLoaded', function() {
    initializeBoard();
    updateGameInfo();
    updateStats();
    newGame();
});

function initializeBoard() {
    const board = document.getElementById('chessboard');
    board.innerHTML = '';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.classList.add('square');
            square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
            square.dataset.row = row;
            square.dataset.col = col;
            square.dataset.square = String.fromCharCode(97 + col) + (8 - row);
            
            // Add coordinates
            if (col === 7) {
                const rankLabel = document.createElement('div');
                rankLabel.classList.add('coordinates', 'coord-rank');
                rankLabel.textContent = 8 - row;
                square.appendChild(rankLabel);
            }
            if (row === 7) {
                const fileLabel = document.createElement('div');
                fileLabel.classList.add('coordinates', 'coord-file');
                fileLabel.textContent = String.fromCharCode(97 + col);
                square.appendChild(fileLabel);
            }

            square.addEventListener('click', handleSquareClick);
            board.appendChild(square);
        }
    }
}

function updateBoard() {
    const board = game.board();
    const squares = document.querySelectorAll('.square');

    squares.forEach((square, index) => {
        const row = Math.floor(index / 8);
        const col = index % 8;
        const piece = board[row][col];
        
        // Clear previous piece
        const existingPiece = square.querySelector('.piece');
        if (existingPiece) {
            existingPiece.remove();
        }

        if (piece) {
            const pieceElement = document.createElement('div');
            pieceElement.classList.add('piece');
            pieceElement.classList.add(piece.color === 'w' ? 'white' : 'black');
            pieceElement.textContent = pieceSymbols[piece.type.toUpperCase()] || pieceSymbols[piece.type];
            pieceElement.dataset.piece = piece.type;
            pieceElement.dataset.color = piece.color;
            square.appendChild(pieceElement);
        }
    });
}

function handleSquareClick(event) {
    if (isAiTurn) return;

    const square = event.currentTarget;
    const squareNotation = square.dataset.square;

    // Clear previous highlights
    clearHighlights();

    if (selectedSquare === null) {
        // Select a piece
        const piece = square.querySelector('.piece');
        if (piece && piece.dataset.color === game.turn()) {
            selectedSquare = squareNotation;
            square.classList.add('selected');
            highlightPossibleMoves(squareNotation);
        }
    } else {
        if (selectedSquare === squareNotation) {
            // Deselect
            selectedSquare = null;
        } else {
            // Attempt to make a move
            const move = {
                from: selectedSquare,
                to: squareNotation,
                promotion: 'q' // Always promote to queen for simplicity
            };

            if (game.move(move)) {
                updateBoard();
                updateGameInfo();
                checkGameEnd();
                
                if (gameMode === 'ai' && !game.game_over()) {
                    setTimeout(makeAiMove, 500);
                }
            }
            selectedSquare = null;
        }
    }
}

function highlightPossibleMoves(square) {
    const moves = game.moves({ square: square, verbose: true });
    moves.forEach(move => {
        const targetSquare = document.querySelector(`[data-square="${move.to}"]`);
        if (targetSquare) {
            targetSquare.classList.add('possible-move');
        }
    });
}

function clearHighlights() {
    document.querySelectorAll('.square').forEach(square => {
        square.classList.remove('selected', 'possible-move', 'highlight');
    });
}

function makeAiMove() {
    if (game.game_over()) return;

    isAiTurn = true;
    document.getElementById('aiThinking').style.display = 'block';
    updatePlayerIndicators();

    setTimeout(() => {
        const bestMove = getBestMove(game, aiDifficulty);
        if (bestMove) {
            game.move(bestMove);
            updateBoard();
            updateGameInfo();
            checkGameEnd();
        }
        
        document.getElementById('aiThinking').style.display = 'none';
        isAiTurn = false;
        updatePlayerIndicators();
    }, Math.random() * 1000 + 500); // Random delay for realism
}

function getBestMove(game, depth) {
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) return null;

    if (depth === 1 || Math.random() < 0.3) {
        // Random move for easier difficulties or some randomness
        return moves[Math.floor(Math.random() * moves.length)];
    }

    let bestMove = null;
    let bestValue = -Infinity;

    moves.forEach(move => {
        game.move(move);
        const value = -minimax(game, depth - 1, -Infinity, Infinity, false);
        game.undo();

        if (value > bestValue) {
            bestValue = value;
            bestMove = move;
        }
    });

    return bestMove;
}

function minimax(game, depth, alpha, beta, maximizing) {
    if (depth === 0 || game.game_over()) {
        return evaluatePosition(game);
    }

    const moves = game.moves({ verbose: true });
    
    if (maximizing) {
        let maxEval = -Infinity;
        for (let move of moves) {
            game.move(move);
            const Eval = minimax(game, depth - 1, alpha, beta, false);
            game.undo();
            maxEval = Math.max(maxEval, Eval);
            alpha = Math.max(alpha, Eval);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let move of moves) {
            game.move(move);
            const Eval = minimax(game, depth - 1, alpha, beta, true);
            game.undo();
            minEval = Math.min(minEval, Eval);
            beta = Math.min(beta, Eval);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function evaluatePosition(game) {
    if (game.in_checkmate()) {
        return game.turn() === 'w' ? -1000 : 1000;
    }
    if (game.in_draw()) {
        return 0;
    }

    const pieceValues = {
        'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0
    };

    let score = 0;
    const board = game.board();
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) {
                const value = pieceValues[piece.type];
                score += piece.color === 'w' ? value : -value;
            }
        }
    }

    return score;
}

function newGame() {
    game.reset();
    selectedSquare = null;
    isAiTurn = false;
    updateBoard();
    updateGameInfo();
    clearHighlights();
    document.getElementById('aiThinking').style.display = 'none';
    document.getElementById('moveHistory').innerHTML = '<p class="text-white opacity-60 text-center">Game started</p>';
}

function undoMove() {
    if (game.history().length > 0) {
        game.undo();
        if (gameMode === 'ai' && game.history().length > 0) {
            game.undo(); // Undo AI move too
        }
        updateBoard();
        updateGameInfo();
        clearHighlights();
        selectedSquare = null;
        isAiTurn = false;
        document.getElementById('aiThinking').style.display = 'none';
    }
}

function toggleGameMode() {
    gameMode = gameMode === 'ai' ? 'local' : 'ai';
    const modeText = document.getElementById('modeText');
    const gameModeBadge = document.getElementById('gameMode');
    const blackPlayerName = document.getElementById('blackPlayerName');
    
    if (gameMode === 'ai') {
        modeText.textContent = 'vs AI';
        gameModeBadge.textContent = 'vs AI';
        blackPlayerName.textContent = 'AI Opponent';
    } else {
        modeText.textContent = 'Local';
        gameModeBadge.textContent = 'Local 2P';
        blackPlayerName.textContent = 'Black Player';
    }
    
    newGame();
}

function changeDifficulty() {
    aiDifficulty = parseInt(document.getElementById('difficultySelect').value);
}

function updateGameInfo() {
    const turn = game.turn() === 'w' ? 'White' : 'Black';
    document.getElementById('currentTurn').textContent = turn + ' to move';
    document.getElementById('moveCount').textContent = Math.ceil(game.history().length / 2);
    
    updatePlayerIndicators();
    updateMoveHistory();
}

function updatePlayerIndicators() {
    const whitePlayer = document.getElementById('whitePlayer');
    const blackPlayer = document.getElementById('blackPlayer');
    
    whitePlayer.classList.remove('active');
    blackPlayer.classList.remove('active');
    
    if (!isAiTurn && game.turn() === 'w') {
        whitePlayer.classList.add('active');
    } else if ((isAiTurn && gameMode === 'ai') || (game.turn() === 'b' && gameMode === 'local')) {
        blackPlayer.classList.add('active');
    }
}

function updateMoveHistory() {
    const history = game.history();
    const moveHistory = document.getElementById('moveHistory');
    
    if (history.length === 0) {
        moveHistory.innerHTML = '<p class="text-white opacity-60 text-center">No moves yet</p>';
        return;
    }

    let historyHTML = '';
    for (let i = 0; i < history.length; i += 2) {
        const moveNumber = Math.floor(i / 2) + 1;
        const whiteMove = history[i];
        const blackMove = history[i + 1] || '';
        
        historyHTML += `
            <div class="flex justify-between text-white text-sm py-1">
                <span class="opacity-70">${moveNumber}.</span>
                <span>${whiteMove}</span>
                <span>${blackMove}</span>
            </div>
        `;
    }
    
    moveHistory.innerHTML = historyHTML;
    moveHistory.scrollTop = moveHistory.scrollHeight;
}

function checkGameEnd() {
    if (game.game_over()) {
        let status = '';
        let statusClass = 'text-yellow-400';
        
        if (game.in_checkmate()) {
            const winner = game.turn() === 'w' ? 'Black' : 'White';
            status = winner + ' wins by checkmate!';
            statusClass = winner === 'White' ? 'text-green-400' : 'text-red-400';
            
            // Update statistics
            if ((winner === 'White' && gameMode === 'ai') || 
                (winner === 'Black' && gameMode === 'local')) {
                gameStats.wins++;
                localStorage.setItem('chessWins', gameStats.wins);
            } else if (gameMode === 'ai') {
                gameStats.losses++;
                localStorage.setItem('chessLosses', gameStats.losses);
            }
            
            updateStats();
        } else if (game.in_draw()) {
            if (game.in_stalemate()) {
                status = 'Draw by stalemate';
            } else if (game.in_threefold_repetition()) {
                status = 'Draw by repetition';
            } else if (game.insufficient_material()) {
                status = 'Draw by insufficient material';
            } else {
                status = 'Draw by 50-move rule';
            }
        }
        
        const gameStatus = document.getElementById('gameStatus');
        gameStatus.textContent = status;
        gameStatus.className = 'font-semibold ' + statusClass;
        
        // Show game over message
        setTimeout(() => {
            alert(status + '\nClick "New Game" to play again!');
        }, 500);
    }
}

function updateStats() {
    document.getElementById('wins').textContent = gameStats.wins;
    document.getElementById('losses').textContent = gameStats.losses;
}

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    switch(event.key) {
        case 'n':
        case 'N':
            if (event.ctrlKey) {
                event.preventDefault();
                newGame();
            }
            break;
        case 'z':
        case 'Z':
            if (event.ctrlKey) {
                event.preventDefault();
                undoMove();
            }
            break;
        case 'Escape':
            selectedSquare = null;
            clearHighlights();
            break;
    }
});

// Add some visual feedback for moves
function animateMove(fromSquare, toSquare) {
    const fromElement = document.querySelector(`[data-square="${fromSquare}"]`);
    const toElement = document.querySelector(`[data-square="${toSquare}"]`);
    
    if (fromElement && toElement) {
        fromElement.classList.add('highlight');
        toElement.classList.add('highlight');
        
        setTimeout(() => {
            fromElement.classList.remove('highlight');
            toElement.classList.remove('highlight');
        }, 1000);
    }
}