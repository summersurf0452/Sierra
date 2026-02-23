// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Offers
 * @dev NFT offer (purchase proposal) system - instant deposit escrow
 * Deposits WLC into escrow on offer creation, supports accept/cancel/expired withdrawal
 * 2.5% platform fee
 */
contract Offers is Ownable, ReentrancyGuard {
    // Platform fee: 250 basis points = 2.5%
    uint256 public constant PLATFORM_FEE = 250;

    // Fee recipient wallet
    address public feeRecipient;

    // Offer counter (auto-increment ID)
    uint256 public offerCount;

    struct Offer {
        address offerer;
        address nftContract;
        uint256 tokenId;
        uint256 price; // Deposited WLC amount
        uint256 expiresAt;
        bool accepted;
        bool canceled;
        bool withdrawn;
    }

    // offerId => Offer
    mapping(uint256 => Offer) public offers;

    // nftContract => tokenId => offerId[]
    mapping(address => mapping(uint256 => uint256[])) public nftOffers;

    event OfferCreated(
        uint256 indexed offerId,
        address indexed offerer,
        address nftContract,
        uint256 tokenId,
        uint256 price,
        uint256 expiresAt
    );

    event OfferAccepted(uint256 indexed offerId, address indexed seller);

    event OfferCanceled(uint256 indexed offerId);

    event OfferWithdrawn(uint256 indexed offerId);

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
     * @dev Creates a new offer (deposits msg.value into escrow)
     * @param nftContract NFT contract address
     * @param tokenId Token ID
     * @param expiresAt Offer expiry time (unix timestamp)
     */
    function createOffer(
        address nftContract,
        uint256 tokenId,
        uint256 expiresAt
    ) external payable nonReentrant returns (uint256) {
        require(msg.value > 0, "Offer price must be greater than 0");
        require(expiresAt > block.timestamp, "Expiry must be in the future");

        uint256 offerId = offerCount;
        offerCount++;

        offers[offerId] = Offer({
            offerer: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: msg.value,
            expiresAt: expiresAt,
            accepted: false,
            canceled: false,
            withdrawn: false
        });

        nftOffers[nftContract][tokenId].push(offerId);

        emit OfferCreated(
            offerId,
            msg.sender,
            nftContract,
            tokenId,
            msg.value,
            expiresAt
        );

        return offerId;
    }

    /**
     * @dev Accepts an offer (only callable by NFT owner)
     * @param offerId Offer ID
     */
    function acceptOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];

        require(offer.offerer != address(0), "Offer does not exist");
        require(!offer.accepted, "Already accepted");
        require(!offer.canceled, "Already canceled");
        require(!offer.withdrawn, "Already withdrawn");
        require(block.timestamp < offer.expiresAt, "Offer expired");

        IERC721 nft = IERC721(offer.nftContract);
        require(nft.ownerOf(offer.tokenId) == msg.sender, "Not the NFT owner");

        offer.accepted = true;

        // Transfer NFT to offerer
        nft.safeTransferFrom(msg.sender, offer.offerer, offer.tokenId);

        // Calculate fee
        uint256 fee = (offer.price * PLATFORM_FEE) / 10000;
        uint256 sellerAmount = offer.price - fee;

        // Transfer amount to seller
        payable(msg.sender).transfer(sellerAmount);

        // Transfer fee to fee recipient
        payable(feeRecipient).transfer(fee);

        emit OfferAccepted(offerId, msg.sender);
    }

    /**
     * @dev Cancels an offer (only callable by offerer)
     * @param offerId Offer ID
     */
    function cancelOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];

        require(offer.offerer != address(0), "Offer does not exist");
        require(offer.offerer == msg.sender, "Not the offerer");
        require(!offer.accepted, "Already accepted");
        require(!offer.canceled, "Already canceled");
        require(!offer.withdrawn, "Already withdrawn");

        offer.canceled = true;

        // Refund deposit
        payable(msg.sender).transfer(offer.price);

        emit OfferCanceled(offerId);
    }

    /**
     * @dev Withdraws deposit from an expired offer (offerer only)
     * @param offerId Offer ID
     */
    function withdrawExpired(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];

        require(offer.offerer != address(0), "Offer does not exist");
        require(offer.offerer == msg.sender, "Not the offerer");
        require(!offer.accepted, "Already accepted");
        require(!offer.canceled, "Already canceled");
        require(!offer.withdrawn, "Already withdrawn");
        require(block.timestamp >= offer.expiresAt, "Offer not expired");

        offer.withdrawn = true;

        // Refund deposit
        payable(msg.sender).transfer(offer.price);

        emit OfferWithdrawn(offerId);
    }

    /**
     * @dev Returns the array of offer IDs for a specific NFT
     * @param nftContract NFT contract address
     * @param tokenId Token ID
     */
    function getOffersByNFT(
        address nftContract,
        uint256 tokenId
    ) external view returns (uint256[] memory) {
        return nftOffers[nftContract][tokenId];
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
