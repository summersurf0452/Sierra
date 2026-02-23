import { expect } from "chai";
import { ethers } from "hardhat";
import { Auction, SharedNFT721 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Auction", function () {
  let auction: Auction;
  let nft: SharedNFT721;
  let owner: SignerWithAddress;
  let seller: SignerWithAddress;
  let bidder1: SignerWithAddress;
  let bidder2: SignerWithAddress;
  let feeRecipient: SignerWithAddress;
  let collectionId: bigint;
  let tokenId: bigint;
  let auctionEndTime: number;

  const ONE_HOUR = 3600;
  const ONE_ETH = ethers.parseEther("1");
  const TWO_ETH = ethers.parseEther("2");

  beforeEach(async function () {
    [owner, seller, bidder1, bidder2, feeRecipient] = await ethers.getSigners();

    // SharedNFT721 배포
    const SharedNFT721Factory = await ethers.getContractFactory("SharedNFT721");
    nft = await SharedNFT721Factory.deploy();
    await nft.waitForDeployment();

    // Auction 배포
    const AuctionFactory = await ethers.getContractFactory("Auction");
    auction = await AuctionFactory.deploy(feeRecipient.address);
    await auction.waitForDeployment();

    // 테스트용 컬렉션 생성 + NFT 민팅
    await nft.connect(seller).createCollection("Test Collection", "TC", 500);
    collectionId = 0n;

    await nft.connect(seller).mint(collectionId, "ipfs://test-metadata");
    tokenId = 0n;

    // NFT를 Auction 컨트랙트에 approve
    await nft.connect(seller).approve(await auction.getAddress(), tokenId);

    // 경매 종료 시간: 현재 + 1시간
    const latestTime = await time.latest();
    auctionEndTime = latestTime + ONE_HOUR;
  });

  describe("배포", function () {
    it("올바른 feeRecipient로 배포된다", async function () {
      expect(await auction.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("PLATFORM_FEE가 250 (2.5%)으로 설정된다", async function () {
      expect(await auction.PLATFORM_FEE()).to.equal(250);
    });

    it("ANTI_SNIPE_DURATION이 10분으로 설정된다", async function () {
      expect(await auction.ANTI_SNIPE_DURATION()).to.equal(600);
    });

    it("feeRecipient가 zero address면 배포 실패한다", async function () {
      const AuctionFactory = await ethers.getContractFactory("Auction");
      await expect(
        AuctionFactory.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid fee recipient");
    });
  });

  describe("경매 생성", function () {
    it("NFT 소유자가 경매를 생성할 수 있다", async function () {
      await expect(
        auction.connect(seller).createAuction(
          await nft.getAddress(),
          tokenId,
          ONE_ETH,
          auctionEndTime
        )
      )
        .to.emit(auction, "AuctionCreated")
        .withArgs(0, seller.address, await nft.getAddress(), tokenId, ONE_ETH, auctionEndTime);

      // NFT가 Auction 컨트랙트로 에스크로 이전 확인
      expect(await nft.ownerOf(tokenId)).to.equal(await auction.getAddress());

      // 경매 정보 확인
      const auctionInfo = await auction.auctions(0);
      expect(auctionInfo.seller).to.equal(seller.address);
      expect(auctionInfo.startPrice).to.equal(ONE_ETH);
      expect(auctionInfo.endTime).to.equal(auctionEndTime);
      expect(auctionInfo.highestBidder).to.equal(ethers.ZeroAddress);
      expect(auctionInfo.highestBid).to.equal(0);
      expect(auctionInfo.settled).to.equal(false);
      expect(auctionInfo.canceled).to.equal(false);

      // minBidIncrement = 1 ETH * 500 / 10000 = 0.05 ETH
      expect(auctionInfo.minBidIncrement).to.equal(ethers.parseEther("0.05"));
    });

    it("소유자가 아닌 사용자는 경매를 생성할 수 없다", async function () {
      await expect(
        auction.connect(bidder1).createAuction(
          await nft.getAddress(),
          tokenId,
          ONE_ETH,
          auctionEndTime
        )
      ).to.be.revertedWith("Not the owner");
    });

    it("startPrice가 0이면 실패한다", async function () {
      await expect(
        auction.connect(seller).createAuction(
          await nft.getAddress(),
          tokenId,
          0,
          auctionEndTime
        )
      ).to.be.revertedWith("Start price must be greater than 0");
    });

    it("endTime이 과거이면 실패한다", async function () {
      const pastTime = (await time.latest()) - 100;
      await expect(
        auction.connect(seller).createAuction(
          await nft.getAddress(),
          tokenId,
          ONE_ETH,
          pastTime
        )
      ).to.be.revertedWith("End time must be in the future");
    });

    it("minBidIncrement가 자동으로 계산된다 (최소 1 wei)", async function () {
      // 매우 작은 startPrice (19 wei) -> 19 * 500 / 10000 = 0 -> 최소 1 wei
      await nft.connect(seller).mint(collectionId, "ipfs://test2");
      const tokenId2 = 1n;
      await nft.connect(seller).approve(await auction.getAddress(), tokenId2);

      await auction.connect(seller).createAuction(
        await nft.getAddress(),
        tokenId2,
        19, // 19 wei
        auctionEndTime
      );

      const auctionInfo = await auction.auctions(0);
      expect(auctionInfo.minBidIncrement).to.equal(1); // 최소 1 wei
    });
  });

  describe("입찰", function () {
    beforeEach(async function () {
      await auction.connect(seller).createAuction(
        await nft.getAddress(),
        tokenId,
        ONE_ETH,
        auctionEndTime
      );
    });

    it("startPrice 이상으로 첫 입찰에 성공한다", async function () {
      await expect(
        auction.connect(bidder1).placeBid(0, { value: ONE_ETH })
      )
        .to.emit(auction, "BidPlaced")
        .withArgs(0, bidder1.address, ONE_ETH);

      const auctionInfo = await auction.auctions(0);
      expect(auctionInfo.highestBidder).to.equal(bidder1.address);
      expect(auctionInfo.highestBid).to.equal(ONE_ETH);
    });

    it("startPrice 미만으로 입찰하면 실패한다", async function () {
      const lowBid = ethers.parseEther("0.5");
      await expect(
        auction.connect(bidder1).placeBid(0, { value: lowBid })
      ).to.be.revertedWith("Bid below start price");
    });

    it("minBidIncrement 미만으로 입찰하면 실패한다", async function () {
      await auction.connect(bidder1).placeBid(0, { value: ONE_ETH });

      // minBidIncrement = 0.05 ETH, 그래서 1.04 ETH로 입찰하면 실패
      const lowBid = ethers.parseEther("1.04");
      await expect(
        auction.connect(bidder2).placeBid(0, { value: lowBid })
      ).to.be.revertedWith("Bid increment too low");
    });

    it("seller는 입찰할 수 없다", async function () {
      await expect(
        auction.connect(seller).placeBid(0, { value: ONE_ETH })
      ).to.be.revertedWith("Seller cannot bid");
    });

    it("종료된 경매에 입찰할 수 없다", async function () {
      // 경매 종료 시간까지 이동
      await time.increaseTo(auctionEndTime + 1);

      await expect(
        auction.connect(bidder1).placeBid(0, { value: ONE_ETH })
      ).to.be.revertedWith("Auction ended");
    });

    it("이전 최고 입찰자의 금액이 pendingReturns에 기록된다", async function () {
      // bidder1이 1 ETH 입찰
      await auction.connect(bidder1).placeBid(0, { value: ONE_ETH });

      // bidder2가 2 ETH 입찰
      await auction.connect(bidder2).placeBid(0, { value: TWO_ETH });

      // bidder1의 pendingReturns 확인
      const pending = await auction.pendingReturns(0, bidder1.address);
      expect(pending).to.equal(ONE_ETH);
    });
  });

  describe("Anti-sniping", function () {
    it("마감 10분 전 입찰 시 endTime이 연장된다", async function () {
      await auction.connect(seller).createAuction(
        await nft.getAddress(),
        tokenId,
        ONE_ETH,
        auctionEndTime
      );

      // 마감 5분 전으로 이동
      await time.increaseTo(auctionEndTime - 300);

      await auction.connect(bidder1).placeBid(0, { value: ONE_ETH });

      const auctionInfo = await auction.auctions(0);
      // endTime이 현재 시간 + 10분으로 연장됨
      const currentTime = await time.latest();
      expect(auctionInfo.endTime).to.equal(currentTime + 600);
    });
  });

  describe("정산", function () {
    beforeEach(async function () {
      await auction.connect(seller).createAuction(
        await nft.getAddress(),
        tokenId,
        ONE_ETH,
        auctionEndTime
      );
    });

    it("무입찰 시 NFT가 seller에게 반환된다", async function () {
      // 경매 종료 시간까지 이동
      await time.increaseTo(auctionEndTime + 1);

      await expect(auction.settleAuction(0))
        .to.emit(auction, "AuctionCanceled")
        .withArgs(0);

      // NFT가 seller에게 반환 확인
      expect(await nft.ownerOf(tokenId)).to.equal(seller.address);
    });

    it("낙찰 시 NFT 전송 + 수수료 계산이 정확하다", async function () {
      // bidder1이 2 ETH 입찰
      await auction.connect(bidder1).placeBid(0, { value: TWO_ETH });

      // 경매 종료
      await time.increaseTo(auctionEndTime + 1);

      const sellerBalBefore = await ethers.provider.getBalance(seller.address);
      const feeRecipientBalBefore = await ethers.provider.getBalance(feeRecipient.address);

      await expect(auction.settleAuction(0))
        .to.emit(auction, "AuctionSettled")
        .withArgs(0, bidder1.address, TWO_ETH);

      // NFT가 bidder1에게 전송 확인
      expect(await nft.ownerOf(tokenId)).to.equal(bidder1.address);

      // 수수료: 2 ETH * 2.5% = 0.05 ETH
      const sellerBalAfter = await ethers.provider.getBalance(seller.address);
      const feeRecipientBalAfter = await ethers.provider.getBalance(feeRecipient.address);

      const expectedFee = (TWO_ETH * 250n) / 10000n;
      const expectedSellerAmount = TWO_ETH - expectedFee;

      expect(sellerBalAfter - sellerBalBefore).to.equal(expectedSellerAmount);
      expect(feeRecipientBalAfter - feeRecipientBalBefore).to.equal(expectedFee);
    });

    it("미종료 경매는 정산할 수 없다", async function () {
      await expect(auction.settleAuction(0)).to.be.revertedWith("Auction not ended");
    });

    it("이미 정산된 경매는 다시 정산할 수 없다", async function () {
      await time.increaseTo(auctionEndTime + 1);
      await auction.settleAuction(0);

      await expect(auction.settleAuction(0)).to.be.revertedWith("Already settled");
    });
  });

  describe("인출 (Pull-over-Push)", function () {
    it("pendingReturns에서 인출에 성공한다", async function () {
      await auction.connect(seller).createAuction(
        await nft.getAddress(),
        tokenId,
        ONE_ETH,
        auctionEndTime
      );

      // bidder1이 1 ETH 입찰
      await auction.connect(bidder1).placeBid(0, { value: ONE_ETH });

      // bidder2가 2 ETH 입찰 → bidder1은 pendingReturns에 1 ETH
      await auction.connect(bidder2).placeBid(0, { value: TWO_ETH });

      const balBefore = await ethers.provider.getBalance(bidder1.address);

      const tx = await auction.connect(bidder1).withdraw(0);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balAfter = await ethers.provider.getBalance(bidder1.address);
      expect(balAfter - balBefore + gasUsed).to.equal(ONE_ETH);

      // pendingReturns가 0인지 확인
      expect(await auction.pendingReturns(0, bidder1.address)).to.equal(0);
    });

    it("잔액이 0이면 인출에 실패한다", async function () {
      await auction.connect(seller).createAuction(
        await nft.getAddress(),
        tokenId,
        ONE_ETH,
        auctionEndTime
      );

      await expect(
        auction.connect(bidder1).withdraw(0)
      ).to.be.revertedWith("No funds to withdraw");
    });
  });

  describe("취소", function () {
    it("무입찰 시 seller가 취소할 수 있다", async function () {
      await auction.connect(seller).createAuction(
        await nft.getAddress(),
        tokenId,
        ONE_ETH,
        auctionEndTime
      );

      await expect(auction.connect(seller).cancelAuction(0))
        .to.emit(auction, "AuctionCanceled")
        .withArgs(0);

      // NFT가 seller에게 반환 확인
      expect(await nft.ownerOf(tokenId)).to.equal(seller.address);

      // 경매 canceled 상태 확인
      const auctionInfo = await auction.auctions(0);
      expect(auctionInfo.canceled).to.equal(true);
    });

    it("입찰이 있으면 취소할 수 없다", async function () {
      await auction.connect(seller).createAuction(
        await nft.getAddress(),
        tokenId,
        ONE_ETH,
        auctionEndTime
      );

      // bidder1이 입찰
      await auction.connect(bidder1).placeBid(0, { value: ONE_ETH });

      await expect(
        auction.connect(seller).cancelAuction(0)
      ).to.be.revertedWith("Bids exist, cannot cancel");
    });

    it("seller가 아닌 사용자는 취소할 수 없다", async function () {
      await auction.connect(seller).createAuction(
        await nft.getAddress(),
        tokenId,
        ONE_ETH,
        auctionEndTime
      );

      await expect(
        auction.connect(bidder1).cancelAuction(0)
      ).to.be.revertedWith("Not the seller");
    });
  });

  describe("수수료 수취자 업데이트", function () {
    it("오너가 수수료 수취자를 변경할 수 있다", async function () {
      await expect(
        auction.connect(owner).updateFeeRecipient(bidder1.address)
      )
        .to.emit(auction, "FeeRecipientUpdated")
        .withArgs(feeRecipient.address, bidder1.address);

      expect(await auction.feeRecipient()).to.equal(bidder1.address);
    });

    it("오너가 아니면 수수료 수취자를 변경할 수 없다", async function () {
      await expect(
        auction.connect(seller).updateFeeRecipient(bidder1.address)
      ).to.be.revertedWithCustomError(auction, "OwnableUnauthorizedAccount");
    });
  });
});
