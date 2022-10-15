pragma solidity ^0.8.9;


contract RockScissorsPaper {
    string public name = "RockScissorsPaper";
    string public symbol = "RSP";

    // event happened on creating game
    event Created(address indexed _player1, address indexed _player2, uint256 _gameNumber);

    enum Move { ROCK, PAPER, SCISSORS } // ROCK < PAPER < SCISSORS

    struct Game {
        address player1;
        address player2;
        Move move1;
        Move move2;
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

    function createGameAndMakeMove1(address player2, Move move1) external {
        uint256 gameNumber = random();
        games[gameNumber] = Game(msg.sender, player2, move1, move1);
        
        emit Created(msg.sender, player2, gameNumber);
    }

    function makeMove2(uint256 gameNumber, Move move2) external {
        require(games[gameNumber].player1 != address(0));
        require(msg.sender == games[gameNumber].player2);

        games[gameNumber].move2 = move2;
    }

    function getWinner(uint256 gameNumber) external view returns (address) {
        Game storage game = games[gameNumber];
        
        if (game.move1 == game.move2) {
            return address(0);
        }

        if (game.move1 < game.move2) {
            if (game.move1 == Move.ROCK && game.move2 == Move.SCISSORS) {
                return game.player1;
            }
            return game.player2;
        } else {
            if (game.move2 == Move.ROCK && game.move1 == Move.SCISSORS) {
                return game.player2;
            }
            return game.player1;
        }
    }
}
