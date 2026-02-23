// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Marketplace
 * @dev NFT Marketplace contract - fixed-price listing/buying/canceling
 * 2.5% platform fee, secured with Checks-Effects-Interactions pattern
 */
contract Marketplace is Ownable, ReentrancyGuard {
    // Platform fee: 250 basis points = 2.5%
    uint256 public constant PLATFORM_FEE = 250;

    // Fee recipient wallet
    address public feeRecipient;

    // Total listing count tracker
    uint256 public listingCount;

    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        bool active;
    }

    // nftContract => tokenId => Listing
    mapping(address => mapping(uint256 => Listing)) public listings;

    event ListingCreated(
        address indexed seller,
        address indexed nftContract,
        uint256 indexed tokenId,
        uint256 price
    );

    event ListingSold(
        address indexed buyer,
        address indexed nftContract,
        uint256 indexed tokenId,
        uint256 price
    );

    event ListingCanceled(
        address indexed seller,
        address indexed nftContract,
        uint256 indexed tokenId
    );

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
     * @dev Creates a new listing
     * @param nftContract NFT contract address
     * @param tokenId Token ID
     * @param price Sale price (wei)
     */
    function createListing(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external nonReentrant {
        require(price > 0, "Price must be greater than 0");

        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner");

        // Check if Marketplace is approved to transfer the NFT
        require(
            nft.getApproved(tokenId) == address(this) ||
                nft.isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );

        // Prevent duplicate listings
        require(!listings[nftContract][tokenId].active, "Already listed");

        listings[nftContract][tokenId] = Listing({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            active: true
        });

        listingCount++;

        emit ListingCreated(msg.sender, nftContract, tokenId, price);
    }

    /**
     * @dev Buys a listed NFT
     * @param nftContract NFT contract address
     * @param tokenId Token ID
     */
    function buyListing(
        address nftContract,
        uint256 tokenId
    ) external payable nonReentrant {
        Listing storage listing = listings[nftContract][tokenId];

        require(listing.active, "Listing not active");
        require(msg.value >= listing.price, "Insufficient payment");
        require(msg.sender != listing.seller, "Cannot buy own listing");

        uint256 price = listing.price;
        address seller = listing.seller;

        // Checks-Effects-Interactions pattern
        // 1. Effects: perform state changes first
        listing.active = false;

        // 2. Interactions: external calls
        // Transfer NFT
        IERC721(nftContract).safeTransferFrom(seller, msg.sender, tokenId);

        // Calculate fee
        uint256 fee = (price * PLATFORM_FEE) / 10000;
        uint256 sellerAmount = price - fee;

        // Transfer amount to seller
        payable(seller).transfer(sellerAmount);

        // Transfer fee to fee recipient
        payable(feeRecipient).transfer(fee);

        // Refund overpayment
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }

        emit ListingSold(msg.sender, nftContract, tokenId, price);
    }

    /**
     * @dev Cancels a listing
     * @param nftContract NFT contract address
     * @param tokenId Token ID
     */
    function cancelListing(
        address nftContract,
        uint256 tokenId
    ) external nonReentrant {
        Listing storage listing = listings[nftContract][tokenId];

        require(listing.active, "Listing not active");
        require(listing.seller == msg.sender, "Not the seller");

        listing.active = false;

        emit ListingCanceled(msg.sender, nftContract, tokenId);
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

    /**
     * @dev Retrieves listing information
     * @param nftContract NFT contract address
     * @param tokenId Token ID
     */
    function getListing(
        address nftContract,
        uint256 tokenId
    ) external view returns (Listing memory) {
        return listings[nftContract][tokenId];
    }
}
