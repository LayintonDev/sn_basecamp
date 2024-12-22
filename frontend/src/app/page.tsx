'use client';
import { FC, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useStarknet, useContract } from '@starknet-react/core';
import contractAbi from '../abis/abi';

const WalletBar = dynamic(() => import('../components/WalletBar'), { ssr: false });

const Page: FC = () => {
  const { account, library } = useStarknet();
  const contractAddress = '<YOUR_CONTRACT_ADDRESS>';
  const contract = useContract({ abi: contractAbi, address: contractAddress });

  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [counter, setCounter] = useState<number | null>(null);
  const [transactionUrl, setTransactionUrl] = useState<string | null>(null);

  // Step 1 --> Read the latest block
  useEffect(() => {
    const fetchBlockNumber = async () => {
      if (!library) return;
      const block = await library.getBlockNumber();
      setBlockNumber(block);
    };
    fetchBlockNumber();
  }, [library]);

  // Step 2 --> Read your balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!library || !account) return;
      const balance = await library.getBalance(account);
      setBalance(balance.toString());
    };
    fetchBalance();
  }, [library, account]);

  // Step 3 --> Read counter from contract
  const fetchCounter = async () => {
    if (!contract) return;
    const result = await contract.call('get_counter');
    setCounter(result[0].toNumber());
  };

  // Step 4 --> Increase counter on contract
  const increaseCounter = async () => {
    if (!contract || !account) return;
    const tx = await contract.invoke('increase_counter', { from: account });
    setTransactionUrl(`https://testnet.starkscan.co/tx/${tx.hash}`);
    await tx.wait();
    fetchCounter();
  };

  // Step 5 --> Reset counter (owner only)
  const resetCounter = async () => {
    if (!contract || !account) return;
    const tx = await contract.invoke('reset_counter', { from: account });
    setTransactionUrl(`https://testnet.starkscan.co/tx/${tx.hash}`);
    await tx.wait();
    fetchCounter();
  };

  // Step 6 --> Get events from a contract
  const fetchEvents = async () => {
    if (!contract || !library) return;
    const events = await library.getPastEvents(contractAddress, {
      fromBlock: 0,
      toBlock: 'latest',
    });
    console.log('Contract Events:', events);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col">
      <h1 className="text-3xl font-bold text-center mb-6">Starknet Frontend Workshop</h1>

      <div className="flex flex-wrap justify-center gap-4">
        <div className="w-full max-w-md space-y-4">
          <div className="bg-white p-4 border-black border">
            <h2 className="text-xl font-bold mb-2">Wallet Connection</h2>
            <WalletBar />
          </div>

          <div className="p-4 border-black border">
            <h3 className="text-lg font-bold mb-2">Read the Blockchain</h3>
            <p>Current Block: {blockNumber ?? 'Loading...'}</p>
          </div>

          <div className="p-4 bg-white border-black border">
            <h3 className="text-lg font-bold mb-2">Your Balance</h3>
            <p>Balance: {balance ?? 'Loading...'}</p>
          </div>

          <div className="p-4 bg-white border-black border">
            <h3 className="text-lg font-bold mb-2">Reset Counter</h3>
            <button
              onClick={resetCounter}
              className="mt-2 border border-black text-black font-regular py-2 px-4 bg-yellow-300 hover:bg-yellow-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Reset Counter
            </button>
            {transactionUrl && (
              <p className="mt-2 text-sm">
                <a
                  href={transactionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-500 underline hover:text-blue-700"
                >
                  View Transaction
                </a>
              </p>
            )}
          </div>
        </div>

        <div className="w-full max-w-md space-y-4">
          <div className="p-4 bg-white border-black border">
            <h3 className="text-lg font-bold mb-2">Contract Counter</h3>
            <p>Counter: {counter ?? 'Loading...'}</p>
            <button
              onClick={fetchCounter}
              className="mt-2 border border-black text-black font-regular py-1 px-3 bg-yellow-300 hover:bg-yellow-500"
            >
              Refresh
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              increaseCounter();
            }}
            className="bg-white p-4 border-black border"
          >
            <h3 className="text-lg font-bold mb-2">Increase Counter</h3>
            <button
              type="submit"
              className="mt-3 border border-black text-black font-regular py-2 px-4 bg-yellow-300 hover:bg-yellow-500"
            >
              Increase
            </button>
          </form>

          <div className="p-4 bg-white border-black border">
            <h3 className="text-lg font-bold mb-2">Fetch Contract Events</h3>
            <button
              onClick={fetchEvents}
              className="mt-2 border border-black text-black font-regular py-1 px-3 bg-yellow-300 hover:bg-yellow-500"
            >
              Fetch Events
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
