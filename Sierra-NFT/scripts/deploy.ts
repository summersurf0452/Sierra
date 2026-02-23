import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);
  console.log("---");

  // 1. SharedNFT721 배포
  console.log("Deploying SharedNFT721...");
  const SharedNFT721Factory = await ethers.getContractFactory("SharedNFT721");
  const sharedNFT721 = await SharedNFT721Factory.deploy();
  await sharedNFT721.waitForDeployment();
  const sharedNFT721Address = await sharedNFT721.getAddress();
  console.log("SharedNFT721 deployed to:", sharedNFT721Address);

  // 2. SharedNFT1155 배포
  console.log("Deploying SharedNFT1155...");
  const SharedNFT1155Factory = await ethers.getContractFactory("SharedNFT1155");
  const sharedNFT1155 = await SharedNFT1155Factory.deploy();
  await sharedNFT1155.waitForDeployment();
  const sharedNFT1155Address = await sharedNFT1155.getAddress();
  console.log("SharedNFT1155 deployed to:", sharedNFT1155Address);

  // 3. Marketplace 배포 (deployer를 feeRecipient로 설정)
  console.log("Deploying Marketplace...");
  const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
  const marketplace = await MarketplaceFactory.deploy(deployer.address);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("Marketplace deployed to:", marketplaceAddress);
  console.log("Fee recipient:", deployer.address);

  // 4. Auction 배포
  console.log("Deploying Auction...");
  const AuctionFactory = await ethers.getContractFactory("Auction");
  const auction = await AuctionFactory.deploy(deployer.address);
  await auction.waitForDeployment();
  const auctionAddress = await auction.getAddress();
  console.log("Auction deployed to:", auctionAddress);

  // 5. Offers 배포
  console.log("Deploying Offers...");
  const OffersFactory = await ethers.getContractFactory("Offers");
  const offers = await OffersFactory.deploy(deployer.address);
  await offers.waitForDeployment();
  const offersAddress = await offers.getAddress();
  console.log("Offers deployed to:", offersAddress);

  // 6. Marketplace1155 배포
  console.log("Deploying Marketplace1155...");
  const Marketplace1155Factory = await ethers.getContractFactory("Marketplace1155");
  const marketplace1155 = await Marketplace1155Factory.deploy(deployer.address);
  await marketplace1155.waitForDeployment();
  const marketplace1155Address = await marketplace1155.getAddress();
  console.log("Marketplace1155 deployed to:", marketplace1155Address);

  console.log("---");
  console.log("Deployment complete!");

  // 배포 주소를 JSON 파일로 저장
  const deployments = {
    network: network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      SharedNFT721: sharedNFT721Address,
      SharedNFT1155: sharedNFT1155Address,
      Marketplace: marketplaceAddress,
      Auction: auctionAddress,
      Offers: offersAddress,
      Marketplace1155: marketplace1155Address,
    },
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const networkName = network.name === "unknown" ? `chainId-${network.chainId}` : network.name;
  const deploymentPath = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2));

  console.log("Deployment info saved to:", deploymentPath);
  console.log("\nDeployed Addresses:");
  console.log("SharedNFT721:", sharedNFT721Address);
  console.log("SharedNFT1155:", sharedNFT1155Address);
  console.log("Marketplace:", marketplaceAddress);
  console.log("Auction:", auctionAddress);
  console.log("Offers:", offersAddress);
  console.log("Marketplace1155:", marketplace1155Address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
