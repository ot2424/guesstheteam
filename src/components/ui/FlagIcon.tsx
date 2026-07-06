import { getCountryCode, getFlagUrl } from '../../utils/countryFlags';

interface Props {
  nationality: string;
  nationality2?: string | null;
  size?: number; // width in px, height follows the 3:4 flag ratio
  className?: string;
  variant?: 'split' | 'inline';
}

export function FlagIcon({ nationality, nationality2, size = 24, className = '', variant = 'split' }: Props) {
  const width = size;
  const height = Math.round((size * 3) / 4);
  const code1 = getCountryCode(nationality);
  const code2 = nationality2 ? getCountryCode(nationality2) : undefined;
  const flags = [
    code1 ? { nationality, url: getFlagUrl(nationality, width * 2) } : null,
    code2 && nationality2 && code2 !== code1 ? { nationality: nationality2, url: getFlagUrl(nationality2, width * 2) } : null,
  ].filter((flag): flag is { nationality: string; url: string } => Boolean(flag?.url));

  if (flags.length === 0) {
    const label = nationality && !/^unknown$/i.test(nationality) ? nationality.slice(0, 2).toUpperCase() : 'N/A';
    return (
      <span
        className={`inline-flex items-center justify-center rounded-sm bg-gray-700 text-gray-300 ${className}`}
        style={{ width, height, fontSize: Math.max(8, height * 0.45) }}
        title={nationality}
      >
        {label}
      </span>
    );
  }

  if (flags.length === 1) {
    const flag = flags[0];
    return (
      <img
        src={flag.url}
        alt={flag.nationality}
        title={flag.nationality}
        className={`inline-block rounded-sm object-cover ${className}`}
        style={{ width, height }}
      />
    );
  }

  if (variant === 'inline') {
    return (
      <span
        className={`inline-flex items-center gap-0.5 ${className}`}
        title={`${nationality} / ${nationality2}`}
      >
        {flags.map((flag) => (
          <img
            key={flag.nationality}
            src={flag.url}
            alt={flag.nationality}
            className="inline-block rounded-sm object-cover"
            style={{ width, height }}
          />
        ))}
      </span>
    );
  }

  return (
    <span
      className={`relative inline-block overflow-hidden rounded-sm ${className}`}
      style={{ width, height }}
      title={`${nationality} / ${nationality2}`}
    >
      <img
        src={flags[0].url}
        alt={flags[0].nationality}
        className="absolute inset-0 object-cover"
        style={{ width, height, clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' }}
      />
      <img
        src={flags[1].url}
        alt={flags[1].nationality}
        className="absolute inset-0 object-cover"
        style={{ width, height, clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)' }}
      />
    </span>
  );
}
