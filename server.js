const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public')); // Serve static files from the 'public' folder

const playersInRoom = {}; // Track of players in each room
const gameStates = {}; // Store game state for each room

function initializeGameState(roomKey) {
    console.log('initializeGameState function called')
    
    gameStates[roomKey] = {
        currentPlayer: 'Player 1',
        secretWord: '',
        roundNumber: 1,
        player1SocketId: null,
        player2SocketId: null,
        scoreboard: {
            player1Score: 0,
            player2Score: 0,
        }
        // Additional game state variables can be added here
    };
}

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('createRoom', (roomKey) => {
        console.log(`Room created with key: ${roomKey}`);
        socket.join(roomKey);
    });

    socket.on('joinRoom', (data) => {
        console.log('joinRoom socket called')
        const { roomKey, playerName } = data;
        socket.join(roomKey);
    
        if (!playersInRoom[roomKey]) {
            playersInRoom[roomKey] = [];
            initializeGameState(roomKey);
        }
    
        // Check if this is the first or second player to join the room
        const playerIndex = playersInRoom[roomKey].push({ id: socket.id, name: playerName }) - 1;
        const playerRole = playerIndex === 0 ? 'Player 1' : 'Player 2';
    
        // Emit to this socket/player their assigned player number and name
        io.to(socket.id).emit('assignPlayer', { playerNumber: playerRole, playerName });
    
        // Assign socket IDs and names in gameStates for room
        if (playerRole === 'Player 1') {
            gameStates[roomKey].player1SocketId = socket.id;
            gameStates[roomKey].player1Name = playerName;
        } else if (playerRole === 'Player 2') {
            gameStates[roomKey].player2SocketId = socket.id;
            gameStates[roomKey].player2Name = playerName;
    
            // Since both players are now present, emit 'roomReady' to both
            // Emit 'roomReady' with additional details including player names
io.to(roomKey).emit('roomReady', {
    roomKey: roomKey,
    player1Name: gameStates[roomKey].player1Name,
    player2Name: gameStates[roomKey].player2Name
});

// Signal the start of the turn to Player 1
io.to(gameStates[roomKey].player1SocketId).emit('startTurn');

        }
    });
    
    

    socket.on('submitWord', (roomKey, word) => {
        console.log('submitWord socket called')
        if (gameStates[roomKey]) {
            gameStates[roomKey].secretWord = word;
    
            // Determine the ID of the player who needs to start guessing
            const guessingPlayerSocketId = gameStates[roomKey].currentPlayer === 'Player 1' ? 
                                           gameStates[roomKey].player2SocketId : 
                                           gameStates[roomKey].player1SocketId;
    
            // Notify the guessing player to start guessing
            io.to(guessingPlayerSocketId).emit('startGuessing', word);
    
            // Notify the other player that their opponent is guessing
            const otherPlayerSocketId = guessingPlayerSocketId === gameStates[roomKey].player1SocketId ? 
                                         gameStates[roomKey].player2SocketId : 
                                         gameStates[roomKey].player1SocketId;
            io.to(otherPlayerSocketId).emit('player2Guessing');
        }
    });
    
    // Add an event listener for the turnChanged event
socket.on('turnChanged', (currentPlayer) => {
    console.log('turnChanged socket called')
    if (currentPlayer === myPlayerNumber) {
        // It's this client's turn to pick a word
        document.getElementById(currentPlayer === 'Player 1' ? 'playerOne' : 'playerTwo').style.display = 'block';
        document.getElementById(currentPlayer === 'Player 1' ? 'playerTwoMessage' : 'playerOneMessage').style.display = 'none';
    } else {
        // It's this client's turn to wait
        document.getElementById('playerOne').style.display = 'none';
        document.getElementById('playerTwo').style.display = 'none';
        document.getElementById(currentPlayer === 'Player 1' ? 'playerTwoMessage' : 'playerOneMessage').textContent = `${currentPlayer} is picking a word`;
        document.getElementById(currentPlayer === 'Player 1' ? 'playerTwoMessage' : 'playerOneMessage').style.display = 'block';
    }
});

socket.on('endRound', (roomKey) => {
    console.log('endRound socket called')
    if (gameStates[roomKey]) {
        // Toggle the current player
        gameStates[roomKey].currentPlayer = gameStates[roomKey].currentPlayer === 'Player 1' ? 'Player 2' : 'Player 1';


         // Log the updated game state
         console.log(`Room ${roomKey} - Current Player: ${gameStates[roomKey].currentPlayer}, Round Number: ${gameStates[roomKey].roundNumber}`);

        // Emit to both players the updated currentPlayer and the new round number
        io.to(gameStates[roomKey].player1SocketId).emit('currentPlayerUpdated', gameStates[roomKey].currentPlayer);
        io.to(gameStates[roomKey].player2SocketId).emit('currentPlayerUpdated', gameStates[roomKey].currentPlayer);

        
    } else {
        console.error(`Game state not found for room: ${roomKey}`);
    }
});

