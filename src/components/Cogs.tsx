import Star from '../assets/star.svg?react';

export default function Cogs() {
  return (
    <div className="cogs" aria-hidden="true">
      <span className="cog cog-a"><Star /></span>
      <span className="cog cog-b"><Star /></span>
      <span className="cog cog-c"><Star /></span>
    </div>
  );
}
