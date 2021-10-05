
async function main() {
    toBN = (num) => web3.utils.toBN(num + "0".repeat(18));
    // npx hardhat run scripts/deploy.js --network testnet
    
    const SpacelensToken = ethers.getContractFactory("SpacelensToken");
    const DummyERC20 = ethers.getContractFactory("DummyERC20");
    
    const maxSupply = toBN(10000),
    price = 100 /** 1 ETH = 5 Tokens */,
    min = toBN(1);

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
    