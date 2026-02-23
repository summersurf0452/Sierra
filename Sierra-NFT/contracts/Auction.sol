// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Auction
 * @dev English Auction contract - NFT auction creation/bidding/settlement/withdrawal/cancellation
 * Anti-sniping protection, Pull-over-Push withdrawal pattern, 2.5% platform fee
 */
contract Auction is ERC721Holder, ReentrancyGuard, Ownable {
    // Platform fee: 250 basis points = 2.5%
    uint256 public constant PLATFORM_FEE = 250;

    // Anti-sniping: extend endTime when bid is placed within 10 minutes of deadline
    uint256 public constant ANTI_SNIPE_DURATION = 10 minutes;

    // Minimum bid increment: 500 basis points = 5%
    uint256 public constant MIN_BID_INCREMENT_BPS = 500;

    // Fee recipient wallet
    address public feeRecipient;

    // Auction counter (auto-increment ID)
    uint256 public auctionCount;

    struct AuctionInfo {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 startPrice;
        uint256 minBidIncrement;
        uint256 endTime;
        address highestBidder;
        uint256 highestBid;
        bool settled;
        bool canceled;
    }

    // auctionId => AuctionInfo
    mapping(uint256 => AuctionInfo) public auctions;

    // auctionId => bidder => pendingAmount (Pull-over-Push)
    mapping(uint256 => mapping(address => uint256)) public pendingReturns;

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed seller,
        address nftContract,
        uint256 tokenId,
        uint256 startPrice,
        uint256 endTime
    );

    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount
    );

    event AuctionSettled(
        uint256 indexed auctionId,
        address indexed winner,
        uint256 amount
    );

    event AuctionCanceled(uint256 indexed auctionId);

    event FeeRecipientUpdated(
        address indexed oldRecipient,
        address indexed newRecipient
    );

    /**
     * @dev Constructor
     * @param _feeRecipient Fee recipient wallet address
     */
    constructor(address _feeRecipient) Ownable(msg.sender) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Creates a new auction
     * @param nftContract NFT contract address
     * @param tokenId Token ID
     * @param startPrice Start price (wei)
     * @param endTime Auction end time (unix timestamp)
     */
    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 startPrice,
        uint256 endTime
    ) external nonReentrant returns (uint256) {
        require(startPrice > 0, "Start price must be greater than 0");
        require(endTime > block.timestamp, "End time must be in the future");

        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner");

        // Transfer NFT to escrow
        nft.safeTransferFrom(msg.sender, address(this), tokenId);

        uint256 auctionId = auctionCount;
        auctionCount++;

        // minBidIncrement = startPrice * 500 / 10000 (minimum 1 wei)
        uint256 minBidIncrement = (startPrice * MIN_BID_INCREMENT_BPS) / 10000;
        if (minBidIncrement == 0) {
            minBidIncrement = 1;
        }

        auctions[auctionId] = AuctionInfo({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            startPrice: startPrice,
            minBidIncrement: minBidIncrement,
            endTime: endTime,
            highestBidder: address(0),
            highestBid: 0,
            settled: false,
            canceled: false
        });

        emit AuctionCreated(
            auctionId,
            msg.sender,
            nftContract,
            tokenId,
            startPrice,
            endTime
        );

        return auctionId;
    }

    /**
     * @dev Places a bid on an auction
     * @param auctionId Auction ID
     */
    function placeBid(uint256 auctionId) external payable nonReentrant {
        AuctionInfo storage auction = auctions[auctionId];

        require(auction.seller != address(0), "Auction does not exist");
        require(!auction.settled, "Auction already settled");
        require(!auction.canceled, "Auction canceled");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.sender != auction.seller, "Seller cannot bid");

        if (auction.highestBidder == address(0)) {
            // First bid: must be >= startPrice
            require(msg.value >= auction.startPrice, "Bid below start price");
        } else {
            // Subsequent bids: must be >= highestBid + minBidIncrement
            require(
                msg.value >= auction.highestBid + auction.minBidIncrement,
                "Bid increment too low"
            );
        }

        // Record previous highest bidder's amount in pendingReturns (Pull-over-Push)
        if (auction.highestBidder != address(0)) {
            pendingReturns[auctionId][auction.highestBidder] += auction
                .highestBid;
        }

        // Record new highest bid
        auction.highestBidder = msg.sender;
        auction.highestBid = msg.value;

        // Anti-sniping: extend endTime when bid is placed within 10 minutes of deadline
        if (auction.endTime - block.timestamp < ANTI_SNIPE_DURATION) {
            auction.endTime = block.timestamp + ANTI_SNIPE_DURATION;
        }

        emit BidPlaced(auctionId, msg.sender, msg.value);
    }

    /**
     * @dev Settles an auction (call after auction ends)
     * @param auctionId Auction ID
     */
    function settleAuction(uint256 auctionId) external nonReentrant {
        AuctionInfo storage auction = auctions[auctionId];

        require(auction.seller != address(0), "Auction does not exist");
        require(!auction.settled, "Already settled");
        require(!auction.canceled, "Auction canceled");
        require(block.timestamp >= auction.endTime, "Auction not ended");

        auction.settled = true;

        if (auction.highestBidder == address(0)) {
            // No bidders: return NFT to seller
            IERC721(auction.nftContract).safeTransferFrom(
                address(this),
                auction.seller,
                auction.tokenId
            );

            emit AuctionCanceled(auctionId);
        } else {
            // Won: transfer NFT to highest bidder
            IERC721(auction.nftContract).safeTransferFrom(
                address(this),
                auction.highestBidder,
                auction.tokenId
            );

            // Calculate fee
            uint256 fee = (auction.highestBid * PLATFORM_FEE) / 10000;
            uint256 sellerAmount = auction.highestBid - fee;

            // Transfer amount to seller
            payable(auction.seller).transfer(sellerAmount);

            // Transfer fee to fee recipient
            payable(feeRecipient).transfer(fee);

            emit AuctionSettled(
                auctionId,
                auction.highestBidder,
                auction.highestBid
            );
        }
    }

    /**
     * @dev Withdraws from pendingReturns (Pull pattern)
     * @param auctionId Auction ID
     */
    function withdraw(uint256 auctionId) external nonReentrant {
        uint256 amount = pendingReturns[auctionId][msg.sender];
        require(amount > 0, "No funds to withdraw");

        // Checks-Effects-Interactions
        pendingReturns[auctionId][msg.sender] = 0;

        payable(msg.sender).transfer(amount);
    }

    /**
     * @dev Cancels an auction (seller only, only when no bids exist)
     * @param auctionId Auction ID
     */
    function cancelAuction(uint256 auctionId) external nonReentrant {
        AuctionInfo storage auction = auctions[auctionId];

        require(auction.seller != address(0), "Auction does not exist");
        require(auction.seller == msg.sender, "Not the seller");
        require(!auction.settled, "Already settled");
        require(!auction.canceled, "Already canceled");
        require(
            auction.highestBidder == address(0),
            "Bids exist, cannot cancel"
        );

        auction.canceled = true;

        // Return NFT
        IERC721(auction.nftContract).safeTransferFrom(
            address(this),
            auction.seller,
            auction.tokenId
        );

        emit AuctionCanceled(auctionId);
    }

    /**
     * @dev Updates the fee recipient address (owner only)
     * @param newRecipient New fee recipient address
     */
    function updateFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid fee recipient");

        address oldRecipient = feeRecipient;
        feeRecipient = newRecipient;

        emit FeeRecipientUpdated(oldRecipient, newRecipient);
    }
}
