import { SPRITE_INNER_HTML } from './spriteData';

export function Sprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: SPRITE_INNER_HTML }} />
  );
}
