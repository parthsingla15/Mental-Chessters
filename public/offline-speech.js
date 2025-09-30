// Offline Speech Recognition Alternative
// This provides a fallback when the Web Speech API fails due to network issues

class OfflineSpeechRecognition {
    constructor() {
        this.isListening = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.onresult = null;
        this.onerror = null;
        this.onstart = null;
        this.onend = null;
        
        // Chess move patterns for offline recognition
        this.patterns = [
            // Basic moves
            { pattern: /pawn\s+(?:to\s+)?([a-h][1-8])/i, type: 'pawn' },
            { pattern: /knight\s+(?:to\s+)?([a-h][1-8])/i, type: 'knight' },
            { pattern: /bishop\s+(?:to\s+)?([a-h][1-8])/i, type: 'bishop' },
            { pattern: /rook\s+(?:to\s+)?([a-h][1-8])/i, type: 'rook' },
            { pattern: /queen\s+(?:to\s+)?([a-h][1-8])/i, type: 'queen' },
            { pattern: /king\s+(?:to\s+)?([a-h][1-8])/i, type: 'king' },
            
            // Direct square moves
            { pattern: /^([a-h][1-8])$/i, type: 'direct' },
            
            // From-to moves
            { pattern: /([a-h][1-8])\s+(?:to\s+)?([a-h][1-8])/i, type: 'from-to' },
            
            // Castling
            { pattern: /castle\s+(?:king|short)/i, type: 'castle-king' },
            { pattern: /castle\s+(?:queen|long)/i, type: 'castle-queen' },
            { pattern: /(?:castle|castling)$/i, type: 'castle-king' }, // default kingside
        ];
    }
    
    async start() {
        if (this.isListening) return;
        
        try {
            // Try to get microphone access for visual feedback
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.isListening = true;
            
            if (this.onstart) this.onstart();
            
            // For now, we'll use a simple text input fallback
            // In a real implementation, you could integrate with a client-side speech library
            this.simulateListening();
            
            // Stop the stream since we're not actually using it for recognition
            stream.getTracks().forEach(track => track.stop());
            
        } catch (error) {
            if (this.onerror) {
                this.onerror({ error: 'not-allowed' });
            }
        }
    }
    
    stop() {
        this.isListening = false;
        if (this.onend) this.onend();
    }
    
    simulateListening() {
        // Simulate listening for a few seconds then stop
        setTimeout(() => {
            this.stop();
        }, 3000);
    }
    
    processText(text) {
        // Process text as if it came from speech recognition
        if (this.onresult) {
            const result = {
                results: [[{
                    transcript: text,
                    confidence: 1.0
                }]],
                resultIndex: 0
            };
            this.onresult(result);
        }
    }
    
    parseChessMove(text) {
        const cleanText = text.toLowerCase().trim();
        
        for (const { pattern, type } of this.patterns) {
            const match = cleanText.match(pattern);
            if (match) {
                switch (type) {
                    case 'pawn':
                        return match[1]; // e.g., "e4"
                    case 'knight':
                        return 'N' + match[1]; // e.g., "Nf3"
                    case 'bishop':
                        return 'B' + match[1]; // e.g., "Bc4"
                    case 'rook':
                        return 'R' + match[1]; // e.g., "Rh1"
                    case 'queen':
                        return 'Q' + match[1]; // e.g., "Qh5"
                    case 'king':
                        return 'K' + match[1]; // e.g., "Kg1"
                    case 'direct':
                        return match[1]; // e.g., "e4"
                    case 'from-to':
                        return match[1] + match[2]; // e.g., "e2e4"
                    case 'castle-king':
                        return 'O-O';
                    case 'castle-queen':
                        return 'O-O-O';
                }
            }
        }
        
        return null;
    }
}

// Make it available globally
window.OfflineSpeechRecognition = OfflineSpeechRecognition;