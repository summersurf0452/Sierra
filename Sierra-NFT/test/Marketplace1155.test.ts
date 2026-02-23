import { expect } from "chai";
import { ethers } from "hardhat";
import { Marketplace1155, SharedNFT1155 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Marketplace1155", function () {
  let marketplace: Marketplace1155;
  let nft: SharedNFT1155;
  let owner: SignerWithAddress;
  let seller: SignerWithAddress;
  let buyer: SignerWithAddress;
  let feeRecipient: SignerWithAddress;
  let collectionId: bigint;
  let tokenId: bigint;

  const MINT_AMOUNT = 10n;
  const PRICE_PER_UNIT = ethers.parseEther("0.1");

  beforeEach(async function () {
    [owner, seller, buyer, feeRecipient] = await ethers.getSigners();

    // SharedNFT1155 배포
    const SharedNFT1155Factory = await ethers.getContractFactory("SharedNFT1155");
    nft = await SharedNFT1155Factory.deploy();
    await nft.waitForDeployment();

    // Marketplace1155 배포
    const Marketplace1155Factory = await ethers.getContractFactory("Marketplace1155");
    marketplace = await Marketplace1155Factory.deploy(feeRecipient.address);
    await marketplace.waitForDeployment();

    // 테스트용 컬렉션 생성
    await nft.connect(seller).createCollection("Test Collection", "TC", 500);
    collectionId = 0n;

    // 테스트용 ERC-1155 NFT 민팅 (10개)
    await nft.connect(seller).mint(collectionId, MINT_AMOUNT, "ipfs://test-metadata");
    tokenId = 0n;

    // Marketplace1155에 setApprovalForAll
    await nft.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
  });

  describe("배포", function () {
    it("올바른 feeRecipient로 배포된다", async function () {
      expect(await marketplace.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("PLATFORM_FEE가 250 (2.5%)으로 설정된다", async function () {
      expect(await marketplace.PLATFORM_FEE()).to.equal(250);
    });

    it("feeRecipient가 zero address면 배포 실패한다", async function () {
      const Factory = await ethers.getContractFactory("Marketplace1155");
      await expect(
        Factory.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid fee recipient");
    });
  });

  describe("리스팅 생성", function () {
    it("정상적으로 리스팅을 생성할 수 있다", async function () {
      await expect(
        marketplace.connect(seller).createListing(
          await nft.getAddress(),
          tokenId,
          MINT_AMOUNT,
          PRICE_PER_UNIT
        )
      )
        .to.emit(marketplace, "Listing1155Created")
        .withArgs(0, seller.address, await nft.getAddress(), tokenId, MINT_AMOUNT, PRICE_PER_UNIT);

      // 에스크로 확인: 마켓플레이스에 토큰 이동
      expect(
        await nft.balanceOf(await marketplace.getAddress(), tokenId)
      ).to.equal(MINT_AMOUNT);

      // seller 잔고 감소
      expect(await nft.balanceOf(seller.address, tokenId)).to.equal(0);

      // 리스팅 정보 확인
      const listing = await marketplace.getListing(0);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.amount).to.equal(MINT_AMOUNT);
      expect(listing.pricePerUnit).to.equal(PRICE_PER_UNIT);
      expect(listing.active).to.equal(true);
    });

    it("balance 부족하면 실패한다", async function () {
      await expect(
        marketplace.connect(seller).createListing(
          await nft.getAddress(),
          tokenId,
          MINT_AMOUNT + 1n, // 11개 (보유: 10개)
          PRICE_PER_UNIT
        )
      ).to.be.revertedWith("Insufficient balance");
    });

    it("approval 없으면 실패한다", async function () {
      // buyer는 approval 없음
      // buyer에게 토큰 전송
      await nft.connect(seller).safeTransferFrom(
        seller.address, buyer.address, tokenId, 5n, "0x"
      );

      await expect(
        marketplace.connect(buyer).createListing(
          await nft.getAddress(),
          tokenId,
          5n,
          PRICE_PER_UNIT
        )
      ).to.be.revertedWith("Marketplace not approved");
    });

    it("amount가 0이면 실패한다", async function () {
      await expect(
        marketplace.connect(seller).createListing(
          await nft.getAddress(),
          tokenId,
          0,
          PRICE_PER_UNIT
        )
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("pricePerUnit이 0이면 실패한다", async function () {
      await expect(
        marketplace.connect(seller).createListing(
          await nft.getAddress(),
          tokenId,
          MINT_AMOUNT,
          0
        )
      ).to.be.revertedWith("Price must be greater than 0");
    });
  });

  describe("부분 구매", function () {
    beforeEach(async function () {
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        tokenId,
        MINT_AMOUNT,
        PRICE_PER_UNIT
      );
    });

    it("10개 중 3개를 구매하면 listing.amount가 7이 된다", async function () {
      const buyAmount = 3n;
      const totalPrice = PRICE_PER_UNIT * buyAmount;

      await expect(
        marketplace.connect(buyer).buyListing(0, buyAmount, { value: totalPrice })
      )
        .to.emit(marketplace, "Listing1155Sold")
        .withArgs(0, buyer.address, buyAmount, totalPrice);

      // 리스팅에 7개 남음
      const listing = await marketplace.getListing(0);
      expect(listing.amount).to.equal(7);
      expect(listing.active).to.equal(true);

      // buyer가 3개 보유
      expect(await nft.balanceOf(buyer.address, tokenId)).to.equal(3);
    });

    it("나머지 7개도 구매할 수 있다", async function () {
      // 첫 번째: 3개 구매
      await marketplace.connect(buyer).buyListing(0, 3n, {
        value: PRICE_PER_UNIT * 3n,
      });

      // 두 번째: 7개 구매
      const totalPrice = PRICE_PER_UNIT * 7n;
      await marketplace.connect(buyer).buyListing(0, 7n, {
        value: totalPrice,
      });

      // 리스팅 소진 -> inactive
      const listing = await marketplace.getListing(0);
      expect(listing.amount).to.equal(0);
      expect(listing.active).to.equal(false);

      // buyer가 10개 보유
      expect(await nft.balanceOf(buyer.address, tokenId)).to.equal(10);
    });
  });

  describe("전량 구매", function () {
    it("전량 구매 시 listing이 비활성화된다", async function () {
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        tokenId,
        MINT_AMOUNT,
        PRICE_PER_UNIT
      );

      const totalPrice = PRICE_PER_UNIT * MINT_AMOUNT;
      await marketplace.connect(buyer).buyListing(0, MINT_AMOUNT, {
        value: totalPrice,
      });

      const listing = await marketplace.getListing(0);
      expect(listing.amount).to.equal(0);
      expect(listing.active).to.equal(false);

      expect(await nft.balanceOf(buyer.address, tokenId)).to.equal(MINT_AMOUNT);
    });
  });

  describe("수수료", function () {
    it("totalPrice에 대해 2.5% 수수료가 정확히 계산된다", async function () {
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        tokenId,
        MINT_AMOUNT,
        PRICE_PER_UNIT
      );

      const buyAmount = 5n;
      const totalPrice = PRICE_PER_UNIT * buyAmount; // 0.5 ETH

      const sellerBalBefore = await ethers.provider.getBalance(seller.address);
      const feeRecipientBalBefore = await ethers.provider.getBalance(feeRecipient.address);

      await marketplace.connect(buyer).buyListing(0, buyAmount, {
        value: totalPrice,
      });

      const sellerBalAfter = await ethers.provider.getBalance(seller.address);
      const feeRecipientBalAfter = await ethers.provider.getBalance(feeRecipient.address);

      const expectedFee = (totalPrice * 250n) / 10000n;
      const expectedSellerAmount = totalPrice - expectedFee;

      expect(sellerBalAfter - sellerBalBefore).to.equal(expectedSellerAmount);
      expect(feeRecipientBalAfter - feeRecipientBalBefore).to.equal(expectedFee);
    });
  });

  describe("취소", function () {
    it("seller가 리스팅을 취소하면 잔여 amount가 반환된다", async function () {
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        tokenId,
        MINT_AMOUNT,
        PRICE_PER_UNIT
      );

      // 3개 구매 후 취소
      await marketplace.connect(buyer).buyListing(0, 3n, {
        value: PRICE_PER_UNIT * 3n,
      });

      await expect(marketplace.connect(seller).cancelListing(0))
        .to.emit(marketplace, "Listing1155Canceled")
        .withArgs(0);

      // 리스팅 비활성화
      const listing = await marketplace.getListing(0);
      expect(listing.active).to.equal(false);
      expect(listing.amount).to.equal(0);

      // seller에게 7개 반환
      expect(await nft.balanceOf(seller.address, tokenId)).to.equal(7);
    });

    it("seller가 아닌 사용자는 취소할 수 없다", async function () {
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        tokenId,
        MINT_AMOUNT,
        PRICE_PER_UNIT
      );

      await expect(
        marketplace.connect(buyer).cancelListing(0)
      ).to.be.revertedWith("Not the seller");
    });
  });

  describe("초과 결제", function () {
    it("초과 결제 시 환불된다", async function () {
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        tokenId,
        MINT_AMOUNT,
        PRICE_PER_UNIT
      );

      const buyAmount = 2n;
      const totalPrice = PRICE_PER_UNIT * buyAmount; // 0.2 ETH
      const overpayment = ethers.parseEther("1"); // 1 ETH 지불

      const buyerBalBefore = await ethers.provider.getBalance(buyer.address);

      const tx = await marketplace.connect(buyer).buyListing(0, buyAmount, {
        value: overpayment,
      });
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const buyerBalAfter = await ethers.provider.getBalance(buyer.address);

      // buyer는 totalPrice + gas만 소비 (초과분 환불됨)
      expect(buyerBalBefore - buyerBalAfter).to.equal(totalPrice + gasUsed);
    });
  });

  describe("엣지 케이스", function () {
    it("listing amount를 초과하여 구매하면 실패한다", async function () {
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        tokenId,
        MINT_AMOUNT,
        PRICE_PER_UNIT
      );

      await expect(
        marketplace.connect(buyer).buyListing(0, MINT_AMOUNT + 1n, {
          value: PRICE_PER_UNIT * (MINT_AMOUNT + 1n),
        })
      ).to.be.revertedWith("Amount exceeds listing");
    });

    it("결제 금액이 부족하면 실패한다", async function () {
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        tokenId,
        MINT_AMOUNT,
        PRICE_PER_UNIT
      );

      await expect(
        marketplace.connect(buyer).buyListing(0, 5n, {
          value: PRICE_PER_UNIT * 4n, // 4개 가격으로 5개 구매 시도
        })
      ).to.be.revertedWith("Insufficient payment");
    });
  });

  describe("수수료 수취자 업데이트", function () {
    it("오너가 수수료 수취자를 변경할 수 있다", async function () {
      await expect(
        marketplace.connect(owner).updateFeeRecipient(buyer.address)
      )
        .to.emit(marketplace, "FeeRecipientUpdated")
        .withArgs(feeRecipient.address, buyer.address);

      expect(await marketplace.feeRecipient()).to.equal(buyer.address);
    });

    it("오너가 아니면 수수료 수취자를 변경할 수 없다", async function () {
      await expect(
        marketplace.connect(seller).updateFeeRecipient(buyer.address)
      ).to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
    });
  });
});