socket.on('updateScore', (roomKey, playerNumber, points) => {
    console.log('updateScore socket called')
    if (gameStates[roomKey]) {
        // Update score
        const scoreKey = playerNumber === 'Player 1' ? 'player1Score' : 'player2Score';
        gameStates[roomKey].scoreboard[scoreKey] += points;

        // Increment the round number and toggle the current player
        gameStates[roomKey].roundNumber++;
        gameStates[roomKey].currentPlayer = gameStates[roomKey].currentPlayer === 'Player 1' ? 'Player 2' : 'Player 1';

        console.log(`Updated scores in room ${roomKey}:`, gameStates[roomKey].scoreboard);
        console.log(`Room ${roomKey} - Current Player: ${gameStates[roomKey].currentPlayer}, Round Number: ${gameStates[roomKey].roundNumber}`);

        // Broadcast updated scoreboard and round number to both players
        io.to(roomKey).emit('scoreboardUpdated', gameStates[roomKey].scoreboard);
        io.to(roomKey).emit('roundNumberUpdated', gameStates[roomKey].roundNumber);

        // Check for game over condition
        const MAX_ROUNDS = 7; // Example: Game ends after 5 rounds
        if (gameStates[roomKey].roundNumber >= MAX_ROUNDS) {
            // Assume determineWinner is a function that returns 'Player 1' or 'Player 2'
            let winner = determineWinner(gameStates[roomKey]);
            let winnerName = winner === 'Player 1' ? gameStates[roomKey].player1Name : gameStates[roomKey].player2Name;
        
            io.in(roomKey).emit('gameOver', {
                winner: winnerName,
                player1Name: gameStates[roomKey].player1Name,
                player2Name: gameStates[roomKey].player2Name,
                player1Score: gameStates[roomKey].scoreboard.player1Score,
                player2Score: gameStates[roomKey].scoreboard.player2Score,
                message: `The winner is ${winnerName}!`
            });

        
        }

        gameStates[roomKey].currentPlayer = gameStates[roomKey].currentPlayer === 'Player 1' ? 'Player 2' : 'Player 1';
    }
});

function determineWinner(gameState) {
    console.log('determineWinner function called')
    // Simple winner determination based on score
    if (gameState.scoreboard.player1Score > gameState.scoreboard.player2Score) {
        return 'Player 1';
    } else if (gameState.scoreboard.player2Score > gameState.scoreboard.player1Score) {
        return 'Player 2';
    } else {
        return 'Draw'; // or any other logic for a tie
    }
}

// Define the resetGameState function
function resetGameState(roomKey) {
    console.log('resetGameState function called');
    if (gameStates[roomKey]) {
        // Reset the game state logic here
        gameStates[roomKey].roundNumber = 1;
        gameStates[roomKey].scoreboard.player1Score = 0;
        gameStates[roomKey].scoreboard.player2Score = 0;
        // Explicitly set currentPlayer to 'Player 1' for a fresh start
        gameStates[roomKey].currentPlayer = 'Player 1';

        console.log(`Game state reset for room: ${roomKey}`);
        console.log(`Room ${roomKey} - Current Player: ${gameStates[roomKey].currentPlayer}, Round Number: ${gameStates[roomKey].roundNumber}`);
    }
}

socket.on('resetGameRequest', (roomKey) => {
    console.log('resetGameRequest socket called');
    resetGameState(roomKey); // Reset the game state

    // After resetting the game state, prepare the updatedGameState including resetting currentPlayer to 'Player 1'
    const updatedGameState = {
        ...gameStates[roomKey],
        currentPlayer: 'Player 1', // Ensures Player 1 starts after a reset
        player1Name: gameStates[roomKey].player1Name,
        player2Name: gameStates[roomKey].player2Name,
        // Ensure roundNumber is reset to 1 here as well, for clarity and consistency
        roundNumber: 1
    };

    // Notify both players of the game reset, triggering UI updates client-side
    io.in(roomKey).emit('gameReset', updatedGameState);
    console.log(`Game reset and notified for room: ${roomKey}`);

    // Emit 'startTurn' to Player 1 to start the new game
    io.to(gameStates[roomKey].player1SocketId).emit('startTurn');
    console.log(`Starting turn for Player 1 in room: ${roomKey}`);
});


socket.on('startGuessing', (roomKey) => {
    console.log('startGuessing socket called')
    
    if (gameStates[roomKey]) {
        const secretWord = gameStates[roomKey].secretWord;
        const currentPlayer = gameStates[roomKey].currentPlayer;

        // Determine the ID of the guessing player based on the current player
        const guessingPlayerSocketId = currentPlayer === 'Player 1' ? gameStates[roomKey].player2SocketId : gameStates[roomKey].player1SocketId;

        // Send the secret word to the guessing player
        io.to(guessingPlayerSocketId).emit('startGuessing', secretWord);
    } else {
        console.error(`Game state not found for room: ${roomKey}`);
    }
});

    socket.on('makeGuess', (roomKey, guess) => {
        console.log('makeGuess socket called')
        if (gameStates[roomKey]) {
            const secretWord = gameStates[roomKey].secretWord;
            const player1SocketId = gameStates[roomKey].player1SocketId;
            const player2SocketId = gameStates[roomKey].player2SocketId;
    
            // Notify Player 1 that Player 2 has made a guess
            io.to(player1SocketId).emit('player2MadeGuess', guess);
    
            if (secretWord === guess) {
                // Guess is correct
                io.to(player1SocketId).emit('guessResult', { correct: true, word: guess });
                io.to(player2SocketId).emit('guessResult', { correct: true, word: guess });
                // Handle correct guess scenario
            } else {
                // Guess is incorrect
                io.to(player1SocketId).emit('guessResult', { correct: false, word: guess });
                io.to(player2SocketId).emit('guessResult', { correct: false, word: guess });
                // Handle incorrect guess scenario
            }
        } else {
            console.error(`Game state not found for room: ${roomKey}`);
        }
    });
    

    socket.on('disconnect', () => {
        console.log('disconnect socket called')
        // Handle player disconnection
        for (const roomKey in playersInRoom) {
            const index = playersInRoom[roomKey].indexOf(socket.id);
            if (index !== -1) {
                playersInRoom[roomKey].splice(index, 1);
                if (playersInRoom[roomKey].length === 0) {
                    // If room is empty, delete the room's state
                    delete gameStates[roomKey];
                }
                break;
            }
        }
    });
});

server.listen(3000, '0.0.0.0', () => {
    console.log('Server listening on port 3000');
});
