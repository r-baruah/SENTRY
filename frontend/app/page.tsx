'use client';

import { useState } from 'react';
import CodeEditor from '@/components/CodeEditor';
import Terminal from '@/components/Terminal';
import VerdictBadge from '@/components/VerdictBadge';

const DEFAULT_CODE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Vault is Ownable {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    // BUG: Missing onlyOwner
    function withdraw() external {
        payable(msg.sender).transfer(address(this).balance);
    }
}`;

export default function Home() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<'IDLE' | 'RUNNING' | 'CRITICAL' | 'SECURE' | 'ERROR' | 'UNKNOWN'>('IDLE');

  const handleAudit = async () => {
    if (status === 'RUNNING') return;

    setStatus('RUNNING');
    // Clear previous logs and add initialization status
    setLogs(['> SYSTEM INIT', '> ESTABLISHING UPLINK TO SENTRY ENGINE...', '> UPLOADING SOURCE CODE...']);

    try {
      // Use env var or default to local (useful for dev)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

      const response = await fetch(`${apiUrl}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with authentication failure: ${response.status}`);
      }

      const data = await response.json();

      // Process logs (split by newline)
      const logLines = data.logs ? data.logs.split('\n') : ['No logs returned'];

      // Filter empty lines mostly
      const filteredLogs = logLines.filter((l: string) => l.trim() !== '');

      setLogs(filteredLogs); // Reset logs completely with new response
      setStatus(data.verdict || 'UNKNOWN');

    } catch (error: any) {
      setLogs((prev) => [...prev, '', '❌ CRITICAL SYSTEM FAILURE', error.message]);
      setStatus('ERROR');
    }
  };

  return (
    <main className="h-screen w-screen bg-black text-white flex flex-col md:flex-row overflow-hidden relative font-sans">
      <VerdictBadge status={status} />

      {/* Left Panel: Editor */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col border-r border-zinc-800 relative z-10 bg-black">
        <CodeEditor code={code} onChange={setCode} disabled={status === 'RUNNING'} />
        <div className="bg-black p-6 border-t border-zinc-800">
          <button
            onClick={handleAudit}
            disabled={status === 'RUNNING'}
            className={`
                            w-full font-mono font-bold text-lg py-5 uppercase tracking-[0.3em] transition-all duration-300
                            border-2 
                            disabled:opacity-50 disabled:cursor-not-allowed
                            ${status === 'RUNNING'
                ? 'bg-zinc-900 border-zinc-800 text-zinc-500 animate-pulse'
                : 'bg-black text-green-500 border-green-700 hover:border-green-400 hover:text-green-400 hover:shadow-[0_0_30px_rgba(74,222,128,0.3)]'}
                        `}
          >
            {status === 'RUNNING' ? '/// PROCESSING...' : '[ INITIATE AUDIT ]'}
          </button>
        </div>
      </div>

      {/* Right Panel: Terminal */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full relative bg-black">
        <Terminal logs={logs} />

        {/* Decorative overlay lines for "tech" feel */}
        <div className="pointer-events-none absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.8)_100%)] opacity-50" />
      </div>
    </main>
  );
}
