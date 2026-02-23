import { expect } from "chai";
import { ethers } from "hardhat";
import { Marketplace, SharedNFT721 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Marketplace", function () {
  let marketplace: Marketplace;
  let nft: SharedNFT721;
  let owner: SignerWithAddress;
  let seller: SignerWithAddress;
  let buyer: SignerWithAddress;
  let feeRecipient: SignerWithAddress;
  let collectionId: bigint;
  let tokenId: bigint;

  beforeEach(async function () {
    [owner, seller, buyer, feeRecipient] = await ethers.getSigners();

    // Deploy SharedNFT721
    const SharedNFT721Factory = await ethers.getContractFactory("SharedNFT721");
    nft = await SharedNFT721Factory.deploy();
    await nft.waitForDeployment();

    // Deploy Marketplace
    const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
    marketplace = await MarketplaceFactory.deploy(feeRecipient.address);
    await marketplace.waitForDeployment();

    // Create test collection
    const tx = await nft.connect(seller).createCollection("Test Collection", "TC", 500);
    const receipt = await tx.wait();
    collectionId = 0n;

    // Mint test NFT
    const mintTx = await nft.connect(seller).mint(collectionId, "ipfs://test-metadata");
    const mintReceipt = await mintTx.wait();
    tokenId = 0n;
  });

  describe("Deployment", function () {
    it("Deploys with the correct feeRecipient", async function () {
      expect(await marketplace.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("PLATFORM_FEE is set to 250 (2.5%)", async function () {
      expect(await marketplace.PLATFORM_FEE()).to.equal(250);
    });

    it("Fails to deploy if feeRecipient is zero address", async function () {
      const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
      await expect(
        MarketplaceFactory.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid fee recipient");
    });
  });

  describe("Listing creation", function () {
    it("Succeeds after approval", async function () {
      // Approve NFT to Marketplace
      await nft.connect(seller).approve(await marketplace.getAddress(), tokenId);

      // Create listing
      const price = ethers.parseEther("1");
      await expect(
        marketplace.connect(seller).createListing(
          await nft.getAddress(),
          tokenId,
          price
        )
      )
        .to.emit(marketplace, "ListingCreated")
        .withArgs(seller.address, await nft.getAddress(), tokenId, price);

      // Verify listing information
      const listing = await marketplace.getListing(await nft.getAddress(), tokenId);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.nftContract).to.equal(await nft.getAddress());
      expect(listing.tokenId).to.equal(tokenId);
      expect(listing.price).to.equal(price);
      expect(listing.active).to.equal(true);

      // Verify listingCount incremented
      expect(await marketplace.listingCount()).to.equal(1);
    });

    it("Fails without approval", async function () {
      const price = ethers.parseEther("1");
      await expect(
        marketplace.connect(seller).createListing(
          await nft.getAddress(),
          tokenId,
          price
        )
      ).to.be.revertedWith("Marketplace not approved");
    });

    it("Fails if non-owner tries to list", async function () {
      await nft.connect(seller).approve(await marketplace.getAddress(), tokenId);

      const price = ethers.parseEther("1");
      await expect(
        marketplace.connect(buyer).createListing(
          await nft.getAddress(),
          tokenId,
          price
        )
      ).to.be.revertedWith("Not the owner");
    });

    it("Fails if price is 0", async function () {
      await nft.connect(seller).approve(await marketplace.getAddress(), tokenId);

      await expect(
        marketplace.connect(seller).createListing(
          await nft.getAddress(),
          tokenId,
          0
        )
      ).to.be.revertedWith("Price must be greater than 0");
    });

    it("Cannot duplicate list an already listed NFT", async function () {
      await nft.connect(seller).approve(await marketplace.getAddress(), tokenId);

      const price = ethers.parseEther("1");
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        tokenId,
        price
      );

      // Attempt to list the same NFT again
      await expect(
        marketplace.connect(seller).createListing(
          await nft.getAddress(),
          tokenId,
          price
        )
      ).to.be.revertedWith("Already listed");
    });

    it("Can also list using setApprovalForAll", async function () {
      // Use setApprovalForAll instead of approve
      await nft.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);

      const price = ethers.parseEther("1");
      await expect(
        marketplace.connect(seller).createListing(
          await nft.getAddress(),
          tokenId,
          price
        )
      ).to.emit(marketplace, "ListingCreated");
    });
  });

  describe("Listing purchase", function () {
    beforeEach(async function () {
      // Create listing
      await nft.connect(seller).approve(await marketplace.getAddress(), tokenId);
      const price = ethers.parseEther("1");
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        tokenId,
        price
      );
    });

    it("Successfully purchases a listing", async function () {
      const price = ethers.parseEther("1");
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
      const feeRecipientBalanceBefore = await ethers.provider.getBalance(feeRecipient.address);

      // Purchase NFT
      await expect(
        marketplace.connect(buyer).buyListing(
          await nft.getAddress(),
          tokenId,
          { value: price }
        )
      )
        .to.emit(marketplace, "ListingSold")
        .withArgs(buyer.address, await nft.getAddress(), tokenId, price);

      // Verify NFT ownership transfer
      expect(await nft.ownerOf(tokenId)).to.equal(buyer.address);

      // Verify listing deactivated
      const listing = await marketplace.getListing(await nft.getAddress(), tokenId);
      expect(listing.active).to.equal(false);

      // Verify seller balance increase (97.5%)
      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      const expectedSellerAmount = (price * 9750n) / 10000n; // 97.5%
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(expectedSellerAmount);

      // Verify fee recipient balance increase (2.5%)
      const feeRecipientBalanceAfter = await ethers.provider.getBalance(feeRecipient.address);
      const expectedFee = (price * 250n) / 10000n; // 2.5%
      expect(feeRecipientBalanceAfter - feeRecipientBalanceBefore).to.equal(expectedFee);
    });

    it("Fails with insufficient funds", async function () {
      const price = ethers.parseEther("1");
      const insufficientAmount = ethers.parseEther("0.5");

      await expect(
        marketplace.connect(buyer).buyListing(
          await nft.getAddress(),
          tokenId,
          { value: insufficientAmount }
        )
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Fails if buying own listing", async function () {
      const price = ethers.parseEther("1");

      await expect(
        marketplace.connect(seller).buyListing(
          await nft.getAddress(),
          tokenId,
          { value: price }
        )
      ).to.be.revertedWith("Cannot buy own listing");
    });

    it("Refunds overpayment", async function () {
      const price = ethers.parseEther("1");
      const overpayment = ethers.parseEther("2");
      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);

      const tx = await marketplace.connect(buyer).buyListing(
        await nft.getAddress(),
        tokenId,
        { value: overpayment }
      );
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);

      // Buyer should only spend price + gas (overpayment is refunded)
      expect(buyerBalanceBefore - buyerBalanceAfter).to.equal(price + gasUsed);
    });

    it("Fee accuracy verification (1 ETH listing)", async function () {
      const price = ethers.parseEther("1");
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
      const feeRecipientBalanceBefore = await ethers.provider.getBalance(feeRecipient.address);

      await marketplace.connect(buyer).buyListing(
        await nft.getAddress(),
        tokenId,
        { value: price }
      );

      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      const feeRecipientBalanceAfter = await ethers.provider.getBalance(feeRecipient.address);

      // Seller: 0.975 ETH
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(ethers.parseEther("0.975"));

      // Fee recipient: 0.025 ETH
      expect(feeRecipientBalanceAfter - feeRecipientBalanceBefore).to.equal(ethers.parseEther("0.025"));
    });
  });

  describe("Listing cancellation", function () {
    beforeEach(async function () {
      // Create listing
      await nft.connect(seller).approve(await marketplace.getAddress(), tokenId);
      const price = ethers.parseEther("1");
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        tokenId,
        price
      );
    });

    it("Seller can cancel a listing", async function () {
      await expect(
        marketplace.connect(seller).cancelListing(
          await nft.getAddress(),
          tokenId
        )
      )
        .to.emit(marketplace, "ListingCanceled")
        .withArgs(seller.address, await nft.getAddress(), tokenId);

      // Verify listing deactivated
      const listing = await marketplace.getListing(await nft.getAddress(), tokenId);
      expect(listing.active).to.equal(false);
    });

    it("Non-seller cannot cancel", async function () {
      await expect(
        marketplace.connect(buyer).cancelListing(
          await nft.getAddress(),
          tokenId
        )
      ).to.be.revertedWith("Not the seller");
    });

    it("Cannot cancel an inactive listing", async function () {
      // Cancel first
      await marketplace.connect(seller).cancelListing(
        await nft.getAddress(),
        tokenId
      );

      // Attempt to cancel again
      await expect(
        marketplace.connect(seller).cancelListing(
          await nft.getAddress(),
          tokenId
        )
      ).to.be.revertedWith("Listing not active");
    });
  });

  describe("Already sold listing", function () {
    it("Cannot repurchase an already sold listing", async function () {
      // Create listing
      await nft.connect(seller).approve(await marketplace.getAddress(), tokenId);
      const price = ethers.parseEther("1");
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        tokenId,
        price
      );

      // First purchase
      await marketplace.connect(buyer).buyListing(
        await nft.getAddress(),
        tokenId,
        { value: price }
      );

      // Attempt second purchase
      await expect(
        marketplace.connect(buyer).buyListing(
          await nft.getAddress(),
          tokenId,
          { value: price }
        )
      ).to.be.revertedWith("Listing not active");
    });
  });

  describe("Fee recipient update", function () {
    it("Owner can change the fee recipient", async function () {
      const [, , , , newRecipient] = await ethers.getSigners();

      await expect(
        marketplace.connect(owner).updateFeeRecipient(newRecipient.address)
      )
        .to.emit(marketplace, "FeeRecipientUpdated")
        .withArgs(feeRecipient.address, newRecipient.address);

      expect(await marketplace.feeRecipient()).to.equal(newRecipient.address);
    });

    it("Non-owner cannot change the fee recipient", async function () {
      const [, , , , newRecipient] = await ethers.getSigners();

      await expect(
        marketplace.connect(seller).updateFeeRecipient(newRecipient.address)
      ).to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
    });

    it("Cannot change to zero address", async function () {
      await expect(
        marketplace.connect(owner).updateFeeRecipient(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid fee recipient");
    });
  });
});
