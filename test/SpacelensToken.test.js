const SpacelensToken = artifacts.require("SpacelensToken");
const DummyERC20 = artifacts.require("DummyERC20");
const {
  expectEvent,
  expectRevert,
  time,
} = require("@openzeppelin/test-helpers");
const { web3 } = require("@openzeppelin/test-helpers/src/setup");

// this function include the desimals
toBN = (num) => web3.utils.toBN(num + "0".repeat(18));

toWei = (num) => web3.utils.toWei(num);
fromWei = (num) => web3.utils.fromWei(num);

contract("Spacelens Token", ([owner, user]) => {
  let token, space;
  const maxSupply = toBN(10000),
    price = 5 /** 1 ETH = 5 Tokens */,
    min = toBN(2);

  before(async function () {
    token = await DummyERC20.new();
    space = await SpacelensToken.new(maxSupply, price, min, owner, token.address, {
      from: owner,
    });
    await token.mint(maxSupply, {from: owner});
    await token.approve(space.address, maxSupply, {from: owner});
  });

  it("Init first phase", async function () {
    const discount = 505 /** 50.5% */,
      dateEndPhase =
        Number(await time.latest()) + 3600 /** the phase will last one hour */,
      supply = toBN(1000);

    await space.createPhase(discount, dateEndPhase, supply, {
      from: owner,
    });

    const phase = await space.phases(0);

    /** checking that the phase is created */
    assert.equal(Number(phase.discount), discount, "Phase discount err");
    assert.equal(Number(phase.endAt), dateEndPhase, "Phase ends err");
    assert.equal(Number(phase.supply), supply, "Phase supply err");
    /** checking that the contract decrease the supply */
    assert.equal(
      Number(await space.supply()),
      maxSupply - supply,
      "Contract dicrease supply err"
    );
  });

  it("Errors creating phases", async function () {
    /// err 200% discount
    await expectRevert(
      space.createPhase(2000, (await time.latest()) + 1, toBN(1), {
        from: owner,
      }),
      "Discount cannot be greater than 100%"
    );
    /// err end date is now less one second
    await expectRevert(
      space.createPhase(1, (await time.latest()) - 1, toBN(1), {
        from: owner,
      }),
      "The end of the phase should be greater than now"
    );
    /// err more that maxSupply (the current supply is maxSupply - phase one original supply)
    await expectRevert(
      space.createPhase(1, (await time.latest()) + 1, maxSupply, {
        from: owner,
      }),
      "Not enough supply to mint"
    );
  });

  it("Init second phase", async function () {
    const discount = 250 /** 25% */,
      // this phase end one hour after phase one over
      dateEndPhase = Number((await space.phases(0)).endAt) + 3600,
      supply = toBN(3000);

    await space.createPhase(discount, dateEndPhase, supply, {
      from: owner,
    });

    const phase = await space.phases(1);

    /** checking that the phase is created */
    assert.equal(Number(phase.discount), discount, "Phase discount err");
    assert.equal(Number(phase.endAt), dateEndPhase, "Phase ends err");
    assert.equal(Number(phase.supply), supply, "Phase supply err");
    /** checking that the contract decrease the supply */
    assert.equal(
      Number(await space.supply()),
      toBN(6000),
      "Contract dicrease supply err"
    );
    /** checking how many phase are, and if the phase one is not finished */
    assert.equal(
      Number(await space.currentPhase()),
      0,
      "Phase one is over err"
    );
    assert.equal(
      Number(await space.totalPhase()),
      2,
      "Should be only 2 phases"
    );
  });

  it("Should mint token", async function () {
    const currentPhaseNumber = Number(await space.currentPhase());

    const preUserBalance = Number(await token.balanceOf(user));
    const prePhaseSupply = Number(
      (await space.phases(currentPhaseNumber)).supply
    );
    await space.buySpacelens(toBN("400"), user, {
      from: user,
      value: toWei("160.5"),
    });
    const postUserBalance = Number(await token.balanceOf(user));
    const posPhaseSupply = Number(
      (await space.phases(currentPhaseNumber)).supply
    );
    assert.equal(preUserBalance, 0, "user phase one pre balance err");

    /// check the user have the token
    assert.equal(
      postUserBalance,
      Number(toBN("400")),
      "user phase one pos balance err"
    );
    /// check the phase supply decrase
    assert.equal(
      prePhaseSupply,
      posPhaseSupply + Number(toBN("400")),
      "supply phase one balance err"
    );
    /// check that the phase not change yet
    assert.equal(
      Number(await space.currentPhase()),
      currentPhaseNumber,
      "current phase err"
    );
  });

  it("Should end the phase (supply out)", async function () {
    const currentPhaseNumber = Number(await space.currentPhase());

    // cal the ETH needed to this operation
    const ethNeeded =
      Math.ceil(Number((await space.phases(currentPhaseNumber)).supply) /
      (Number(await space.spacePrice()) *
        (1000 -
          Number((await space.phases(currentPhaseNumber)).discount))) /
      1000);
    /// err not enought ETH
    await expectRevert(
      space.buySpacelens(
        (
          await space.phases(currentPhaseNumber)
        ).supply,
        user,
        { from: user, value: ethNeeded - 10 }
      ),
      "Not enough ETH"
    );
    /// Err not enought tokens.
    await expectRevert(
      space.buySpacelens(
        toBN(1),
        user,
        { from: user, value: ethNeeded }
      ),
      "There are too few tokens"
    );

    await space.buySpacelens(
      (
        await space.phases(currentPhaseNumber)
      ).supply,
      user, 
      { from: user, value: ethNeeded }
    );

    // Check that the initial phase is over
    assert.isTrue(
      Boolean((await space.phases(currentPhaseNumber)).over),
      "The phase is over"
    );

    // check supply
    assert.notEqual(
      Number((await space.phases(1)).supply),
      0,
      "phase supply err"
    );
    assert.equal(
      Number((await space.phases(0)).supply),
      0,
      "phase supply err"
    );
  });

  it("Should end the phase (time out)", async function () {
	  /// advance time 4 hours to end the phase
    await time.increase(time.duration.hours(4)); 
	
	  /// create the last phase (3)
    const discount = 0,
    dateEndPhase =
    Number(await time.latest()) + time.duration.years(1),
    supply = (await await space.supply());
    console.log(Number(await space.totalPhase()),Number(await space.currentPhase()));
    
    await space.createPhase(discount, dateEndPhase, supply, {
      from: owner,
    });
    console.log(Number(await space.totalPhase()),Number(await space.currentPhase()));
    
    await space.buySpacelens(toBN(2), user, { from: user, value: toBN(1) });
    console.log(Number(await space.totalPhase()),Number(await space.currentPhase()));

	  /// check this phase change
    assert.equal(
      Number(await space.currentPhase()),
      1,
      "change phase per time out err"
    );
    assert.isTrue(
      Boolean((await space.phases(Number(await space.currentPhase()))).over),
      "The phase is over"
    );
  });
});
