import * as helpers from '../helpers';

const Identity = artifacts.require("Identity");
const DaoCreatorGoodDollar = artifacts.require("DaoCreatorGoodDollar");
const Avatar = artifacts.require("Avatar");
const GoodDollar = artifacts.require("GoodDollar");
const ControllerInterface = artifacts.require("ControllerInterface");
const AbsoluteVote = artifacts.require("AbsoluteVote");
const SchemeRegistrar = artifacts.require("SchemeRegistrar");
const SignUpBonus = artifacts.require("SignUpBonus");

contract("Integration - rewarding claimer bonus", ([founder, claimer, claimer2, nonClaimer]) => {

    let identity: helpers.ThenArg<ReturnType<typeof Identity['new']>>;
    let avatar: helpers.ThenArg<ReturnType<typeof Avatar['new']>>;
    let controller: helpers.ThenArg<ReturnType<typeof ControllerInterface['new']>>;
    let absoluteVote: helpers.ThenArg<ReturnType<typeof AbsoluteVote['new']>>;
    let token: helpers.ThenArg<ReturnType<typeof GoodDollar['new']>>;
    let signUpBonus: helpers.ThenArg<ReturnType<typeof SignUpBonus['new']>>;

    let proposalId: string;

    before(async () => {
      identity = await Identity.deployed();
      avatar = await Avatar.at(await (await DaoCreatorGoodDollar.deployed()).avatar());
      controller = await ControllerInterface.at(await avatar.owner());
      absoluteVote = await AbsoluteVote.deployed();
      token = await GoodDollar.at(await avatar.nativeToken());
      signUpBonus = await SignUpBonus.new(avatar.address, identity.address, 6);

    });

    it("should not allow awarding before starting scheme", async () => {
      await helpers.assertVMException(signUpBonus.awardUser(claimer, 3), "Scheme is not registered")
    })

    it("should start SignUpBonus scheme", async () => {
      const schemeRegistrar = await SchemeRegistrar.deployed();
      const transaction = await schemeRegistrar.proposeScheme(avatar.address, signUpBonus.address,
        helpers.NULL_HASH, "0x0000010", helpers.NULL_HASH);

      proposalId = transaction.logs[0].args._proposalId;

      const voteResult = await absoluteVote.vote(proposalId, 1, 0, founder);
      const executeProposalEventExists = voteResult.logs.some(e => e.event === 'ExecuteProposal');

       // Verifies that the ExecuteProposal event has been emitted
      assert(executeProposalEventExists);
    });

    it("should not allow awarding by non admin", async () => {
      await helpers.assertVMException(signUpBonus.awardUser(nonClaimer, 5, { from: nonClaimer }), "not IdentityAdmin")
    });

    it("should allow awarding", async () => {
      let oldBalance = await token.balanceOf(claimer);
      expect(oldBalance.toString()).to.be.equal("0");
      
      await signUpBonus.awardUser(claimer, 5);

      let newBalance = await token.balanceOf(claimer);
      expect(newBalance.toString()).to.be.equal("5");
    });

    it("should not allow awarding more than max bonus", async () => {
      await helpers.assertVMException(signUpBonus.awardUser(claimer, 2), "Cannot award user beyond max");
    })

    it("should end SignUpBonus scheme", async () => {
      const schemeRegistrar = await SchemeRegistrar.deployed();
      const transaction = await schemeRegistrar.proposeToRemoveScheme(avatar.address, signUpBonus.address,
          helpers.NULL_HASH);

      proposalId = transaction.logs[0].args._proposalId;

      const voteResult = await await absoluteVote.vote(proposalId, 1, 0, founder);
      const executeProposalEventExists = voteResult.logs.some(e => e.event === 'ExecuteProposal');

      assert(executeProposalEventExists);
    });
});

export{}