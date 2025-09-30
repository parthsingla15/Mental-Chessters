# Mental Chessters - Voice-Enabled Chess Game 🎤♟️

A modern, full-featured chess application with revolutionary voice recognition capabilities. Play chess using natural language commands with AI opponents of varying difficulties.

## 🌟 Features

### 🎮 Game Modes
- **Online Multiplayer** - Play against other players in real-time
- **AI Chess** - Challenge AI opponents with 4 difficulty levels
- **Voice Chess** - Play using voice commands with speech recognition
- **Offline Mode** - Play without internet connection

### 🎤 Voice Recognition
- **Natural Language Processing** - Say "Pawn to e4" or "Knight to f3"
- **Multiple Command Formats** - Support for various speaking styles
- **Audio Feedback** - Hear move confirmations and game status
- **Fallback Options** - Keyboard shortcuts and text input when voice fails
- **HTTPS Support** - Secure voice recognition with SSL certificates

### 🤖 AI Chess Engine
- **4 Difficulty Levels**: Easy, Medium, Hard, Expert
- **Minimax Algorithm** - Advanced move calculation
- **Position Evaluation** - Smart piece positioning
- **Real-time Processing** - Quick AI responses

### 🎯 Additional Features
- **Move History** - Track all game moves
- **Game Analysis** - Position evaluation display
- **Responsive Design** - Works on desktop and mobile
- **User Authentication** - Secure login system
- **Beautiful UI** - Modern glass morphism design

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- Modern web browser (Chrome recommended for voice features)
- Microphone (for voice chess mode)

### Installation

1. **Clone or download the project**
   ```bash
   cd Mental-Chessters
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Generate SSL certificates for voice recognition**
   ```bash
   node generate-cert.js
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open your browser**
   - HTTP: `http://localhost:3001`
   - HTTPS: `https://localhost:3443` (recommended for voice features)

## 🎮 How to Play

### Login Credentials
- **Admin**: username `admin`, password `password123`
- **Player**: username `player1`, password `chess123`
- **Guest**: username `guest`, password `guest`

### Voice Chess Commands

| Voice Command | Chess Notation | Description |
|---------------|----------------|-------------|
| "Pawn to e4" | e4 | Move pawn to e4 |
| "Knight to f3" | Nf3 | Move knight to f3 |
| "Bishop to c4" | Bc4 | Move bishop to c4 |
| "Queen to h5" | Qh5 | Move queen to h5 |
| "Castle kingside" | O-O | Kingside castling |
| "Castle queenside" | O-O-O | Queenside castling |
| "e2 to e4" | e2e4 | From-to format |

### Alternative Formats
- **Short format**: "Pawn e4", "Knight f3"
- **Direct notation**: Just say "e4", "Nf3", "O-O"
- **From-to format**: "e2 to e4", "g1 to f3"

## 🛠️ Project Structure

```
Mental-Chessters/
├── app.js                 # Main server file with voice endpoints
├── package.json          # Node.js dependencies
├── generate-cert.js      # SSL certificate generator
├── public/
│   └── offline-speech.js # Offline speech recognition fallback
├── views/
│   ├── voice-game.ejs    # Voice chess interface
│   ├── ai-game.ejs       # AI chess interface
│   ├── game-mode.ejs     # Game mode selection
│   ├── login.ejs         # Login page
│   └── index.ejs         # Online multiplayer
├── node_modules/         # Dependencies
└── README.md            # This file
```

## 🎯 Game Modes Guide

### 1. Voice Chess
1. Select "Voice Chess" from main menu
2. Choose difficulty (Easy/Medium/Hard/Expert)
3. Grant microphone permissions
4. Click "Start Listening" and speak your moves
5. AI responds automatically

### 2. AI Chess
- Traditional point-and-click chess
- Same AI engine as voice mode
- Visual move selection

### 3. Online Multiplayer
- Real-time chess with other players
- Socket.io powered
- Spectator support

## 🔧 Technical Details

### Voice Processing
- **Frontend**: Web Speech API for browser-based recognition
- **Backend**: Natural language parsing to chess notation
- **Fallbacks**: Offline mode with keyboard shortcuts

### AI Engine
- **Algorithm**: Minimax with alpha-beta pruning
- **Evaluation**: Piece values + positional bonuses
- **Depth**: Varies by difficulty (1-3 moves ahead)

### Technologies Used
- **Backend**: Node.js, Express.js, Socket.io
- **Frontend**: Vanilla JavaScript, Tailwind CSS, EJS
- **Chess Logic**: Chess.js library
- **Voice**: Web Speech API, Speech Synthesis API

## 🌐 Browser Support

### Voice Recognition
- ✅ Chrome/Chromium (Recommended)
- ✅ Microsoft Edge
- ✅ Safari (macOS/iOS)
- ❌ Firefox (Limited support)

### General Chess Play
- ✅ All modern browsers
- ✅ Mobile browsers
- ✅ Desktop applications

## 🔒 Security Features

- HTTPS support for secure voice recognition
- Session-based authentication
- SSL certificate generation script
- Secure cookie handling

## 🚨 Troubleshooting

### Voice Recognition Issues
1. **"Voice Not Supported"**: Use Chrome or Edge browser
2. **"Microphone Blocked"**: Enable microphone in browser settings
3. **Network Errors**: Try HTTPS version or use keyboard shortcuts
4. **No Response**: Speak clearly and wait for processing

### Server Issues
1. **Port 3001 in use**: Check if server is already running
2. **SSL Certificate Error**: Run `node generate-cert.js` again
3. **Dependencies Error**: Run `npm install` again

## 📱 Mobile Support

- Responsive design works on mobile devices
- Touch-friendly interface
- Voice recognition available on supported mobile browsers
- Optimized board size for smaller screens

## 🤝 Contributing

This is a personal chess project, but suggestions and improvements are welcome!

## 📄 License

This project is for educational and personal use.

## 🎯 Future Enhancements

- [ ] Move disambiguation for ambiguous commands
- [ ] Voice-activated undo commands
- [ ] Position analysis voice commands
- [ ] Multi-language support
- [ ] Tournament mode
- [ ] Game replay system

---

**Mental Chessters** - Where strategy meets innovation! 🧠♟️🎤

**Enjoy playing chess with your voice!** 🎉