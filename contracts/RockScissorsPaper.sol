pragma solidity ^0.8.9;


contract RockScissorsPaper {
    string public name = "RockScissorsPaper";
    string public symbol = "RSP";

    // event happened on creating game
    event Created(address indexed _player1, address indexed _player2, uint256 _gameNumber);

    enum Move { NONE, ROCK, PAPER, SCISSORS, INVALID } // ROCK < PAPER < SCISSORS
    uint public constant TimeoutSeconds = 1000;
    uint public constant GameResultDraw = 0;
    uint public constant GameResultPlayer1 = 1;
    uint public constant GameResultPlayer2 = 2;

    struct Game {
        address player1;
        address player2;
        uint256 move1;
        uint256 secret1;
        Move move2;
        uint lastUpdated;
    }

    // An address type variable is used to store ethereum accounts.
    address public owner;

    // games mapping
    mapping(uint256 => Game) games;

    constructor() {
        owner = msg.sender;
    }

    uint counter = 1;
    function random() private returns (uint256) {
        counter++;
        return uint256(keccak256(abi.encodePacked(block.difficulty, block.timestamp, counter)));
    }

    function createGameAndMakeMove1(address player2, uint256 move1) external {
        uint256 gameNumber = random();
        games[gameNumber] = Game(msg.sender, player2, move1, 0, Move.NONE, block.timestamp);
        
        emit Created(msg.sender, player2, gameNumber);
    }

    function makeMove2(uint256 gameNumber, Move move2) external {
        Game storage game = games[gameNumber];
        
        require(game.player1 != address(0), "game is not created");
        require(msg.sender == game.player2, "should be done by player2 passed on game creation");
        require(move2 == Move.ROCK || move2 == Move.PAPER || move2 == Move.SCISSORS, "Invalid move2"); // move is allowed
        require(game.move2 == Move.NONE, "cannot redo");
        require(isTimeoutOK(game), "timeout exceed");

        game.move2 = move2;
        game.lastUpdated = block.timestamp;
    }

    function provideSecret1(uint256 gameNumber, uint256 secret1) external {
        Game storage game = games[gameNumber];
        
        require(game.player1 != address(0), "game is not created");
        require(msg.sender == game.player1, "should be done by game creator");
        require(game.move2 != Move.NONE, "move2 is not done");
        require(game.secret1 == 0, "cannot redo");
        require(isTimeoutOK(game), "timeout exceed");

        game.secret1 = secret1;
    }

    function getWinner(uint256 gameNumber) external view returns (uint) {
        Game storage game = games[gameNumber];
        
        require(game.player1 != address(0), "game is not created");
        
        if (game.move2 == Move.NONE) {
            // move2 is not done
            if (isTimeoutOK(game)) {
                require(false, "move2 is not done");
            } else {
                return GameResultPlayer1;
            }
        }

        if (game.secret1 == 0) {
            // secret is not provided
            if (isTimeoutOK(game)) {
                require(false, "provideSecret1 is not done");
            } else {
                return GameResultPlayer2;
            }
        }
        
        Move move1 = myDecrypt(game.move1, game.secret1);
        if (move1 == Move.INVALID) {
            // player1 made an invalid turn
            return GameResultPlayer2;
        }

        Move move2 = game.move2;

        if (move1 == move2) {
            return GameResultDraw;
        }

        if (move1 < move2) {
            if (move1 == Move.ROCK && move2 == Move.SCISSORS) {
                return GameResultPlayer1;
            }
            return GameResultPlayer2;
        } else {
            if (move2 == Move.ROCK && move1 == Move.SCISSORS) {
                return GameResultPlayer2;
            }
            return GameResultPlayer1;
        }
    }

    function isTimeoutOK(Game memory game) public view returns (bool) {
        // timeout not exceed
        return game.lastUpdated + TimeoutSeconds >= block.timestamp;
    }

    function myEncrypt(uint move, uint256 secret) public pure returns (uint) {
        return uint256(keccak256(abi.encodePacked(move, secret)));
    }

    function myDecrypt(uint256 encryptedMove, uint256 secret) public pure returns (Move) {
        Move[3] memory candidates = [Move.ROCK, Move.PAPER, Move.SCISSORS];
        for (uint i=0; i<candidates.length; i++) {
            uint256 encrypted = myEncrypt(uint(candidates[i]), secret);
            if (encrypted == encryptedMove) {
                return candidates[i];
            }
        }
        return Move.INVALID;        
    }
}
