const socket=io();
const chess= new  Chess();
const boardElement=document.getElementById("chessboard");

let draggedPiece=null;
let sourceSquare=null;
let playerRole=null;
let moveHistory = [];
let currentTurn = 'w';


const renderBoard=()=>{
    const board=chess.board();
    if (!boardElement) {
        console.error('Board element not found!');
        return;
    }
    boardElement.innerHTML="";
    
    board.forEach((row,rowindex)=>{
        row.forEach((square,squareindex)=>{
            const squareElement=document.createElement('div');
            squareElement.classList.add("square",
                (squareindex+rowindex)%2==0? "light" : "dark"
            );
            squareElement.dataset.row=rowindex;
            squareElement.dataset.col=squareindex;
            
            // Add coordinates
            if (rowindex === 7) {
                const fileLabel = document.createElement('div');
                fileLabel.classList.add('coordinates', 'coord-file');
                fileLabel.textContent = String.fromCharCode(97 + squareindex);
                squareElement.appendChild(fileLabel);
            }
            if (squareindex === 0) {
                const rankLabel = document.createElement('div');
                rankLabel.classList.add('coordinates', 'coord-rank');
                rankLabel.textContent = 8 - rowindex;
                squareElement.appendChild(rankLabel);
            }

            if(square){
                const pieceElement =document.createElement('div');
                pieceElement.classList.add('piece',square.color=='w'?'white':'black');
                pieceElement.innerText=getPieceUnicode(square);
                
                // Set draggable based on player role and piece color
                const isDraggable = (playerRole === 'W' && square.color === 'w') || 
                                   (playerRole === 'b' && square.color === 'b');
                pieceElement.draggable = isDraggable;
                
                if (isDraggable) {
                    pieceElement.classList.add('draggable');
                }
                
                // Single dragstart event listener
                pieceElement.addEventListener('dragstart', (e) => {
                    console.log('Dragstart event triggered', { draggable: pieceElement.draggable, playerRole, pieceColor: square.color });
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowindex, col: squareindex };
                        e.dataTransfer.setData('text/plain', "");
                        e.dataTransfer.effectAllowed = 'move';
                        pieceElement.classList.add('dragging');
                        document.body.style.cursor = 'grabbing';
                        console.log('Piece drag started successfully');
                    } else {
                        e.preventDefault();
                        console.log('Drag prevented - piece not draggable');
                    }
                });
                
                // Add dragend event listener
                pieceElement.addEventListener('dragend', (e) => {
                    pieceElement.classList.remove('dragging');
                    document.body.style.cursor = '';
                    draggedPiece = null;
                    sourceSquare = null;
                });
                
                squareElement.appendChild(pieceElement);
            }
            //
            squareElement.addEventListener('dragover',function(e){
                e.preventDefault();
            });
            squareElement.addEventListener('drop',function(e){
                e.preventDefault();
                console.log('Drop event triggered', { draggedPiece: !!draggedPiece, sourceSquare });
                if(draggedPiece && sourceSquare){
                    const targetSource={
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col),
                    };
                    console.log('Handling move from', sourceSquare, 'to', targetSource);
                    handleMove(sourceSquare,targetSource);
                    
                    // Reset drag state
                    draggedPiece.classList.remove('dragging');
                    document.body.style.cursor = '';
                    draggedPiece = null;
                    sourceSquare = null;
                } else {
                    console.log('Drop ignored - no dragged piece or source square');
                }
            });
            boardElement.appendChild(squareElement)
  
            
           
       
        });
    });
    if(playerRole =='b'){
        boardElement.classList.add('flipped');
    }else{
        boardElement.classList.remove('flipped');
    }
    

};

const handleMove=(source,target)=>{
    const move={
        from:`${String.fromCharCode(97+source.col)}${8-source.row}`,
        to:`${String.fromCharCode(97+target.col)}${8-target.row}`,
        promotion:'q'
    };
    
    socket.emit('move',move);
};

const getPieceUnicode=(piece)=>{
  const unicodePieces={ 
   k : "♔",
   q : "♕",
   r:  "♖",
   b : "♗",
   n : "♘",
   p : "♙",
   K : "♚",
   Q : "♛",
   R : "♜",
   B : "♝",
   N : "♞",
   P : "♟"
};

return unicodePieces[piece.type]||"";
};

// UI Update Functions
const updatePlayerIndicators = () => {
    const whitePlayer = document.getElementById('whitePlayer');
    const blackPlayer = document.getElementById('blackPlayer');
    const currentTurnElement = document.getElementById('currentTurn');
    
    // Remove active class from both
    whitePlayer.classList.remove('active');
    blackPlayer.classList.remove('active');
    
    // Add active class to current player
    if (currentTurn === 'w') {
        whitePlayer.classList.add('active');
        currentTurnElement.textContent = 'White to move';
    } else {
        blackPlayer.classList.add('active');
        currentTurnElement.textContent = 'Black to move';
    }
};

const updateMoveHistory = (move) => {
    moveHistory.push(move);
    const historyElement = document.getElementById('moveHistory');
    
    if (moveHistory.length === 1) {
        historyElement.innerHTML = '';
    }
    
    const moveElement = document.createElement('div');
    moveElement.className = 'text-white text-sm py-1 px-2 bg-white bg-opacity-10 rounded mb-1';
    const moveNumber = Math.ceil(moveHistory.length / 2);
    const isWhiteMove = moveHistory.length % 2 === 1;
    
    if (isWhiteMove) {
        moveElement.textContent = `${moveNumber}. ${move.from}-${move.to}`;
    } else {
        moveElement.textContent = `${moveNumber}... ${move.from}-${move.to}`;
    }
    
    historyElement.appendChild(moveElement);
    historyElement.scrollTop = historyElement.scrollHeight;
};

const updatePlayerRole = (role) => {
    const roleElement = document.getElementById('playerRole');
    if (role === 'W') {
        roleElement.textContent = 'White Player';
        roleElement.className = 'font-semibold text-white';
    } else if (role === 'b') {
        roleElement.textContent = 'Black Player';
        roleElement.className = 'font-semibold text-gray-300';
    } else {
        roleElement.textContent = 'Spectator';
        roleElement.className = 'font-semibold text-yellow-400';
    }
};

socket.on('playerRole',(role)=>{
    playerRole=role;
    updatePlayerRole(role);
    renderBoard();
    updatePlayerIndicators();
});

socket.on('spectatorRole',()=>{
    playerRole=null;
    updatePlayerRole(null);
    renderBoard();
});

socket.on('boardState',(fen)=>{
    chess.load(fen);
    currentTurn = chess.turn();
    renderBoard();
    updatePlayerIndicators();
});

socket.on('move',(move)=>{
    chess.move(move);
    currentTurn = chess.turn();
    updateMoveHistory(move);
    renderBoard();
    updatePlayerIndicators();
});


// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    renderBoard();
    updatePlayerIndicators();
});

// Also initialize immediately in case DOM is already loaded
if (document.readyState === 'loading') {
    // Loading hasn't finished yet
} else {
    // DOM is ready
    renderBoard();
    updatePlayerIndicators();
}

// Connection status
socket.on('connect', () => {
    document.getElementById('connectionStatus').textContent = 'Connected to server';
});

socket.on('disconnect', () => {
    document.getElementById('connectionStatus').textContent = 'Disconnected from server';
    document.getElementById('connectionStatus').parentElement.className = 
        'mt-6 p-3 bg-red-500 bg-opacity-20 rounded-lg';
    document.getElementById('connectionStatus').parentElement.firstElementChild.firstElementChild.className = 
        'w-2 h-2 bg-red-400 rounded-full mr-2';
});
