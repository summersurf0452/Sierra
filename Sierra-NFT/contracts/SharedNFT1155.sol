// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SharedNFT1155
 * @dev ERC-1155 based shared NFT contract
 * A shared contract where multiple users can create their own collections and mint multi-edition NFTs
 */
contract SharedNFT1155 is ERC1155, Ownable, ReentrancyGuard {
    struct Collection {
        uint256 id;
        address creator;
        string name;
        string symbol;
        uint256 royaltyPercentage; // basis points (max 1000 = 10%)
    }

    uint256 private _tokenIdCounter;
    uint256 private _collectionIdCounter;

    // tokenId => collectionId
    mapping(uint256 => uint256) public tokenToCollection;

    // collectionId => Collection
    mapping(uint256 => Collection) public collections;

    // tokenId => total supply
    mapping(uint256 => uint256) public tokenSupply;

    // tokenId => tokenURI
    mapping(uint256 => string) private _tokenURIs;

    event CollectionCreated(
        uint256 indexed collectionId,
        address indexed creator,
        string name
    );

    event NFTMinted(
        uint256 indexed tokenId,
        uint256 indexed collectionId,
        address indexed owner,
        uint256 amount,
        string tokenURI
    );

    constructor() ERC1155("") Ownable(msg.sender) {
        _tokenIdCounter = 0;
        _collectionIdCounter = 0;
    }

    /**
     * @dev Creates a new collection
     * @param name Collection name
     * @param symbol Collection symbol
     * @param royaltyPercentage Royalty percentage (basis points, max 1000)
     */
    function createCollection(
        string memory name,
        string memory symbol,
        uint256 royaltyPercentage
    ) external returns (uint256) {
        require(royaltyPercentage <= 1000, "Royalty cannot exceed 10%");

        uint256 collectionId = _collectionIdCounter;
        _collectionIdCounter++;

        collections[collectionId] = Collection({
            id: collectionId,
            creator: msg.sender,
            name: name,
            symbol: symbol,
            royaltyPercentage: royaltyPercentage
        });

        emit CollectionCreated(collectionId, msg.sender, name);

        return collectionId;
    }

    /**
     * @dev Mints an NFT (multi-edition)
     * @param collectionId Collection ID
     * @param amount Supply amount
     * @param tokenURI Token metadata URI
     */
    function mint(
        uint256 collectionId,
        uint256 amount,
        string memory tokenURI
    ) external nonReentrant returns (uint256) {
        require(
            collectionId < _collectionIdCounter,
            "Collection does not exist"
        );
        require(amount > 0, "Amount must be greater than 0");

        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        tokenToCollection[tokenId] = collectionId;
        tokenSupply[tokenId] = amount;
        _tokenURIs[tokenId] = tokenURI;

        _mint(msg.sender, tokenId, amount, "");

        emit NFTMinted(tokenId, collectionId, msg.sender, amount, tokenURI);

        return tokenId;
    }

    /**
     * @dev Overrides token URI to support individual URIs
     * @param tokenId Token ID
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        require(tokenId < _tokenIdCounter, "Token does not exist");
        return _tokenURIs[tokenId];
    }

    /**
     * @dev Retrieves collection information
     * @param collectionId Collection ID
     */
    function getCollectionInfo(
        uint256 collectionId
    ) external view returns (Collection memory) {
        require(
            collectionId < _collectionIdCounter,
            "Collection does not exist"
        );
        return collections[collectionId];
    }

    /**
     * @dev Returns the total number of collections
     */
    function totalCollections() external view returns (uint256) {
        return _collectionIdCounter;
    }

    /**
     * @dev Returns the total number of token types
     */
    function totalTokenTypes() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev Returns the total supply of a specific token
     * @param tokenId Token ID
     */
    function totalSupply(uint256 tokenId) external view returns (uint256) {
        require(tokenId < _tokenIdCounter, "Token does not exist");
        return tokenSupply[tokenId];
    }
}
