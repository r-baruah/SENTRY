'use client';

import { useEffect, useRef } from 'react';

interface TerminalProps {
    logs: string[];
}

export default function Terminal({ logs }: TerminalProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="h-full w-full bg-black border-l border-zinc-800 p-4 font-mono text-xs md:text-sm overflow-y-auto custom-scrollbar">
            <div className="sticky top-0 bg-black/80 backdrop-blur-sm mb-4 text-zinc-500 uppercase tracking-widest text-[10px] border-b border-zinc-800 pb-2 z-10 flex justify-between">
                <span>Mission Control // Live Feed</span>
                <span className="text-green-500 animate-pulse">● ONLINE</span>
            </div>
            <div className="flex flex-col space-y-1 font-mono">
                {logs.length === 0 && (
                    <div className="text-zinc-700 italic">Waiting for pipeline initiation...</div>
                )}
                {logs.map((log, i) => (
                    <div key={i} className="text-green-500 break-words whitespace-pre-wrap leading-tight">
                        <span className="opacity-30 mr-2 select-none">{(i + 1).toString().padStart(3, '0')}</span>
                        {log}
                    </div>
                ))}
            </div>
            <div ref={bottomRef} />
        </div>
    );
}
