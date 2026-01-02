interface VerdictBadgeProps {
    status: 'IDLE' | 'RUNNING' | 'CRITICAL' | 'SECURE' | 'ERROR' | 'UNKNOWN';
}

export default function VerdictBadge({ status }: VerdictBadgeProps) {
    if (status === 'IDLE' || status === 'RUNNING') return null;

    if (status === 'UNKNOWN') {
        return (
            <div className="
            absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 
            px-12 py-8 border-4 backdrop-blur-xl
            flex flex-col items-center justify-center
            animate-in fade-in zoom-in duration-300 pointer-events-none
            border-yellow-500 bg-yellow-950/90 text-yellow-400 shadow-[0_0_100px_rgba(234,179,8,0.6)]
        ">
                <div className="text-4xl md:text-6xl font-black tracking-widest uppercase mb-2">
                    INCONCLUSIVE
                </div>
                <div className="text-sm md:text-base tracking-[0.5em] font-bold opacity-80 uppercase">
                    Verification Failed
                </div>
            </div>
        );
    }

    const isCritical = status === 'CRITICAL' || status === 'ERROR';
    const isSecure = status === 'SECURE';

    return (
        <div className={`
            absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 
            px-12 py-8 border-4 backdrop-blur-xl
            flex flex-col items-center justify-center
            animate-in fade-in zoom-in duration-300 pointer-events-none
            ${isCritical
                ? 'border-red-600 bg-red-950/90 text-red-500 shadow-[0_0_100px_rgba(239,68,68,0.6)]'
                : 'border-green-500 bg-green-950/90 text-green-400 shadow-[0_0_100px_rgba(34,197,94,0.6)]'}
        `}>
            <div className={`text-4xl md:text-6xl font-black tracking-widest uppercase mb-2 ${isCritical ? 'animate-pulse' : ''}`}>
                {isCritical ? 'COMPROMISED' : 'SECURE'}
            </div>
            <div className="text-sm md:text-base tracking-[0.5em] font-bold opacity-80 uppercase">
                {isCritical ? 'Critical Vulnerability Detected' : 'System Integrity Verified'}
            </div>
        </div>
    );
}
