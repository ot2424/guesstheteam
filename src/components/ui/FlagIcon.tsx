import { getCountryCode, getFlagUrl } from '../../utils/countryFlags';

interface Props {
  nationality: string;
  nationality2?: string | null;
  size?: number; // width in px, height follows the 3:4 flag ratio
  className?: string;
}

export function FlagIcon({ nationality, nationality2, size = 24, className = '' }: Props) {
  const width = size;
  const height = Math.round((size * 3) / 4);
  const code1 = getCountryCode(nationality);
  const code2 = nationality2 ? getCountryCode(nationality2) : undefined;

  if (!code1 && !code2) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-sm bg-gray-700 text-gray-400 ${className}`}
        style={{ width, height, fontSize: height * 0.7 }}
        title={nationality}
      >
        ?
      </span>
    );
  }

  if (!code2 || !nationality2 || code2 === code1) {
    return (
      <img
        src={getFlagUrl(nationality, width * 2)}
        alt={nationality}
        title={nationality}
        className={`inline-block rounded-sm object-cover ${className}`}
        style={{ width, height }}
      />
    );
  }

  return (
    <span
      className={`relative inline-block overflow-hidden rounded-sm ${className}`}
      style={{ width, height }}
      title={`${nationality} / ${nationality2}`}
    >
      <img
        src={getFlagUrl(nationality, width * 2)}
        alt={nationality}
        className="absolute inset-0 object-cover"
        style={{ width, height, clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' }}
      />
      <img
        src={getFlagUrl(nationality2, width * 2)}
        alt={nationality2}
        className="absolute inset-0 object-cover"
        style={{ width, height, clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)' }}
      />
    </span>
  );
}
