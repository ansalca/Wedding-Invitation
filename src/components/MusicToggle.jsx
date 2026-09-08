export default function MusicToggle({ playing, onToggle }) {
  return (
    <button
      type="button"
      className="music"
      onClick={onToggle}
      aria-pressed={playing}
      aria-label={playing ? 'Pause background music' : 'Play background music'}
    >
      <span className={`bars ${playing ? '' : 'is-paused'}`} aria-hidden="true">
        <span /><span /><span />
      </span>
    </button>
  );
}
