const SpacelensToken = artifacts.require("SpacelensToken");
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
  let spaceToken;
  const maxSupply = toBN(10000),
    price = 5 /** 1 ETH = 5 Tokens */,
    min = toBN(1);

  before(async function () {
    spaceToken = await SpacelensToken.new(maxSupply, price, min, owner, {
      from: owner,
    });
  });

  it("Init first phase", async function () {
    const discount = 505 /** 50.5% */,
      dateEndPhase =
        Number(await time.latest()) + 3600 /** the phase will last one hour */,
      supply = toBN(1000);

    await spaceToken.createPhase(discount, dateEndPhase, supply, {
      from: owner,
    });

    const phase = await spaceToken.phases(0);

    /** checking that the phase is created */
    assert.equal(Number(phase.discount), discount, "Phase discount err");
    assert.equal(Number(phase.end), dateEndPhase, "Phase ends err");
    assert.equal(Number(phase.supply), supply, "Phase supply err");
    /** checking that the contract decrease the supply */
    assert.equal(
      Number(await spaceToken.supply()),
      maxSupply - supply,
      "Contract dicrease supply err"
    );
  });

  it("Errors creating phases", async function () {
    /// err 200% discount
    await expectRevert(
      spaceToken.createPhase(2000, (await time.latest()) + 1, toBN(1), {
        from: owner,
      }),
      "Discount cannot be greater than 100%"
    );
    /// err end date is now less one second
    await expectRevert(
      spaceToken.createPhase(1, (await time.latest()) - 1, toBN(1), {
        from: owner,
      }),
      "The end of the phase should be greater than now"
    );
    /// err more that maxSupply (the current supply is maxSupply - phase one original supply)
    await expectRevert(
      spaceToken.createPhase(1, (await time.latest()) + 1, maxSupply, {
        from: owner,
      }),
      "not enough supply to mint"
    );
  });

  it("Init second phase", async function () {
    const discount = 250 /** 25% */,
      // this phase end one hour after phase one over
      dateEndPhase = Number((await spaceToken.phases(0)).end) + 3600,
      supply = toBN(3000);

    await spaceToken.createPhase(discount, dateEndPhase, supply, {
      from: owner,
    });

    const phase = await spaceToken.phases(1);

    /** checking that the phase is created */
    assert.equal(Number(phase.discount), discount, "Phase discount err");
    assert.equal(Number(phase.end), dateEndPhase, "Phase ends err");
    assert.equal(Number(phase.supply), supply, "Phase supply err");
    /** checking that the contract decrease the supply */
    assert.equal(
      Number(await spaceToken.supply()),
      toBN(6000),
      "Contract dicrease supply err"
    );
    /** checking how many phase are, and if the phase one is not finished */
    assert.equal(
      Number(await spaceToken.currentPhase()),
      0,
      "Phase one is over err"
    );
    assert.equal(
      Number(await spaceToken.lastPhase()),
      2,
      "Should be only 2 phases"
    );
  });

  it("Should mint token", async function () {
    const currentPhaseNumber = Number(await spaceToken.currentPhase());

    const preUserBalance = Number(await spaceToken.balanceOf(user));
    const prePhaseSupply = Number(
      (await spaceToken.phases(currentPhaseNumber)).supply
    );
    await spaceToken.buySpacelens(toBN("400"), {
      from: user,
      value: toWei("160.5"),
    });
    const postUserBalance = Number(await spaceToken.balanceOf(user));
    const posPhaseSupply = Number(
      (await spaceToken.phases(currentPhaseNumber)).supply
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
      Number(await spaceToken.currentPhase()),
      currentPhaseNumber,
      "current phase err"
    );
  });

  it("Should end the phase (supply out)", async function () {
    const currentPhaseNumber = Number(await spaceToken.currentPhase());

    // cal the ETH needed to this operation
    const ethNeeded =
      Math.ceil(Number((await spaceToken.phases(currentPhaseNumber)).supply) /
      (Number(await spaceToken.spacePrice()) *
        (1000 -
          Number((await spaceToken.phases(currentPhaseNumber)).discount))) /
      1000);
    /// err not enought ETH
    await expectRevert(
      spaceToken.buySpacelens(
        (
          await spaceToken.phases(currentPhaseNumber)
        ).supply,
        { from: user, value: ethNeeded - 10 }
      ),
      "not enough eth"
    );

    await spaceToken.buySpacelens(
      (
        await spaceToken.phases(currentPhaseNumber)
      ).supply,
      { from: user, value: ethNeeded }
    );

    // check that the initial phase is not the current phase
    assert.notEqual(
      Number(await spaceToken.currentPhase()),
      currentPhaseNumber,
      "change phase per supply out err"
    );

    // check supply
    assert.notEqual(
      Number((await spaceToken.phases(1)).supply),
      0,
      "phase supply err"
    );
    assert.equal(
      Number((await spaceToken.phases(0)).supply),
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
	supply = (await await spaceToken.supply());
    await spaceToken.createPhase(discount, dateEndPhase, supply, {
		from: owner,
    });
	
	/// create the last phase (3)
    await spaceToken.buySpacelens(1, { from: user, value: 1 });

	/// check this phase change
    assert.equal(
      Number(await spaceToken.currentPhase()),
      2,
      "change phase per time out err"
    );
  });
});
