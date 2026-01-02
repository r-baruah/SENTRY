interface CodeEditorProps {
    code: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export default function CodeEditor({ code, onChange, disabled }: CodeEditorProps) {
    // Simple line numbers
    const lines = code.split('\n').length;
    const lineNumbers = Array.from({ length: Math.max(lines, 20) }, (_, i) => i + 1);

    return (
        <div className="h-full w-full bg-[#0a0a0a] relative flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-black border-b border-zinc-800 text-xs font-mono text-zinc-500 select-none">
                <div className="flex items-center space-x-4">
                    <span className="text-zinc-300 font-bold">INPUT // SOURCE_CODE.sol</span>
                    <span>SIZE: {new Blob([code]).size} B</span>
                </div>
                <span>SOLIDITY 0.8.0</span>
            </div>
            <div className="flex-1 flex w-full relative">
                {/* Line Numbers */}
                <div className="w-12 bg-black text-right pr-3 pt-4 text-zinc-700 font-mono text-sm select-none leading-6 border-r border-zinc-900 hidden md:block">
                    {lineNumbers.map(n => (
                        <div key={n}>{n}</div>
                    ))}
                </div>

                {/* Editor */}
                <textarea
                    value={code}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    placeholder="// Paste Solidity Contract Here..."
                    spellCheck={false}
                    className="flex-1 w-full bg-transparent text-zinc-300 font-mono text-sm p-4 leading-6 resize-none focus:outline-none disabled:opacity-50"
                />
            </div>
        </div>
    );
}
