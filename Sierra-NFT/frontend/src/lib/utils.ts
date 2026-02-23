import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatEther, parseEther } from 'viem';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert Wei to WLC
 */
export function formatWLC(weiString: string | bigint): string {
  return formatEther(BigInt(weiString));
}

/**
 * Convert WLC to Wei
 */
export function parseWLC(wlcString: string): bigint {
  return parseEther(wlcString);
}

/**
 * Display address in abbreviated form (0x1234...5678)
 */
export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Convert Web3 errors to user-friendly messages
 */
export function formatWeb3Error(error: unknown): string {
  if (typeof error === 'string') return error;

  if (error && typeof error === 'object') {
    const err = error as any;

    // User rejected transaction
    if (
      err.code === 4001 ||
      err.message?.includes('User rejected') ||
      err.message?.includes('User denied')
    ) {
      return 'Transaction was rejected';
    }

    // Insufficient funds
    if (
      err.message?.includes('insufficient funds') ||
      err.message?.includes('insufficient balance')
    ) {
      return 'Insufficient balance';
    }

    // Network error
    if (err.message?.includes('network') || err.message?.includes('fetch')) {
      return 'A network error occurred. Please try again';
    }

    // Contract error
    if (err.message?.includes('execution reverted')) {
      return 'Transaction was rejected. Please check the conditions';
    }

    // Return original message if available
    if (err.message) return err.message;
    if (err.shortMessage) return err.shortMessage;
  }

  return 'An unknown error occurred';
}

/**
 * Convert IPFS URI to HTTP gateway URL
 * Uses Dedicated Gateway if NEXT_PUBLIC_PINATA_GATEWAY env var is set
 */
export function ipfsToHttp(ipfsUri: string): string {
  if (!ipfsUri) return '';

  // Already HTTP
  if (ipfsUri.startsWith('http://') || ipfsUri.startsWith('https://')) {
    return ipfsUri;
  }

  const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY
    ? `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}`
    : 'https://gateway.pinata.cloud';

  // ipfs:// to gateway
  if (ipfsUri.startsWith('ipfs://')) {
    const cid = ipfsUri.replace('ipfs://', '');
    return `${gateway}/ipfs/${cid}`;
  }

  // URL without protocol (e.g. "xxx.mypinata.cloud/ipfs/...")
  if (ipfsUri.includes('.') && ipfsUri.includes('/')) {
    return `https://${ipfsUri}`;
  }

  // Assume it's a CID
  return `${gateway}/ipfs/${ipfsUri}`;
}

/**
 * Add Pinata image optimization parameters to IPFS image URL
 * Only supported on Pinata Dedicated Gateway (mypinata.cloud)
 */
export function getOptimizedImageUrl(
  ipfsUri: string,
  options: { width?: number; quality?: number } = {},
): string {
  const httpUrl = ipfsToHttp(ipfsUri);
  if (!httpUrl) return '';

  // Only Pinata Dedicated Gateway supports image optimization
  if (!httpUrl.includes('mypinata.cloud')) return httpUrl;

  const params = new URLSearchParams();
  if (options.width) params.set('img-width', String(options.width));
  if (options.quality) params.set('img-quality', String(options.quality));

  const separator = httpUrl.includes('?') ? '&' : '?';
  return params.toString() ? `${httpUrl}${separator}${params}` : httpUrl;
}

/**
 * Extract image URL from NFT entity
 * - Uses imageUrl directly if available
 * - Otherwise fetches metadata from tokenURI and extracts image field
 */
export async function parseNftMetadata(nft: {
  imageUrl?: string | null;
  tokenURI?: string | null;
}): Promise<string> {
  // Use imageUrl first if available (DB cache)
  if (nft.imageUrl) {
    return ipfsToHttp(nft.imageUrl);
  }

  // Return empty string if no tokenURI
  if (!nft.tokenURI) {
    return '';
  }

  try {
    // Convert tokenURI to HTTP URL
    const metadataUrl = ipfsToHttp(nft.tokenURI);

    // Fetch metadata
    const response = await fetch(metadataUrl);
    if (!response.ok) {
      console.error('Failed to fetch metadata:', response.statusText);
      return '';
    }

    const metadata = await response.json();

    // Extract image field
    if (metadata.image) {
      return ipfsToHttp(metadata.image);
    }

    return '';
  } catch (error) {
    console.error('Error parsing NFT metadata:', error);
    return '';
  }
}
