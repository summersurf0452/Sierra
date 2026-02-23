# WorldLand NFT Generative Art Engine

모듈형 레이어를 조합하여 **고유한 NFT 이미지와 메타데이터**를 자동으로 생성하는 Node.js 엔진

## Quick Start

```bash
# 1. 의존성 설치
npm install

# 2. 샘플 레이어 생성 (테스트용)
node scripts/generate-samples.js

# 3. NFT 컬렉션 생성
npm run generate

# 4. 검증 (중복 확인 + 레어리티 분포)
npm run verify
```

## 프로젝트 구조

```
worldland-nft/
├── src/
│   ├── config.js       # 레이어 & 컬렉션 설정
│   ├── engine.js       # 핵심 생성 엔진
│   ├── metadata.js     # ERC-721 메타데이터 생성
│   └── main.js         # CLI 진입점
├── scripts/
│   ├── generate-samples.js  # 테스트용 샘플 레이어 생성
│   └── verify.js            # 컬렉션 검증 스크립트
├── layers/             # 레이어 에셋 (PNG)
│   ├── 1-Background/
│   ├── 2-Base/
│   ├── 3-Eyes/
│   └── ...
└── output/             # 생성 결과물
    ├── images/         # NFT 이미지
    └── metadata/       # JSON 메타데이터
```

## 사용법

### 1. 레이어 에셋 준비

`layers/` 폴더에 PNG 파일을 넣습니다. 폴더 이름은 `{순서}-{레이어명}` 형식입니다.

```
layers/
├── 1-Background/
│   ├── Blue#30.png       ← 이름#가중치.png
│   ├── Red#20.png        ← 가중치가 낮을수록 희귀
│   └── Space#5.png
├── 2-Base/
│   ├── Robot#40.png
│   └── Alien#10.png
```

> **레어리티 가중치**: 파일명에 `#숫자`를 붙이면 해당 수치에 비례하여 선택됩니다.  
> 숫자가 클수록 자주 등장하고, 작을수록 희귀합니다.

### 2. 설정 변경

`src/config.js`에서 컬렉션을 설정합니다:

```javascript
const layerConfigurations = [
  {
    growEditionSizeTo: 1000, // 생성할 NFT 수
    layersOrder: [
      { name: "Background" },
      { name: "Base" },
      { name: "Eyes" },
      { name: "Mouth" },
      { name: "Accessory", optional: true }, // 없을 수도 있는 레이어
    ],
  },
];

const format = { width: 1000, height: 1000 };
const collectionName = "WorldLand NFT";
const baseUri = "ipfs://YOUR_CID_HERE";
```

### 3. 생성 & 검증

```bash
npm run generate   # 컬렉션 생성
npm run verify     # 중복 검사 + 레어리티 분포 리포트
```

## 중복 방지

각 조합을 **DNA 문자열**로 변환하여 `Set`에 저장합니다:

```
DNA = "Background:Blue-Base:Robot-Eyes:Laser-Mouth:Smile-Accessory:Crown"
```

같은 DNA가 이미 존재하면 다시 뽑아서 **100% 유니크**를 보장합니다.

## 메타데이터 (ERC-721)

각 NFT에 대해 OpenSea 호환 JSON을 생성합니다:

```json
{
  "name": "WorldLand NFT #1",
  "description": "A unique WorldLand generative NFT",
  "image": "ipfs://YOUR_CID_HERE/1.png",
  "edition": 1,
  "attributes": [
    { "trait_type": "Background", "value": "Blue" },
    { "trait_type": "Base", "value": "Robot" }
  ]
}
```

## License

MIT
