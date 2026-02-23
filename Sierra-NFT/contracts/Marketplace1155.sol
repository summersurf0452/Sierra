// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Marketplace1155
 * @dev ERC-1155 fixed-price marketplace contract
 * Supports partial purchases, escrow-based, 2.5% platform fee
 */
contract Marketplace1155 is ERC1155Holder, ReentrancyGuard, Ownable {
    // Platform fee: 250 basis points = 2.5%
    uint256 public constant PLATFORM_FEE = 250;

    // Fee recipient wallet
    address public feeRecipient;

    // Listing counter (auto-increment ID)
    uint256 public listingCount;

    struct Listing1155 {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 amount;
        uint256 pricePerUnit;
        bool active;
    }

    // listingId => Listing1155
    mapping(uint256 => Listing1155) public listings;

    event Listing1155Created(
        uint256 indexed listingId,
        address indexed seller,
        address nftContract,
        uint256 tokenId,
        uint256 amount,
        uint256 pricePerUnit
    );

    event Listing1155Sold(
        uint256 indexed listingId,
        address indexed buyer,
        uint256 amount,
        uint256 totalPrice
    );

    event Listing1155Canceled(uint256 indexed listingId);

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
     * @dev Creates a new ERC-1155 listing
     * @param nftContract NFT contract address
     * @param tokenId Token ID
     * @param amount Sale quantity
     * @param pricePerUnit Price per unit (wei)
     */
    function createListing(
        address nftContract,
        uint256 tokenId,
        uint256 amount,
        uint256 pricePerUnit
    ) external nonReentrant returns (uint256) {
        require(amount > 0, "Amount must be greater than 0");
        require(pricePerUnit > 0, "Price must be greater than 0");

        IERC1155 nft = IERC1155(nftContract);
        require(
            nft.balanceOf(msg.sender, tokenId) >= amount,
            "Insufficient balance"
        );
        require(
            nft.isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );

        // Transfer ERC-1155 tokens to escrow
        nft.safeTransferFrom(msg.sender, address(this), tokenId, amount, "");

        uint256 listingId = listingCount;
        listingCount++;

        listings[listingId] = Listing1155({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            amount: amount,
            pricePerUnit: pricePerUnit,
            active: true
        });

        emit Listing1155Created(
            listingId,
            msg.sender,
            nftContract,
            tokenId,
            amount,
            pricePerUnit
        );

        return listingId;
    }

    /**
     * @dev Buys listed ERC-1155 tokens (partial purchase supported)
     * @param listingId Listing ID
     * @param amount Purchase quantity
     */
    function buyListing(
        uint256 listingId,
        uint256 amount
    ) external payable nonReentrant {
        Listing1155 storage listing = listings[listingId];

        require(listing.active, "Listing not active");
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= listing.amount, "Amount exceeds listing");

        uint256 totalPrice = listing.pricePerUnit * amount;
        require(msg.value >= totalPrice, "Insufficient payment");

        // Checks-Effects: perform state changes first
        listing.amount -= amount;
        if (listing.amount == 0) {
            listing.active = false;
        }

        address seller = listing.seller;

        // Interactions: external calls
        // Transfer ERC-1155
        IERC1155(listing.nftContract).safeTransferFrom(
            address(this),
            msg.sender,
            listing.tokenId,
            amount,
            ""
        );

        // Calculate fee
        uint256 fee = (totalPrice * PLATFORM_FEE) / 10000;
        uint256 sellerAmount = totalPrice - fee;

        // Transfer amount to seller
        payable(seller).transfer(sellerAmount);

        // Transfer fee to fee recipient
        payable(feeRecipient).transfer(fee);

        // Refund overpayment
        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }

        emit Listing1155Sold(listingId, msg.sender, amount, totalPrice);
    }

    /**
     * @dev Cancels a listing (seller only, returns remaining amount)
     * @param listingId Listing ID
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing1155 storage listing = listings[listingId];

        require(listing.active, "Listing not active");
        require(listing.seller == msg.sender, "Not the seller");

        uint256 remainingAmount = listing.amount;
        listing.active = false;
        listing.amount = 0;

        // Return remaining ERC-1155 tokens to seller
        IERC1155(listing.nftContract).safeTransferFrom(
            address(this),
            msg.sender,
            listing.tokenId,
            remainingAmount,
            ""
        );

        emit Listing1155Canceled(listingId);
    }

    /**
     * @dev Retrieves listing information
     * @param listingId Listing ID
     */
    function getListing(
        uint256 listingId
    ) external view returns (Listing1155 memory) {
        return listings[listingId];
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
