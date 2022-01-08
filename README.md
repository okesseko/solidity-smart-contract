# Solidity Smart Contract

This project is based on the [Hardhat Hackathon Boilerplate](https://github.com/nomiclabs/hardhat-hackathon-boilerplate).
I will refactor it's react from class component to function component and write other smart contact

## Quick start

The first things you need to do are cloning this repository and installing its
dependencies:

```sh
git clone https://github.com/okesseko/solidity-smart-contract.git
cd solidity-smart-contract
npm install
```

Once installed, let's run Hardhat's testing network:

```sh
npx hardhat node
```

Then, on a new terminal, go to the repository's root folder and run this to
deploy your contract:

```sh
npx hardhat run scripts/deploy.js --network localhost
```

Now, we can run the frontend with:

```sh
cd frontend
npm install
npm start
```

Finally, open the browser and connect to the localhost:3000
