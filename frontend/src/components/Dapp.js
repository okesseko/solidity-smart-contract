import React, { useState, useEffect, useRef } from "react";

import { ethers } from "ethers";

import TokenArtifact from "../contracts/Token.json";
import contractAddress from "../contracts/contract-address.json";

import { NoWalletDetected } from "./NoWalletDetected";
import { ConnectWallet } from "./ConnectWallet";
import { Loading } from "./Loading";
import { Transfer } from "./Transfer";
import { TransactionErrorMessage } from "./TransactionErrorMessage";
import { WaitingForTransactionMessage } from "./WaitingForTransactionMessage";
import { NoTokensMessage } from "./NoTokensMessage";

const HARDHAT_NETWORK_ID = "31337";

const ERROR_CODE_TX_REJECTED_BY_USER = 4001;

const Dapp = () => {
  const token = useRef();
  const pollDataInterval = useRef();
  const myAddress = useRef();

  const [tokenData, setTokenData] = useState();
  const [balance, setBalance] = useState();
  const [txBeingSent, setTxBeingSent] = useState();
  const [transactionError, setTransactionError] = useState();
  const [networkError, setNetworkError] = useState();

  async function connectWallet() {
    const [myAddress] = await window.ethereum.enable();

    if (!checkNetwork()) {
      return;
    }
    initialize(myAddress);

    window.ethereum.on("accountsChanged", ([newAddress]) => {
      stopPollingData();
      if (newAddress === undefined) {
        return resetState();
      }

      initialize(newAddress);
    });

    window.ethereum.on("networkChanged", (e) => {
      console.log(e);
      stopPollingData();
      resetState();
    });
  }

  function initialize(userAddress) {
    myAddress.current = userAddress;

    initializeEthers();
    getTokenData();
    startPollingData();
  }

  async function initializeEthers() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    token.current = new ethers.Contract(
      contractAddress.Token,
      TokenArtifact.abi,
      provider.getSigner(0)
    );
  }

  async function getTokenData() {
    const name = await token.current.name();
    const symbol = await token.current.symbol();

    setTokenData({ name, symbol });
  }

  function startPollingData() {
    pollDataInterval.current = setInterval(() => updateBalance(), 1000);

    updateBalance();
  }

  function stopPollingData() {
    clearInterval(pollDataInterval.current);
    pollDataInterval.current = undefined;
  }

  async function updateBalance() {
    const balance = await token.current.balanceOf(myAddress.current);
    console.log("bal");
    setBalance(balance);
  }

  async function transferTokens(to, amount) {
    try {
      dismissTransactionError();

      const tx = await token.current.transfer(to, amount);
      setTxBeingSent(tx.hash);
      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }

      await updateBalance();
    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }

      console.error(error);
      setTransactionError(error);
    } finally {
      setTxBeingSent(null);
    }
  }

  function dismissTransactionError() {
    setTransactionError(null);
  }

  function dismissNetworkError() {
    setNetworkError(null);
  }

  function getRpcErrorMessage(error) {
    if (error.data) {
      return error.data.message;
    }

    return error.message;
  }

  function resetState() {
    setTokenData(null);
    setBalance(null);
    setTxBeingSent(null);
    setTransactionError(null);
    setNetworkError(null);
  }

  function checkNetwork() {
    if (window.ethereum.networkVersion === HARDHAT_NETWORK_ID) {
      return true;
    }

    setNetworkError("Please connect Metamask to Localhost:8545");

    return false;
  }

  useEffect(
    () => () => {
      stopPollingData();
    },
    []
  );

  if (window.ethereum === undefined) {
    return <NoWalletDetected />;
  }

  if (!myAddress.current) {
    return (
      <ConnectWallet
        connectWallet={connectWallet}
        networkError={networkError}
        dismiss={dismissNetworkError}
      />
    );
  }

  if (!tokenData || !balance) {
    return <Loading />;
  }

  return (
    <div className="container p-4">
      <div className="row">
        <div className="col-12">
          <h1>
            {tokenData.name} ({tokenData.symbol})
          </h1>
          <p>
            Welcome <b>{myAddress.current}</b>, you have{" "}
            <b>
              {balance.toString()} {tokenData.symbol}
            </b>
            .
          </p>
        </div>
      </div>
      <hr />
      <div className="row">
        <div className="col-12">
          {txBeingSent && <WaitingForTransactionMessage txHash={txBeingSent} />}
          {transactionError && (
            <TransactionErrorMessage
              message={getRpcErrorMessage(transactionError)}
              dismiss={dismissTransactionError}
            />
          )}
        </div>
      </div>
      <div className="row">
        <div className="col-12">
          {balance.eq(0) && (
            <NoTokensMessage selectedAddress={myAddress.current} />
          )}
          {balance.gt(0) && (
            <Transfer
              transferTokens={(to, amount) => transferTokens(to, amount)}
              tokenSymbol={tokenData.symbol}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dapp;
