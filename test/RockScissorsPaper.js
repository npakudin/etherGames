const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");

describe("RockScissorsPaper contract", function () {
  const Move = {
    ROCK: 0,
    PAPER: 1,
    SCISSORS: 2,
  }
  const InvalidMoves = [Move.INVALID, Move.INVALID_MAX, Move.INVALID_MIN];

  async function deployFixture() {
    const RockScissorsPaper = await ethers.getContractFactory("RockScissorsPaper");
    const [owner, addr1, addr2] = await ethers.getSigners();

    const rspContract = await RockScissorsPaper.deploy();

    await rspContract.deployed();

    return { RockScissorsPaper, rspContract, owner, addr1, addr2 };
  }

  async function testGame(rspContract, addr1, addr2, move1, move2, expectedWinner) {
    let gameNumber;
    const captureValue = (value) => {
      gameNumber = value
        return true
    };
    await expect(rspContract.connect(addr1).createGameAndMakeMove1(addr2.address, move1))
      .to.emit(rspContract, "Created")
      .withArgs(addr1.address, addr2.address, captureValue);

    await rspContract.connect(addr2).makeMove2(gameNumber, move2);

    let winnerAddr = '0x0000000000000000000000000000000000000000';
    switch (expectedWinner) {
      case 0:
        winnerAddr = '0x0000000000000000000000000000000000000000';
        break;
      case 1:
        winnerAddr = addr1.address;
        break;
      case 2:
        winnerAddr = addr2.address;
        break;
      default:
        throw "invalid expectedWinner";
    }
    expect(await rspContract.getWinner(gameNumber)).to.equal(winnerAddr);
  }

  it("Should create game", async function () {
    const { rspContract, addr1, addr2 } = await loadFixture(deployFixture);

    await testGame(rspContract, addr1, addr2, Move.ROCK, Move.ROCK, 0);
    await testGame(rspContract, addr1, addr2, Move.PAPER, Move.PAPER, 0);
    await testGame(rspContract, addr1, addr2, Move.SCISSORS, Move.SCISSORS, 0);

    await testGame(rspContract, addr1, addr2, Move.ROCK, Move.PAPER, 2);
    await testGame(rspContract, addr1, addr2, Move.PAPER, Move.ROCK, 1);

    await testGame(rspContract, addr1, addr2, Move.ROCK, Move.SCISSORS, 1);
    await testGame(rspContract, addr1, addr2, Move.SCISSORS, Move.ROCK, 2);

    await testGame(rspContract, addr1, addr2, Move.PAPER, Move.SCISSORS, 2);
    await testGame(rspContract, addr1, addr2, Move.SCISSORS, Move.PAPER, 1);
  });
});
