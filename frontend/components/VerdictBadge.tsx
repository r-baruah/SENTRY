interface VerdictBadgeProps {
    status: 'IDLE' | 'RUNNING' | 'CRITICAL' | 'SECURE' | 'ERROR' | 'UNKNOWN';
}

export default function VerdictBadge({ status }: VerdictBadgeProps) {
    if (status === 'IDLE') return null;

    if (status === 'RUNNING') {
        return (
            <div className="
                absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 
                px-16 py-10 border-8 backdrop-blur-md
                flex flex-col items-center justify-center
                animate-in fade-in zoom-in duration-300 pointer-events-none
                border-cyan-800 bg-cyan-950/80 text-cyan-400 shadow-[0_0_100px_rgba(8,145,178,0.4)]
            ">
                <div className="mb-6 animate-spin">
                    <svg className="w-16 h-16 md:w-20 md:h-20" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
                <div className="text-4xl md:text-7xl font-black tracking-widest uppercase mb-2 animate-pulse">
                    ANALYZING
                </div>
                <div className="text-sm md:text-xl tracking-[0.6em] font-bold opacity-80 uppercase">
                    NEURAL ENGINE ACTIVE
                </div>
            </div>
        );
    }

    if (status === 'UNKNOWN') {
        return (
            <div className="
            absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 
            px-16 py-10 border-8 backdrop-blur-2xl
            flex flex-col items-center justify-center
            animate-in fade-in zoom-in duration-500 pointer-events-none
            border-yellow-600 bg-yellow-950/95 text-yellow-500 shadow-[0_0_150px_rgba(234,179,8,0.6)]
        ">
                <div className="text-5xl md:text-8xl font-black tracking-tighter uppercase mb-4">
                    INCONCLUSIVE
                </div>
                <div className="text-lg md:text-2xl tracking-[0.7em] font-bold opacity-90 uppercase">
                    Verification Failed
                </div>
                <div className="mt-6 px-4 py-2 bg-yellow-600 text-black font-black text-sm tracking-widest">
                    SYSTEM UNCERTAIN - MANUAL REVIEW REQ
                </div>
            </div>
        );
    }

    const isCritical = status === 'CRITICAL' || status === 'ERROR';

    return (
        <div className={`
            absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 
            px-16 py-10 border-8 backdrop-blur-2xl
            flex flex-col items-center justify-center
            animate-in fade-in zoom-in duration-500 pointer-events-none
            ${isCritical
                ? 'border-red-600 bg-red-950/95 text-red-500 shadow-[0_0_150px_rgba(239,68,68,0.8)] animate-pulse shadow-red-900/50'
                : 'border-green-500 bg-green-950/90 text-green-400 shadow-[0_0_100px_rgba(34,197,94,0.6)]'}
        `}>
            {isCritical && (
                <div className="absolute inset-0 border-4 border-red-500 animate-ping opacity-20" />
            )}
            <div className={`text-5xl md:text-8xl font-black tracking-tighter uppercase mb-4 ${isCritical ? 'scale-110' : ''}`}>
                {isCritical ? 'COMPROMISED' : 'SECURE'}
            </div>
            <div className="text-lg md:text-2xl tracking-[0.7em] font-bold opacity-90 uppercase">
                {isCritical ? 'CRITICAL EXPLOIT DETECTED' : 'SYSTEM INTEGRITY VERIFIED'}
            </div>
            {isCritical && (
                <div className="mt-6 px-4 py-2 bg-red-600 text-black font-black text-sm tracking-widest">
                    IMMEDIATE ACTION REQUIRED
                </div>
            )}
        </div>
    );
}
