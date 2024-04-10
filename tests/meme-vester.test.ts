import { Cl } from "@stacks/transactions";
import { beforeEach, describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const alice = accounts.get("wallet_1")!;
let currentBlockTimestamp = Math.floor(new Date().getTime() / 1000);

/*
  The test below is an example. To learn more, read the testing documentation here:
  https://docs.hiro.so/clarinet/feature-guides/test-contract-with-clarinet-sdk
*/

describe("meme-vester tests", () => {
  beforeEach(() => {
    // Initialize meme before each test
    simnet.callPublicFn(
      "meme",
      "initialize",
      [
        Cl.stringAscii("MEME"),
        Cl.stringAscii("MEME"),
        Cl.uint(8),
        Cl.uint(21_000_000 * 1e8),
        Cl.stringUtf8("https://helloworld.com"),
      ],
      deployer
    );
    // Initialize bmeme before each test
    simnet.callPublicFn(
      "bmeme",
      "initialize",
      [
        Cl.stringAscii("bounded meme"),
        Cl.stringAscii("bMEME"),
        Cl.uint(8),
        Cl.uint(2_000_000 * 1e8),
        Cl.stringUtf8("https://helloworld.com"),
      ],
      deployer
    );
    // Initialize meme-vester before each test
    simnet.callPublicFn(
      "meme-vester",
      "initialize",
      [Cl.principal(deployer + ".bmeme"), Cl.principal(deployer + ".meme")],
      deployer
    );
    // Allow meme-vester to be a transferer of bmeme
    simnet.callPublicFn(
      "bmeme",
      "set-transferer",
      [Cl.principal(deployer + ".meme-vester"), Cl.bool(true)],
      deployer
    );
    // Allow deployer to be a transferer of bmeme
    simnet.callPublicFn(
      "bmeme",
      "set-transferer",
      [Cl.principal(deployer), Cl.bool(true)],
      deployer
    );
    // Allow meme-vester to be a supply controller of bmeme
    simnet.callPublicFn(
      "bmeme",
      "set-supply-controller",
      [Cl.principal(deployer + ".meme-vester"), Cl.bool(true)],
      deployer
    );
    // Seed meme-vester with 2_000_000 meme
    simnet.callPublicFn(
      "meme",
      "transfer",
      [
        Cl.uint(2_000_000 * 1e8),
        Cl.principal(deployer),
        Cl.principal(deployer + ".meme-vester"),
        Cl.none(),
      ],
      deployer
    );
    // Mock timestamp to current uinxtimestamp
    simnet.callPublicFn(
      "meme-vester",
      "set-mock-timestamp",
      [Cl.uint(currentBlockTimestamp)],
      deployer
    );
  });

  describe("vest", () => {
    describe("when amount is zero", () => {
      it("should error", () => {
        const vestResponse = simnet.callPublicFn(
          "meme-vester",
          "vest",
          [Cl.principal(deployer + ".bmeme"), Cl.uint(0)],
          deployer
        ).result;
        expect(vestResponse).toBeErr(Cl.uint(400));
      });
    });
    describe("when passed a non-bmeme contract", () => {
      it("should error", () => {
        const vestResponse = simnet.callPublicFn(
          "meme-vester",
          "vest",
          [Cl.principal(deployer + ".meme"), Cl.uint(100)],
          deployer
        ).result;
        expect(vestResponse).toBeErr(Cl.uint(400));
      });
    });
    describe("when params are valid", () => {
      it("should work", () => {
        const vestResponse = simnet.callPublicFn(
          "meme-vester",
          "vest",
          [Cl.principal(deployer + ".bmeme"), Cl.uint(100 * 1e8)],
          deployer
        ).result;
        expect(vestResponse).toBeOk(Cl.bool(true));
        const vestingInfoResp = simnet.callReadOnlyFn(
          "meme-vester",
          "get-vesting-info",
          [Cl.principal(deployer), Cl.uint(0)],
          deployer
        ).result;
        expect(vestingInfoResp).toBeOk(
          Cl.tuple({
            amount: Cl.uint(100 * 1e8),
            claimable: Cl.uint(0),
            "start-at": Cl.uint(currentBlockTimestamp),
            "end-at": Cl.uint(currentBlockTimestamp + 31536000),
            "has-claimed": Cl.bool(false),
            "last-claimed-at": Cl.uint(currentBlockTimestamp),
          })
        );
      });
    });
  });

  describe("getVestingInfo", () => {
    describe("when vesting position is not existed", () => {
      it("should returns default vesting info", () => {
        const vestingInfoResp = simnet.callReadOnlyFn(
          "meme-vester",
          "get-vesting-info",
          [Cl.principal(deployer), Cl.uint(0)],
          deployer
        ).result;
        expect(vestingInfoResp).toBeOk(
          Cl.tuple({
            amount: Cl.uint(0),
            claimable: Cl.uint(0),
            "start-at": Cl.uint(0),
            "end-at": Cl.uint(0),
            "has-claimed": Cl.bool(false),
            "last-claimed-at": Cl.uint(0),
          })
        );
      });
    });
    describe("when vesting position is existed", () => {
      let vestStartAt: number;
      let vestEndAt: number;
      beforeEach(() => {
        vestStartAt = currentBlockTimestamp;
        vestEndAt = currentBlockTimestamp + 31536000;
        simnet.callPublicFn(
          "meme-vester",
          "vest",
          [Cl.principal(deployer + ".bmeme"), Cl.uint(100 * 1e8)],
          deployer
        );
      });
      describe("when just vest", () => {
        it("should return correct vesting info", () => {
          const vestingInfoResp = simnet.callReadOnlyFn(
            "meme-vester",
            "get-vesting-info",
            [Cl.principal(deployer), Cl.uint(0)],
            deployer
          ).result;
          expect(vestingInfoResp).toBeOk(
            Cl.tuple({
              amount: Cl.uint(100 * 1e8),
              claimable: Cl.uint(0),
              "start-at": Cl.uint(vestStartAt),
              "end-at": Cl.uint(vestEndAt),
              "has-claimed": Cl.bool(false),
              "last-claimed-at": Cl.uint(vestStartAt),
            })
          );
        });
      });
      describe("when vest for 30 days", () => {
        it("should return correct vesting info", () => {
          // Mock timestamp to 30 days later
          currentBlockTimestamp += 30 * 86400;
          simnet.callPublicFn(
            "meme-vester",
            "set-mock-timestamp",
            [Cl.uint(currentBlockTimestamp)],
            deployer
          );
          // Check vesting info
          const vestingInfoResp = simnet.callReadOnlyFn(
            "meme-vester",
            "get-vesting-info",
            [Cl.principal(deployer), Cl.uint(0)],
            deployer
          ).result;
          expect(vestingInfoResp).toBeOk(
            Cl.tuple({
              amount: Cl.uint(100 * 1e8),
              claimable: Cl.uint(
                Math.floor((100 * 1e8 * 30 * 86400) / 31536000)
              ),
              "start-at": Cl.uint(vestStartAt),
              "end-at": Cl.uint(vestEndAt),
              "has-claimed": Cl.bool(false),
              "last-claimed-at": Cl.uint(vestStartAt),
            })
          );
        });
      });
      describe("when vest for 180 days", () => {
        it("should return correct vesting info", () => {
          // Mock timestamp to 180 days later
          currentBlockTimestamp += 180 * 86400;
          simnet.callPublicFn(
            "meme-vester",
            "set-mock-timestamp",
            [Cl.uint(currentBlockTimestamp)],
            deployer
          );
          // Check vesting info
          const vestingInfoResp = simnet.callReadOnlyFn(
            "meme-vester",
            "get-vesting-info",
            [Cl.principal(deployer), Cl.uint(0)],
            deployer
          ).result;
          expect(vestingInfoResp).toBeOk(
            Cl.tuple({
              amount: Cl.uint(100 * 1e8),
              claimable: Cl.uint(
                Math.floor((100 * 1e8 * 180 * 86400) / 31536000)
              ),
              "start-at": Cl.uint(vestStartAt),
              "end-at": Cl.uint(vestEndAt),
              "has-claimed": Cl.bool(false),
              "last-claimed-at": Cl.uint(vestStartAt),
            })
          );
        });
      });
      describe("when vest for 365 days", () => {
        it("should return correct vesting info", () => {
          // Mock timestamp to 365 days later
          currentBlockTimestamp += 365 * 86400;
          simnet.callPublicFn(
            "meme-vester",
            "set-mock-timestamp",
            [Cl.uint(currentBlockTimestamp)],
            deployer
          );
          // Check vesting info
          const vestingInfoResp = simnet.callReadOnlyFn(
            "meme-vester",
            "get-vesting-info",
            [Cl.principal(deployer), Cl.uint(0)],
            deployer
          ).result;
          expect(vestingInfoResp).toBeOk(
            Cl.tuple({
              amount: Cl.uint(100 * 1e8),
              claimable: Cl.uint(
                Math.floor((100 * 1e8 * 365 * 86400) / 31536000)
              ),
              "start-at": Cl.uint(vestStartAt),
              "end-at": Cl.uint(vestEndAt),
              "has-claimed": Cl.bool(false),
              "last-claimed-at": Cl.uint(vestStartAt),
            })
          );
        });
      });
      describe("when vest for 400 days", () => {
        it("should return correct vesting info", () => {
          // Mock timestamp to 400 days later
          currentBlockTimestamp += 400 * 86400;
          simnet.callPublicFn(
            "meme-vester",
            "set-mock-timestamp",
            [Cl.uint(currentBlockTimestamp)],
            deployer
          );
          // Check vesting info
          const vestingInfoResp = simnet.callReadOnlyFn(
            "meme-vester",
            "get-vesting-info",
            [Cl.principal(deployer), Cl.uint(0)],
            deployer
          ).result;
          expect(vestingInfoResp).toBeOk(
            Cl.tuple({
              amount: Cl.uint(100 * 1e8),
              claimable: Cl.uint(100 * 1e8),
              "start-at": Cl.uint(vestStartAt),
              "end-at": Cl.uint(vestEndAt),
              "has-claimed": Cl.bool(false),
              "last-claimed-at": Cl.uint(vestStartAt),
            })
          );
        });
      });
    });
  });

  describe("claim", () => {
    describe("when bmeme contract is not injected properly", () => {
      it("should error", () => {
        const claimResponse = simnet.callPublicFn(
          "meme-vester",
          "claim",
          [
            Cl.principal(deployer + ".mock-bmeme"),
            Cl.principal(deployer + ".meme"),
            Cl.uint(100 * 1e8),
          ],
          deployer
        ).result;
        expect(claimResponse).toBeErr(Cl.uint(400));
      });
    });
    describe("when meme contract is not injected properly", () => {
      it("should error", () => {
        const claimResponse = simnet.callPublicFn(
          "meme-vester",
          "claim",
          [
            Cl.principal(deployer + ".bmeme"),
            Cl.principal(deployer + ".bmeme"),
            Cl.uint(100 * 1e8),
          ],
          deployer
        ).result;
        expect(claimResponse).toBeErr(Cl.uint(400));
      });
    });
    describe("when vesting position is not existed", () => {
      it("should error", () => {
        const claimResponse = simnet.callPublicFn(
          "meme-vester",
          "claim",
          [
            Cl.principal(deployer + ".bmeme"),
            Cl.principal(deployer + ".meme"),
            Cl.uint(0),
          ],
          deployer
        ).result;
        expect(claimResponse).toBeErr(Cl.uint(404));
      });
    });
    describe("when vesting position is existed", () => {
      let vestStartAt: number;
      let vestEndAt: number;
      beforeEach(() => {
        vestStartAt = currentBlockTimestamp;
        vestEndAt = currentBlockTimestamp + 31536000;
        // Drop 2_000_000 bMEME to alice
        simnet.callPublicFn(
          "bmeme",
          "transfer",
          [
            Cl.uint(2_000_000 * 1e8),
            Cl.principal(deployer),
            Cl.principal(alice),
            Cl.none(),
          ],
          deployer
        );
        simnet.callPublicFn(
          "meme-vester",
          "vest",
          [Cl.principal(deployer + ".bmeme"), Cl.uint(2_000_000 * 1e8)],
          alice
        );
      });
      describe("when claim twice after 365 days", () => {
        it("should error", () => {
          // Mock timestamp to 365 days later
          currentBlockTimestamp += 365 * 86400;
          simnet.callPublicFn(
            "meme-vester",
            "set-mock-timestamp",
            [Cl.uint(currentBlockTimestamp)],
            deployer
          );
          // Alice claims
          const claimResponse = simnet.callPublicFn(
            "meme-vester",
            "claim",
            [
              Cl.principal(deployer + ".bmeme"),
              Cl.principal(deployer + ".meme"),
              Cl.uint(0),
            ],
            alice
          ).result;
          expect(claimResponse).toBeOk(Cl.bool(true));
          // Alice claims again
          const claimResponse2 = simnet.callPublicFn(
            "meme-vester",
            "claim",
            [
              Cl.principal(deployer + ".bmeme"),
              Cl.principal(deployer + ".meme"),
              Cl.uint(0),
            ],
            alice
          ).result;
          expect(claimResponse2).toBeErr(Cl.uint(402));
        });
      });
      describe("when claim multiple times", () => {
        it("show work", () => {
          for (let i = 1; i <= 12; i++) {
            // Assuming 30 days passed
            currentBlockTimestamp += 30 * 86400;
            simnet.callPublicFn(
              "meme-vester",
              "set-mock-timestamp",
              [Cl.uint(currentBlockTimestamp)],
              deployer
            );
            // Alice claims
            const claimResponse = simnet.callPublicFn(
              "meme-vester",
              "claim",
              [
                Cl.principal(deployer + ".bmeme"),
                Cl.principal(deployer + ".meme"),
                Cl.uint(0),
              ],
              alice
            ).result;
            expect(claimResponse).toBeOk(Cl.bool(true));
            // Check balance
            const balanceResp = simnet.callReadOnlyFn(
              "meme",
              "get-balance",
              [Cl.principal(alice)],
              alice
            ).result;
            expect(balanceResp).toBeOk(
              Cl.uint(Math.floor((2_000_000 * 1e8 * 30 * 86400) / 31536000) * i)
            );
          }
        });
      });
      describe("when claim after 365 days", () => {
        it("should work", () => {
          // Mock timestamp to 365 days later
          currentBlockTimestamp += 365 * 86400;
          simnet.callPublicFn(
            "meme-vester",
            "set-mock-timestamp",
            [Cl.uint(currentBlockTimestamp)],
            deployer
          );
          // Alice claims
          const claimResponse = simnet.callPublicFn(
            "meme-vester",
            "claim",
            [
              Cl.principal(deployer + ".bmeme"),
              Cl.principal(deployer + ".meme"),
              Cl.uint(0),
            ],
            alice
          ).result;
          expect(claimResponse).toBeOk(Cl.bool(true));
          // Check vesting info
          const vestingInfoResp = simnet.callReadOnlyFn(
            "meme-vester",
            "get-vesting-info",
            [Cl.principal(alice), Cl.uint(0)],
            alice
          ).result;
          expect(vestingInfoResp).toBeOk(
            Cl.tuple({
              amount: Cl.uint(2_000_000 * 1e8),
              claimable: Cl.uint(0),
              "start-at": Cl.uint(vestStartAt),
              "end-at": Cl.uint(vestEndAt),
              "has-claimed": Cl.bool(true),
              "last-claimed-at": Cl.uint(currentBlockTimestamp),
            })
          );
          // Check balance
          const balanceResp = simnet.callReadOnlyFn(
            "meme",
            "get-balance",
            [Cl.principal(alice)],
            alice
          ).result;
          expect(balanceResp).toBeOk(Cl.uint(2_000_000 * 1e8));
        });
      });
    });
  });
});
