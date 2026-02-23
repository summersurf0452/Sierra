import { expect } from "chai";
import { ethers } from "hardhat";
import { Offers, SharedNFT721 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Offers", function () {
  let offers: Offers;
  let nft: SharedNFT721;
  let owner: SignerWithAddress;
  let nftOwner: SignerWithAddress;
  let offerer: SignerWithAddress;
  let other: SignerWithAddress;
  let feeRecipient: SignerWithAddress;
  let collectionId: bigint;
  let tokenId: bigint;
  let expiresAt: number;

  const ONE_HOUR = 3600;
  const ONE_ETH = ethers.parseEther("1");

  beforeEach(async function () {
    [owner, nftOwner, offerer, other, feeRecipient] = await ethers.getSigners();

    // Deploy SharedNFT721
    const SharedNFT721Factory = await ethers.getContractFactory("SharedNFT721");
    nft = await SharedNFT721Factory.deploy();
    await nft.waitForDeployment();

    // Deploy Offers
    const OffersFactory = await ethers.getContractFactory("Offers");
    offers = await OffersFactory.deploy(feeRecipient.address);
    await offers.waitForDeployment();

    // Create test collection + mint NFT
    await nft.connect(nftOwner).createCollection("Test Collection", "TC", 500);
    collectionId = 0n;

    await nft.connect(nftOwner).mint(collectionId, "ipfs://test-metadata");
    tokenId = 0n;

    // Approve NFT to Offers contract (for acceptOffer)
    await nft.connect(nftOwner).approve(await offers.getAddress(), tokenId);

    // Offer expiration time: current + 1 hour
    const latestTime = await time.latest();
    expiresAt = latestTime + ONE_HOUR;
  });

  describe("Deployment", function () {
    it("Deploys with the correct feeRecipient", async function () {
      expect(await offers.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("PLATFORM_FEE is set to 250 (2.5%)", async function () {
      expect(await offers.PLATFORM_FEE()).to.equal(250);
    });

    it("Fails to deploy if feeRecipient is zero address", async function () {
      const OffersFactory = await ethers.getContractFactory("Offers");
      await expect(
        OffersFactory.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid fee recipient");
    });
  });

  describe("Offer creation", function () {
    it("Can create an offer with msg.value > 0", async function () {
      await expect(
        offers.connect(offerer).createOffer(
          await nft.getAddress(),
          tokenId,
          expiresAt,
          { value: ONE_ETH }
        )
      )
        .to.emit(offers, "OfferCreated")
        .withArgs(0, offerer.address, await nft.getAddress(), tokenId, ONE_ETH, expiresAt);

      // Verify offer information
      const offer = await offers.offers(0);
      expect(offer.offerer).to.equal(offerer.address);
      expect(offer.nftContract).to.equal(await nft.getAddress());
      expect(offer.tokenId).to.equal(tokenId);
      expect(offer.price).to.equal(ONE_ETH);
      expect(offer.expiresAt).to.equal(expiresAt);
      expect(offer.accepted).to.equal(false);
      expect(offer.canceled).to.equal(false);
      expect(offer.withdrawn).to.equal(false);
    });

    it("Fails if msg.value is 0", async function () {
      await expect(
        offers.connect(offerer).createOffer(
          await nft.getAddress(),
          tokenId,
          expiresAt,
          { value: 0 }
        )
      ).to.be.revertedWith("Offer price must be greater than 0");
    });

    it("Fails if expiresAt is in the past", async function () {
      const pastTime = (await time.latest()) - 100;
      await expect(
        offers.connect(offerer).createOffer(
          await nft.getAddress(),
          tokenId,
          pastTime,
          { value: ONE_ETH }
        )
      ).to.be.revertedWith("Expiry must be in the future");
    });

    it("Gets added to nftOffers array", async function () {
      await offers.connect(offerer).createOffer(
        await nft.getAddress(),
        tokenId,
        expiresAt,
        { value: ONE_ETH }
      );

      const offerIds = await offers.getOffersByNFT(await nft.getAddress(), tokenId);
      expect(offerIds.length).to.equal(1);
      expect(offerIds[0]).to.equal(0);
    });
  });

  describe("Offer acceptance", function () {
    beforeEach(async function () {
      // Create offer
      await offers.connect(offerer).createOffer(
        await nft.getAddress(),
        tokenId,
        expiresAt,
        { value: ONE_ETH }
      );
    });

    it("NFT owner can accept an offer", async function () {
      const sellerBalBefore = await ethers.provider.getBalance(nftOwner.address);
      const feeRecipientBalBefore = await ethers.provider.getBalance(feeRecipient.address);

      const tx = await offers.connect(nftOwner).acceptOffer(0);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      await expect(tx)
        .to.emit(offers, "OfferAccepted")
        .withArgs(0, nftOwner.address);

      // Verify NFT transferred to offerer
      expect(await nft.ownerOf(tokenId)).to.equal(offerer.address);

      // Fee: 1 ETH * 2.5% = 0.025 ETH
      const sellerBalAfter = await ethers.provider.getBalance(nftOwner.address);
      const feeRecipientBalAfter = await ethers.provider.getBalance(feeRecipient.address);

      const expectedFee = (ONE_ETH * 250n) / 10000n;
      const expectedSellerAmount = ONE_ETH - expectedFee;

      expect(sellerBalAfter - sellerBalBefore + gasUsed).to.equal(expectedSellerAmount);
      expect(feeRecipientBalAfter - feeRecipientBalBefore).to.equal(expectedFee);

      // Verify offer accepted status
      const offer = await offers.offers(0);
      expect(offer.accepted).to.equal(true);
    });

    it("Non-NFT owner cannot accept", async function () {
      await expect(
        offers.connect(other).acceptOffer(0)
      ).to.be.revertedWith("Not the NFT owner");
    });

    it("Expired offer cannot be accepted", async function () {
      await time.increaseTo(expiresAt + 1);

      await expect(
        offers.connect(nftOwner).acceptOffer(0)
      ).to.be.revertedWith("Offer expired");
    });
  });

  describe("Offer cancellation", function () {
    beforeEach(async function () {
      await offers.connect(offerer).createOffer(
        await nft.getAddress(),
        tokenId,
        expiresAt,
        { value: ONE_ETH }
      );
    });

    it("Offerer can cancel an offer", async function () {
      const balBefore = await ethers.provider.getBalance(offerer.address);

      const tx = await offers.connect(offerer).cancelOffer(0);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      await expect(tx).to.emit(offers, "OfferCanceled").withArgs(0);

      // Verify deposit refund
      const balAfter = await ethers.provider.getBalance(offerer.address);
      expect(balAfter - balBefore + gasUsed).to.equal(ONE_ETH);

      // Verify offer canceled status
      const offer = await offers.offers(0);
      expect(offer.canceled).to.equal(true);
    });

    it("Non-offerer cannot cancel", async function () {
      await expect(
        offers.connect(other).cancelOffer(0)
      ).to.be.revertedWith("Not the offerer");
    });

    it("Already accepted offer cannot be canceled", async function () {
      await offers.connect(nftOwner).acceptOffer(0);

      await expect(
        offers.connect(offerer).cancelOffer(0)
      ).to.be.revertedWith("Already accepted");
    });
  });

  describe("Expired withdrawal", function () {
    beforeEach(async function () {
      await offers.connect(offerer).createOffer(
        await nft.getAddress(),
        tokenId,
        expiresAt,
        { value: ONE_ETH }
      );
    });

    it("After expiration, offerer can withdraw deposit", async function () {
      await time.increaseTo(expiresAt + 1);

      const balBefore = await ethers.provider.getBalance(offerer.address);

      const tx = await offers.connect(offerer).withdrawExpired(0);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      await expect(tx).to.emit(offers, "OfferWithdrawn").withArgs(0);

      // Verify deposit refund
      const balAfter = await ethers.provider.getBalance(offerer.address);
      expect(balAfter - balBefore + gasUsed).to.equal(ONE_ETH);

      // Verify offer withdrawn status
      const offer = await offers.offers(0);
      expect(offer.withdrawn).to.equal(true);
    });

    it("Cannot withdraw before expiration", async function () {
      await expect(
        offers.connect(offerer).withdrawExpired(0)
      ).to.be.revertedWith("Offer not expired");
    });

    it("Non-offerer cannot withdraw", async function () {
      await time.increaseTo(expiresAt + 1);

      await expect(
        offers.connect(other).withdrawExpired(0)
      ).to.be.revertedWith("Not the offerer");
    });
  });

  describe("Multiple offers", function () {
    it("Can create multiple offers for the same NFT", async function () {
      const halfEth = ethers.parseEther("0.5");

      await offers.connect(offerer).createOffer(
        await nft.getAddress(), tokenId, expiresAt, { value: ONE_ETH }
      );

      await offers.connect(other).createOffer(
        await nft.getAddress(), tokenId, expiresAt, { value: halfEth }
      );

      const offerIds = await offers.getOffersByNFT(await nft.getAddress(), tokenId);
      expect(offerIds.length).to.equal(2);
      expect(offerIds[0]).to.equal(0);
      expect(offerIds[1]).to.equal(1);

      // Verify each offer's information
      const offer0 = await offers.offers(0);
      expect(offer0.offerer).to.equal(offerer.address);
      expect(offer0.price).to.equal(ONE_ETH);

      const offer1 = await offers.offers(1);
      expect(offer1.offerer).to.equal(other.address);
      expect(offer1.price).to.equal(halfEth);
    });
  });

  describe("Fee recipient update", function () {
    it("Owner can change the fee recipient", async function () {
      await expect(
        offers.connect(owner).updateFeeRecipient(offerer.address)
      )
        .to.emit(offers, "FeeRecipientUpdated")
        .withArgs(feeRecipient.address, offerer.address);

      expect(await offers.feeRecipient()).to.equal(offerer.address);
    });

    it("Non-owner cannot change the fee recipient", async function () {
      await expect(
        offers.connect(offerer).updateFeeRecipient(other.address)
      ).to.be.revertedWithCustomError(offers, "OwnableUnauthorizedAccount");
    });
  });
});
