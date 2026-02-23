import { expect } from "chai";
import { ethers } from "hardhat";
import { SharedNFT1155 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SharedNFT1155", function () {
  let nft: SharedNFT1155;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let minter: SignerWithAddress;

  beforeEach(async function () {
    [owner, creator, minter] = await ethers.getSigners();

    const SharedNFT1155Factory = await ethers.getContractFactory("SharedNFT1155");
    nft = await SharedNFT1155Factory.deploy();
    await nft.waitForDeployment();
  });

  describe("Collection creation", function () {
    it("Creates a collection and emits CollectionCreated event", async function () {
      await expect(
        nft.connect(creator).createCollection("My Collection", "MC", 500)
      )
        .to.emit(nft, "CollectionCreated")
        .withArgs(0, creator.address, "My Collection");

      const collection = await nft.getCollectionInfo(0);
      expect(collection.id).to.equal(0);
      expect(collection.creator).to.equal(creator.address);
      expect(collection.name).to.equal("My Collection");
      expect(collection.symbol).to.equal("MC");
      expect(collection.royaltyPercentage).to.equal(500);
    });

    it("Fails if royalty exceeds 10%", async function () {
      await expect(
        nft.connect(creator).createCollection("My Collection", "MC", 1001)
      ).to.be.revertedWith("Royalty cannot exceed 10%");
    });

    it("Succeeds with royalty up to 10%", async function () {
      await expect(
        nft.connect(creator).createCollection("My Collection", "MC", 1000)
      ).to.emit(nft, "CollectionCreated");
    });
  });

  describe("NFT minting (multi-edition)", function () {
    beforeEach(async function () {
      // Create collection
      await nft.connect(creator).createCollection("My Collection", "MC", 500);
    });

    it("Mints a multi-edition NFT and emits NFTMinted event", async function () {
      const tokenURI = "ipfs://QmTest123";
      const amount = 10;

      await expect(nft.connect(minter).mint(0, amount, tokenURI))
        .to.emit(nft, "NFTMinted")
        .withArgs(0, 0, minter.address, amount, tokenURI);

      expect(await nft.balanceOf(minter.address, 0)).to.equal(amount);
      expect(await nft.uri(0)).to.equal(tokenURI);
      expect(await nft.tokenToCollection(0)).to.equal(0);
      expect(await nft.totalSupply(0)).to.equal(amount);
    });

    it("Fails when minting to a non-existent collection", async function () {
      await expect(
        nft.connect(minter).mint(999, 10, "ipfs://QmTest123")
      ).to.be.revertedWith("Collection does not exist");
    });

    it("Fails if amount is 0", async function () {
      await expect(
        nft.connect(minter).mint(0, 0, "ipfs://QmTest123")
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Anyone can mint NFTs (open minting)", async function () {
      await expect(nft.connect(minter).mint(0, 5, "ipfs://QmTest1"))
        .to.emit(nft, "NFTMinted");

      await expect(nft.connect(owner).mint(0, 10, "ipfs://QmTest2"))
        .to.emit(nft, "NFTMinted");
    });
  });

  describe("View functions", function () {
    it("totalCollections returns total number of collections", async function () {
      expect(await nft.totalCollections()).to.equal(0);
      await nft.connect(creator).createCollection("Collection 1", "C1", 500);
      expect(await nft.totalCollections()).to.equal(1);
      await nft.connect(creator).createCollection("Collection 2", "C2", 300);
      expect(await nft.totalCollections()).to.equal(2);
    });

    it("totalTokenTypes returns total number of token types", async function () {
      await nft.connect(creator).createCollection("Collection 1", "C1", 500);
      expect(await nft.totalTokenTypes()).to.equal(0);
      await nft.connect(minter).mint(0, 10, "ipfs://QmTest1");
      expect(await nft.totalTokenTypes()).to.equal(1);
      await nft.connect(minter).mint(0, 5, "ipfs://QmTest2");
      expect(await nft.totalTokenTypes()).to.equal(2);
    });

    it("totalSupply returns total supply for a specific token", async function () {
      await nft.connect(creator).createCollection("Collection 1", "C1", 500);
      await nft.connect(minter).mint(0, 10, "ipfs://QmTest1");
      expect(await nft.totalSupply(0)).to.equal(10);
    });
  });
});
