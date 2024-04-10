import { Cl } from "@stacks/transactions";
import { beforeEach, describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const alice = accounts.get("wallet_1")!;

/*
  The test below is an example. To learn more, read the testing documentation here:
  https://docs.hiro.so/clarinet/feature-guides/test-contract-with-clarinet-sdk
*/

describe("meme tests", () => {
  beforeEach(() => {
    // Initialize meme before each test
    simnet.callPublicFn(
      "meme",
      "initialize",
      [
        Cl.stringAscii("meme"),
        Cl.stringAscii("MEME"),
        Cl.uint(8),
        Cl.uint(21_000_000 * 1e8),
        Cl.stringUtf8("https://helloworld.com"),
      ],
      deployer
    );
  });

  describe("initialize", () => {
    describe("when caller is not a deployer", () => {
      it("should error", () => {
        const initializeResponse = simnet.callPublicFn(
          "meme",
          "initialize",
          [
            Cl.stringAscii("meme"),
            Cl.stringAscii("MEME"),
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
          "meme",
          "initialize",
          [
            Cl.stringAscii("meme"),
            Cl.stringAscii("MEME"),
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
          "meme",
          "get-name",
          [],
          alice
        );
        expect(getNameResponse.result).toBeOk(Cl.stringAscii("meme"));
      });
    });
  });

  describe("get-symbol", () => {
    describe("when get symbol is called", () => {
      it("should returns the symbol", () => {
        const getSymbolResponse = simnet.callReadOnlyFn(
          "meme",
          "get-symbol",
          [],
          alice
        );
        expect(getSymbolResponse.result).toBeOk(Cl.stringAscii("MEME"));
      });
    });
  });

  describe("get-decimals", () => {
    describe("when get decimals is called", () => {
      it("should returns the decimals", () => {
        const getDecimalsResponse = simnet.callReadOnlyFn(
          "meme",
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
          "meme",
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
    describe("when transfer and sender is different", () => {
      it("should error", () => {
        const transferResponse = simnet.callPublicFn(
          "meme",
          "transfer",
          [
            Cl.uint(1 * 1e8),
            Cl.principal(alice),
            Cl.principal(deployer),
            Cl.none(),
          ],
          deployer
        ).result;
        expect(transferResponse).toBeErr(Cl.uint(403));
      });
    });
    describe("when transfer exceeded the balance", () => {
      it("should error", () => {
        const transferResponse = simnet.callPublicFn(
          "meme",
          "transfer",
          [
            Cl.uint(21_000_001 * 1e8),
            Cl.principal(deployer),
            Cl.principal(alice),
            Cl.none(),
          ],
          deployer
        ).result;
        expect(transferResponse).toBeErr(Cl.uint(1));
      });
    });
    describe("when self-transfer", () => {
      it("should work", () => {
        simnet.callPublicFn(
          "meme",
          "transfer",
          [
            Cl.uint(1 * 1e8),
            Cl.principal(deployer),
            Cl.principal(deployer),
            Cl.none(),
          ],
          deployer
        );
        const deployBalance = simnet.callReadOnlyFn(
          "meme",
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
          "meme",
          "transfer",
          [
            Cl.uint(1 * 1e8),
            Cl.principal(deployer),
            Cl.principal(alice),
            Cl.none(),
          ],
          deployer
        );
        const deployerBalance = simnet.callReadOnlyFn(
          "meme",
          "get-balance",
          [Cl.principal(deployer)],
          deployer
        ).result;
        const aliceBalance = simnet.callReadOnlyFn(
          "meme",
          "get-balance",
          [Cl.principal(alice)],
          deployer
        ).result;
        expect(deployerBalance).toBeOk(Cl.uint((21_000_000 - 1) * 1e8));
        expect(aliceBalance).toBeOk(Cl.uint(1 * 1e8));
      });
    });
  });

  describe("get-total-supply", () => {
    describe("when total supply is called", () => {
      it("should returns the correct total supply", () => {
        const totalSupplyResponse = simnet.callReadOnlyFn(
          "meme",
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
        "meme",
        "get-token-uri",
        [],
        deployer
      ).result;
      expect(tokenUriResponse).toBeOk(
        Cl.some(Cl.stringUtf8("https://helloworld.com"))
      );
    });
  });
});
