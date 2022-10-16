# Rock Paper Scissors game

To run tests

```
yarn install && npx hardhat test
```

## Process of the game

Owner deploys a smart contract allowing to play the game

1. Player1 creates a game for player1 and player2 and makes move1.
Notice: create + move1 are together to make the game faster

    1. move1 is encrypted to prevent seeing it by player2 before move2
    1. To prevent comparing encrypt(move1) with encrypt(ROCK), encrypt(PAPER), encrypt(SCISSORS) player2 adds a secret1
    1. So move1 is really: `encrypted(move1, secret1)`

1. Player2 makes move2

    1. move2 is open, not needed to be encrypted

1. Player1 provides `secret1`

1. Anybody can read the game result (1 for player1, 2 for player2, 0 for the draw case)

1. To prevent infinite waiting of players (e.g. player1 sees their defeat and doesn't provide `secret1`) if difference of blocks number > 100, the player failed their move is considered defeated

1. If player1 makes an invalid move their considered is defeated
