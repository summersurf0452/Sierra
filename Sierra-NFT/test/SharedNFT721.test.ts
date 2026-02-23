import { expect } from "chai";
import { ethers } from "hardhat";
import { SharedNFT721 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SharedNFT721", function () {
  let nft: SharedNFT721;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let minter: SignerWithAddress;

  beforeEach(async function () {
    [owner, creator, minter] = await ethers.getSigners();

    const SharedNFT721Factory = await ethers.getContractFactory("SharedNFT721");
    nft = await SharedNFT721Factory.deploy();
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

  describe("NFT minting", function () {
    beforeEach(async function () {
      // Create collection
      await nft.connect(creator).createCollection("My Collection", "MC", 500);
    });

    it("Mints an NFT and emits NFTMinted event", async function () {
      const tokenURI = "ipfs://QmTest123";

      await expect(nft.connect(minter).mint(0, tokenURI))
        .to.emit(nft, "NFTMinted")
        .withArgs(0, 0, minter.address, tokenURI);

      expect(await nft.ownerOf(0)).to.equal(minter.address);
      expect(await nft.tokenURI(0)).to.equal(tokenURI);
      expect(await nft.tokenToCollection(0)).to.equal(0);
    });

    it("Fails when minting to a non-existent collection", async function () {
      await expect(
        nft.connect(minter).mint(999, "ipfs://QmTest123")
      ).to.be.revertedWith("Collection does not exist");
    });

    it("Anyone can mint NFTs (open minting)", async function () {
      await expect(nft.connect(minter).mint(0, "ipfs://QmTest1"))
        .to.emit(nft, "NFTMinted");

      await expect(nft.connect(owner).mint(0, "ipfs://QmTest2"))
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

    it("totalSupply returns total number of tokens", async function () {
      await nft.connect(creator).createCollection("Collection 1", "C1", 500);
      expect(await nft.totalSupply()).to.equal(0);
      await nft.connect(minter).mint(0, "ipfs://QmTest1");
      expect(await nft.totalSupply()).to.equal(1);
      await nft.connect(minter).mint(0, "ipfs://QmTest2");
      expect(await nft.totalSupply()).to.equal(2);
    });
  });
});
