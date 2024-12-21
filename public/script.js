let secretWord;
let guessCount = 0;
let revealedLetters = 0;
let roundNumber = 1;
let player1Score = 0;
let player2Score = 0;
let guessedLetters = [];
let currentPlayer = 1; 
let isSinglePlayer = false; 
let isSinglePlayerFiveRounds = false;
let myPlayerNumber = '';


// client-side JavaScript
const socket = io(); // Adjust the URL to your server

socket.on('startGuessing', (word) => {
    console.log("startGuessing socket called:", word);
    secretWord = word;
    preparePlayerTwoScreen();

    // Show the guessing interface for the current player
    document.getElementById('playerOne').style.display = 'none';
    document.getElementById('playerTwo').style.display = 'block';
    document.getElementById('playerOneMessage').style.display = 'none';
    document.getElementById('playerTwoMessage').style.display = 'none';
});


socket.on('currentPlayerUpdated', (newCurrentPlayer) => {
    console.log('currentPlayerUpdated socket called')
    console.log("currentPlayerUpdated received. New Current Player:", newCurrentPlayer);
    currentPlayer = newCurrentPlayer;
    updateGameTextBasedOnRole();
});


socket.on('assignPlayer', (data) => {
    console.log('assignPlayer socket called')
    const { playerNumber, playerName } = data;
    myPlayerNumber = playerNumber; // Assuming you store player number globally
    console.log(`Assigned as ${playerNumber} (${playerName})`);
    updatePlayerUI(playerNumber, playerName); // Pass both playerNumber and playerName
    updateGameTextBasedOnRole(); // This function might also need adjustment
});

function updatePlayerUI(playerNumber, playerName) {
    console.log("updatePlayerUI function called");
    const playerDisplay = document.getElementById('playerDisplay');
   // playerDisplay.textContent = `You are ${playerName} (${playerNumber})`;
}

socket.on('roomReady', (data) => {
    console.log('roomReady socket called')
    console.log("Room is ready:", data.roomKey, "Player 1:", data.player1Name, "Player 2:", data.player2Name);

    // Update global player name variables
    myPlayerName = myPlayerNumber === 'Player 1' ? data.player1Name : data.player2Name;
    opponentPlayerName = myPlayerNumber === 'Player 1' ? data.player2Name : data.player1Name;

    // Hide the waiting message
    document.getElementById('waitingForPlayerMessage').style.display = 'none';

    // Show the game screen and update the UI with player names
    document.getElementById('gameScreen').style.display = 'block';
    document.getElementById('player1Display').textContent = data.player1Name;
    document.getElementById('player2Display').textContent = data.player2Name;

    startGame(); // Proceed to start the game with both players ready
});


socket.on('startTurn', () => {
    console.log("startTurn socket called");
    if (myPlayerNumber === 'Player 1') {
        // Logic to start Player 1's turn
        // Show word input for Player 1
        document.getElementById('playerOne').style.display = 'block';
        // Hide player two UI elements if any
        document.getElementById('playerTwo').style.display = 'none';
        document.getElementById('playerOneMessage').style.display = 'none';
        document.getElementById('playerTwoMessage').style.display = 'none';
    }
});


socket.on('playerAction', (message) => {
    console.log("playerAction socket called")
    // Assuming you have a dedicated element to show these messages
    document.getElementById('playerActionMessage').textContent = message;
});

document.addEventListener('DOMContentLoaded', function() {
    socket.on('scoreboardUpdated', (updatedScoreboard) => {
        console.log("scoreboardUpdated socket called");
        // Update local scoreboard variables
        player1Score = updatedScoreboard.player1Score;
        player2Score = updatedScoreboard.player2Score;
    
        // Call updateScoreboard to refresh the scoreboard display with updated scores and names
        updateScoreboard(); 
    });
    

socket.on('roundNumberUpdated', (newRoundNumber) => {
    console.log("roundNumberUpdate socket called")
    roundNumber = newRoundNumber;
    updateRoundDisplay(); // Update the UI with the new round number
});
});

// Listen for the 'gameOver' event
socket.on('gameOver', (data) => {
    console.log('gameOver socket called')
    console.log(data.message); // Debugging to see if we receive the event
    // Update the UI to show the game over screen
    displayGameOverScreen(data);
});

function displayGameOverScreen(data) {
    console.log('displayerGameOverScreen function called')
    document.getElementById('gameScreen').style.display = 'none';
    let gameOverScreen = document.getElementById('endGameScreen');
    gameOverScreen.style.display = 'block';

    // Use player names instead of static "Player 1" and "Player 2"
    document.getElementById('player1FinalScore').textContent = `${data.player1Name}'s score = ${data.player1Score}`;
    document.getElementById('player2FinalScore').textContent = `${data.player2Name}'s score = ${data.player2Score}`;
    document.getElementById('winnerAnnouncement').textContent = data.message;
}

socket.on('gameReset', (updatedGameState) => {
    console.log("gameReset socket called", updatedGameState);
    console.log('Player 1 Name:', document.getElementById('player1Name').value, 'Player 2 Name:', document.getElementById('player2Name').value);

    
    resetClientGameState(updatedGameState); // Pass the updated game state to reset function
    // No need to re-join the room; the client should already be in the correct room.
});

