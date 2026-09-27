import CharacterIconMenu from './CharacterIconMenu';
import ColourMenu from './ColourMenu';
import EiconMenu from './EiconMenu';
import HorizontalRuleMenu from './HorizontalRuleMenu';
import LinkMenu from './LinkMenu';

/**
 * Keep toolbar pop-ups outside the toolbar's own layout boundary.
 *
 * The floating toolbar is transformed and horizontally scrollable. A fixed
 * pop-up rendered inside it would therefore be positioned against, and
 * clipped by, the floating bar instead of the viewport.
 */
export default function EditorToolbarMenus() {
  return (
    <>
      <ColourMenu />
      <EiconMenu />
      <CharacterIconMenu />
      <HorizontalRuleMenu />
      <LinkMenu />
    </>
  );
}
