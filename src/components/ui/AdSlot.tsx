interface Props {
  type: 'sidebar' | 'leaderboard' | 'rewarded';
  className?: string;
}

const AD_SIZES = {
  sidebar:     { width: '160px', height: '600px', label: 'Sidebar Ad (160×600)' },
  leaderboard: { width: '100%',  height: '90px',  label: 'Leaderboard Ad (728×90)' },
  rewarded:    { width: '100%',  height: '60px',  label: 'Rewarded Ad – Video ansehen für Bonus' },
};

export function AdSlot({ type, className = '' }: Props) {
  const { width, height, label } = AD_SIZES[type];

  if (type === 'rewarded') {
    return (
      <button
        className={`flex items-center justify-center gap-2 rounded-lg border border-dashed border-yellow-600/40 bg-yellow-900/10 text-yellow-600 text-sm hover:border-yellow-500/60 transition-colors ${className}`}
        style={{ width, height }}
        onClick={() => alert('[Rewarded Ad Placeholder] – Video-Integration hier')}
      >
        <span>▶</span>
        <span>{label}</span>
      </button>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded border border-dashed border-gray-700 bg-gray-900/50 text-gray-600 text-xs ${className}`}
      style={{ width, height, minWidth: width !== '100%' ? width : undefined }}
    >
      {label}
    </div>
  );
}
