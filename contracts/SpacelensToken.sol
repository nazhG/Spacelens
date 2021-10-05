//SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Spacelens ERC20
/// @author nazhG
/// @notice this contract allow create phases for mint token and transfer the funds
contract SpacelensToken is ERC20, Ownable, Pausable {

	/// a phase is a period for a discount in minting price 
	/// until amount N of token sold out or reaching a date
	/// @dev a phase is always needed to mint
    struct Phase {
		/// uint between 0(0.0%) - 1000(100.0%) to mul with the price on sells
        uint256 discount;
		/// timestamp when this phase ends
        uint256 end;
		/// uint that decreases when sold in phase
		/// @note to know the original supply look up in logs
        uint256 supply;
    }

	/// all phases (next, current and previous) 
    mapping(uint256 => Phase) public phases;

	/// reference for the mapping of phases, uint of the current phase
    uint256 public currentPhase;

	/// reference for the mapping of phases, uint of the last phase
	/// @dev phases[lastPhase - 1] to get the last phase
    uint256 public lastPhase;

	/// @notice max amount of token allowed to mint in this contract
    uint256 public immutable maxSupply;

	/// @notice current mintable amount of tokens
    uint256 public supply;

	/// @notice minimum amount of tokens that can be minted in one transaction
    uint256 public minimumToken;

	/// @notice amount of tokens minted for one ETH
    uint256 public spacePrice;

	/// @notice wallet to transfer funds of the contract
    address public dispatcher;

    constructor(
        uint256 _maxSupply,
        uint256 _spacePrice,
        uint256 _minimumToken,
        address _dispatcher
    ) ERC20("Spacelens", "SPCL") {
        currentPhase = 0;
        lastPhase = 0;
        maxSupply = _maxSupply;
		supply = _maxSupply;
        spacePrice = _spacePrice;
        minimumToken = _minimumToken;
        dispatcher = _dispatcher;
    }

	/// @notice add a phase to mapping
	function createPhase(uint256 _discount, uint256 _end, uint256 _supply) external onlyOwner {
		Phase storage p = phases[lastPhase++];

		require(_discount < 1001, "Discount cannot be greater than 100%");
		p.discount = _discount;

		require(block.timestamp < _end, "The end of the phase should be greater than now");
		p.end = _end;

		require(supply >= _supply, "Not enough supply to mint");
		/// supply will decrease with each phase
		/// if the supply reaches 0 means that the cap of token are distributed in the phases
		supply -= _supply;
		p.supply = _supply;
	}

	/// @notice change account to transfer the contract balance
	function changeDispatcher(address _dispatcher) external onlyOwner {
        dispatcher = _dispatcher;
	}

	/// @notice mint tokens, require send ETH
	function buySpacelens(uint256 _tokenAmount) external payable whenNotPaused {
		/// advance phase if the time is out
		if (block.timestamp > phases[currentPhase].end) {
			currentPhase++;
		}
		require(phases[currentPhase].supply >= _tokenAmount, "Not enought supply");
		require(msg.value > 0, "not ETH");
		require(_tokenAmount >= minimumToken, "There are too few tokens");
		/// calculation: tokens / (price * (100 - discount) / 100)
		uint256 finalPrice = (_tokenAmount / (spacePrice * (1000 - phases[currentPhase].discount))) / 1000;
		require(finalPrice <= msg.value, "Not enough eth");
		_mint(msg.sender, _tokenAmount);
		/// change currenta phase total supply
		phases[currentPhase].supply -= _tokenAmount;
		/// advance phase if the supply is out
		if (phases[currentPhase].supply == 0) {
			currentPhase++;
		}
	}

	/// @notice pause the mint, no one could buy token from this contract
	function pauseMint() external onlyOwner {
		_pause();
    }

	/// @notice continue minting, let user call function to buy token
	function unpauseMint() external onlyOwner {
		_unpause();
    }

}
