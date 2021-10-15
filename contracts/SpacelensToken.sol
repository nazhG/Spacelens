//SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Spacelens
/// @author nazhG
/// @notice this contract allow create phases for mint token and transfer the funds
contract SpacelensToken is Ownable, Pausable {
    /// a phase is a period for a discount in minting price
    /// until amount N of token sold out or reaching a date
    /// @dev a phase is always needed to mint
    struct Phase {
        /// uint between 0(0.0%) - 1000(100.0%) to mul with the price on sells
        uint256 discount;
        /// timestamp when this phase ends
        uint256 endAt;
        /// initial supply
        uint256 initSupply;
        /// uint that decreases when sold in phase
        /// @note to know the original supply look up in logs
        uint256 supply;
        /// mark as finished the phase
        bool over;
    }

    /// all phases (next, current and previous)
    mapping(uint256 => Phase) public phases;

    /// reference for the mapping of phases, uint of the current phase
    uint256 public currentPhase;

    /// reference for the mapping of phases, uint of the total phase
    /// @dev phases[totalPhase - 1] to get the total phase
    uint256 public totalPhase;

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

    /// @notice address the token that user buys
    address public tokenAddress;

    /// records creation and change of phases
    event PhaseChange(
        uint256 indexed index,
        uint256 _discount,
        uint256 _endAt,
        uint256 _supply,
        bool _over
    );

    /// records the changes of the wallet where the tokens are transferred
    event DispatcherChange(address indexed _dispatcher);

    /// records the token transfers made by the contract
    event Purchase(address indexed _account, uint256 _amount, uint256 _price);

    constructor(
        uint256 _maxSupply,
        uint256 _spacePrice,
        uint256 _minimumToken,
        address _dispatcher,
        address _tokenAddress
    ) {
        currentPhase = 0;
        totalPhase = 0;
        maxSupply = _maxSupply;
        supply = _maxSupply;
        spacePrice = _spacePrice;
        minimumToken = _minimumToken;
        dispatcher = _dispatcher;
        tokenAddress = _tokenAddress;
    }

    /// @notice add a phase to mapping
    function createPhase(
        uint256 _discount,
        uint256 _endAt,
        uint256 _supply
    ) external onlyOwner {
        emit PhaseChange(totalPhase, _discount, _endAt, _supply, false);

        Phase storage p = phases[totalPhase++];

        require(_discount < 1001, "Discount cannot be greater than 100%");
        p.discount = _discount;

        require(
            block.timestamp < _endAt,
            "The end of the phase should be greater than now"
        );
        p.endAt = _endAt;

        p.initSupply = _supply;

        require(supply >= _supply, "Not enough supply to mint");
        /// supply will decrease with each phase
        /// if the supply reaches 0 means that the cap of token are distributed in the phases
        supply -= _supply;
        p.supply = _supply;

        require(
            ERC20(tokenAddress).transferFrom(
                dispatcher,
                address(this),
                _supply
            ),
            "The token could not be transferred to the phase"
        );
    }

    /// @notice change a phase of the mapping
    function changePhase(
        uint256 _which,
        uint256 _discount,
        uint256 _endAt,
        bool _addSupply,
        uint256 _supplyChange,
        bool _over
    ) external onlyOwner {
        Phase storage p = phases[_which];

        require(_discount < 1001, "Discount cannot be greater than 100%");
        p.discount = _discount;

        require(
            block.timestamp < _endAt,
            "The end of the phase should be greater than now"
        );
        p.endAt = _endAt;

        if (_addSupply) {
            /// As you are adding supply to the phase, the supply is subtracted from the general contract
            require(supply - _supplyChange >= 0, "Not enough supply to mint");
            supply -= _supplyChange;
            p.supply += _supplyChange;
        } else {
            require(p.supply - _supplyChange >= 0, "Exceeds the minimum");
            supply += _supplyChange;
            p.supply -= _supplyChange;
        }

        p.over = _over;

        emit PhaseChange(_which, _discount, _endAt, p.supply, _over);
    }

    /// @notice change account to transfer the contract balance
    function changeDispatcher(address _dispatcher) external onlyOwner {
        emit DispatcherChange(_dispatcher);
        dispatcher = _dispatcher;
    }

    /// @notice mint tokens, require send ETH
    function buySpacelens(uint256 _tokenAmount, address _account)
        external
        payable
        whenNotPaused
    {
        /// advance phase if the time is out
        if (phases[currentPhase].over) {
            require(currentPhase < totalPhase, "Current phase is over");
            currentPhase++;
        }
        if (block.timestamp > phases[currentPhase].endAt) {
            phases[currentPhase].over = true;
            emit PhaseChange(
                currentPhase,
                phases[currentPhase].discount,
                phases[currentPhase].endAt,
                phases[currentPhase].supply,
                true
            );
        }
        require(
            phases[currentPhase].supply >= _tokenAmount,
            "Not enought supply"
        );
        require(_tokenAmount >= minimumToken, "There are too few tokens");
        /// calculation: tokens / (price * (100 - discount) / 100)
        uint256 finalPrice = (_tokenAmount /
            (spacePrice * (1000 - phases[currentPhase].discount))) / 1000;
        require(finalPrice <= msg.value, "Not enough ETH");
        ERC20(tokenAddress).transfer(_account, _tokenAmount);
        /// change currenta phase total supply
        phases[currentPhase].supply -= _tokenAmount;
        /// advance phase if the supply is out
        if (phases[currentPhase].supply == 0) {
            phases[currentPhase].over = true;
            emit PhaseChange(
                currentPhase,
                phases[currentPhase].discount,
                phases[currentPhase].endAt,
                phases[currentPhase].supply,
                true
            );
        }
        emit Purchase(_account, _tokenAmount, finalPrice);
    }

    /// @notice get ongoing phase or the last phase over
    function getcurrentPhase() external view returns (Phase memory) {
        return phases[currentPhase];
    }

    /// @notice pause the mint, no one could buy token from this contract
    function pauseMint() external onlyOwner {
        _pause();
    }

    /// @notice withdraw eth
    function withdraw(address _account, uint256 _amount) external onlyOwner {
        payable(_account).transfer(_amount);
    }

    /// @notice continue minting, let user call function to buy token
    function unpauseMint() external onlyOwner {
        _unpause();
    }
}
