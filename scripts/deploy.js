toWei = (num) => web3.utils.toWei(num);

async function main() {
    // npx hardhat run scripts/deploy.js --network testnet
    
    const SpacelensToken = await ethers.getContractFactory("SpacelensToken");
    const DummyERC20 = await ethers.getContractFactory("DummyERC20");
    
    const maxSupply = toWei('10000'),
    price = 100 /** 1 ETH = 100 Tokens */,
    min = toWei('1'),
    owner = (await ethers.getSigners())[0].address;
    
    token = await DummyERC20.deploy();
    
    space = await SpacelensToken.deploy(maxSupply, price, min, owner, token.address);

    await token.mint(maxSupply, {from: owner});
    await token.approve(space.address, maxSupply, {from: owner});

    console.log("SpacelensToken:", space.address);
    console.log("DummyERC20:", token.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
/**
 * SpacelensToken: 0x7eb4dB7cB1A010Bce23D0B56721ae20fdf714155
 * DummyERC20: 0xe8E93e35e3e0bAb9C225D1D1BaC60f861cfa87A0
 */
    