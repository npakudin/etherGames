const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");

describe("RockScissorsPaper contract", function () {
  const Move = {
    NONE: 0,
    ROCK: 1,
    PAPER: 2,
    SCISSORS: 3,
    INVALID: 4,
  }
  const InvalidGameNumber = 12345;
  const GameResult = {
    Draw: 0,
    Player1: 1,
    Player2: 2,
  }


  async function deployFixture() {
    const RockScissorsPaper = await ethers.getContractFactory("RockScissorsPaper");
    const [owner, addr1, addr2, otherAddr] = await ethers.getSigners();

    const rspContract = await RockScissorsPaper.deploy();

    await rspContract.deployed();

    return { RockScissorsPaper, rspContract, owner, addr1, addr2, otherAddr };
  }


  async function makeMove1(rspContract, addr1, addr2, move1) {
    // in test we don't need a crypto generator, but in prod we do
    const secret1 = Math.floor(Math.random() * 1000 * 1000 * 1000 * 1000);
    const encryptedMove1 = await rspContract.myEncrypt(move1, secret1);
    
    let gameNumber;
    const captureValue = (value) => {
        gameNumber = value
        return true
    };
    await expect(rspContract.connect(addr1).createGameAndMakeMove1(addr2.address, encryptedMove1))
      .to.emit(rspContract, "Created")
      .withArgs(addr1.address, addr2.address, captureValue);

    return {gameNumber, secret1};
  }


  async function testGame(move1, move2, expectedWinner) {
    const { rspContract, addr1, addr2 } = await loadFixture(deployFixture);
    const { gameNumber, secret1 } = await makeMove1(rspContract, addr1, addr2, move1);
    await rspContract.connect(addr2).makeMove2(gameNumber, move2);
    await rspContract.connect(addr1).provideSecret1(gameNumber, secret1);

    expect(await rspContract.getWinner(gameNumber)).to.equal(expectedWinner);
  }


  it("Should test all happy paths", async function () {
    const { rspContract, addr1, addr2 } = await loadFixture(deployFixture);

    await testGame(Move.ROCK, Move.ROCK, GameResult.Draw);
    await testGame(Move.PAPER, Move.PAPER, GameResult.Draw);
    await testGame(Move.SCISSORS, Move.SCISSORS, GameResult.Draw);

    await testGame(Move.ROCK, Move.PAPER, GameResult.Player2);
    await testGame(Move.PAPER, Move.ROCK, GameResult.Player1);

    await testGame(Move.ROCK, Move.SCISSORS, GameResult.Player1);
    await testGame(Move.SCISSORS, Move.ROCK, GameResult.Player2);

    await testGame(Move.PAPER, Move.SCISSORS, GameResult.Player2);
    await testGame(Move.SCISSORS, Move.PAPER, GameResult.Player1);
  });


  it("Should fail with invalid move2", async function () {
    const { rspContract, addr1, addr2 } = await loadFixture(deployFixture);
    const { gameNumber, secret1 } = await makeMove1(rspContract, addr1, addr2, Move.ROCK);

    await expect(rspContract.connect(addr2).makeMove2(gameNumber, Move.INVALID)).to.be.revertedWith("Invalid move2");
  });


  it("Player1 loses if invalid move1", async function () {
    const { rspContract, addr1, addr2 } = await loadFixture(deployFixture);
    const { gameNumber, secret1 } = await makeMove1(rspContract, addr1, addr2, Move.INVALID);
    await rspContract.connect(addr2).makeMove2(gameNumber, Move.SCISSORS);
  });


  it("Should fail when move2 is done by other addr", async function () {
    const { rspContract, addr1, addr2, otherAddr } = await loadFixture(deployFixture);
    const { gameNumber, secret1 } = await makeMove1(rspContract, addr1, addr2, Move.ROCK);
    await expect(rspContract.connect(otherAddr).makeMove2(gameNumber, Move.SCISSORS)).to.be.revertedWith("should be done by player2 passed on game creation");
  });

  it("Should fail when provideSecret1 is done by other addr", async function () {
    const { rspContract, addr1, addr2, otherAddr } = await loadFixture(deployFixture);
    const { gameNumber, secret1 } = await makeMove1(rspContract, addr1, addr2, Move.ROCK);
    await rspContract.connect(addr2).makeMove2(gameNumber, Move.SCISSORS);

    await expect(rspContract.connect(otherAddr).provideSecret1(gameNumber, secret1)).to.be.revertedWith("should be done by game creator");
  });

  it("Should fail when provideSecret1 is done before move2", async function () {
    const { rspContract, addr1, addr2 } = await loadFixture(deployFixture);
    const { gameNumber, secret1 } = await makeMove1(rspContract, addr1, addr2, Move.ROCK);

    await expect(rspContract.connect(addr1).provideSecret1(gameNumber, secret1)).to.be.revertedWith("move2 is not done");
  });

  
  it("Should fail when read before move1", async function () {
    const { rspContract, addr1, addr2 } = await loadFixture(deployFixture);

    await expect(rspContract.getWinner(InvalidGameNumber)).to.be.revertedWith("game is not created");
  });

  it("Should fail when read before move2", async function () {
    const { rspContract, addr1, addr2 } = await loadFixture(deployFixture);
    const { gameNumber, secret1 } = await makeMove1(rspContract, addr1, addr2, Move.ROCK);

    await expect(rspContract.getWinner(gameNumber)).to.be.revertedWith("move2 is not done");
  });

  it("Should fail when read before provideSecret", async function () {
    const { rspContract, addr1, addr2 } = await loadFixture(deployFixture);
    const { gameNumber, secret1 } = await makeMove1(rspContract, addr1, addr2, Move.ROCK);
    await rspContract.connect(addr2).makeMove2(gameNumber, Move.SCISSORS);

    await expect(rspContract.getWinner(gameNumber)).to.be.revertedWith("provideSecret1 is not done");
  });


  it("Should fail when move2 is done 2nd time", async function () {
    const { rspContract, addr1, addr2 } = await loadFixture(deployFixture);
    const { gameNumber, secret1 } = await makeMove1(rspContract, addr1, addr2, Move.ROCK);
    await rspContract.connect(addr2).makeMove2(gameNumber, Move.SCISSORS);
    await rspContract.connect(addr1).provideSecret1(gameNumber, secret1);

    expect(await rspContract.getWinner(gameNumber)).to.equal(GameResult.Player1);

    // here player2 tries to redo move2
    await expect(rspContract.connect(addr2).makeMove2(gameNumber, Move.PAPER)).to.be.revertedWith("cannot redo");
  });


  it("Should fail when provideSecret1 is done 2nd time", async function () {
    const { rspContract, addr1, addr2 } = await loadFixture(deployFixture);
    const { gameNumber, secret1 } = await makeMove1(rspContract, addr1, addr2, Move.ROCK);
    await rspContract.connect(addr2).makeMove2(gameNumber, Move.SCISSORS);
    await rspContract.connect(addr1).provideSecret1(gameNumber, secret1);

    expect(await rspContract.getWinner(gameNumber)).to.equal(GameResult.Player1);

    // here player1 tries to redo provideSecret1
    await expect(rspContract.connect(addr1).provideSecret1(gameNumber, secret1)).to.be.revertedWith("cannot redo");
  });


  it("Should work when the same players plays 2nd time", async function () {
    const { rspContract, addr1, addr2 } = await loadFixture(deployFixture);
    
    const { gameNumber: gameNumber1, secret1 } = await makeMove1(rspContract, addr1, addr2, Move.ROCK);
    await rspContract.connect(addr2).makeMove2(gameNumber1, Move.SCISSORS);
    await rspContract.connect(addr1).provideSecret1(gameNumber1, secret1);
    expect(await rspContract.getWinner(gameNumber1)).to.equal(GameResult.Player1);

    const { gameNumber: gameNumber2, secret1: secret1_2 } = await makeMove1(rspContract, addr1, addr2, Move.PAPER);
    await rspContract.connect(addr2).makeMove2(gameNumber2, Move.SCISSORS);
    await rspContract.connect(addr1).provideSecret1(gameNumber2, secret1_2);
    expect(await rspContract.getWinner(gameNumber2)).to.equal(GameResult.Player2);

    // result of game1 is the same
    expect(await rspContract.getWinner(gameNumber1)).to.equal(GameResult.Player1);
  });


  it("Should fail when move2 is done for unexisting game", async function () {
    const { rspContract, addr1, addr2 } = await loadFixture(deployFixture);

    await expect(rspContract.connect(addr2).makeMove2(InvalidGameNumber, Move.PAPER)).to.be.revertedWith("game is not created");
  });

  it("Should fail when provideSecret1 is done for unexisting game", async function () {
    const { rspContract, addr1, addr2 } = await loadFixture(deployFixture);

    await expect(rspContract.connect(addr1).provideSecret1(InvalidGameNumber, Move.PAPER)).to.be.revertedWith("game is not created");
  });
});
