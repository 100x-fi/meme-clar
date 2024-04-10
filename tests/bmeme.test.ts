import { Cl } from "@stacks/transactions";
import { beforeEach, describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const alice = accounts.get("wallet_1")!;
const bob = accounts.get("wallet_2")!;

/*
  The test below is an example. To learn more, read the testing documentation here:
  https://docs.hiro.so/clarinet/feature-guides/test-contract-with-clarinet-sdk
*/

describe("bmeme tests", () => {
  beforeEach(() => {
    // Initialize bmeme before each test
    simnet.callPublicFn(
      "bmeme",
      "initialize",
      [
        Cl.stringAscii("bounded meme"),
        Cl.stringAscii("bMEME"),
        Cl.uint(8),
        Cl.uint(21_000_000 * 1e8),
        Cl.stringUtf8("https://helloworld.com"),
      ],
      deployer
    );
  });

  describe("initialize", () => {
    describe("when caller is not an owner", () => {
      it("should error", () => {
        const initializeResponse = simnet.callPublicFn(
          "bmeme",
          "initialize",
          [
            Cl.stringAscii("bounded meme"),
            Cl.stringAscii("bMEME"),
            Cl.uint(8),
            Cl.uint(21_000_000 * 1e8),
            Cl.stringUtf8("https://helloworld.com"),
          ],
          alice
        ).result;
        expect(initializeResponse).toBeErr(Cl.uint(403));
      });
    });
    describe("when contract is initialized", () => {
      it("should error", () => {
        const initializeResponse = simnet.callPublicFn(
          "bmeme",
          "initialize",
          [
            Cl.stringAscii("bounded meme"),
            Cl.stringAscii("bMEME"),
            Cl.uint(8),
            Cl.uint(21_000_000 * 1e8),
            Cl.stringUtf8("https://helloworld.com"),
          ],
          deployer
        ).result;
        expect(initializeResponse).toBeErr(Cl.uint(401));
      });
    });
  });

  describe("get-name", () => {
    describe("when get name is called", () => {
      it("should returns the name", () => {
        const getNameResponse = simnet.callReadOnlyFn(
          "bmeme",
          "get-name",
          [],
          alice
        );
        expect(getNameResponse.result).toBeOk(Cl.stringAscii("bounded meme"));
      });
    });
  });

  describe("get-symbol", () => {
    describe("when get symbol is called", () => {
      it("should returns the symbol", () => {
        const getSymbolResponse = simnet.callReadOnlyFn(
          "bmeme",
          "get-symbol",
          [],
          alice
        );
        expect(getSymbolResponse.result).toBeOk(Cl.stringAscii("bMEME"));
      });
    });
  });

  describe("get-decimals", () => {
    describe("when get decimals is called", () => {
      it("should returns the decimals", () => {
        const getDecimalsResponse = simnet.callReadOnlyFn(
          "bmeme",
          "get-decimals",
          [],
          alice
        );
        expect(getDecimalsResponse.result).toBeOk(Cl.uint(8));
      });
    });
  });

  describe("get-balance", () => {
    describe("when get balance is called", () => {
      it("should returns the correct balance", () => {
        const deployerBalanceResponse = simnet.callReadOnlyFn(
          "bmeme",
          "get-balance",
          [Cl.principal(deployer)],
          deployer
        );
        expect(deployerBalanceResponse.result).toBeOk(
          Cl.uint(21_000_000 * 1e8)
        );
      });
    });
  });

  describe("transfer", () => {
    describe("when transferer is allowed", () => {
      beforeEach(() => {
        // Allow bob as a transferer
        simnet.callPublicFn(
          "bmeme",
          "set-transferer",
          [Cl.principal(bob), Cl.bool(true)],
          deployer
        );
      });
      describe("when transfer exceeded the balance", () => {
        it("should error", () => {
          const transferResponse = simnet.callPublicFn(
            "bmeme",
            "transfer",
            [
              Cl.uint(21_000_001 * 1e8),
              Cl.principal(deployer),
              Cl.principal(alice),
              Cl.none(),
            ],
            bob
          ).result;
          expect(transferResponse).toBeErr(Cl.uint(1));
        });
      });
      describe("when self-transfer", () => {
        it("should work", () => {
          simnet.callPublicFn(
            "bmeme",
            "transfer",
            [
              Cl.uint(1 * 1e8),
              Cl.principal(deployer),
              Cl.principal(deployer),
              Cl.none(),
            ],
            bob
          );
          const deployBalance = simnet.callReadOnlyFn(
            "bmeme",
            "get-balance",
            [Cl.principal(deployer)],
            deployer
          ).result;
          expect(deployBalance).toBeOk(Cl.uint(21_000_000 * 1e8));
        });
      });
      describe("when transfer with correct amount", () => {
        it("should work", () => {
          simnet.callPublicFn(
            "bmeme",
            "transfer",
            [
              Cl.uint(1 * 1e8),
              Cl.principal(deployer),
              Cl.principal(alice),
              Cl.none(),
            ],
            bob
          );
          const deployerBalance = simnet.callReadOnlyFn(
            "bmeme",
            "get-balance",
            [Cl.principal(deployer)],
            deployer
          ).result;
          const aliceBalance = simnet.callReadOnlyFn(
            "bmeme",
            "get-balance",
            [Cl.principal(alice)],
            deployer
          ).result;
          expect(deployerBalance).toBeOk(Cl.uint((21_000_000 - 1) * 1e8));
          expect(aliceBalance).toBeOk(Cl.uint(1 * 1e8));
        });
      });
    });

    describe("when transferer is not allowed", () => {
      it("should error", () => {
        const transferResponse = simnet.callPublicFn(
          "bmeme",
          "transfer",
          [
            Cl.uint(1 * 1e8),
            Cl.principal(alice),
            Cl.principal(deployer),
            Cl.none(),
          ],
          alice
        ).result;
        expect(transferResponse).toBeErr(Cl.uint(403));
      });
    });
  });

  describe("get-total-supply", () => {
    describe("when total supply is called", () => {
      it("should returns the correct total supply", () => {
        const totalSupplyResponse = simnet.callReadOnlyFn(
          "bmeme",
          "get-total-supply",
          [],
          deployer
        ).result;
        expect(totalSupplyResponse).toBeOk(Cl.uint(21_000_000 * 1e8));
      });
    });
  });

  describe("get-token-uri", () => {
    it("should returns the correct token uri", () => {
      const tokenUriResponse = simnet.callReadOnlyFn(
        "bmeme",
        "get-token-uri",
        [],
        deployer
      ).result;
      expect(tokenUriResponse).toBeOk(
        Cl.some(Cl.stringUtf8("https://helloworld.com"))
      );
    });
  });

  describe("get-owner", () => {
    describe("when get owner is called", () => {
      it("should returns the correct owner", () => {
        const ownerResponse = simnet.callReadOnlyFn(
          "bmeme",
          "get-owner",
          [],
          deployer
        ).result;
        expect(ownerResponse).toBeOk(Cl.principal(deployer));
      });
    });
  });

  describe("burn", () => {
    describe("when burner is a supply controller", () => {
      beforeEach(() => {
        simnet.callPublicFn(
          "bmeme",
          "set-supply-controller",
          [Cl.principal(deployer), Cl.bool(true)],
          deployer
        );
      });
      describe("when burn is exceeded the balance", () => {
        it("should error", () => {
          const burnResponse = simnet.callPublicFn(
            "bmeme",
            "burn",
            [Cl.principal(deployer), Cl.uint(21_000_001 * 1e8)],
            deployer
          ).result;
          expect(burnResponse).toBeErr(Cl.uint(1));
        });
      });
      describe("when burn with correct amount", () => {
        it("should work", () => {
          simnet.callPublicFn(
            "bmeme",
            "burn",
            [Cl.principal(deployer), Cl.uint(1 * 1e8)],
            deployer
          );
          const deployerBalance = simnet.callReadOnlyFn(
            "bmeme",
            "get-balance",
            [Cl.principal(deployer)],
            deployer
          ).result;
          expect(deployerBalance).toBeOk(Cl.uint((21_000_000 - 1) * 1e8));
        });
      });
    });
    describe("when burner is not a supply controller", () => {
      it("should error", () => {
        const burnResponse = simnet.callPublicFn(
          "bmeme",
          "burn",
          [Cl.principal(alice), Cl.uint(1 * 1e8)],
          alice
        ).result;
        expect(burnResponse).toBeErr(Cl.uint(403));
      });
    });
  });

  describe("transfer-ownership", () => {
    describe("when caller is an owner", () => {
      it("should work", () => {
        simnet.callPublicFn(
          "bmeme",
          "transfer-ownership",
          [Cl.principal(alice)],
          deployer
        );
        const ownerResponse = simnet.callReadOnlyFn(
          "bmeme",
          "get-owner",
          [],
          deployer
        ).result;
        expect(ownerResponse).toBeOk(Cl.principal(alice));
      });
    });
    describe("when caller is not an owner", () => {
      it("should error", () => {
        const transferOwnershipResponse = simnet.callPublicFn(
          "bmeme",
          "transfer-ownership",
          [Cl.principal(bob)],
          alice
        ).result;
        expect(transferOwnershipResponse).toBeErr(Cl.uint(403));
      });
    });
  });

  describe("set-transferer", () => {
    describe("when caller is not an owner", () => {
      it("should error", () => {
        const setTransfererResponse = simnet.callPublicFn(
          "bmeme",
          "set-transferer",
          [Cl.principal(alice), Cl.bool(true)],
          alice
        ).result;
        expect(setTransfererResponse).toBeErr(Cl.uint(403));
      });
    });
    describe("when caller is an owner", () => {
      it("should work", () => {
        simnet.callPublicFn(
          "bmeme",
          "set-transferer",
          [Cl.principal(alice), Cl.bool(true)],
          deployer
        );
        const transfererResponse = simnet.callReadOnlyFn(
          "bmeme",
          "is-transferer",
          [Cl.principal(alice)],
          deployer
        ).result;
        expect(transfererResponse).toBeOk(Cl.bool(true));
      });
    });
  });

  describe("set-supply-controller", () => {
    describe("when caller is not an owner", () => {
      it("should error", () => {
        const setSupplyControllerResponse = simnet.callPublicFn(
          "bmeme",
          "set-supply-controller",
          [Cl.principal(alice), Cl.bool(true)],
          alice
        ).result;
        expect(setSupplyControllerResponse).toBeErr(Cl.uint(403));
      });
    });
    describe("when caller is an owner", () => {
      it("should work", () => {
        simnet.callPublicFn(
          "bmeme",
          "set-supply-controller",
          [Cl.principal(alice), Cl.bool(true)],
          deployer
        );
        const supplyControllerResponse = simnet.callReadOnlyFn(
          "bmeme",
          "is-supply-controller",
          [Cl.principal(alice)],
          deployer
        ).result;
        expect(supplyControllerResponse).toBeOk(Cl.bool(true));
      });
    });
  });
});
