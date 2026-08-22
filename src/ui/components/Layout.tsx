import type { ReactNode } from 'react';
import { Box } from 'ink';
import { HeaderBar } from './HeaderBar.js';
import { FooterBar } from './FooterBar.js';
import { HelpOverlay } from './HelpOverlay.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { useTheme } from '../hooks/useTheme.js';
import type { Control } from '../controls.js';

export interface LayoutProps {
  title: string;
  status?: string;
  controls?: readonly Control[];
  isHelpOpen?: boolean;
  children: ReactNode;
}

/**
 * The persistent frame: header, body, footer.
 *
 * Help *replaces* the body rather than floating over it. Ink has no z-index, so
 * a swap is both simpler and gives the overlay the body's sizing for free.
 */
export function Layout({ title, status, controls, isHelpOpen = false, children }: LayoutProps) {
  const theme = useTheme();
  const { columns, isNarrow } = useTerminalSize();
  const width = Math.max(20, Math.min(columns - 2, 100));

  return (
    <Box flexDirection="column" padding={1}>
      <HeaderBar title={title} status={status} theme={theme} width={width} />

      <Box flexDirection="column" flexGrow={1} marginTop={1}>
        {isHelpOpen && controls ? (
          <HelpOverlay controls={controls} theme={theme} isNarrow={isNarrow} />
        ) : (
          children
        )}
      </Box>

      {controls ? <FooterBar controls={controls} theme={theme} isNarrow={isNarrow} /> : null}
    </Box>
  );
}
