## TODO 📝

- agregar prettier
✔️ agregar decimales en los porcentajes e.g. permitir => 35.5%
✔️ aplicar el minimum_token
- agregar eventos
- cambiar cuando cambia de phase y no hay phase proxima
- feature: getcurrentPhase
- feature: modificion de phases
- agregar subgraph para listado de clientes
- hacer un deploy con hardhat y subirlo a una testnet

### Pre-requisites 📋

_nodejs_

[See Hardhat setup enviroment tutorial](https://hardhat.org/tutorial/setting-up-the-environment.html)

```
npm i
```

## Compiling 🗃️

```
npm run compile
```

## Running tests ⚙️ _in progress_

_In order to test using a mainnet fork you must set:_

* [**ALCHEMY_MAIN_API_KEY**](https://dashboard.alchemyapi.io/apps)  
* [**COINMARKETCAP_API_KEY**](https://pro.coinmarketcap.com/account)

_in your .env file_

```
npm run test
```

## Built with 🛠️

- [Solidity](https://docs.soliditylang.org/en/v0.6.6/)
- [Hardhat](https://hardhat.org/) 👷

## License 📄

This project is under the MIT License - look up the file [LICENSE.md](LICENSE.md) for more details.