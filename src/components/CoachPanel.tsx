import React from 'react';

export const CoachPanel: React.FC = () => {
    return (
        <div className="text-slate-100">
            <h3 className="text-lg font-semibold mb-4 text-amber-400">Strategic Advice</h3>
            <p className="text-slate-300 mb-4">
                The Coach Bot is analyzing the board...
            </p>
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
                <p className="text-sm italic text-slate-400">
                    "Focus on securing ore resources early to build cities faster."
                </p>
            </div>
        </div>
    );
};
