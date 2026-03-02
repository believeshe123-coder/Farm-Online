import { buildAsciiBoard } from '../render/asciiBoard';

export default function AsciiBoard({ tiles, gridSize, selectedTileIndex, onSelectTile }) {
  const { headerLines, boardLines } = buildAsciiBoard({
    tiles,
    gridSize,
    selectedTileIndex,
  });

  return (
    <section className="grid-panel ascii-panel">
      <h3>Farm Grid</h3>
      <div className="ascii-scroll-wrap">
        <pre className="ascii-header" aria-label="Farm title">
          {headerLines.map((line, index) => (
            <span key={`header-${index}`} className="ascii-line">
              {line}
            </span>
          ))}
        </pre>
        <div className="ascii-board-wrap" style={{ '--grid-size': gridSize }}>
          <pre className="ascii-board" aria-label="ASCII farm board">
            {boardLines.map((lineTokens, lineIndex) => (
              <span className="ascii-line" key={`line-${lineIndex}`}>
                {lineTokens.map((token, tokenIndex) => (
                  <span key={`line-${lineIndex}-token-${tokenIndex}`} className={token.className}>
                    {token.text}
                  </span>
                ))}
              </span>
            ))}
          </pre>
          <div className="ascii-grid-overlay" aria-hidden="true">
            {tiles.map((_, index) => (
              <button
                key={index}
                type="button"
                className="ascii-grid-hitbox"
                title={`Tile ${index + 1}`}
                onClick={() => onSelectTile(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
