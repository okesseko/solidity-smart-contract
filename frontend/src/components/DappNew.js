import React, { useState, useEffect, useRef } from "react";

// We'll use ethers to interact with the Ethereum network and our contract
import { ethers } from "ethers";

// We import the contract's artifacts and address here, as we are going to be
// using them with ethers
import TokenArtifact from "../contracts/Token.json";
import contractAddress from "../contracts/contract-address.json";

// All the logic of this dapp is contained in the Dapp component.
// These other components are just presentational ones: they don't have any
// logic. They just render HTML.
import { NoWalletDetected } from "./NoWalletDetected";
import { ConnectWallet } from "./ConnectWallet";
import { Loading } from "./Loading";
import { Transfer } from "./Transfer";
import { TransactionErrorMessage } from "./TransactionErrorMessage";
import { WaitingForTransactionMessage } from "./WaitingForTransactionMessage";
import { NoTokensMessage } from "./NoTokensMessage";

// This is the Hardhat Network id, you might change it in the hardhat.config.js
// Here's a list of network ids https://docs.metamask.io/guide/ethereum-provider.html#properties
// to use when deploying to other networks.
const HARDHAT_NETWORK_ID = "31337";

// This is an error code that indicates that the user canceled a transaction
const ERROR_CODE_TX_REJECTED_BY_USER = 4001;

const Dapp = () => {
  const token = useRef();
  const pollDataInterval = useRef();

  const [tokenData, setTokenData] = useState();
  const [selectedAddress, setSelectedAddress] = useState();
  const [balance, setBalance] = useState();
  const [txBeingSent, setTxBeingSent] = useState();
  const [transactionError, setTransactionError] = useState();
  const [networkError, setNetworkError] = useState();

  async function connectWallet() {
    // This method is run when the user clicks the Connect. It connects the
    // dapp to the user's wallet, and initializes it.

    // To connect to the user's wallet, we have to run this method.
    // It returns a promise that will resolve to the user's address.
    const [selectedAddress] = await window.ethereum.enable();

    // Once we have the address, we can initialize the application.

    // First we check the network
    if (!checkNetwork()) {
      return;
    }

    initialize(selectedAddress);

    // We reinitialize it whenever the user changes their account.
    window.ethereum.on("accountsChanged", ([newAddress]) => {
      stopPollingData();
      // `accountsChanged` event can be triggered with an undefined newAddress.
      // This happens when the user removes the Dapp from the "Connected
      // list of sites allowed access to your addresses" (Metamask > Settings > Connections)
      // To avoid errors, we reset the dapp state
      if (newAddress === undefined) {
        return resetState();
      }

      initialize(newAddress);
    });

    // We reset the dapp state if the network is changed
    window.ethereum.on("networkChanged", ([networkId]) => {
      stopPollingData();
      resetState();
    });
  }

  function initialize(userAddress) {
    // This method initializes the dapp

    // We first store the user's address in the component's state
    setSelectedAddress(userAddress);

    // Then, we initialize ethers, fetch the token's data, and start polling
    // for the user's balance.

    // Fetching the token data and the user's balance are specific to this
    // sample project, but you can reuse the same initialization pattern.
    intializeEthers();
    getTokenData();
    startPollingData();
  }

  async function intializeEthers() {
    // We first initialize ethers by creating a provider using window.ethereum
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    // When, we initialize the contract using that provider and the token's
    // artifact. You can do this same thing with your contracts.
    token.current = new ethers.Contract(
      contractAddress.Token,
      TokenArtifact.abi,
      provider.getSigner(0)
    );
  }

  function startPollingData() {
    pollDataInterval.current = setInterval(() => updateBalance(), 1000);

    // We run it once immediately so we don't have to wait for it
    updateBalance();
  }
  function stopPollingData() {
    clearInterval(pollDataInterval.current);
    pollDataInterval.current = undefined;
  }

  useEffect(() => {
    return () => {
      stopPollingData();
    };
  }, []);

  if (window.ethereum === undefined) {
    return <NoWalletDetected />;
  }

  if (!selectedAddress) {
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
            Welcome <b>{selectedAddress}</b>, you have{" "}
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
            <NoTokensMessage selectedAddress={selectedAddress} />
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
