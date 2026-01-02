'use client';

import { useEffect, useRef } from 'react';

interface TerminalProps {
    logs: string[];
}

export default function Terminal({ logs }: TerminalProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [logs]);

    const getLogStyle = (log: string) => {
        if (log.includes('[PASS]')) {
            return 'text-green-400 bg-green-900/30 px-2 py-1 rounded-sm block font-bold';
        }
        if (log.toLowerCase().includes('error') || log.includes('CRITICAL')) {
            return 'text-red-400 font-bold';
        }
        return 'text-zinc-400';
    };

    return (
        <div
            ref={containerRef}
            className="h-full w-full bg-black border-l border-zinc-800 p-6 font-mono text-lg md:text-xl overflow-y-auto custom-scrollbar"
        >
            <div className="sticky top-0 bg-black/80 backdrop-blur-sm mb-6 text-zinc-500 uppercase tracking-widest text-xs border-b border-zinc-800 pb-2 z-10 flex justify-between">
                <span>Mission Control // Live Feed</span>
                <span className="text-green-500 animate-pulse">● ONLINE</span>
            </div>
            <div className="flex flex-col space-y-2 font-mono">
                {logs.length === 0 && (
                    <div className="text-zinc-700 italic">Waiting for pipeline initiation...</div>
                )}
                {logs.map((log, i) => (
                    <div key={i} className={`break-words whitespace-pre-wrap leading-relaxed ${getLogStyle(log)}`}>
                        <span className="opacity-30 mr-4 select-none text-sm inline-block w-8">
                            {(i + 1).toString().padStart(3, '0')}
                        </span>
                        {log}
                    </div>
                ))}
            </div>
        </div>
    );
}
