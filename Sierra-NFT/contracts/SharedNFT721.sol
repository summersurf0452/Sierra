// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SharedNFT721
 * @dev ERC-721 based shared NFT contract
 * A shared contract where multiple users can create their own collections and mint NFTs
 */
contract SharedNFT721 is ERC721URIStorage, Ownable, ReentrancyGuard {
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

    event CollectionCreated(
        uint256 indexed collectionId,
        address indexed creator,
        string name
    );

    event NFTMinted(
        uint256 indexed tokenId,
        uint256 indexed collectionId,
        address indexed owner,
        string tokenURI
    );

    constructor() ERC721("Sierra NFT", "SNFT") Ownable(msg.sender) {
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
     * @dev Mints an NFT
     * @param collectionId Collection ID
     * @param tokenURI Token metadata URI
     */
    function mint(
        uint256 collectionId,
        string memory tokenURI
    ) external nonReentrant returns (uint256) {
        require(
            collectionId < _collectionIdCounter,
            "Collection does not exist"
        );

        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        tokenToCollection[tokenId] = collectionId;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);

        emit NFTMinted(tokenId, collectionId, msg.sender, tokenURI);

        return tokenId;
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
     * @dev Returns the total number of tokens
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
}