function resetClientGameState(gameState) {
    console.log("resetClientGameState function called", gameState);

    // Check for a complete game state
    if (!gameState) {
        console.error("Incomplete game state provided for reset.");
        return;
    }

    // Update client-side variables with the new game state
    roundNumber = gameState.roundNumber;
    player1Score = gameState.scoreboard.player1Score;
    player2Score = gameState.scoreboard.player2Score;
    currentPlayer = gameState.currentPlayer; // This reflects who's turn it is

    // Log for debugging purposes
    console.log('Reset to Round:', roundNumber, 'Scores - Player 1:', player1Score, 'Player 2:', player2Score, 'Current Player:', currentPlayer);

    // Update the UI to reflect the new game state
    document.getElementById('roundNumber').textContent = roundNumber;
    document.getElementById('player1Score').textContent = player1Score;
    document.getElementById('player2Score').textContent = player2Score;

    // This part is crucial: It updates the global variables or directly updates the UI with player names from the gameState
    // Assuming myPlayerNumber is set elsewhere and accurately reflects this client's player number
    if (myPlayerNumber === 'Player 1') {
        myPlayerName = gameState.player1Name;
        opponentPlayerName = gameState.player2Name;
    } else {
        myPlayerName = gameState.player2Name;
        opponentPlayerName = gameState.player1Name;
    }

    // Log the corrected player names for debugging
    console.log('Player Names Reset - My Name:', myPlayerName, 'Opponent Name:', opponentPlayerName);

    // Update UI elements based on roles and ensure the game text reflects current player names and roles
    updateGameTextBasedOnRole();

    // Hide end game screen and show the game screen for a new start
    document.getElementById('endGameScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';

    // Adjust the UI based on the current player's role
    updateUIForNewRole(currentPlayer);

    // Reset any additional UI elements as needed, such as the keypad
    resetKeypad();

    // Close any modal dialogs if open
    closeModal();

    console.log("Game state reset successfully.");
}
    

socket.on('waitingForPlayer', () => {
    console.log('waitingForPlayer socket called')
    showWaitingForPlayer();
});

// Client sends this when they're ready to start the new game
function sendPlayerReady() {
    console.log('sendPlayerReady function called')
    const roomKey = document.getElementById('roomKey').value; // Or however you access the room key
    socket.emit('playerReady', roomKey);
}

function requestGameReset() {
    console.log('requestGameReset function called')
    const roomKey = document.getElementById('roomKey').value; // Make sure this is how you obtain the room key
    socket.emit('resetGameRequest', roomKey);
    
    // Hide the start screen explicitly
    document.getElementById('startScreen').style.display = 'none';

}

function resetGame() {
    console.log("resetGame function called");
    const roomKey = document.getElementById('roomKey').value; // Ensure this matches how you've stored the room key
    console.log("Emitting resetGame event for roomKey:", roomKey);
    socket.emit('resetGame', roomKey);
}

function showWaitingForPlayer() {
    console.log('showWaitingForPlayer function called')
    // Hide the start screen and any other irrelevant UI components
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'none'; // Hide game screen if necessary
    document.getElementById('endGameScreen').style.display = 'none'; // Hide end game screen if necessary

    // Display the waiting message
    const waitingMessage = document.getElementById('waitingForPlayerMessage'); // Ensure this element exists
    if(waitingMessage) {
        waitingMessage.textContent = "Waiting for other player to join...";
        waitingMessage.style.display = 'block';
    } else {
        console.error("Waiting message element not found");
    }
}

function resetGameStateUI(gameState) {
    console.log('resetGameStateUI function called')
    // Update UI elements based on gameState
    document.getElementById('roundNumber').textContent = gameState.roundNumber;
    document.getElementById('player1Score').textContent = gameState.scoreboard.player1Score;
    document.getElementById('player2Score').textContent = gameState.scoreboard.player2Score;
    // Additional UI reset logic here
    
    // Hide the game over screen and show the game screen again
    document.getElementById('endGameScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    // Reset the word input and other game state as needed
}


const playButton = document.getElementById('playButton');
if (playButton) {
    playButton.addEventListener('click', startMultiplayerGame);
} else {
    console.error("playButton element not found");
}


document.getElementById('helpPickWord').addEventListener('click', randomWordPick);


function updateRoundDisplay() {
    console.log("updateRoundDisplayer function called");
    const roundNumberElement = document.getElementById('roundNumber');
    if (roundNumberElement) {
        roundNumberElement.textContent = roundNumber; // Update the round number display
        console.log('Round number inner text:', roundNumberElement.textContent);
    } else {
        console.error('Round number element not found');
    }
}

function resetGameState() {
    console.log("resetGameState function called")
    console.log("Player 1 Name:", player1Name, "Player 2 Name:", player2Name);
    
    // Resetting game state variables
    secretWord = '';
    guessCount = 0;
    revealedLetters = 0;
    guessedLetters = [];

    // Clear the word input field
    document.getElementById('wordInput').value = '';

    // Clear previous guesses display
    const wordDisplay = document.getElementById('wordDisplay');
    wordDisplay.innerHTML = '';
    const letterGuesses = document.getElementById('letterGuesses');
    letterGuesses.innerHTML = '';

    
}

function chooseMultiplayer() {
    console.log("chooseMultiplayer function called")
    isSinglePlayer = false;

    // Hide the initial start screen
    document.getElementById('startScreen').style.display = 'none';

    // Show the multiplayer room entry screen instead of the name entry screen
    document.getElementById('multiplayerRoomEntryScreen').style.display = 'block';

    // Set up event listeners for multiplayer
    // Note: You might need to adjust this if your multiplayer setup changes
    setupMultiplayerListeners();
}

function showWaitingForPlayer() {
    console.log('showWaitingForPlayer function called')
    // Hide unnecessary UI components initially
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('multiplayerRoomEntryScreen').style.display = 'none';
    // Display a waiting message
    const waitingMessage = document.getElementById('waitingForPlayerMessage'); // Ensure this element exists in your HTML
    waitingMessage.textContent = "Waiting for other player to join...";
    waitingMessage.style.display = 'block';
}

function joinRoom() {
    console.log('joinRoom function called')
    const playerName = prompt("Please enter your name:").trim();
    if (!playerName) {
        alert("You must enter a name to play.");
        return;
    }

    myPlayerName = playerName; // Set the player name

    let roomKey = document.getElementById('roomKey').value;
    if (!roomKey) {
        roomKey = generateRoomKey(); // This also updates the display
    } else {
        // Update the roomkeydisplay div with the existing room key
        document.getElementById('roomkeydisplay').textContent = `Room Key: ${roomKey}`;
    }

    socket.emit('joinRoom', { roomKey, playerName });
    console.log("Joining room with key:", roomKey, "and player name:", playerName);

    // Hide the room ready message and show the waiting message instead
    document.getElementById('roomReadyMessage').style.display = 'none';
    showWaitingForPlayer(); // Call this function to show the waiting message
}


function generateRoomKey() {
    console.log('generateRoomKey function called')
    const characters = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < 4; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    // Set the generated result into the roomKey input field
    document.getElementById('roomKey').value = result;

    // Update the roomkeydisplay div with the new room key
    document.getElementById('roomkeydisplay').textContent = `Room Key: ${result}`;
}

function chooseSinglePlayer() {
    console.log('chooseSinglePlayer function called')
    isSinglePlayer = true;
    randomWordPick();
    setupSinglePlayerGame();
}

function setupMultiplayerListeners() {
    console.log('setupMultiPlayerListeners function called')
    document.getElementById('playButton').addEventListener('click', startMultiplayerGame);
}

function setupSinglePlayerGame() {
    console.log('setupSinglePlayerGame function called')
    // Hide the start screen and name entry screen
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('nameEntryScreen').style.display = 'none';

    // Set up the game for single-player mode
    const player1Name = 'Player';
    document.getElementById('player1Display').textContent = player1Name;
    document.getElementById('player2Display').style.display = 'none'; // Hide Player 2 display

    // Show the game screen and prepare it for guessing
    document.getElementById('gameScreen').style.display = 'block';

    // Prepare the guessing part of the game
    preparePlayerTwoScreen(); // Sets up the guessing screen

    // Initialize scoreboard for single player
    updateScoreboard();

    // Since it's single-player, hide the word input section (Player 1)
    document.getElementById('playerOne').style.display = 'none';

    // Show the letter guess boxes and the keypad for guessing
    document.getElementById('playerTwo').style.display = 'block';
    document.getElementById('keypad').style.display = 'block';

    // Update the heading text for single player mode
    if (isSinglePlayer) {
        document.querySelector('#playerTwo h2').textContent = "Guess the Word";
    }
}

function startMultiplayerGame() {
    console.log("startmultiplayer game function called")
    const player1Name = document.getElementById('player1Name').value || 'Player 1';
    const player2Name = document.getElementById('player2Name').value || 'Player 2';

    // Update the game for multiplayer mode
    // The rest of the code from the original startGame function goes here
}

// Assuming these are set somewhere in your script when players join the room or the game starts
var myPlayerName = 'Your Name'; // This should be set to the name the user entered
var opponentPlayerName = 'Opponent Name'; // This should be set based on the opponent's name


function startGame() {
    console.log("startGame function called")
    // Use the globally stored player names
    const player1Name = myPlayerNumber === 'Player 1' ? myPlayerName : opponentPlayerName;
    const player2Name = myPlayerNumber === 'Player 2' ? myPlayerName : opponentPlayerName;

    // Hide the room ready message and multiplayer room entry screen
    document.getElementById('roomReadyMessage').style.display = 'none';
    document.getElementById('multiplayerRoomEntryScreen').style.display = 'none';

    // Update the scoreboard with the actual player names
    document.getElementById('player1Display').textContent = player1Name;
    document.getElementById('player2Display').textContent = player2Name;

    console.log("Player 1 Name:", player1Name, "Player 2 Name:", player2Name);
document.querySelector('#playerOne h2').textContent = `${player1Name}: Enter a 5-letter Word`;
document.querySelector('#playerTwo h2').textContent = `${player2Name}: Guess the Word`;

    // Hide the start screen and show the game screen
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    document.getElementById('nextRound').style.display = 'none';

    // Attach event listener to the Next Round button
    document.getElementById('nextRound').addEventListener('click', prepareForNextRound);

    document.getElementById('nameEntryScreen').style.display = 'none';

    // Check player roles and display the appropriate UI
    if (myPlayerNumber === 'Player 1') {
        document.getElementById('playerOne').style.display = 'block';
        document.getElementById('playerTwo').style.display = 'none';
    } else if (myPlayerNumber === 'Player 2') {
        document.getElementById('playerOne').style.display = 'none';
        document.getElementById('playerTwo').style.display = 'none';

        // Display the waiting message for Player 2
        const playerTwoMessage = document.getElementById('playerTwoMessage');
        if (playerTwoMessage) {
            playerTwoMessage.style.display = 'block';
            playerTwoMessage.textContent = `${player1Name} is picking a word`;
        }
    }
}


// Function to randomly select one of the specified words
function randomWordPick() {
    const words = ["Until","Knife","Write","Owner","Reply","Rugby","Sheep","Wrong","Spite","Squad","Uncle","Yours","Burst","Climb","Imply","Marry","Relax","Brave","Vague","Afoot","Afore","Unity","Aline","Aloft","Crazy","Faint","Harsh","Naked","Nasty","Naval","Outer","Sheer","Silly","Steep","Aloof","Aloud","Amiss","Askew","Awful","Wrote","Canny","Dirty","Ditto","Yield","Dully","Young","Forte","About","Above","Abuse","Actor","Acute","Admit","Adopt","Adult","After","Again","Agent","Agree","Ahead","Alarm","Album","Boost","Booth","Bound","Brain","Brand","Bread","Break","Breed","Brief","Bring","Broad","Broke","Brown","Build","Built","Debut","Delay","Depth","Doing","Doubt","Dozen","Draft","Drama","Drawn","Dream","Dress","Drill","Drink","Drive","Drove","Dying","Eager","Early","Earth","Eight","Elite","Empty","Enemy","Enjoy","Enter","Youth","Judge","Known","Label","Large","Laser","Later","Laugh","Layer","Learn","Lease","Least","Leave","Legal","Level","Wound","Light","Limit","Peace","Worth","Phase","Phone","Photo","Piece","Pilot","Pitch","Place","Plain","Plane","Plant","Plate","Point","Pound","Sheet","Shelf","Shell","Shift","Shirt","Shock","Shoot","Short","Shown","Sight","Since","Sixth","Sixty","Sized","Skill","Sleep","Slide","Small","Smart","Smile","Smith","Smoke","Solid","Solve","Sorry","Sound","South","Space","Upset","Urban","Usage","Usual","Valid","Value","Video","Virus","Visit","Alert","Alike","Alive","Allow","Alone","Along","Alter","Anger","Angle","Angry","Apart","Apple","Apply","Arena","Buyer","Cable","Voice","Carry","Catch","Cause","Chain","Chair","Chart","Chase","Cheap","Check","Chest","Chief","Child","Entry","Equal","Error","Event","Every","Exact","Exist","Extra","Faith","Award","Basis","Beach","Birth","Block","Blood","Board","China","Class","Clock","Coach","Coast","Court","Cream","Crime","Crowd","Crown","Death","Cycle","Floor","Fault","Field","Frame","Fruit","Glass","Grant","Grass","Frank","Group","Guide","Heart","Horse","Hotel","House","March","Lunch","Metal","Model","Money","Month","Motor","Mouth","Music","Power","Price","Pride","Prize","Proof","Queen","Radio","Range","Ratio","River","Speed","Sport","Staff","Stage","Steam","Steel","Stock","Store","Stuff","Style","Sugar","Table","Taste","Theme","Thing","Water","Woman","World","Which","Whose","Argue","Arise","Avoid","Begin","Blame","Count","Cover","Claim","Dance","Fight","Focus","Force","Guess","Match","Press","Prove","Raise","Reach","Refer","Speak","Spend","Split","Stand","Start","State","Stick","Study","Teach","Thank","Think","Throw","Waste","Watch","Worry","Would","Aware","Basic","Black","Blind","Civil","Close","Fifth","Final","Front","Giant","Grand","Green","Gross","Happy","Human","Ideal","Local","Lucky","Magic","Major","Minor","Moral","Prime","Proud","Quiet","Ready","Roman","Spare","Sweet","Third","Vital","White","Whole","Slash","While","Amuck","Aside","Clean","Clear","Daily","FALSE","First","Forth","Fresh","Fully","Funny","Godly","Great","Heavy","Hence","Hotly","Jolly","Lowly","Madly","Maybe","Never","Piano","Plumb","Prior","Quick","Ramen","Rapid","Right","Rough","Sadly","Union","Sleek","Upper","Stark","Still","Stone","Stour","Super","Tally","Thick","Tight","Utter","Where","Below","Circa","Cross","Furth","Minus","Avast","Bravo","Bless","Fudge","Golly","Hella","Jesus","Kapow","Loose","Lordy","Mercy","Plonk","Psych","Salve","Sniff","There","Viola","Wacko","Woops","Image","Index","Inner","Input","Issue","Irony","Juice","Joint","Night","Noise","North","Noted","Novel","Nurse","Ocean","Offer","Often","Order","Other","Ought","Paint","Panel","Paper","Party","Round","Route","Royal","Rural","Scale","Scene","Scope","Score","Sense","Serve","Seven","Shall","Shape","Share","Sharp","Times","Tired","Title","Today","Topic","Total","Touch","Tough","Tower","Track","Trade","Train","Treat","Trend","Trial","Tried","Tries","Truck","Truly","Trust","Truth","Twice","Under"];

    const randomIndex = Math.floor(Math.random() * words.length);
    const randomWord = words[randomIndex];

    // Set the selected word as the value of the word input
    document.getElementById('wordInput').value = randomWord;

    secretWord = randomWord.toUpperCase();
}

async function submitWord() {
    let secretWord = document.getElementById('wordInput').value.toLowerCase();
    let roomKey = document.getElementById('roomKey').value; // Retrieve the room key value

    if (secretWord.length !== 5) {
        alert("Please enter a 5-letter word.");
        return;
    }

    try {
        const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${secretWord}&format=json&origin=*`;
        const response = await fetch(url);
        const data = await response.json();
        const page = data.query.pages;
        const pageId = Object.keys(page)[0];

        if (pageId !== "-1") {
            socket.emit('submitWord', roomKey, secretWord);
            
            // Hide the word input UI and show a waiting message
            document.getElementById('playerOne').style.display = 'none';
            document.getElementById('playerTwo').style.display = 'none';
            const waitingMessageElement = myPlayerNumber === 'Player 1' ? 'playerOneMessage' : 'playerTwoMessage';
            document.getElementById(waitingMessageElement).innerHTML = 'Waiting for the other player... <span class="loader"></span>';
            document.getElementById(waitingMessageElement).style.display = 'block';

        } else {
            alert("This is not a valid word. Please enter a different one.");
        }
    } catch (error) {
        console.error('Error:', error);
        alert("There was an error processing your request. Please try again.");

    }
}



function preparePlayerTwoScreen() {
    console.log('preparePlayerTwoScreen function called')
    // Clean up any previous game state
    const wordDisplay = document.getElementById('wordDisplay');
    wordDisplay.innerHTML = '';
    const letterGuesses = document.getElementById('letterGuesses');
    letterGuesses.innerHTML = '';

    // Set up for a new word guessing
    for (let i = 0; i < 5; i++) {
        let div = document.createElement('div');
        div.className = 'letterBox';
        div.id = 'letterBox' + i;
        wordDisplay.appendChild(div);
    }

    for (let i = 0; i < 15; i++) {
        let input = document.createElement('input');
        input.className = 'guessBox';
        input.maxLength = 1;
        input.oninput = function() {
            this.value = this.value.toUpperCase();
            if (this.value.length === 1 && this.nextElementSibling) {
                this.nextElementSibling.focus();
            }
            handleGuess(this);
        };
        letterGuesses.appendChild(input);
    }

    guessCount = 0;
    revealedLetters = 0;
    guessedLetters = [];

    updateLettersLeft();
}

function handleRematchButtonClick() {
    console.log('handleRematchButtonClick function called')
    // Hide the start screen and any other screens that should not be visible
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('endGameScreen').style.display = 'none'; // Assuming you want to hide the game over screen as well

    // Show the waiting message
    showWaitingForPlayer();

    // Emit the game reset event to the server here if not done within showWaitingForPlayer()
    resetGame(); // Assuming this function sends the reset signal to the server
}


function handleGuess(inputBox) {
    console.log('handleGuess function called')
    const letter = inputBox.value.toLowerCase();

    if (myPlayerNumber === 'Player 1') {
        document.getElementById('playerOneMessage').textContent = 'Player 2 is guessing your word';
    }

    // If the letter is already guessed, reset the input box and exit
    if (guessedLetters.includes(letter)) {
        openModal("You have already guessed this letter.");
        inputBox.value = '';
        return;
    }

    // Add the new guess to the guessed letters array
    guessedLetters.push(letter);

    // Find and update the corresponding key in the keypad
    const correspondingKey = Array.from(document.querySelectorAll('.key')).find(key => key.textContent.toUpperCase() === inputBox.value.toUpperCase());
    if (correspondingKey) {
        correspondingKey.classList.add('key-clicked');
    }

    let found = false;
    for (let i = 0; i < secretWord.length; i++) {
        if (secretWord[i].toLowerCase() === letter) {
            let letterBox = document.getElementById('letterBox' + i);
            if (letterBox.textContent === '') {
                letterBox.textContent = letter.toUpperCase();
                letterBox.classList.add('correctGuess');
                revealedLetters++;
                found = true;
            }
            inputBox.classList.add('correctGuess');
        }
    }

    if (!found) {
        inputBox.classList.add('incorrectGuess'); // Add a class for incorrect guess
    }

    guessCount++;
    updateLettersLeft();
    checkWinCondition();

    socket.emit('makeGuess', roomKey, letter); // Ensure roomKey is defined and use 'letter'
}

function updateLettersLeft() {
    const guessesLeft = 15 - guessCount;
    document.getElementById('lettersLeftDisplay').textContent = "Guesses left: " + guessesLeft;
}

// This is your existing startNextRound function
function startNextRound() {
    console.log('startNextRound function called')
    
    updateScoreboard();
    resetCommonElements();  // Reset common UI elements

    // Notify server to end the round and switch roles
    const roomKey = document.getElementById('roomKey').value;
    socket.emit('endRound', roomKey);
}

// Set up the event listener for the 'nextRound' button
document.getElementById('nextRound').addEventListener('click', () => {
    const roomKey = document.getElementById('roomKey').value; // Adjust based on how roomKey is stored
    socket.emit('endRound', roomKey);
    
    startNextRound(); // Call startNextRound function here
});
    

// New function to reset common UI elements
function resetCommonElements() {
    console.log('resetCommonElements function called')
    document.getElementById('playerOne').style.display = 'none';
    document.getElementById('playerTwo').style.display = 'none';
    document.getElementById('playerOneMessage').style.display = 'none';
    document.getElementById('playerTwoMessage').style.display = 'none';
    document.getElementById('nextRound').style.display = 'none';
    document.getElementById('wordInput').value = '';
    guessCount = 0;
    revealedLetters = 0;
    guessedLetters = [];
    document.getElementById('wordDisplay').innerHTML = '';
    document.getElementById('letterGuesses').innerHTML = '';
    resetKeypad();
    updateLettersLeft();
}

// Listen for role update from server
socket.on('updateRole', (newRole) => {
    console.log('updateRole socket called')
    myPlayerNumber = newRole;
    updateUIForNewRole();  // Call a function to update UI based on new role
});

function updateUIForNewRole(currentPlayer) {
    console.log("updateUIForNewRole function called", currentPlayer);

    // Hide both UI sections initially
    document.getElementById('playerOne').style.display = 'none';
    document.getElementById('playerTwo').style.display = 'none';
    document.getElementById('playerOneMessage').style.display = 'none';
    document.getElementById('playerTwoMessage').style.display = 'none';

    // Show UI elements based on currentPlayer and myPlayerNumber
    if (currentPlayer === myPlayerNumber) {
        if (myPlayerNumber === 'Player 1') {
            document.getElementById('playerOne').style.display = 'block';
            document.getElementById('playerTwoMessage').textContent = 'Waiting for Player 2 to guess...';
        } else {
            document.getElementById('playerTwo').style.display = 'block';
            document.getElementById('playerOneMessage').textContent = 'Waiting for Player 1 to pick a word...';
        }
    } else {
        if (myPlayerNumber === 'Player 1') {
            document.getElementById('playerOneMessage').textContent = 'Player 2 is picking a word...';
        } else {
            document.getElementById('playerTwoMessage').textContent = 'Player 1 is picking a word...';
        }
        document.getElementById(myPlayerNumber === 'Player 1' ? 'playerOneMessage' : 'playerTwoMessage').style.display = 'block';
    }
}


function updateGameTextBasedOnRole() {
    console.log("updateGameTextBasedOnRole function called");

    // Use the global variables for player names instead of reading from the DOM elements directly.
    const player1Name = myPlayerNumber === 'Player 1' ? myPlayerName : opponentPlayerName;
    const player2Name = myPlayerNumber === 'Player 2' ? myPlayerName : opponentPlayerName;

    // Ensure the correct player names are used based on their roles.
    if (currentPlayer === 'Player 1') {
        document.querySelector('#playerOne h2').textContent = `${player1Name}: Enter a 5-letter Word`;
        document.querySelector('#playerTwo h2').textContent = `${player2Name}: Guess the Word`;
    } else {
        document.querySelector('#playerOne h2').textContent = `${player2Name}: Enter a 5-letter Word`;
        document.querySelector('#playerTwo h2').textContent = `${player1Name}: Guess the Word`;
    }
}

function switchPlayers() {
    console.log("switchPlayers function called");
    // No longer toggle currentPlayer here, as it's now handled by the server
    updateGameTextBasedOnRole();
}

function updateGameText() {
    console.log('updateGameText function called')
    // Use global variables that hold the current player and opponent names.
    const player1Name = myPlayerNumber === 'Player 1' ? myPlayerName : opponentPlayerName;
    const player2Name = myPlayerNumber === 'Player 2' ? myPlayerName : opponentPlayerName;

    // Determine which text to display based on the currentPlayer variable.
    if (currentPlayer === 'Player 1') {
        document.querySelector('#playerOne h2').textContent = `${player1Name}: Enter a 5-letter Word`;
        document.querySelector('#playerTwo h2').textContent = `${player2Name}: Guess the Word`;
    } else {
        document.querySelector('#playerOne h2').textContent = `${player2Name}: Enter a 5-letter Word`;
        document.querySelector('#playerTwo h2').textContent = `${player1Name}: Guess the Word`;
    }
}
    
function checkWinCondition() {
    
    const player1Name = document.getElementById('player1Name').value || 'Player 1';
    const player2Name = document.getElementById('player2Name').value || 'Player 2';
    console.log("Player 1 Name:", player1Name, "Player 2 Name:", player2Name);

    let guessingPlayerName, wordPickingPlayerName;

    if (roundNumber === 1) {
        // In the first round, Player 1 is the word picker and Player 2 is the guesser
        guessingPlayerName = player2Name;
        wordPickingPlayerName = player1Name;
    } else {
        // From the second round onwards, determine based on currentPlayer
        guessingPlayerName = currentPlayer === 'Player 1' ? player2Name : player1Name;
        wordPickingPlayerName = currentPlayer === 'Player 1' ? player1Name : player2Name;
    }

    console.log("Guessing Player:", guessingPlayerName, "Word Picking Player:", wordPickingPlayerName);

    let winner;
    let winningMessage;
    let points = 0;

    console.log("Revealed Letters:", revealedLetters, "Secret Word Length:", secretWord.length, "Guess Count:", guessCount);

    if (revealedLetters === secretWord.length) {
        // Guessing player wins
        winner = guessingPlayerName;
        points = 16 - guessCount;
        points = Math.max(points, 1);
        winningMessage = `You guessed the word and earned ${points} points!`;
    } else if (guessCount === 15) {
        // Word-picking player wins
        winner = wordPickingPlayerName;
        points = 0;
        winningMessage = `You didn't guess the word!`;
    }

    if (winner) {
        // Add a 2-second delay before updating the scoreboard
        setTimeout(() => {
            updateScore(winner, points);
            console.log("Winner determined:", winner, "Points Awarded:", points);
        }, 1000); // 2000 milliseconds = 2 seconds

        // Blur any focused element before showing the alert
        if (document.activeElement) {
            document.activeElement.blur();
        }

        if (isSinglePlayerFiveRounds && roundNumber >= 5) {
            openModal("Game over! Your final score: " + player1Score, endGame);
            console.log("Single Player Five Rounds mode - Game over");
        } else if (roundNumber < 10 || isSinglePlayer) {
            document.getElementById('nextRound').style.display = 'block';
            if (guessCount === 15) {
                showCorrectAnswer();
            }
            openModal(winningMessage);
            console.log("Continuing to next round or single player mode");
        } else {
            openModal(winningMessage, endGame);
            console.log("Multiplayer mode - Game over");
        }
    } else {
        console.log("No winner determined in this round.");
    }
}


function updateScore(winningPlayer, pointsAwarded) {
    console.log('updateScore function called')
    // Send score update to server
    const roomKey = document.getElementById('roomKey').value;
    socket.emit('updateScore', roomKey, winningPlayer, pointsAwarded);
}


function prepareForNextRound() {
    console.log('prepareForNextRound function called')
    const nextRoundBtn = document.getElementById('nextRound');

    if (isSinglePlayer) {
        // Increment round number and update the scoreboard for single-player mode
        roundNumber++;
        updateScoreboard();

        // Pick a new word and reset the game state for guessing
        randomWordPick();
        preparePlayerTwoScreen();
        resetKeypad();

        // Reset the game state
        guessCount = 0;
        revealedLetters = 0;
        guessedLetters = [];
    } else {
        // For multiplayer mode
        
        updateScoreboard();

        // Check if the game should end in multiplayer mode
        if (roundNumber > 10) {
            endGame();
            return;
        }

        // Prepare for the next round in multiplayer mode
        document.getElementById('playerOne').style.display = 'block';
        document.getElementById('playerTwo').style.display = 'none';
        document.getElementById('correctAnswer').style.display = 'none';
        nextRoundBtn.style.display = 'none';
        document.getElementById('wordInput').value = '';
        guessCount = 0;
        revealedLetters = 0;
        guessedLetters = []; // Clear guessed letters for the new round

        // Clear previous guesses
        const wordDisplay = document.getElementById('wordDisplay');
        wordDisplay.innerHTML = '';
        const letterGuesses = document.getElementById('letterGuesses');
        letterGuesses.innerHTML = '';

        // Switch players for word picking and guessing
        switchPlayers();

        // Reset the keypad keys
        resetKeypad();
    }

    updateLettersLeft();
}

function updateScoreboard() {
    console.log('updateScoreboard function called')
    // Update the round number
    const roundNumberElement = document.getElementById('roundNumber');
    if (roundNumberElement) {
        roundNumberElement.textContent = roundNumber;
    }

    // Check if the game mode is single player or multiplayer
    if (isSinglePlayer) {
        // Single-player scoreboard format
        const scoreElement = document.getElementById('player1Score');
        if (scoreElement) {
            scoreElement.textContent = player1Score;
        }
        // Assuming single player doesn't need to update player2Score, but adjust if necessary
    } else {
        // For multiplayer, ensure to use the dynamically set names
        const player1DisplayText = myPlayerNumber === 'Player 1' ? myPlayerName : opponentPlayerName;
        const player2DisplayText = myPlayerNumber === 'Player 2' ? myPlayerName : opponentPlayerName;

        // Update player names and scores for multiplayer
        document.getElementById('player1Display').textContent = player1DisplayText;
        document.getElementById('player2Display').textContent = player2DisplayText;
        document.getElementById('player1Score').textContent = player1Score;
        document.getElementById('player2Score').textContent = player2Score;
    }
}

function showCorrectAnswer() {
    // Display the correct answer when Player 2 runs out of guesses
    const correctAnswerDisplay = document.getElementById('correctAnswer');
    correctAnswerDisplay.textContent = "Correct Answer: " + secretWord.toUpperCase();
    correctAnswerDisplay.style.display = 'block';
}

function endGame(winnerName) {
    console.log('endGame function called')
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('winnerAnnouncement').textContent = `The winner is ${winnerName}!`;
    document.getElementById('endGameScreen').style.display = 'block';
}

// Reset game function to be called when 'Start Over' button is clicked
function resetGame() {
    console.log('resetGame function called')
    // Implement game reset logic here
    // This may involve navigating back to the game setup screen, resetting scores, etc.
}


document.getElementById('restartGameButton').addEventListener('click', function() {
    // Reset game state variables
    myPlayerName = '';
    opponentPlayerName = '';
    player1Score = 0;
    player2Score = 0;
    // Hide end game screen
    document.getElementById('endGameScreen').style.display = 'none';
    // Show the initial screen where users can create/join a room
    // You might also need to disconnect from the current game session or reset any relevant game state on the server
    document.getElementById('startScreen').style.display = 'block';
});



function playAgain() {
    console.log('playAgain function called')
    resetGame();
    // Hide the Play Again button after it's clicked
    document.getElementById('playAgainButton').style.display = 'none';

    // Reset the keypad keys
    document.querySelectorAll('.key').forEach(key => {
        key.classList.remove('key-clicked');
    });
}

function handleKeypadInput(e) {
    const letter = e.target.textContent.toUpperCase();

    // Find the first empty guess box
    const emptyGuessBox = Array.from(document.querySelectorAll('.guessBox')).find(box => !box.value);

    if (emptyGuessBox) {
        // Fill the empty guess box with the letter
        emptyGuessBox.value = letter;
        handleGuess(emptyGuessBox);

        // Add 'key-clicked' class to the clicked key
        e.target.classList.add('key-clicked');
    }
}

function updateGuesses(letter) {
    // Iterate through the guess boxes and fill in the first empty one
    const guessBoxes = document.querySelectorAll('.guessBox');
    for (const box of guessBoxes) {
        if (!box.value) {
            box.value = letter.toUpperCase();
            handleGuess(box);
            break;
        }
    }
}

document.getElementById('keypad').addEventListener('click', function(e) {
    if (e.target && e.target.matches('.key')) {
        handleKeypadInput(e);
    }
});

function resetKeypad() {
    const keys = document.querySelectorAll('.key');
    keys.forEach(key => {
        key.classList.remove('key-clicked');
    });
}

function resetGame() {
    console.log('resetGame function called')
    // Resetting all game variables
    roundNumber = 1;
    player1Score = 0;
    player2Score = 0;
    currentPlayer = 1;
    guessCount = 0;
    revealedLetters = 0;
    guessedLetters = [];

    isSinglePlayer = false;
    isSinglePlayerFiveRounds = false;

    // Reset the UI elements
    document.getElementById('wordInput').value = '';
    document.getElementById('wordDisplay').innerHTML = '';
    document.getElementById('letterGuesses').innerHTML = '';

    // Hide the start screen (with multiplayer and single player buttons)
    document.getElementById('startScreen').style.display = 'none';

    // Show the game screen directly for the next multiplayer game
    document.getElementById('gameScreen').style.display = 'block';

    // Prepare player screens for a new game
    document.getElementById('playerOne').style.display = 'block';
    document.getElementById('playerTwo').style.display = 'none';
    document.getElementById('correctAnswer').style.display = 'none';
    document.getElementById('nextRound').style.display = 'none';

    // Update the scoreboard to reflect the reset
    updateScoreboard();

    // Prepare for Player 1 to pick a word in multiplayer mode
    switchPlayers();
}

// Get the modal
var modal = document.getElementById("customModal");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

function openModal(message, callback) {
    document.getElementById("modalText").textContent = message;
    modal.style.display = "block";

    // Check if callback is a function before assigning it
    if (typeof callback === "function") {
        modal.callback = callback;
    } else {
        modal.callback = null;
    }
}

function closeModal() {
    console.log("Closing modal...");
    modal.style.display = "none";
    if (modal.callback) {
        console.log("Executing callback");
        modal.callback();
        modal.callback = null; // Clear the callback once executed
    }
}

span.onclick = function() {
    closeModal();
}

window.onclick = function(event) {
    if (event.target == modal) {
        closeModal();
    }
}

var confirmationModal = document.getElementById("confirmationModal");

function openConfirmationModal() {
    console.log("Opening confirmation modal...");
    confirmationModal.style.display = "block";
}

function closeConfirmationModal() {
  confirmationModal.style.display = "none";
}

document.getElementById('toggleInstructions').addEventListener('click', function() {
    console.log("Toggle Instructions clicked"); // Debugging line
    var instructions = document.getElementById('gameInstructions');
    if (instructions.style.display === 'none' || instructions.style.display === '') {
        instructions.style.display = 'block';
    } else {
        instructions.style.display = 'none';
    }
});

document.getElementById('confirmYes').addEventListener('click', function() {
    resetGame(); // Logic for "Yes" - Reset the game
    closeConfirmationModal();
});

document.getElementById('confirmNo').addEventListener('click', function() {
    // Logic for "No" - Close the modal and possibly perform other actions
    closeConfirmationModal();
});

document.querySelectorAll('input').forEach(input => {
    input.addEventListener('focus', () => document.body.classList.add('no-scroll'));
    input.addEventListener('blur', () => document.body.classList.remove('no-scroll'));
});

document.getElementById('gameScreen').addEventListener('touchmove', function(e) {
    e.preventDefault();
}, { passive: false });

document.getElementById('restartGameButton').addEventListener('click', function() {
    requestGameReset(); // This should emit the reset event to the server
    
});
