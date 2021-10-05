/**
 * @type import('hardhat/config').HardhatUserConfig
 */

require("dotenv").config();
require("@nomiclabs/hardhat-truffle5");
require('@openzeppelin/hardhat-upgrades');
require("hardhat-gas-reporter");

module.exports = {
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
        blockNumber: 12404000
      }
    },
    testnet: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${ process.env.ALCHEMY_TESTNET }`,
      accounts: [`0x${ process.env.PRIVATE_KEY }`],
      chainID: 4,
    }
  },
  gasReporter: {
    enabled: true,
    currency: 'USD',
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  solidity: {
    compilers: [
      {
        version: "0.8.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  mocha: {
    timeout: 240000,
  },
};
